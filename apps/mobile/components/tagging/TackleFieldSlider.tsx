import { useCallback, useMemo, useRef, useState, Fragment } from "react";
import {
  Alert,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  computeTackleGainLoss,
  formatTackleEndDisplay,
  isAtOwnOne,
  isOppEndZoneEnd,
  isOwnEndZoneEnd,
  isPendingTackleConfirm,
  isTackleRightExtreme,
  tackleEndFromCenterX,
  tackleSliderPosFromCenterX,
  tackleStepYardLine,
  tackleStripCenterX,
  tackleThumbCenterX,
  sliderPosForTackleEnd,
  TACKLE_SLIDER_OPP_ONE,
  TACKLE_SLIDER_OWN_ONE,
  TACKLE_SLIDER_TD_POS,
  TACKLE_STRIP_END_ZONE_PX,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";
import { formatFieldPosition } from "@/lib/tagging/kickoffReturn";
import { LAYOUT } from "@/lib/tagging/layoutConstants";
import { ODK, type PlaylistData, type YardLine } from "@huddlestat/shared";

type TackleFieldSliderProps = {
  ballSpot: YardLine;
  end: TackleEnd;
  onChange: (end: TackleEnd) => void;
  allowTouchdown?: boolean;
  odk?: PlaylistData["odk"];
  sectionLabel?: string;
  showGain?: boolean;
  compact?: boolean;
};

const ORBIT_GAIN_HEIGHT = 80;
const ORBIT_SPOT_HEIGHT = 44;
const RULER_HEIGHT = 48;
const FINE_BTN_SIZE = 56;
const THUMB_SIZE = FINE_BTN_SIZE;
/** Center-to-center distance from thumb to ± button */
const FINE_OFFSET = FINE_BTN_SIZE + 12;
const GAIN_LABEL_HALF = 72;
const SPOT_LABEL_HALF = 72;
const CHROME_HEIGHT = ORBIT_SPOT_HEIGHT + ORBIT_GAIN_HEIGHT;

const FIELD_GREEN = "#2f7d32";
const FIELD_GREEN_ALT = "#297429";
const FIELD_LINE = "rgba(255,255,255,0.92)";
const FIELD_GOAL = "#f5d547";
const GOAL_LINE_W = 3;

const FIELD_DIGIT_W = 13;
const FIELD_DIGIT_LINE_GAP = 5;
const FIELD_LINE_IN_NUM_W = 2;
const FIELD_ARROW_SLOT = 8;

/** 10-yard numbers on the strip (internal 0–100 field axis). */
const FIELD_YARD_NUMBERS: { pos: number; label: string }[] = [
  { pos: 10, label: "10" },
  { pos: 20, label: "20" },
  { pos: 30, label: "30" },
  { pos: 40, label: "40" },
  { pos: 50, label: "50" },
  { pos: 60, label: "40" },
  { pos: 70, label: "30" },
  { pos: 80, label: "20" },
  { pos: 90, label: "10" },
];

const MOW_STRIPE_COUNT = 24;

function fieldPosCenterX(trackWidth: number, fieldPos: number): number {
  return tackleStripCenterX(trackWidth, fieldPos);
}

function FieldArrow({ direction }: { direction: "left" | "right" }) {
  return (
    <View
      style={[
        styles.fieldArrow,
        direction === "left" ? styles.fieldArrowLeft : styles.fieldArrowRight,
      ]}
    />
  );
}

function FieldYardNumber({
  label,
  arrow,
  lineCenterX,
}: {
  label: string;
  arrow: "left" | "right" | "none";
  lineCenterX: number;
}) {
  const tens = label[0] ?? "";
  const ones = label[1] ?? "";
  const leftArrowW = arrow === "left" ? FIELD_ARROW_SLOT : 0;
  const rightArrowW = arrow === "right" ? FIELD_ARROW_SLOT : 0;
  const lineCenterFromRowStart =
    leftArrowW +
    FIELD_DIGIT_W +
    FIELD_DIGIT_LINE_GAP +
    FIELD_LINE_IN_NUM_W / 2;
  const rowWidth =
    leftArrowW +
    FIELD_DIGIT_W +
    FIELD_DIGIT_LINE_GAP +
    FIELD_LINE_IN_NUM_W +
    FIELD_DIGIT_LINE_GAP +
    FIELD_DIGIT_W +
    rightArrowW;

  return (
    <View
      style={[
        styles.fieldNumberWrap,
        { left: lineCenterX - lineCenterFromRowStart, width: rowWidth },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.fieldNumberYardLine,
          {
            left:
              lineCenterFromRowStart - FIELD_LINE_IN_NUM_W / 2,
          },
        ]}
      />
      <View style={styles.fieldNumberRow}>
        {arrow === "left" ? (
          <View style={styles.fieldArrowSlot}>
            <FieldArrow direction="left" />
          </View>
        ) : null}
        <Text style={styles.fieldDigit}>{tens}</Text>
        <View style={styles.fieldDigitLineGap} />
        <Text style={styles.fieldDigit}>{ones}</Text>
        {arrow === "right" ? (
          <View style={styles.fieldArrowSlot}>
            <FieldArrow direction="right" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function FieldRuler({
  trackWidth,
  height,
}: {
  trackWidth: number;
  height: number;
}) {
  const yardPositions = useMemo(() => {
    const marks: number[] = [];
    for (let pos = 0; pos <= 100; pos += 5) marks.push(pos);
    return marks;
  }, []);

  const hashPositions = useMemo(() => {
    const marks: number[] = [];
    for (let pos = 0; pos <= 100; pos += 1) marks.push(pos);
    return marks;
  }, []);

  return (
    <View style={[styles.fieldStrip, { height }]}>
      <View style={styles.mowStripes} pointerEvents="none">
        {Array.from({ length: MOW_STRIPE_COUNT }, (_, i) => (
          <View
            key={i}
            style={[
              styles.mowStripe,
              { backgroundColor: i % 2 === 0 ? FIELD_GREEN : FIELD_GREEN_ALT },
            ]}
          />
        ))}
      </View>

      <View
        style={[styles.fieldEz, { width: TACKLE_STRIP_END_ZONE_PX }]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.fieldEz,
          { right: 0, width: TACKLE_STRIP_END_ZONE_PX },
        ]}
        pointerEvents="none"
      />

      <View
        style={[
          styles.fieldGoalLine,
          { left: fieldPosCenterX(trackWidth, 0) - GOAL_LINE_W / 2 },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.fieldGoalLine,
          {
            left: fieldPosCenterX(trackWidth, 100) - GOAL_LINE_W / 2,
          },
        ]}
        pointerEvents="none"
      />

      {yardPositions.map((pos) => {
        if (pos === 0 || pos === 100 || pos % 10 === 0) return null;
        const x = fieldPosCenterX(trackWidth, pos);
        return (
          <View
            key={`yard-${pos}`}
            style={[styles.fieldYardLine, styles.fieldYardLineFive, { left: x - 0.5 }]}
            pointerEvents="none"
          />
        );
      })}

      {hashPositions.map((pos) => {
        if (pos % 5 === 0) return null;
        const x = fieldPosCenterX(trackWidth, pos);
        return (
          <Fragment key={`hash-${pos}`}>
            <View
              style={[styles.fieldHash, { left: x - 1, top: 2 }]}
              pointerEvents="none"
            />
            <View
              style={[styles.fieldHash, styles.fieldHashBottom, { left: x - 1 }]}
              pointerEvents="none"
            />
          </Fragment>
        );
      })}

      {FIELD_YARD_NUMBERS.map(({ pos, label }) => {
        const lineCenterX = fieldPosCenterX(trackWidth, pos);
        const arrow =
          pos === 50 ? "none" : pos < 50 ? ("left" as const) : ("right" as const);
        return (
          <FieldYardNumber
            key={`num-${pos}`}
            label={label}
            arrow={arrow}
            lineCenterX={lineCenterX}
          />
        );
      })}
    </View>
  );
}

export function TackleFieldSlider({
  ballSpot,
  end,
  onChange,
  allowTouchdown = true,
  odk = ODK.Offense,
  sectionLabel = "Tackled at",
  showGain = true,
  compact = false,
}: TackleFieldSliderProps) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const outcomeConfirmedRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragPos, setDragPos] = useState<number | null>(null);

  const gainLoss = computeTackleGainLoss(ballSpot, end, odk);
  const spotMoved = end.kind !== "yardline" || gainLoss !== 0;
  const gainLabel = gainLoss > 0 ? `+${gainLoss}` : String(gainLoss);
  const spotLabel = formatTackleEndDisplay(end);
  const pendingConfirm = isPendingTackleConfirm(end);
  const inOwnEz = isOwnEndZoneEnd(end);
  const inOppEz = isOppEndZoneEnd(end);
  const inEndZone = inOwnEz || inOppEz;
  const confirmedSafety = end.kind === "safety";
  const confirmedTouchdown = end.kind === "touchdown";
  const outcomeConfirmed = confirmedSafety || confirmedTouchdown;
  onChangeRef.current = onChange;
  outcomeConfirmedRef.current = outcomeConfirmed;

  function clampLeft(center: number, halfWidth: number): number {
    if (trackWidth <= 0) return 0;
    return Math.min(
      trackWidth - halfWidth * 2,
      Math.max(0, center - halfWidth),
    );
  }

  const syncTrackMetrics = useCallback(() => {
    trackRef.current?.measureInWindow((pageX, _pageY, width) => {
      trackPageXRef.current = pageX;
      trackWidthRef.current = width;
      setTrackWidth(width);
    });
  }, []);

  const centerXFromPageX = useCallback((pageX: number): number | null => {
    const width = trackWidthRef.current;
    if (width <= 2 * TACKLE_STRIP_END_ZONE_PX) return null;
    const localX = pageX - trackPageXRef.current;
    return Math.min(width, Math.max(0, localX));
  }, []);

  const commitCenterX = useCallback(
    (centerX: number) => {
      const width = trackWidthRef.current;
      onChangeRef.current(
        tackleEndFromCenterX(width, centerX, allowTouchdown),
      );
    },
    [allowTouchdown],
  );

  const setFromPageX = useCallback(
    (pageX: number, commit: boolean) => {
      const centerX = centerXFromPageX(pageX);
      if (centerX === null) return;
      const width = trackWidthRef.current;
      let pos = tackleSliderPosFromCenterX(width, centerX);
      if (!allowTouchdown && pos >= TACKLE_SLIDER_TD_POS) {
        pos = 99;
      }
      setDragPos(pos);
      if (commit) commitCenterX(centerX);
    },
    [allowTouchdown, centerXFromPageX, commitCenterX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !outcomeConfirmedRef.current,
        onMoveShouldSetPanResponder: () => !outcomeConfirmedRef.current,
        onPanResponderGrant: (evt) => {
          const touchPageX = evt.nativeEvent.pageX;
          trackRef.current?.measureInWindow((pageX, _pageY, width) => {
            trackPageXRef.current = pageX;
            trackWidthRef.current = width;
            setTrackWidth(width);
            setFromPageX(touchPageX, true);
          });
        },
        onPanResponderMove: (evt) => {
          setFromPageX(evt.nativeEvent.pageX, true);
        },
        onPanResponderRelease: () => setDragPos(null),
        onPanResponderTerminate: () => setDragPos(null),
      }),
    [setFromPageX],
  );

  const activeSliderPos =
    dragPos !== null ? dragPos : sliderPosForTackleEnd(end);
  const thumbCenter =
    trackWidth > 0
      ? tackleThumbCenterX(trackWidth, activeSliderPos)
      : TACKLE_STRIP_END_ZONE_PX / 2;
  const thumbLeft = thumbCenter - THUMB_SIZE / 2;
  const gainFontSize = Math.abs(gainLoss) >= 10 ? 34 : 44;
  const gainLineHeight = Math.abs(gainLoss) >= 10 ? 38 : 48;

  function handleFineStep(delta: 1 | -1) {
    if (inOwnEz) {
      if (delta > 0) {
        onChange({ kind: "yardline", yardLine: TACKLE_SLIDER_OWN_ONE });
      }
      return;
    }
    if (inOppEz) {
      if (delta < 0) {
        onChange({ kind: "yardline", yardLine: TACKLE_SLIDER_OPP_ONE });
      }
      return;
    }
    if (end.kind !== "yardline") return;
    if (isAtOwnOne(end.yardLine) && delta < 0) {
      onChange({ kind: "endzone", side: "own" });
      return;
    }
    if (isTackleRightExtreme(end.yardLine) && delta > 0) {
      if (allowTouchdown) {
        onChange({ kind: "endzone", side: "opponent" });
      }
      return;
    }
    onChange({
      kind: "yardline",
      yardLine: tackleStepYardLine(end.yardLine, delta),
    });
  }

  function handleSafetyPress() {
    Alert.alert("Confirm safety?", "Mark this play as a safety?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => onChange({ kind: "safety" }),
      },
    ]);
  }

  function handleTouchdownPress() {
    Alert.alert("Confirm touchdown?", "Mark this play as a touchdown?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        onPress: () => onChange({ kind: "touchdown" }),
      },
    ]);
  }

  function OrbitButton({
    center,
    label,
    onPress,
    disabled,
  }: {
    center: number;
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) {
    return (
      <Pressable
        style={[
          styles.fineBtn,
          { left: clampLeft(center, FINE_BTN_SIZE / 2) },
          disabled && styles.btnDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        hitSlop={8}
      >
        <Text style={styles.fineBtnText}>{label}</Text>
      </Pressable>
    );
  }

  const atOppOne =
    end.kind === "yardline" && isTackleRightExtreme(end.yardLine);
  const showMinus =
    inOppEz || (end.kind === "yardline" && spotMoved && !inOwnEz);
  const showPlus =
    inOwnEz ||
    (end.kind === "yardline" &&
      spotMoved &&
      !(atOppOne && !allowTouchdown));
  const leftCompanionCenter = thumbCenter - FINE_OFFSET;
  const rightCompanionCenter = thumbCenter + FINE_OFFSET;
  const chromeTitle = confirmedSafety
    ? "Safety"
    : confirmedTouchdown
      ? "Touchdown"
      : inOwnEz
        ? "Confirm Safety"
        : "Confirm Touchdown";
  const chromePressable = pendingConfirm;
  const onChromePress = inOwnEz ? handleSafetyPress : handleTouchdownPress;
  const chromeHeight = showGain ? CHROME_HEIGHT : ORBIT_SPOT_HEIGHT;
  const rulerHeight = compact ? 36 : RULER_HEIGHT;
  const showGainChrome = showGain && spotMoved;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{sectionLabel}</Text>

      <View
        style={[
          styles.orbitShell,
          {
            minHeight: chromeHeight + LAYOUT.minTapTarget + rulerHeight + 8,
            paddingTop: chromeHeight,
            paddingBottom: rulerHeight,
          },
        ]}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
          setTrackWidth(e.nativeEvent.layout.width);
          syncTrackMetrics();
        }}
      >
        {inEndZone && trackWidth > 0 ? (
          <Pressable
            style={[
              styles.chromeConfirm,
              { height: chromeHeight },
              outcomeConfirmed && styles.chromeConfirmLocked,
            ]}
            onPress={chromePressable ? onChromePress : undefined}
            disabled={!chromePressable}
          >
            <Text
              style={[
                styles.chromeConfirmTitle,
                outcomeConfirmed && styles.chromeConfirmTitleLocked,
              ]}
            >
              {chromeTitle}
            </Text>
            {showGainChrome ? (
              <Text
                style={[
                  styles.chromeConfirmGain,
                  outcomeConfirmed && styles.chromeConfirmGainLocked,
                ]}
              >
                {gainLabel}
              </Text>
            ) : null}
          </Pressable>
        ) : (
          <>
            {trackWidth > 0 ? (
              <Text
                style={[
                  styles.spotLabel,
                  { left: clampLeft(thumbCenter, SPOT_LABEL_HALF) },
                ]}
              >
                {spotLabel}
              </Text>
            ) : null}

            {showGainChrome && trackWidth > 0 ? (
              <Text
                style={[
                  styles.gainLabel,
                  {
                    left: clampLeft(thumbCenter, GAIN_LABEL_HALF),
                    fontSize: gainFontSize,
                    lineHeight: gainLineHeight,
                  },
                ]}
              >
                {gainLabel}
              </Text>
            ) : null}
          </>
        )}

        <View
          ref={trackRef}
          style={styles.trackBand}
          {...panResponder.panHandlers}
        >
          <View style={styles.track} />

          {trackWidth > 0 ? (
            <View style={[styles.thumb, { left: thumbLeft }]} />
          ) : null}

          {trackWidth > 0 && showMinus ? (
            <OrbitButton
              center={leftCompanionCenter}
              label="−"
              onPress={() => handleFineStep(-1)}
              disabled={inOwnEz}
            />
          ) : null}

          {trackWidth > 0 && showPlus ? (
            <OrbitButton
              center={rightCompanionCenter}
              label="+"
              onPress={() => handleFineStep(1)}
              disabled={inOppEz || (atOppOne && !allowTouchdown)}
            />
          ) : null}
        </View>

        {trackWidth > 0 ? (
          <FieldRuler trackWidth={trackWidth} height={rulerHeight} />
        ) : null}
      </View>

      <Text style={styles.fromSpot}>From {formatFieldPosition(ballSpot)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orbitShell: {
    position: "relative",
    minHeight:
      CHROME_HEIGHT + LAYOUT.minTapTarget + RULER_HEIGHT + 8,
    paddingTop: CHROME_HEIGHT,
    paddingBottom: RULER_HEIGHT,
  },
  gainLabel: {
    position: "absolute",
    top: ORBIT_SPOT_HEIGHT,
    width: GAIN_LABEL_HALF * 2,
    textAlign: "center",
    fontSize: 44,
    fontWeight: "900",
    color: LAYOUT.colors.navy,
    fontVariant: ["tabular-nums"],
    lineHeight: 48,
    includeFontPadding: false,
  },
  trackBand: {
    position: "relative",
    minHeight: FINE_BTN_SIZE + 12,
    justifyContent: "center",
    paddingVertical: 8,
  },
  track: {
    height: 14,
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
  },
  thumb: {
    position: "absolute",
    top: (FINE_BTN_SIZE + 12 - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: LAYOUT.colors.navy,
    borderWidth: 3,
    borderColor: "#fff",
    zIndex: 2,
  },
  fineBtn: {
    position: "absolute",
    top: (FINE_BTN_SIZE + 12 - FINE_BTN_SIZE) / 2,
    width: FINE_BTN_SIZE,
    height: FINE_BTN_SIZE,
    borderRadius: FINE_BTN_SIZE / 2,
    borderWidth: 2,
    borderColor: LAYOUT.colors.navy,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  chromeConfirm: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CHROME_HEIGHT,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: LAYOUT.colors.navy,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 4,
  },
  chromeConfirmLocked: {
    backgroundColor: LAYOUT.colors.navy,
    borderColor: LAYOUT.colors.navy,
  },
  chromeConfirmTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
  },
  chromeConfirmTitleLocked: {
    color: "#fff",
  },
  chromeConfirmGain: {
    fontSize: 28,
    fontWeight: "900",
    color: LAYOUT.colors.navy,
    fontVariant: ["tabular-nums"],
    lineHeight: 32,
    includeFontPadding: false,
  },
  chromeConfirmGainLocked: {
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.35,
  },
  fineBtnText: {
    fontSize: 32,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    lineHeight: 34,
  },
  spotLabel: {
    position: "absolute",
    top: 4,
    width: SPOT_LABEL_HALF * 2,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
  },
  fieldStrip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: RULER_HEIGHT,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a4d1c",
  },
  mowStripes: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  mowStripe: {
    flex: 1,
  },
  fieldEz: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.22)",
    zIndex: 1,
  },
  fieldGoalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: GOAL_LINE_W,
    backgroundColor: FIELD_GOAL,
    opacity: 0.95,
    zIndex: 2,
  },
  fieldYardLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: FIELD_LINE,
  },
  fieldYardLineFive: {
    width: 1,
    opacity: 0.55,
  },
  fieldHash: {
    position: "absolute",
    width: 2,
    height: 4,
    backgroundColor: FIELD_LINE,
    opacity: 0.75,
  },
  fieldHashBottom: {
    bottom: 2,
  },
  fieldNumberWrap: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: 3,
  },
  fieldNumberYardLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: FIELD_LINE_IN_NUM_W,
    backgroundColor: FIELD_LINE,
    opacity: 0.95,
  },
  fieldNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldArrowSlot: {
    width: FIELD_ARROW_SLOT,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldDigit: {
    width: FIELD_DIGIT_W,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: FIELD_LINE,
    letterSpacing: 0,
    includeFontPadding: false,
    backgroundColor: FIELD_GREEN,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  fieldDigitLineGap: {
    width: FIELD_DIGIT_LINE_GAP,
  },
  fieldArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    opacity: 0.95,
  },
  fieldArrowLeft: {
    borderRightWidth: 5,
    borderRightColor: FIELD_LINE,
    marginRight: 1,
  },
  fieldArrowRight: {
    borderLeftWidth: 5,
    borderLeftColor: FIELD_LINE,
    marginLeft: 1,
  },
  fromSpot: {
    fontSize: 12,
    color: LAYOUT.colors.placeholderText,
  },
});
