import { useCallback, useMemo, useRef, useState } from "react";
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
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  formatFieldPosition,
} from "@/lib/tagging/kickoffReturn";
import {
  canStepHudlYardLine,
  fieldPositionToSliderRatio,
  stepHudlYardLine,
} from "@/lib/tagging/fieldPosition100";
import { LAYOUT } from "@/lib/tagging/layoutConstants";
import {
  computeTackleGainLoss,
  formatTackleEndDisplay,
  isTackleLeftExtreme,
  isTackleRightExtreme,
  sliderYardLineForTackleEnd,
  TACKLE_SLIDER_OWN_ONE,
  TACKLE_SLIDER_OPP_ONE,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";
import type { YardLine } from "@huddlestat/shared";

type TackleFieldSliderProps = {
  ballSpot: YardLine;
  end: TackleEnd;
  onChange: (end: TackleEnd) => void;
};

const THUMB_TRAVEL_PAD = 16;
const ORBIT_GAIN_HEIGHT = 80;
const ORBIT_SPOT_HEIGHT = 44;
const RULER_HEIGHT = 36;
const FINE_BTN_SIZE = 56;
const THUMB_SIZE = FINE_BTN_SIZE;
/** Center-to-center distance from thumb to ± button */
const FINE_OFFSET = FINE_BTN_SIZE + 12;
const CONNECTOR_SIZE = FINE_OFFSET;
const GAIN_LABEL_HALF = 72;
const SPOT_LABEL_HALF = 72;
const RULER_DIGIT_W = 9;

/** 10-yard ruler: G · 10 · 20 · 30 · 40 · 50 · 40 · 30 · 20 · 10 · G */
const RULER_MARKS: { pos: number; label: string }[] = [
  { pos: 0, label: "G" },
  { pos: 10, label: "10" },
  { pos: 20, label: "20" },
  { pos: 30, label: "30" },
  { pos: 40, label: "40" },
  { pos: 50, label: "50" },
  { pos: 60, label: "40" },
  { pos: 70, label: "30" },
  { pos: 80, label: "20" },
  { pos: 90, label: "10" },
  { pos: 100, label: "G" },
];

function rulerMarkLeft(tickX: number, tickAnchorOffset: number): number {
  return tickX - tickAnchorOffset;
}

function FieldRuler({ trackWidth }: { trackWidth: number }) {
  const thumbTravel = Math.max(0, trackWidth - THUMB_TRAVEL_PAD);

  return (
    <View style={styles.ruler}>
      {RULER_MARKS.map(({ pos, label }) => {
        const ratio = fieldPositionToSliderRatio(pos);
        const tickX = ratio * thumbTravel;
        const isGoal = label === "G";
        const isMid = pos === 50;

        if (isGoal) {
          return (
            <View
              key={pos}
              style={[styles.rulerMarkRow, { left: rulerMarkLeft(tickX, 0) }]}
            >
              <View style={[styles.rulerTick, styles.rulerTickMajor]} />
              <Text style={styles.rulerLabelGoal}>G</Text>
            </View>
          );
        }

        const tens = label[0] ?? "";
        const ones = label[1] ?? "";
        const tickAnchor = RULER_DIGIT_W + 1;

        return (
          <View
            key={pos}
            style={[
              styles.rulerMarkRow,
              { left: rulerMarkLeft(tickX, tickAnchor) },
            ]}
          >
            <Text style={[styles.rulerDigit, isMid && styles.rulerLabelMid]}>
              {tens}
            </Text>
            <View
              style={[
                styles.rulerTick,
                isMid && styles.rulerTickMajor,
              ]}
            />
            <Text style={[styles.rulerDigit, isMid && styles.rulerLabelMid]}>
              {ones}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function TackleFieldSlider({
  ballSpot,
  end,
  onChange,
}: TackleFieldSliderProps) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  const sliderYardLine = sliderYardLineForTackleEnd(end, ballSpot);
  const gainLoss = computeTackleGainLoss(ballSpot, end);
  const spotMoved =
    end.kind !== "yardline" || gainLoss !== 0;
  const gainLabel =
    gainLoss > 0 ? `+${gainLoss}` : String(gainLoss);
  const spotLabel = formatTackleEndDisplay(end);
  const atLeft = end.kind === "yardline" && isTackleLeftExtreme(end.yardLine);
  const atRight = end.kind === "yardline" && isTackleRightExtreme(end.yardLine);

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

  const ratioFromPageX = useCallback((pageX: number): number | null => {
    const width = trackWidthRef.current;
    if (width <= THUMB_TRAVEL_PAD) return null;
    const localX = pageX - trackPageXRef.current;
    const usable = width - THUMB_TRAVEL_PAD;
    return Math.min(1, Math.max(0, localX / usable));
  }, []);

  const commitRatio = useCallback((ratio: number) => {
    onChange({
      kind: "yardline",
      yardLine: fieldRatioToYardLine(ratio),
    });
  }, [onChange]);

  const setFromPageX = useCallback(
    (pageX: number, commit: boolean) => {
      const ratio = ratioFromPageX(pageX);
      if (ratio === null) return;
      setDragRatio(ratio);
      if (commit) commitRatio(ratio);
    },
    [commitRatio, ratioFromPageX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
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

  const activeRatio =
    dragRatio ?? fieldYardLineToRatio(sliderYardLine);
  const thumbTravel = Math.max(0, trackWidth - THUMB_TRAVEL_PAD);
  const thumbLeft = trackWidth > 0 ? activeRatio * thumbTravel : 0;
  const thumbCenter = thumbLeft + THUMB_SIZE / 2;

  function handleFineStep(delta: 1 | -1) {
    if (end.kind !== "yardline") return;
    onChange({
      kind: "yardline",
      yardLine: stepHudlYardLine(end.yardLine, delta),
    });
  }

  function handleSafetyPress() {
    Alert.alert(
      "Safety?",
      "Confirm a safety on this play? If not, the ball stays at Own 1 (−1).",
      [
        {
          text: "Own 1 (−1)",
          onPress: () =>
            onChange({ kind: "yardline", yardLine: TACKLE_SLIDER_OWN_ONE }),
        },
        {
          text: "Confirm safety",
          style: "destructive",
          onPress: () => onChange({ kind: "safety" }),
        },
      ],
    );
  }

  function handleTouchdownPress() {
    Alert.alert(
      "Touchdown?",
      "Confirm touchdown on this play? If not, the ball stays at Opp 1 (+1).",
      [
        {
          text: "Opp 1 (+1)",
          onPress: () =>
            onChange({ kind: "yardline", yardLine: TACKLE_SLIDER_OPP_ONE }),
        },
        {
          text: "Confirm TD",
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
    const half = variant === "confirm" ? 52 : FINE_BTN_SIZE / 2;
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

  const showMinusFine =
    end.kind === "yardline" && spotMoved && !atLeft;
  const showPlusFine =
    end.kind === "yardline" && spotMoved && !atRight;

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
              { left: clampLeft(thumbCenter, GAIN_LABEL_HALF) },
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
          (showMinusFine ||
            showPlusFine ||
            (atLeft && end.kind === "yardline") ||
            (atRight && end.kind === "yardline")) ? (
            <>
              {showMinusFine || (atLeft && end.kind === "yardline") ? (
                <View
                  style={[
                    styles.connectorDisc,
                    {
                      left:
                        thumbCenter -
                        FINE_OFFSET / 2 -
                        CONNECTOR_SIZE / 2,
                    },
                  ]}
                  pointerEvents="none"
                />
              ) : null}
              {showPlusFine || (atRight && end.kind === "yardline") ? (
                <View
                  style={[
                    styles.connectorDisc,
                    {
                      left:
                        thumbCenter +
                        FINE_OFFSET / 2 -
                        CONNECTOR_SIZE / 2,
                    },
                  ]}
                  pointerEvents="none"
                />
              ) : null}
            </>
          ) : null}

          <View style={styles.track} />

          <View style={[styles.thumb, { left: thumbLeft }]} />

          {trackWidth > 0 && atLeft && end.kind === "yardline" ? (
            <OrbitButton
              center={thumbCenter - FINE_OFFSET}
              label="Confirm\nSafety"
              onPress={handleSafetyPress}
              variant="confirm"
            />
          ) : showMinusFine ? (
            <OrbitButton
              center={thumbCenter - FINE_OFFSET}
              label="−"
              onPress={() => handleFineStep(-1)}
              disabled={!canStepHudlYardLine(end.yardLine, -1)}
            />
          ) : null}

          {trackWidth > 0 && atRight && end.kind === "yardline" ? (
            <OrbitButton
              center={thumbCenter + FINE_OFFSET}
              label="Confirm\nTD"
              onPress={handleTouchdownPress}
              variant="confirm"
            />
          ) : showPlusFine ? (
            <OrbitButton
              center={thumbCenter + FINE_OFFSET}
              label="+"
              onPress={() => handleFineStep(1)}
              disabled={!canStepHudlYardLine(end.yardLine, 1)}
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
    marginLeft: -2,
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
    width: 104,
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
  ruler: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: RULER_HEIGHT,
  },
  rulerMarkRow: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 1,
  },
  rulerDigit: {
    width: RULER_DIGIT_W,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: LAYOUT.colors.placeholderText,
    fontVariant: ["tabular-nums"],
    lineHeight: 12,
    paddingBottom: 1,
  },
  rulerTick: {
    width: 2,
    height: 10,
    backgroundColor: LAYOUT.colors.placeholderText,
    opacity: 0.7,
    marginBottom: 1,
  },
  rulerTickMajor: {
    height: 14,
    backgroundColor: LAYOUT.colors.textMuted,
    opacity: 0.9,
  },
  rulerLabelGoal: {
    fontSize: 11,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    lineHeight: 12,
    paddingBottom: 1,
  },
  rulerLabelMid: {
    fontWeight: "800",
    color: LAYOUT.colors.textMuted,
  },
  fromSpot: {
    fontSize: 12,
    color: LAYOUT.colors.placeholderText,
  },
});
