import { Pressable, StyleSheet, Text, View } from "react-native";

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function Stepper({
  label,
  value,
  onChange,
  min = -99,
  max = 99,
  step = 1,
}: StepperProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          style={styles.btn}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable
          style={styles.btn}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1e293b",
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    minWidth: 48,
    textAlign: "center",
    color: "#0f172a",
    fontVariant: ["tabular-nums"],
  },
});
