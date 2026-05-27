import { useMemo } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useState } from "react";
import { yardsSliderRange } from "@/lib/tagging/playConfig";
import type { YardLine } from "@huddlestat/shared";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type YardsSliderProps = {
  yardLine: YardLine;
  value: number;
  onChange: (value: number) => void;
  label?: string;
};

export function YardsSlider({
  yardLine,
  value,
  onChange,
  label = "Yards",
}: YardsSliderProps) {
  const { min, max } = useMemo(() => yardsSliderRange(yardLine), [yardLine]);
  const [trackWidth, setTrackWidth] = useState(0);

  const clamped = Math.min(max, Math.max(min, value));
  const range = max - min || 1;
  const ratio = (clamped - min) / range;
  const thumbLeft = trackWidth > 0 ? ratio * (trackWidth - 20) : 0;

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => setFromX(evt.nativeEvent.locationX),
    onPanResponderMove: (evt) => setFromX(evt.nativeEvent.locationX),
  });

  function setFromX(x: number) {
    if (trackWidth <= 0) return;
    const r = Math.min(1, Math.max(0, (x - 10) / (trackWidth - 20)));
    const raw = min + r * range;
    onChange(Math.round(raw));
  }

  function onTrackLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {clamped > 0 ? `+${clamped}` : clamped}
        </Text>
      </View>
      <Text style={styles.hint}>
        From {yardLine < 0 ? "own" : "opp"} {Math.abs(yardLine)} · range {min} to +{max}
      </Text>
      <View
        style={styles.trackWrap}
        onLayout={onTrackLayout}
        {...pan.panHandlers}
      >
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
          <View style={[styles.thumb, { left: thumbLeft }]} />
        </View>
        <View style={styles.tickRow}>
          <Text style={styles.tick}>{min}</Text>
          <Text style={styles.tick}>0</Text>
          <Text style={styles.tick}>+{max}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    fontVariant: ["tabular-nums"],
  },
  hint: {
    fontSize: 11,
    color: LAYOUT.colors.placeholderText,
  },
  trackWrap: {
    paddingVertical: 8,
    minHeight: LAYOUT.minTapTarget,
    justifyContent: "center",
  },
  track: {
    height: 12,
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    overflow: "visible",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: LAYOUT.colors.navyLight,
    borderRadius: 6,
    opacity: 0.5,
  },
  thumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: LAYOUT.colors.navy,
    borderWidth: 2,
    borderColor: "#fff",
    top: -8,
    marginLeft: -4,
  },
  tickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  tick: {
    fontSize: 11,
    color: LAYOUT.colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
});
