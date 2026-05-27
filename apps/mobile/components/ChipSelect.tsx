import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

type ChipSelectProps<T extends string> = {
  label: string;
  options: readonly T[];
  value: T | "";
  onChange: (value: T) => void;
};

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: ChipSelectProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Text style={styles.label}>{label}</Text>
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginRight: 4,
    minWidth: 72,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipSelected: {
    backgroundColor: "#1e3a5f",
    borderColor: "#1e3a5f",
  },
  chipText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#334155",
  },
  chipTextSelected: {
    color: "#fff",
  },
});
