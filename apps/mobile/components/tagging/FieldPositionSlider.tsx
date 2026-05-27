import { useState } from "react";
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
};

const END_BTN_WIDTH = 72;

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
}: FieldPositionSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const ratio = ratioForValue(value);
  const thumbLeft = trackWidth > 0 ? ratio * (trackWidth - 16) : 0;
  const valueLabel = displayValue ?? formatFieldPosition(value);

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => !hideTrack,
    onMoveShouldSetPanResponder: () => !hideTrack,
    onPanResponderGrant: (evt) => setFromX(evt.nativeEvent.locationX),
    onPanResponderMove: (evt) => setFromX(evt.nativeEvent.locationX),
  });

  function setFromX(x: number) {
    if (trackWidth <= 0 || hideTrack) return;
    const r = Math.min(1, Math.max(0, (x - 8) / (trackWidth - 16)));
    onChange(valueForRatio(r));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        {label ? <Text style={styles.label}>{label}</Text> : <View />}
        <Text style={styles.value}>{valueLabel}</Text>
      </View>
      <View style={styles.sliderRow}>
        <EndButton action={leftAction} style={styles.endBtnLeft} />
        {hideTrack ? (
          <View style={styles.trackSpacer} />
        ) : (
          <View
            style={styles.trackColumn}
            onLayout={(e: LayoutChangeEvent) =>
              setTrackWidth(e.nativeEvent.layout.width)
            }
            {...pan.panHandlers}
          >
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
        )}
        <EndButton action={rightAction} style={styles.endBtnRight} />
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
