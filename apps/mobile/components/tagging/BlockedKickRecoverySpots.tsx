import { StyleSheet, Text, View } from "react-native";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  PUNT_RETURNED_DEFAULT,
  formatReturnEndDisplay,
  receivedRatioToYardLine,
  receivedYardLineToRatio,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
  type BlockedKickRecoverySpots,
} from "@/lib/tagging/blockedKickRecovery";
import { computeReturnYards } from "@/lib/tagging/kickoffReturn";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type BlockedKickRecoverySpotsProps = {
  spots: BlockedKickRecoverySpots;
  onChange: (spots: BlockedKickRecoverySpots) => void;
  defendingEnd?: DefendingEnd;
};

export function BlockedKickRecoverySpotsPanel({
  spots,
  onChange,
  defendingEnd = "left",
}: BlockedKickRecoverySpotsProps) {
  const isTd = spots.returnEnd.kind === "touchdown";
  const isSafety = spots.returnEnd.kind === "safety";
  const hideReturnTrack = isTd || isSafety;
  const returnedYardLine =
    spots.returnEnd.kind === "yardline"
      ? spots.returnEnd.yardLine
      : PUNT_RETURNED_DEFAULT;
  const returnYards = computeReturnYards(spots.recoveredAt, spots.returnEnd);

  return (
    <View style={styles.panel}>
      <FieldPositionSlider
        label="1 · Recovered at"
        value={spots.recoveredAt}
        onChange={(recoveredAt) => onChange({ ...spots, recoveredAt })}
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
                    returnEnd: {
                      kind: "yardline",
                      yardLine: PUNT_RETURNED_DEFAULT,
                    },
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
                    returnEnd: {
                      kind: "yardline",
                      yardLine: PUNT_RETURNED_DEFAULT,
                    },
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
