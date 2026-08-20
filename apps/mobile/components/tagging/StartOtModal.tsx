import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { TapGrid } from "@/components/tagging/TapGrid";
import { DirectionOfPlayControl } from "@/components/tagging/DirectionOfPlayControl";
import type { DefendingEnd } from "@/lib/tagging/defendingEnd";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

const OT_POSSESSION_OPTIONS = ["We have ball first", "They have ball first"] as const;

type StartOtModalProps = {
  visible: boolean;
  onClose: () => void;
  onChoose: (choice: {
    possession: "us" | "them";
    defendingEnd: DefendingEnd;
  }) => void;
  usLabel?: string;
  themLabel?: string;
};

export function StartOtModal({
  visible,
  onClose,
  onChoose,
  usLabel = "Us",
  themLabel = "Them",
}: StartOtModalProps) {
  const [possession, setPossession] = useState<"us" | "them" | null>(null);
  const [defendingEnd, setDefendingEnd] = useState<DefendingEnd>("left");

  function resetAndClose() {
    setPossession(null);
    setDefendingEnd("left");
    onClose();
  }

  function handleStart() {
    if (!possession) return;
    onChoose({ possession, defendingEnd });
    setPossession(null);
    setDefendingEnd("left");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Start overtime</Text>
          <Text style={styles.subtitle}>
            HS OT — alternating possessions from the opponent 10. No kickoff.
            Declare who has the ball and which end we defend.
          </Text>
          <TapGrid
            options={OT_POSSESSION_OPTIONS}
            value={
              possession === "us"
                ? "We have ball first"
                : possession === "them"
                  ? "They have ball first"
                  : ""
            }
            onChange={(label) => {
              setPossession(
                label === "We have ball first" ? "us" : "them",
              );
            }}
            columns={1}
            size="dense"
          />
          <DirectionOfPlayControl
            defendingEnd={defendingEnd}
            onChange={setDefendingEnd}
            usLabel={usLabel}
            themLabel={themLabel}
            advancingTowardOpponent={possession !== "them"}
          />
          <Pressable
            style={[styles.startBtn, !possession && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={!possession}
          >
            <Text style={styles.startText}>Start OT</Text>
          </Pressable>
          <Pressable style={styles.cancelBtn} onPress={resetAndClose}>
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
  startBtn: {
    alignSelf: "stretch",
    backgroundColor: LAYOUT.colors.navy,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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
