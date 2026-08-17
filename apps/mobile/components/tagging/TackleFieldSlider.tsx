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
  canTackleStepYardLine,
  computeTackleGainLoss,
  formatTackleEndDisplay,
  isAtOwnGoalLine,
  isAtOwnOne,
  isTackleRightExtreme,
  sliderYardLineForTackleEnd,
  tackleRatioToFieldPosition,
  tackleRatioToYardLine,
  tackleStepYardLine,
  tackleStripCenterX,
  tackleStripRatioFromCenterX,
  tackleYardLineToFieldPos,
  TACKLE_SLIDER_OPP_ONE,
  TACKLE_SLIDER_OWN_ONE,
  TACKLE_STRIP_END_ZONE_PX,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";
import { formatFieldPosition } from "@/lib/tagging/kickoffReturn";
import { LAYOUT } from "@/lib/tagging/layoutConstants";
import type { YardLine } from "@huddlestat/shared";

type TackleFieldSliderProps = {
  ballSpot: YardLine;
  end: TackleEnd;
  onChange: (end: TackleEnd) => void;
  allowTouchdown?: boolean;
};

const ORBIT_GAIN_HEIGHT = 80;
const ORBIT_SPOT_HEIGHT = 44;
const RULER_HEIGHT = 48;
const FINE_BTN_SIZE = 56;
const THUMB_SIZE = FINE_BTN_SIZE;
/** Center-to-center distance from thumb to ± button */
const FINE_OFFSET = FINE_BTN_SIZE + 12;
const CONFIRM_BTN_WIDTH = 104;
const ENDPOINT_BTN_GAP = 16;
const CONNECTOR_SIZE = FINE_OFFSET;
const GAIN_LABEL_HALF = 72;
const SPOT_LABEL_HALF = 72;

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

