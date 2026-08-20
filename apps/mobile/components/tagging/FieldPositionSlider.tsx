import { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { formatFieldPosition } from "@/lib/tagging/kickoffReturn";
import {
  mathRatioFromOriented,
  orientedRatio,
  type DefendingEnd,
} from "@/lib/tagging/defendingEnd";
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
  /** Offense-axis math ratio (0 = Own/−1, 1 = Opp/+1). */
  ratioForValue: (y: YardLine) => number;
  /** Offense-axis math ratio → Hudl yard line. */
  valueForRatio: (r: number) => YardLine;
  leftTick?: string;
  rightTick?: string;
  centerTick?: string;
  /** Own-side end action when defending left (e.g. Safety / Touchback). */
  leftAction?: SliderEndAction;
  /** Opp-side end action when defending left (e.g. Touchdown). */
  rightAction?: SliderEndAction;
  hideTrack?: boolean;
  displayValue?: string;
  /**
   * Device-relative end our team defends. When `"right"`, track and end
   * buttons mirror so Own sits on the device right.
   */
  defendingEnd?: DefendingEnd;
};

const END_BTN_WIDTH = 72;
const THUMB_INSET = 8;
const THUMB_TRAVEL_PAD = 16;

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
  defendingEnd = "left",
}: FieldPositionSliderProps) {
  const trackRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const onChangeRef = useRef(onChange);
  const valueForRatioRef = useRef(valueForRatio);
  const hideTrackRef = useRef(hideTrack);
  const defendingEndRef = useRef(defendingEnd);
  const draggingRef = useRef(false);
  const [trackWidth, setTrackWidth] = useState(0);
  /** Display-space ratio while dragging (device left = 0). */
  const [dragDisplayRatio, setDragDisplayRatio] = useState<number | null>(null);

  const mirrored = defendingEnd === "right";
  const displayLeftTick = mirrored ? rightTick : leftTick;
  const displayRightTick = mirrored ? leftTick : rightTick;
  const displayLeftAction = mirrored ? rightAction : leftAction;
  const displayRightAction = mirrored ? leftAction : rightAction;

  onChangeRef.current = onChange;
  valueForRatioRef.current = valueForRatio;
  hideTrackRef.current = hideTrack;
  defendingEndRef.current = defendingEnd;

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

  const applyDisplayRatio = useCallback((displayRatio: number, commit: boolean) => {
    setDragDisplayRatio(displayRatio);
    if (commit) {
      const mathRatio = mathRatioFromOriented(
        displayRatio,
        defendingEndRef.current,
      );
      onChangeRef.current(valueForRatioRef.current(mathRatio));
    }
  }, []);

  const setFromPageX = useCallback(
    (pageX: number, commit: boolean) => {
      const ratio = ratioFromPageX(pageX);
      if (ratio === null) return;
      applyDisplayRatio(ratio, commit);
    },
    [applyDisplayRatio, ratioFromPageX],
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
          setDragDisplayRatio(null);
        },
        onPanResponderTerminate: () => {
          draggingRef.current = false;
          setDragDisplayRatio(null);
        },
      }),
    [setFromPageX],
  );

  const activeDisplayRatio =
    dragDisplayRatio ?? orientedRatio(ratioForValue(value), defendingEnd);
  const thumbTravel = Math.max(0, trackWidth - THUMB_TRAVEL_PAD);
  const thumbLeft = trackWidth > 0 ? activeDisplayRatio * thumbTravel : 0;
  const valueLabel =
    displayValue ??
    (dragDisplayRatio !== null
      ? formatFieldPosition(
          valueForRatio(
            mathRatioFromOriented(dragDisplayRatio, defendingEnd),
          ),
        )
      : formatFieldPosition(value));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        {label ? <Text style={styles.label}>{label}</Text> : <View />}
        <Text style={styles.value}>{valueLabel}</Text>
      </View>
      <View style={styles.sliderRow}>
        <EndButton action={displayLeftAction} style={styles.endBtnLeft} />
        {hideTrack ? (
          <View style={styles.trackSpacer} />
        ) : (
          <View
            ref={trackRef}
            style={styles.trackColumn}
            onLayout={(e: LayoutChangeEvent) => {
              trackWidthRef.current = e.nativeEvent.layout.width;
              setTrackWidth(e.nativeEvent.layout.width);
              syncTrackMetrics();
            }}
            {...panResponder.panHandlers}
          >
            <View style={styles.track}>
              <View style={[styles.midMark, { left: "50%" }]} />
              <View style={[styles.thumb, { left: thumbLeft }]} />
            </View>
            <View style={styles.tickRow}>
              <Text style={styles.tick}>{displayLeftTick}</Text>
              <Text style={[styles.tick, styles.tickCenter]}>{centerTick}</Text>
              <Text style={styles.tick}>{displayRightTick}</Text>
            </View>
          </View>
        )}
        <EndButton action={displayRightAction} style={styles.endBtnRight} />
      </View>
    </View>
  );
}

function EndButton({
  action,
  style,
}: {
  action?: SliderEndAction;
  style?: StyleProp<ViewStyle>;
}) {
  if (!action) {
    return <View style={[styles.endBtnPlaceholder, style]} />;
  }
  return (
    <Pressable
      style={[
        styles.endBtn,
        style,
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
        numberOfLines={2}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
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
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  endBtnLeft: {},
  endBtnRight: {},
  endBtnPlaceholder: {
    width: END_BTN_WIDTH,
  },
  endBtn: {
    width: END_BTN_WIDTH,
    minHeight: LAYOUT.compactTapTarget,
    paddingHorizontal: 4,
    paddingVertical: 6,
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
    fontSize: 10,
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
  trackSpacer: {
    flex: 1,
    minHeight: LAYOUT.compactTapTarget,
  },
  track: {
    height: 8,
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
  },
  midMark: {
    position: "absolute",
    top: -2,
    width: 2,
    height: 12,
    marginLeft: -1,
    backgroundColor: LAYOUT.colors.textMuted,
    opacity: 0.5,
  },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: LAYOUT.colors.navy,
    borderWidth: 2,
    borderColor: "#fff",
    top: -7,
    marginLeft: -2,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
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
