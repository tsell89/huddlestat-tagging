import { Pressable, StyleSheet, Text, View } from "react-native";
import { FieldPositionSlider } from "@/components/tagging/FieldPositionSlider";
import {
  PENALTY_YARD_OPTIONS,
  autoFirstDownWhenAgainst,
  foulRatioToYardLine,
  foulYardLineToRatio,
  type PenaltyAgainst,
  type PenaltyDraftFields,
  type PenaltyYards,
} from "@/lib/tagging/penaltySpot";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type PenaltySpotPanelProps = {
  penalty: PenaltyDraftFields;
  onChange: (penalty: PenaltyDraftFields) => void;
  defendingEnd?: DefendingEnd;
};

export function PenaltySpotPanel({
  penalty,
  onChange,
  defendingEnd = "left",
}: PenaltySpotPanelProps) {
  function setYards(yards: PenaltyYards) {
    onChange({ ...penalty, yards });
  }
  function setAgainst(against: PenaltyAgainst) {
    // Defensive fouls commonly carry an automatic first down; clear when back to O.
    onChange({
      ...penalty,
      against,
      autoFirstDown: autoFirstDownWhenAgainst(against),
    });
  }

  return (
    <View style={styles.panel}>
      <FieldPositionSlider
        label="Spot of foul"
        value={penalty.foulSpot}
        onChange={(foulSpot) => onChange({ ...penalty, foulSpot })}
        ratioForValue={foulYardLineToRatio}
        valueForRatio={foulRatioToYardLine}
        leftTick="−1"
        centerTick="50"
        rightTick="+1"
        defendingEnd={defendingEnd}
      />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Yards</Text>
        <View style={styles.chips}>
          {PENALTY_YARD_OPTIONS.map((yd) => (
            <Pressable
              key={yd}
              onPress={() => setYards(yd)}
              style={[styles.chip, penalty.yards === yd && styles.chipOn]}
            >
              <Text
                style={[
                  styles.chipText,
                  penalty.yards === yd && styles.chipTextOn,
                ]}
              >
                {yd}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Against</Text>
        <View style={styles.chips}>
          {(
            [
              ["O", "Offense"],
              ["D", "Defense"],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setAgainst(value)}
              style={[
                styles.chip,
                styles.chipWide,
                penalty.against === value && styles.chipOn,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  penalty.against === value && styles.chipTextOn,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        onPress={() =>
          onChange({ ...penalty, autoFirstDown: !penalty.autoFirstDown })
        }
        style={[styles.afd, penalty.autoFirstDown && styles.afdOn]}
      >
        <Text
          style={[styles.afdText, penalty.autoFirstDown && styles.afdTextOn]}
        >
          Auto first down {penalty.autoFirstDown ? "ON" : "OFF"}
        </Text>
      </Pressable>

      <Text style={styles.note}>
        Replay same down (unless auto 1st). Half-distance near the goal line.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: {
    width: 64,
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.navy,
    textTransform: "uppercase",
  },
  chips: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    minWidth: 44,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.navyLight,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  chipWide: {
    flex: 1,
  },
  chipOn: {
    backgroundColor: LAYOUT.colors.navy,
    borderColor: LAYOUT.colors.navy,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: LAYOUT.colors.navy,
  },
  chipTextOn: {
    color: "#fff",
  },
  afd: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.navyLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  afdOn: {
    backgroundColor: "#eff6ff",
    borderColor: LAYOUT.colors.navy,
  },
  afdText: {
    fontSize: 13,
    fontWeight: "700",
    color: LAYOUT.colors.navy,
  },
  afdTextOn: {
    color: LAYOUT.colors.navy,
  },
  note: {
    fontSize: 12,
    color: LAYOUT.colors.textMuted,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },
});
