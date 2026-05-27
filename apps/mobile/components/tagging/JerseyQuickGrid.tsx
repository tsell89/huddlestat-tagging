import { Pressable, StyleSheet, Text, View } from "react-native";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

/** Compact jersey grid for one-screen kickoff tagging (Gate 3 replaces with roster) */
const DEMO_JERSEYS = [
  "1", "2", "3", "4", "5", "6", "7", "8",
  "9", "10", "11", "12", "13", "14", "15", "16",
  "20", "21", "22", "23", "24", "25", "30", "33",
] as const;

type JerseyQuickGridProps = {
  selectedJersey: string;
  onSelectJersey: (jersey: string) => void;
  slotLabel: string;
};

export function JerseyQuickGrid({
  selectedJersey,
  onSelectJersey,
  slotLabel,
}: JerseyQuickGridProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Jersey — {slotLabel}</Text>
      <View style={styles.grid}>
        {DEMO_JERSEYS.map((num) => {
          const selected = selectedJersey === num;
          return (
            <Pressable
              key={num}
              style={[styles.cell, selected && styles.cellSelected]}
              onPress={() => onSelectJersey(num)}
            >
              <Text style={[styles.cellText, selected && styles.cellTextSelected]}>
                {num}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    alignContent: "flex-start",
  },
  cell: {
    width: "12.5%",
    minWidth: 36,
    maxWidth: 52,
    flexGrow: 1,
    aspectRatio: 1.1,
    maxHeight: LAYOUT.compactTapTarget,
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  cellSelected: {
    backgroundColor: LAYOUT.colors.navy,
    borderColor: LAYOUT.colors.navy,
  },
  cellText: {
    fontSize: 13,
    fontWeight: "700",
    color: LAYOUT.colors.textPrimary,
  },
  cellTextSelected: {
    color: "#fff",
  },
});
