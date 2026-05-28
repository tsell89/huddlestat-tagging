import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { TapGrid } from "@/components/tagging/TapGrid";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

const OT_POSSESSION_OPTIONS = ["We have ball first", "They have ball first"] as const;

type StartOtModalProps = {
  visible: boolean;
  onClose: () => void;
  onChoose: (choice: "us" | "them") => void;
};

export function StartOtModal({ visible, onClose, onChoose }: StartOtModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Start overtime</Text>
          <Text style={styles.subtitle}>
            HS OT — alternating possessions from the opponent 10. No kickoff.
          </Text>
          <TapGrid
            options={OT_POSSESSION_OPTIONS}
            value=""
            onChange={(label) => {
              onChoose(
                label === "We have ball first" ? "us" : "them",
              );
            }}
            columns={1}
            size="dense"
          />
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: LAYOUT.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: LAYOUT.colors.textMuted,
    lineHeight: 20,
  },
  cancelBtn: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 15,
    color: LAYOUT.colors.textMuted,
    fontWeight: "600",
  },
});
