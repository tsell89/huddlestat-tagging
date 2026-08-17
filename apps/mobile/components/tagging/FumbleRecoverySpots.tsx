import { StyleSheet, Text, View } from "react-native";
import { ODK, type FumbleRecoverySide, type PlaylistData } from "@huddlestat/shared";
import { TapGrid } from "@/components/tagging/TapGrid";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import { TackleFieldSlider } from "@/components/tagging/TackleFieldSlider";
import {
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  fumbleReturnEndToTackleEnd,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
  tackleEndToFumbleReturnEnd,
  type FumbleRecoverySpots,
} from "@/lib/tagging/fumbleRecovery";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

const RECOVERY_TEAMS = ["Us", "Them"] as const;

type FumbleRecoverySpotsProps = {
  spots: FumbleRecoverySpots;
  onChange: (spots: FumbleRecoverySpots) => void;
  odk?: PlaylistData["odk"];
};

function usRecoverySide(odk: PlaylistData["odk"]): FumbleRecoverySide {
  return odk === ODK.Defense ? "defense" : "offense";
}

export function FumbleRecoverySpotsPanel({
  spots,
  onChange,
  odk = ODK.Offense,
}: FumbleRecoverySpotsProps) {
  const isDefense = spots.recoveredBy === "defense";
  const usSide = usRecoverySide(odk);
  const recoveredTeam = spots.recoveredBy === usSide ? "Us" : "Them";

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
          options={[...RECOVERY_TEAMS]}
          value={recoveredTeam}
          onChange={(label) => {
            const recoveredBy: FumbleRecoverySide =
              label === "Us" ? usSide : usSide === "offense" ? "defense" : "offense";
            onChange({
              ...spots,
              recoveredBy,
              recoveredAt: spots.fumbleAt,
              returnEnd: { kind: "yardline", yardLine: spots.fumbleAt },
            });
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
            onChange={(recoveredAt) => {
              const returnFollowsRecover =
                spots.returnEnd.kind === "yardline" &&
                spots.returnEnd.yardLine === spots.recoveredAt;
              onChange({
                ...spots,
                recoveredAt,
                returnEnd: returnFollowsRecover
                  ? { kind: "yardline", yardLine: recoveredAt }
                  : spots.returnEnd,
              });
            }}
            ratioForValue={returnedYardLineToRatio}
            valueForRatio={returnedRatioToYardLine}
            leftTick="−1"
            centerTick="50"
            rightTick="+1"
          />

          <TackleFieldSlider
            ballSpot={spots.recoveredAt}
            end={fumbleReturnEndToTackleEnd(spots.returnEnd)}
            onChange={(end) =>
              onChange({
                ...spots,
                returnEnd: tackleEndToFumbleReturnEnd(end),
              })
            }
            sectionLabel="3 · Returned to"
            showGain={false}
            compact
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 6 },
  sideRow: { gap: 4 },
  sideLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
  },
});
