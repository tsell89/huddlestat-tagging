import { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { formatFieldPosition } from "@/lib/tagging/kickoffReturn";
import type { YardLine } from "@huddlestat/shared";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

export type SliderEndAction = {
  label: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
};

type FieldPositionSliderProps = {
  label: string;
  value: YardLine;
  onChange: (value: YardLine) => void;
  ratioForValue: (y: YardLine) => number;
  valueForRatio: (r: number) => YardLine;
  leftTick?: string;
  rightTick?: string;
  centerTick?: string;
  leftAction?: SliderEndAction;
  rightAction?: SliderEndAction;
  hideTrack?: boolean;
  displayValue?: string;
  /** Shown above the track once the spot moves (e.g. gain/loss). Does not move the slider. */
  thumbOverlay?: { value: string } | null;
  /** ±1 yard nudge on the yard line — same visibility rules as thumbOverlay. */
  fineAdjust?: {
    onStep: (delta: 1 | -1) => void;
    canStepMinus: boolean;
    canStepPlus: boolean;
  } | null;
};

const THUMB_INSET = 8;
const THUMB_TRAVEL_PAD = 16;
const THUMB_SIZE = 32;
const OVERLAY_VALUE_HALF = 40;
const FINE_BTN_SIZE = 40;

export function FieldPositionSlider({
  label,
  value,
  onChange,
  ratioForValue,
  valueForRatio,
  leftTick = "−1",
  rightTick = "+1",
  centerTick = "50",
  leftAction,
  rightAction,
  hideTrack = false,
  displayValue,
  thumbOverlay,
  fineAdjust,
}: FieldPositionSliderProps) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const valueForRatioRef = useRef(valueForRatio);
  const hideTrackRef = useRef(hideTrack);
  const draggingRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  onChangeRef.current = onChange;
  valueForRatioRef.current = valueForRatio;
  hideTrackRef.current = hideTrack;

  const syncTrackMetrics = useCallback(() => {
    trackRef.current?.measureInWindow((pageX, _pageY, width) => {
      trackPageXRef.current = pageX;
      trackWidthRef.current = width;
      setTrackWidth(width);
    });
  }, []);

  const ratioFromPageX = useCallback((pageX: number): number | null => {
    const width = trackWidthRef.current;
    if (width <= THUMB_TRAVEL_PAD || hideTrackRef.current) return null;
    const localX = pageX - trackPageXRef.current;
    const usable = width - THUMB_TRAVEL_PAD;
    return Math.min(1, Math.max(0, (localX - THUMB_INSET) / usable));
  }, []);

  const applyRatio = useCallback((ratio: number, commit: boolean) => {
    setDragRatio(ratio);
    if (commit) {
      onChangeRef.current(valueForRatioRef.current(ratio));
    }
  }, []);

  const setFromPageX = useCallback(
    (pageX: number, commit: boolean) => {
      const ratio = ratioFromPageX(pageX);
      if (ratio === null) return;
      applyRatio(ratio, commit);
    },
    [applyRatio, ratioFromPageX],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !hideTrackRef.current,
        onMoveShouldSetPanResponder: () => !hideTrackRef.current,
        onPanResponderGrant: (evt) => {
          draggingRef.current = true;
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
        onPanResponderRelease: () => {
          draggingRef.current = false;
          setDragRatio(null);
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false;
          setDragRatio(null);
        },
      }),
    [setFromPageX, syncTrackMetrics],
  );

  const activeRatio = dragRatio ?? ratioForValue(value);
  const thumbTravel = Math.max(0, trackWidth - THUMB_TRAVEL_PAD);
  const thumbLeft = trackWidth > 0 ? activeRatio * thumbTravel : 0;
  const valueLabel =
    displayValue ??
    (dragRatio !== null
      ? formatFieldPosition(valueForRatio(dragRatio))
      : formatFieldPosition(value));

  const thumbCenter = thumbLeft + THUMB_SIZE / 2 - 2;
  const showChrome = !!(thumbOverlay || fineAdjust);

  function FineBtn({
    delta,
    disabled,
  }: {
    delta: 1 | -1;
    disabled: boolean;
  }) {
    if (!fineAdjust) return null;
    return (
      <Pressable
        style={[styles.fineBtn, disabled && styles.fineBtnDisabled]}
        onPress={() => fineAdjust.onStep(delta)}
        disabled={disabled}
      >
        <Text style={styles.fineBtnText}>{delta === -1 ? "−" : "+"}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        {label ? <Text style={styles.label}>{label}</Text> : <View />}
        <Text style={styles.value}>{valueLabel}</Text>
      </View>
      {hideTrack ? null : (
        <View
          style={[styles.trackColumn, showChrome && styles.trackColumnExpanded]}
        >
          <View style={styles.trackLineRow}>
            {showChrome && fineAdjust ? (
              <FineBtn delta={-1} disabled={!fineAdjust.canStepMinus} />
            ) : null}

            <View
              ref={trackRef}
              style={[
                styles.trackHitArea,
                showChrome && styles.trackHitAreaExpanded,
              ]}
              onLayout={(e: LayoutChangeEvent) => {
                trackWidthRef.current = e.nativeEvent.layout.width;
                setTrackWidth(e.nativeEvent.layout.width);
                syncTrackMetrics();
              }}
              {...panResponder.panHandlers}
            >
              {showChrome && thumbOverlay && trackWidth > 0 ? (
                <View style={styles.overlayBand} pointerEvents="none">
                  <Text
                    style={[
                      styles.overlayValue,
                      { left: thumbCenter - OVERLAY_VALUE_HALF },
                    ]}
                  >
                    {thumbOverlay.value}
                  </Text>
                </View>
              ) : null}
              <View style={styles.track}>
                <View style={[styles.midMark, { left: "50%" }]} />
                <View style={[styles.thumb, { left: thumbLeft }]} />
              </View>
              <View style={styles.tickRow}>
                <Text style={styles.tick}>{leftTick}</Text>
                <Text style={[styles.tick, styles.tickCenter]}>{centerTick}</Text>
                <Text style={styles.tick}>{rightTick}</Text>
              </View>
            </View>

            {showChrome && fineAdjust ? (
              <FineBtn delta={1} disabled={!fineAdjust.canStepPlus} />
            ) : null}
          </View>
        </View>
      )}
      {leftAction && rightAction ? (
        <View style={styles.endActionRow}>
          <EndButton action={leftAction} />
          <EndButton action={rightAction} />
        </View>
      ) : leftAction || rightAction ? (
        <View style={styles.endActionRow}>
          <EndButton action={(leftAction ?? rightAction)!} />
        </View>
      ) : null}
    </View>
  );
}

