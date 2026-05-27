import { StyleSheet, Text, View } from "react-native";
import type { FumbleRecoverySide } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  formatReturnEndDisplay,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
  type FumbleRecoverySpots,
} from "@/lib/tagging/fumbleRecovery";
import { computeReturnYards } from "@/lib/tagging/kickoffReturn";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

const RECOVERY_SIDES = ["Offense", "Defense"] as const;

type FumbleRecoverySpotsProps = {
  spots: FumbleRecoverySpots;
  onChange: (spots: FumbleRecoverySpots) => void;
};

function sideToLabel(side: FumbleRecoverySide): (typeof RECOVERY_SIDES)[number] {
  return side === "offense" ? "Offense" : "Defense";
}

function labelToSide(label: (typeof RECOVERY_SIDES)[number]): FumbleRecoverySide {
  return label === "Offense" ? "offense" : "defense";
}

export function FumbleRecoverySpotsPanel({
  spots,
  onChange,
}: FumbleRecoverySpotsProps) {
  const isDefense = spots.recoveredBy === "defense";
  const isTd = spots.returnEnd.kind === "touchdown";
  const isSafety = spots.returnEnd.kind === "safety";
  const hideReturnTrack = isTd || isSafety;
  const returnedYardLine =
    spots.returnEnd.kind === "yardline"
      ? spots.returnEnd.yardLine
      : isDefense
        ? spots.recoveredAt
        : spots.fumbleAt;
  const returnYards = isDefense
    ? computeReturnYards(spots.recoveredAt, spots.returnEnd)
    : 0;

  return (
    <View style={styles.panel}>
      <FieldPositionSlider
        label="1 · Fumbled at"
        value={spots.fumbleAt}
        onChange={(fumbleAt) => {
          const next = { ...spots, fumbleAt };
          if (!isDefense) {
            next.recoveredAt = fumbleAt;
            next.returnEnd = { kind: "yardline", yardLine: fumbleAt };
          }
          onChange(next);
        }}
        ratioForValue={fieldYardLineToRatio}
        valueForRatio={fieldRatioToYardLine}
        leftTick="−1"
        centerTick="50"
        rightTick="+1"
      />

      <View style={styles.sideRow}>
        <Text style={styles.sideLabel}>Recovered by</Text>
        <TapGrid
          options={RECOVERY_SIDES}
          value={sideToLabel(spots.recoveredBy)}
          onChange={(label) => {
            const recoveredBy = labelToSide(label);
            if (recoveredBy === "offense") {
              onChange({
                ...spots,
                recoveredBy,
                recoveredAt: spots.fumbleAt,
                returnEnd: { kind: "yardline", yardLine: spots.fumbleAt },
              });
            } else {
              onChange({
                ...spots,
                recoveredBy,
                recoveredAt: spots.fumbleAt,
                returnEnd: { kind: "yardline", yardLine: spots.fumbleAt },
              });
            }
          }}
          columns={2}
          size="dense"
        />
      </View>

      {isDefense ? (
        <>
          <FieldPositionSlider
            label="2 · Recovered at"
            value={spots.recoveredAt}
            onChange={(recoveredAt) =>
              onChange({
                ...spots,
                recoveredAt,
                returnEnd: { kind: "yardline", yardLine: recoveredAt },
              })
            }
            ratioForValue={returnedYardLineToRatio}
            valueForRatio={returnedRatioToYardLine}
            leftTick="−1"
            centerTick="50"
            rightTick="+1"
          />

          <FieldPositionSlider
            label="3 · Returned to"
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
                          yardLine: spots.recoveredAt,
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
                          yardLine: spots.recoveredAt,
                        },
                      }
                    : { ...spots, returnEnd: { kind: "touchdown" } },
                ),
            }}
            hideTrack={hideReturnTrack}
            displayValue={formatReturnEndDisplay(spots.returnEnd)}
          />

          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>Return yards</Text>
            <Text style={styles.computedValue}>
              {returnYards > 0 ? `+${returnYards}` : returnYards}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8 },
  sideRow: { gap: 4 },
  sideLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
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
