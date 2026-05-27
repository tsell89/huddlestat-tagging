import { StyleSheet, Text, View } from "react-native";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  RETURNED_DEFAULT,
  caughtRatioToYardLine,
  caughtYardLineToRatio,
  computeReturnYards,
  formatReturnEndDisplay,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
  type KickoffReturnSpots,
} from "@/lib/tagging/kickoffReturn";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type KickoffReturnSpotsProps = {
  spots: KickoffReturnSpots;
  onChange: (spots: KickoffReturnSpots) => void;
  onTouchback: () => void;
};

export function KickoffReturnSpotsPanel({
  spots,
  onChange,
  onTouchback,
}: KickoffReturnSpotsProps) {
  const isTd = spots.returnEnd.kind === "touchdown";
  const isSafety = spots.returnEnd.kind === "safety";
  const hideReturnTrack = isTd || isSafety;
  const returnedYardLine =
    spots.returnEnd.kind === "yardline"
      ? spots.returnEnd.yardLine
      : RETURNED_DEFAULT;
  const returnYards = computeReturnYards(spots.caughtAt, spots.returnEnd);

  const safetyAction = {
    label: "Safety",
    selected: isSafety,
    onPress: () =>
      onChange(
        isSafety
          ? {
              ...spots,
              returnEnd: { kind: "yardline", yardLine: RETURNED_DEFAULT },
            }
          : { ...spots, returnEnd: { kind: "safety" } },
      ),
  };

  const touchdownAction = {
    label: "Touchdown",
    selected: isTd,
    onPress: () =>
      onChange(
        isTd
          ? {
              ...spots,
              returnEnd: { kind: "yardline", yardLine: RETURNED_DEFAULT },
            }
          : { ...spots, returnEnd: { kind: "touchdown" } },
      ),
  };

  return (
    <View style={styles.panel}>
      <FieldPositionSlider
        label="1 · Caught at"
        value={spots.caughtAt}
        onChange={(caughtAt) => onChange({ ...spots, caughtAt })}
        ratioForValue={caughtYardLineToRatio}
        valueForRatio={caughtRatioToYardLine}
        leftTick="−1"
        centerTick="50"
        rightTick="+1"
        leftAction={{
          label: "Touchback",
          onPress: onTouchback,
        }}
      />

      <FieldPositionSlider
        label="2 · Returned to"
        value={returnedYardLine}
        onChange={(yardLine) =>
          onChange({
            ...spots,
            returnEnd: { kind: "yardline", yardLine },
          })
        }
        ratioForValue={returnedYardLineToRatio}
        valueForRatio={returnedRatioToYardLine}
        leftTick="−1"
        centerTick="50"
        rightTick="+1"
        leftAction={safetyAction}
        rightAction={touchdownAction}
        hideTrack={hideReturnTrack}
        displayValue={formatReturnEndDisplay(spots.returnEnd)}
      />

      <View style={styles.computedRow}>
        <Text style={styles.computedLabel}>Return yards</Text>
        <Text style={styles.computedValue}>
          {returnYards > 0 ? `+${returnYards}` : returnYards}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 8,
  },
  computedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: LAYOUT.colors.navyLight,
  },
  computedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.navy,
    textTransform: "uppercase",
  },
  computedValue: {
    fontSize: 22,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    fontVariant: ["tabular-nums"],
  },
});
