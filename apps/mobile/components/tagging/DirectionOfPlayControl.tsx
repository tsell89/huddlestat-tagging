import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ballGoingEnd,
  formatDefendingEndLabel,
  type DefendingEnd,
} from "@/lib/tagging/defendingEnd";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type DirectionOfPlayControlProps = {
  defendingEnd: DefendingEnd;
  onChange: (end: DefendingEnd) => void;
  /** Our team short label (e.g. team code). */
  usLabel: string;
  /** Opponent short label. */
  themLabel: string;
  /**
   * True when the ball is advancing toward the opponent end this possession
   * (our offense / our kickoff return). False when advancing toward our end
   * (our defense / they return our kick).
   */
  advancingTowardOpponent: boolean;
  /** Dense two-choice grid only (no field diagram). */
  compact?: boolean;
};

/**
 * Defend-left / defend-right control with both teams on sides of the LOS
 * and an arrow in the direction the ball is going.
 */
export function DirectionOfPlayControl({
  defendingEnd,
  onChange,
  usLabel,
  themLabel,
  advancingTowardOpponent,
  compact = false,
}: DirectionOfPlayControlProps) {
  const going = ballGoingEnd(defendingEnd, advancingTowardOpponent);
  const arrowLeft = going === "left";

  // Physical layout: our defending end is where we sit; opponent opposite.
  // Defend left → Us on left of LOS, Them on right.
  // Defend right → Them on left of LOS, Us on right.
  const leftTeam = defendingEnd === "left" ? usLabel : themLabel;
  const rightTeam = defendingEnd === "left" ? themLabel : usLabel;
  const leftIsUs = defendingEnd === "left";

  return (
    <View style={styles.wrap}>
      {!compact ? (
        <View style={styles.fieldRow}>
          {arrowLeft ? <Text style={styles.arrow}>←</Text> : <View style={styles.arrowSpacer} />}
          <View style={[styles.teamBox, leftIsUs && styles.teamBoxUs]}>
            <Text style={[styles.teamText, leftIsUs && styles.teamTextUs]} numberOfLines={1}>
              {leftTeam}
            </Text>
          </View>
          <View style={styles.los}>
            <Text style={styles.losText}>LOS</Text>
          </View>
          <View style={[styles.teamBox, !leftIsUs && styles.teamBoxUs]}>
            <Text style={[styles.teamText, !leftIsUs && styles.teamTextUs]} numberOfLines={1}>
              {rightTeam}
            </Text>
          </View>
          {!arrowLeft ? <Text style={styles.arrow}>→</Text> : <View style={styles.arrowSpacer} />}
        </View>
      ) : null}

      <View style={styles.choiceRow}>
        {(["left", "right"] as const).map((end) => {
          const selected = defendingEnd === end;
          return (
            <Pressable
              key={end}
              style={[styles.choice, selected && styles.choiceSelected]}
              onPress={() => onChange(end)}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {formatDefendingEndLabel(end)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Compact header chip showing current defending end + ball arrow. */
export function DirectionOfPlayChip({
  defendingEnd,
  advancingTowardOpponent,
  onPress,
}: {
  defendingEnd: DefendingEnd;
  advancingTowardOpponent: boolean;
  onPress?: () => void;
}) {
  const going = ballGoingEnd(defendingEnd, advancingTowardOpponent);
  const label =
    defendingEnd === "left" ? "Defend L" : "Defend R";
  const arrow = going === "left" ? "←" : "→";

  return (
    <Pressable
      style={styles.chip}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
    >
      <Text style={styles.chipText}>
        {arrow} {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  arrow: {
    fontSize: 22,
    fontWeight: "800",
    color: LAYOUT.colors.navy,
    width: 28,
    textAlign: "center",
  },
  arrowSpacer: {
    width: 28,
  },
  teamBox: {
    flex: 1,
    minHeight: LAYOUT.compactTapTarget,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LAYOUT.colors.sectionBorder,
    backgroundColor: LAYOUT.colors.placeholderBg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  teamBoxUs: {
    borderColor: LAYOUT.colors.navy,
    backgroundColor: "#eff6ff",
  },
  teamText: {
    fontSize: 14,
    fontWeight: "700",
    color: LAYOUT.colors.textPrimary,
  },
  teamTextUs: {
    color: LAYOUT.colors.navy,
  },
  los: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: LAYOUT.colors.navy,
  },
  losText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  choiceRow: {
    flexDirection: "row",
    gap: 6,
  },
  choice: {
    flex: 1,
    minHeight: LAYOUT.compactTapTarget,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LAYOUT.colors.sectionBorder,
    backgroundColor: LAYOUT.colors.placeholderBg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  choiceSelected: {
    borderColor: LAYOUT.colors.navy,
    backgroundColor: LAYOUT.colors.navy,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: "700",
    color: LAYOUT.colors.textPrimary,
  },
  choiceTextSelected: {
    color: "#fff",
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  chipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