function EndButton({ action }: { action: SliderEndAction }) {
  return (
    <Pressable
      style={[
        styles.endBtn,
        action.selected && styles.endBtnSelected,
        action.disabled && styles.endBtnDisabled,
      ]}
      onPress={action.onPress}
      disabled={action.disabled}
    >
      <Text
        style={[
          styles.endBtnText,
          action.selected && styles.endBtnTextSelected,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
  },
  endActionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  endBtn: {
    flex: 1,
    minHeight: LAYOUT.minTapTarget,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LAYOUT.colors.sectionBorder,
    backgroundColor: LAYOUT.colors.placeholderBg,
    justifyContent: "center",
    alignItems: "center",
  },
  endBtnSelected: {
    borderColor: LAYOUT.colors.navy,
    backgroundColor: LAYOUT.colors.navy,
  },
  endBtnDisabled: {
    opacity: 0.35,
  },
  endBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: LAYOUT.colors.textPrimary,
    textAlign: "center",
  },
  endBtnTextSelected: {
    color: "#fff",
  },
  trackColumn: {
    flex: 1,
    paddingVertical: 4,
    minHeight: LAYOUT.compactTapTarget,
    justifyContent: "center",
  },
  trackColumnExpanded: {
    paddingVertical: 0,
    minHeight: LAYOUT.minTapTarget + 36,
    gap: 2,
  },
  overlayBand: {
    height: 40,
    position: "relative",
    marginBottom: 2,
  },
  overlayValue: {
    position: "absolute",
    top: 0,
    width: OVERLAY_VALUE_HALF * 2,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "900",
    color: LAYOUT.colors.navy,
    fontVariant: ["tabular-nums"],
    lineHeight: 36,
  },
  trackLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fineBtn: {
    width: FINE_BTN_SIZE,
    height: FINE_BTN_SIZE,
    borderRadius: FINE_BTN_SIZE / 2,
    borderWidth: 2,
    borderColor: LAYOUT.colors.navy,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fineBtnDisabled: {
    opacity: 0.35,
  },
  fineBtnText: {
    fontSize: 22,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    lineHeight: 24,
  },
  trackHitArea: {
    flex: 1,
    paddingVertical: 6,
    justifyContent: "center",
  },
  trackHitAreaExpanded: {
    paddingVertical: 14,
    minHeight: LAYOUT.minTapTarget,
  },
  track: {
    height: 12,
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
  },
  midMark: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 18,
    marginLeft: -1,
    backgroundColor: LAYOUT.colors.textMuted,
    opacity: 0.5,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: LAYOUT.colors.navy,
    borderWidth: 3,
    borderColor: "#fff",
    top: -(THUMB_SIZE / 2 - 6),
    marginLeft: -2,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  tick: {
    fontSize: 10,
    fontWeight: "600",
    color: LAYOUT.colors.placeholderText,
  },
  tickCenter: {
    color: LAYOUT.colors.textMuted,
    fontWeight: "800",
  },
});
