import { Pressable, StyleSheet, Text, View } from "react-native";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type TapGridProps<T extends string> = {
  options: readonly T[];
  value: T | "";
  onChange: (value: T) => void;
  columns?: number;
  /** @deprecated use size */
  compact?: boolean;
  size?: "default" | "compact" | "dense";
  disabled?: boolean;
};

export function TapGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
  compact = false,
  size,
  disabled = false,
}: TapGridProps<T>) {
  const resolvedSize = size ?? (compact ? "compact" : "default");
  const cellHeight =
    resolvedSize === "dense"
      ? 36
      : resolvedSize === "compact"
        ? 44
        : LAYOUT.minTapTarget;
  const fontSize = resolvedSize === "dense" ? 12 : 13;

  return (
    <View style={styles.grid}>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <Pressable
            key={opt}
            style={[
              styles.cell,
              {
                width: `${100 / columns}%`,
                minHeight: cellHeight,
              },
              selected && styles.cellSelected,
              disabled && styles.cellDisabled,
            ]}
            onPress={() => onChange(opt)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.cellText,
                { fontSize },
                selected && styles.cellTextSelected,
              ]}
              numberOfLines={1}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  cell: {
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  cellSelected: {
    backgroundColor: LAYOUT.colors.navy,
    borderColor: LAYOUT.colors.navy,
  },
  cellDisabled: {
    opacity: 0.55,
  },
  cellText: {
    fontSize: 13,
    fontWeight: "600",
    color: LAYOUT.colors.textPrimary,
    textAlign: "center",
  },
  cellTextSelected: {
    color: "#fff",
  },
});
