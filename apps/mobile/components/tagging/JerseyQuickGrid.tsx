import { Pressable, StyleSheet, Text, View } from "react-native";
import type { JerseyGridEntry, JerseyGridTier } from "@/lib/tagging/jerseyGridRank";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type JerseyQuickGridProps = {
  entries: JerseyGridEntry[];
  selectedJersey: string;
  onSelectJersey: (jersey: string) => void;
  slotLabel: string;
};

function cellStyleForTier(tier: JerseyGridTier, selected: boolean) {
  const tierStyle = TIER_CELL_STYLES[tier];
  return [
    styles.cell,
    tierStyle,
    selected && styles.cellSelected,
    selected && tier === "hero" && styles.cellSelectedHero,
  ];
}

function textStyleForTier(tier: JerseyGridTier, selected: boolean) {
  return [
    styles.cellText,
    tier === "hero" && styles.cellTextHero,
    tier === "small" && styles.cellTextSmall,
    selected && styles.cellTextSelected,
  ];
}

export function JerseyQuickGrid({
  entries,
  selectedJersey,
  onSelectJersey,
  slotLabel,
}: JerseyQuickGridProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Jersey — {slotLabel}</Text>
      <View style={styles.grid}>
        {entries.map((entry) => {
          const selected = selectedJersey === entry.jersey;
          return (
            <Pressable
              key={entry.jersey}
              style={cellStyleForTier(entry.tier, selected)}
              onPress={() => onSelectJersey(entry.jersey)}
            >
              <Text style={textStyleForTier(entry.tier, selected)}>
                {entry.jersey}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const TIER_CELL_STYLES = StyleSheet.create({
  hero: {
    width: "25%",
    minWidth: 72,
    maxWidth: 96,
    maxHeight: LAYOUT.compactTapTarget * 2,
    aspectRatio: 1.05,
  },
  frequent: {
    width: "18%",
    minWidth: 52,
    maxWidth: 64,
    maxHeight: 52,
    aspectRatio: 1.08,
  },
  standard: {
    width: "12.5%",
    minWidth: 36,
    maxWidth: 52,
    maxHeight: LAYOUT.compactTapTarget,
    aspectRatio: 1.1,
  },
  small: {
    width: "10%",
    minWidth: 32,
    maxWidth: 44,
    maxHeight: 36,
    aspectRatio: 1.1,
  },
});

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
    flexGrow: 1,
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
  cellSelectedHero: {
    borderWidth: 2,
  },
  cellText: {
    fontSize: 13,
    fontWeight: "700",
    color: LAYOUT.colors.textPrimary,
  },
  cellTextHero: {
    fontSize: 18,
  },
  cellTextSmall: {
    fontSize: 11,
  },
  cellTextSelected: {
    color: "#fff",
  },
});