function FieldRuler({ trackWidth }: { trackWidth: number }) {
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
    <View style={styles.fieldStrip}>
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
}: TackleFieldSliderProps) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const outcomeConfirmedRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const sliderYardLine = sliderYardLineForTackleEnd(end, ballSpot);
  const gainLoss = computeTackleGainLoss(ballSpot, end);
  const spotMoved =
    end.kind !== "yardline" || gainLoss !== 0;
  const gainLabel =
    gainLoss > 0 ? `+${gainLoss}` : String(gainLoss);
  const spotLabel = formatTackleEndDisplay(end);
  const atOwnGoalLine =
    end.kind === "yardline" && isAtOwnGoalLine(end.yardLine);
  const atOwnOne = end.kind === "yardline" && isAtOwnOne(end.yardLine);
  const atOppOne =
    end.kind === "yardline" && isTackleRightExtreme(end.yardLine);
  const showConfirmSafety = atOwnGoalLine;
  const showConfirmTd =
    allowTouchdown && atOppOne && end.kind === "yardline";
  const confirmedSafety = end.kind === "safety";
  const confirmedTouchdown = end.kind === "touchdown";
  const outcomeConfirmed = confirmedSafety || confirmedTouchdown;
  onChangeRef.current = onChange;
  outcomeConfirmedRef.current = outcomeConfirmed;
  const showThumb = !showConfirmSafety && !showConfirmTd && !outcomeConfirmed;

  function clampLeft(center: number, halfWidth: number): number {
    if (trackWidth <= 0) return 0;
    return Math.min(
      trackWidth - halfWidth * 2,
      Math.max(0, center - halfWidth),
    );
  }

  /** Place ± beside the actual clamped confirm box so edge clamping cannot overlap them. */
  function endpointCompanionCenter(direction: 1 | -1): number {
    const confirmLeft = clampLeft(thumbCenter, CONFIRM_BTN_WIDTH / 2);
    const confirmRight = confirmLeft + CONFIRM_BTN_WIDTH;
    if (direction > 0) {
      return confirmRight + ENDPOINT_BTN_GAP + FINE_BTN_SIZE / 2;
    }
    return confirmLeft - ENDPOINT_BTN_GAP - FINE_BTN_SIZE / 2;
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
    const minX = TACKLE_STRIP_END_ZONE_PX;
    const maxX = width - TACKLE_STRIP_END_ZONE_PX;
    return Math.min(maxX, Math.max(minX, localX));
  }, []);

  const commitCenterX = useCallback(
    (centerX: number) => {
      const width = trackWidthRef.current;
      const ratio = tackleStripRatioFromCenterX(width, centerX);
      onChangeRef.current({
        kind: "yardline",
        yardLine: tackleRatioToYardLine(ratio),
      });
    },
    [],
  );

  const setFromPageX = useCallback(
    (pageX: number, commit: boolean) => {
      const centerX = centerXFromPageX(pageX);
      if (centerX === null) return;
      const width = trackWidthRef.current;
      setDragRatio(tackleStripRatioFromCenterX(width, centerX));
      if (commit) commitCenterX(centerX);
    },
    [centerXFromPageX, commitCenterX],
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
        onPanResponderRelease: () => setDragRatio(null),
        onPanResponderTerminate: () => setDragRatio(null),
      }),
    [setFromPageX],
  );

  const activeFieldPos =
    dragRatio !== null
      ? tackleRatioToFieldPosition(dragRatio)
      : tackleYardLineToFieldPos(sliderYardLine);
  const thumbCenter =
    trackWidth > 0
      ? fieldPosCenterX(trackWidth, activeFieldPos)
      : TACKLE_STRIP_END_ZONE_PX;
  const thumbLeft = thumbCenter - THUMB_SIZE / 2;
  const gainFontSize = Math.abs(gainLoss) >= 10 ? 34 : 44;
  const gainLineHeight = Math.abs(gainLoss) >= 10 ? 38 : 48;
  const gainTop = Math.abs(gainLoss) >= 10 ? 4 : 10;

  function handleFineStep(delta: 1 | -1) {
    if (end.kind !== "yardline") return;
    onChange({
      kind: "yardline",
      yardLine: tackleStepYardLine(end.yardLine, delta),
    });
  }

  function handleSafetyPress() {
    Alert.alert(
      "Confirm safety?",
      "Mark this play as a safety?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: () => onChange({ kind: "safety" }),
        },
      ],
    );
  }

  function handleTouchdownPress() {
    Alert.alert(
      "Confirm touchdown?",
      "Mark this play as a touchdown?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          onPress: () => onChange({ kind: "touchdown" }),
        },
      ],
    );
  }

  function OrbitButton({
    center,
    label,
    onPress,
    disabled,
    variant = "fine",
  }: {
    center: number;
    label: string;
    onPress: () => void;
    disabled?: boolean;
    variant?: "fine" | "confirm";
  }) {
    const half = variant === "confirm" ? CONFIRM_BTN_WIDTH / 2 : FINE_BTN_SIZE / 2;
    return (
      <Pressable
        style={[
          variant === "confirm" ? styles.confirmBtn : styles.fineBtn,
          { left: clampLeft(center, half) },
          disabled && styles.btnDisabled,
        ]}
        onPress={onPress}
        disabled={disabled}
        hitSlop={8}
      >
        <Text
          style={
            variant === "confirm" ? styles.confirmBtnText : styles.fineBtnText
          }
          numberOfLines={2}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  const showMinusToGoal = atOwnOne && spotMoved && end.kind === "yardline";
  const showPlusFromGoal = atOwnGoalLine && end.kind === "yardline";
  const showMinusFine =
    end.kind === "yardline" &&
    spotMoved &&
    !atOwnGoalLine &&
    !atOwnOne &&
    !atOppOne;
  const showPlusFine =
    end.kind === "yardline" &&
    spotMoved &&
    !atOwnGoalLine &&
    !atOppOne &&
    !atOwnOne;

  const showLeftOrbit =
    showMinusToGoal ||
    (atOppOne && showConfirmTd) ||
    (showMinusFine && !showConfirmSafety);
  const showRightOrbit =
    showPlusFromGoal ||
    (showPlusFine && !atOppOne && !showConfirmTd);
  const showConfirmedLeftOrbit = confirmedTouchdown;
  const showConfirmedRightOrbit = confirmedSafety;
  const leftCompanionCenter =
    showConfirmTd || confirmedTouchdown
      ? endpointCompanionCenter(-1)
      : thumbCenter - FINE_OFFSET;
  const rightCompanionCenter =
    showConfirmSafety || confirmedSafety
      ? endpointCompanionCenter(1)
      : thumbCenter + FINE_OFFSET;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Tackled at</Text>

      <View
        style={styles.orbitShell}
        onLayout={(e: LayoutChangeEvent) => {
          trackWidthRef.current = e.nativeEvent.layout.width;
          setTrackWidth(e.nativeEvent.layout.width);
          syncTrackMetrics();
        }}
      >
        {spotMoved && trackWidth > 0 ? (
          <Text
            style={[
              styles.gainLabel,
              {
                left: clampLeft(thumbCenter, GAIN_LABEL_HALF),
                top: gainTop,
                fontSize: gainFontSize,
                lineHeight: gainLineHeight,
              },
            ]}
          >
            {gainLabel}
          </Text>
        ) : null}

        <View
          ref={trackRef}
          style={styles.trackBand}
          {...panResponder.panHandlers}
        >
          {trackWidth > 0 &&
          (showLeftOrbit ||
            showRightOrbit ||
            showConfirmedLeftOrbit ||
            showConfirmedRightOrbit) ? (
            <>
              {showLeftOrbit || showConfirmedLeftOrbit ? (
                <View
                  style={[
                    styles.connectorDisc,
                    {
                      left:
                        (thumbCenter + leftCompanionCenter) / 2 -
                        CONNECTOR_SIZE / 2,
                    },
                  ]}
                  pointerEvents="none"
                />
              ) : null}
              {showRightOrbit || showConfirmedRightOrbit ? (
                <View
                  style={[
                    styles.connectorDisc,
                    {
                      left:
                        (thumbCenter + rightCompanionCenter) / 2 -
                        CONNECTOR_SIZE / 2,
                    },
                  ]}
                  pointerEvents="none"
                />
              ) : null}
            </>
          ) : null}

          <View style={styles.track} />

          {showThumb ? (
            <View style={[styles.thumb, { left: thumbLeft }]} />
          ) : null}

          {trackWidth > 0 && confirmedSafety ? (
            <OrbitButton
              center={thumbCenter}
              label="Safety ✓"
              onPress={() => undefined}
              variant="confirm"
            />
          ) : trackWidth > 0 && confirmedTouchdown ? (
            <OrbitButton
              center={thumbCenter}
              label="Touchdown ✓"
              onPress={() => undefined}
              variant="confirm"
            />
          ) : trackWidth > 0 && showConfirmSafety ? (
            <OrbitButton
              center={thumbCenter}
              label="Confirm\nSafety"
              onPress={handleSafetyPress}
              variant="confirm"
            />
          ) : showMinusToGoal || (atOppOne && showConfirmTd) ? (
            <OrbitButton
              center={leftCompanionCenter}
              label="−"
              onPress={() => handleFineStep(-1)}
              disabled={
                end.kind !== "yardline" ||
                !canTackleStepYardLine(end.yardLine, -1)
              }
            />
          ) : showMinusFine ? (
            <OrbitButton
              center={leftCompanionCenter}
              label="−"
              onPress={() => handleFineStep(-1)}
              disabled={!canTackleStepYardLine(end.yardLine, -1)}
            />
          ) : null}

          {confirmedTouchdown ? (
            <OrbitButton
              center={leftCompanionCenter}
              label="−"
              onPress={() =>
                onChange({
                  kind: "yardline",
                  yardLine: TACKLE_SLIDER_OPP_ONE,
                })
              }
            />
          ) : trackWidth > 0 && showConfirmTd ? (
            <OrbitButton
              center={thumbCenter}
              label="Confirm\nTD"
              onPress={handleTouchdownPress}
              variant="confirm"
            />
          ) : confirmedSafety ? (
            <OrbitButton
              center={rightCompanionCenter}
              label="+"
              onPress={() =>
                onChange({
                  kind: "yardline",
                  yardLine: TACKLE_SLIDER_OWN_ONE,
                })
              }
            />
          ) : showPlusFromGoal ? (
            <OrbitButton
              center={rightCompanionCenter}
              label="+"
              onPress={() => handleFineStep(1)}
              disabled={!canTackleStepYardLine(end.yardLine, 1)}
            />
          ) : showPlusFine ? (
            <OrbitButton
              center={rightCompanionCenter}
              label="+"
              onPress={() => handleFineStep(1)}
              disabled={!canTackleStepYardLine(end.yardLine, 1)}
            />
          ) : null}
        </View>

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

        {trackWidth > 0 ? <FieldRuler trackWidth={trackWidth} /> : null}
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
      ORBIT_GAIN_HEIGHT + LAYOUT.minTapTarget + ORBIT_SPOT_HEIGHT + RULER_HEIGHT + 8,
    paddingTop: ORBIT_GAIN_HEIGHT,
    paddingBottom: ORBIT_SPOT_HEIGHT + RULER_HEIGHT,
  },
  gainLabel: {
    position: "absolute",
    top: 10,
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
  connectorDisc: {
    position: "absolute",
    top: (FINE_BTN_SIZE + 12 - CONNECTOR_SIZE) / 2,
    width: CONNECTOR_SIZE,
    height: CONNECTOR_SIZE,
    borderRadius: CONNECTOR_SIZE / 2,
    backgroundColor: "rgba(147, 197, 253, 0.35)",
    borderWidth: 2,
    borderColor: LAYOUT.colors.navyLight,
    zIndex: 1,
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
  confirmBtn: {
    position: "absolute",
    top: (FINE_BTN_SIZE + 12 - LAYOUT.minTapTarget) / 2,
    width: CONFIRM_BTN_WIDTH,
    minHeight: LAYOUT.minTapTarget,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LAYOUT.colors.navy,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    zIndex: 3,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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
  confirmBtnText: {
    fontSize: 11,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    textAlign: "center",
    lineHeight: 14,
  },
  spotLabel: {
    position: "absolute",
    bottom: RULER_HEIGHT + 4,
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
