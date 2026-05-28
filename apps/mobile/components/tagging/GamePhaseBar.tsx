import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { GamePhase } from "@huddlestat/shared";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

const PHASE_SEGMENTS: { phase: GamePhase; label: string }[] = [
  { phase: "Q1", label: "Q1" },
  { phase: "Q2", label: "Q2" },
  { phase: "Q3", label: "Q3" },
  { phase: "Q4", label: "Q4" },
  { phase: "HALFTIME", label: "HALF" },
  { phase: "OT", label: "OT" },
  { phase: "FINAL", label: "FINAL" },
];

type GamePhaseBarProps = {
  phase: GamePhase;
  onPhasePress: (phase: GamePhase) => void;
};

export function GamePhaseBar({ phase, onPhasePress }: GamePhaseBarProps) {
  const locked = phase === "FINAL";

  function handlePress(next: GamePhase) {
    if (locked || next === phase) return;
    if (next === "FINAL") {
      Alert.alert(
        "End game?",
        "Mark this game FINAL? You can still review plays in the log.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "End game", onPress: () => onPhasePress("FINAL") },
        ],
      );
      return;
    }
    onPhasePress(next);
  }

  return (
    <View style={styles.bar}>
      {PHASE_SEGMENTS.map(({ phase: p, label }) => {
        const active = phase === p;
        return (
          <Pressable
            key={p}
            style={[
              styles.segment,
              active && styles.segmentActive,
              locked && !active && styles.segmentLocked,
            ]}
            onPress={() => handlePress(p)}
            disabled={locked && !active}
          >
            <Text
              style={[
                styles.segmentText,
                active && styles.segmentTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: LAYOUT.padding.screen,
    paddingVertical: 6,
    backgroundColor: "#0f172a",
    borderBottomWidth: 1,
    borderBottomColor: LAYOUT.colors.sectionBorder,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    minHeight: 36,
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: LAYOUT.colors.navyLight,
  },
  segmentLocked: {
    opacity: 0.45,
  },
  segmentText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  segmentTextActive: {
    color: "#0f172a",
  },
});
