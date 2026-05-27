import { StyleSheet, Text, TextInput, View } from "react-native";
import type { PlayerRef } from "@huddlestat/shared";

type PlayerInputProps = {
  label: string;
  value: PlayerRef;
  onChange: (value: PlayerRef) => void;
};

export function PlayerInput({ label, value, onChange }: PlayerInputProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.jersey}
          placeholder="#"
          value={value.jersey}
          onChangeText={(jersey) => onChange({ ...value, jersey })}
          keyboardType="number-pad"
          maxLength={3}
        />
        <TextInput
          style={styles.name}
          placeholder="Name"
          value={value.name}
          onChangeText={(name) => onChange({ ...value, name })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  jersey: {
    width: 64,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "#fff",
  },
  name: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    backgroundColor: "#fff",
  },
});
