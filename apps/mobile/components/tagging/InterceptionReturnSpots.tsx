import { StyleSheet, Text, View } from "react-native";
import { TapGrid } from "@/components/tagging/TapGrid";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  computeReturnYards,
  formatReturnEndDisplay,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
  type KickoffReturnSpots,
} from "@/lib/tagging/kickoffReturn";
import {
  receivedRatioToYardLine,
  receivedYardLineToRatio,
} from "@/lib/tagging/puntReturn";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type InterceptionReturnSpotsProps = {
  spots: KickoffReturnSpots;
  onChange: (spots: KickoffReturnSpots) => void;
  defendingEnd?: DefendingEnd;
};

export function InterceptionReturnSpotsPanel({
  spots,
  onChange,
  defendingEnd = "left",
}: InterceptionReturnSpotsProps) {
  const isTd = spots.returnEnd.kind === "touchdown";
  const isSafety = spots.returnEnd.kind === "safety";
  const hideReturnTrack = isTd || isSafety;
  const returnedYardLine =
    spots.returnEnd.kind === "yardline"
      ? spots.returnEnd.yardLine
      : spots.caughtAt;
  const returnYards = computeReturnYards(spots.caughtAt, spots.returnEnd);

  return (
    <View style={styles.panel}>
      <FieldPositionSlider
        label="1 · Caught at"
        value={spots.caughtAt}
        onChange={(caughtAt) => onChange({ ...spots, caughtAt })}
        ratioForValue={receivedYardLineToRatio}
        valueForRatio={receivedRatioToYardLine}
        leftTick="−1"
        centerTick="50"
        rightTick="+1"
        defendingEnd={defendingEnd}
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
        leftAction={{
          label: "Safety",
          selected: isSafety,
          onPress: () =>
            onChange(
              isSafety
                ? {
                    ...spots,
                    returnEnd: { kind: "yardline", yardLine: spots.caughtAt },
                  }
                : { ...spots, returnEnd: { kind: "safety" } },
            ),
        }}
        rightAction={{
          label: "Touchdown",
          selected: isTd,
          onPress: () =>
            onChange(
              isTd
                ? {
                    ...spots,
                    returnEnd: { kind: "yardline", yardLine: spots.caughtAt },
                  }
                : { ...spots, returnEnd: { kind: "touchdown" } },
            ),
        }}
        hideTrack={hideReturnTrack}
        displayValue={formatReturnEndDisplay(spots.returnEnd)}
        defendingEnd={defendingEnd}
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
  panel: { gap: 8 },
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
