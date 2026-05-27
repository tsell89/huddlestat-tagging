import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LocalPlay } from "@/lib/db/types";
import {
  formatPlayPlayers,
  formatPlaySituation,
} from "@/lib/tagging/formatPlayLog";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type PlayLogSidebarProps = {
  plays: LocalPlay[];
  nextPlayNumber: number;
  editingPlayId: string | null;
  catchUpMode: boolean;
  saving: boolean;
  saveDisabled: boolean;
  onCatchUp: () => void;
  onSelectPlay: (play: LocalPlay) => void;
  onResumeLive: () => void;
  onSave: () => void;
};

export function PlayLogSidebar({
  plays,
  nextPlayNumber,
  editingPlayId,
  catchUpMode,
  saving,
  saveDisabled,
  onCatchUp,
  onSelectPlay,
  onResumeLive,
  onSave,
}: PlayLogSidebarProps) {
  const { colors } = LAYOUT;
  const lastTwo = [...plays].reverse().slice(0, 2);
  const isOffLive = editingPlayId !== null || catchUpMode;

  return (
    <View style={[styles.panel, { borderLeftColor: colors.sectionBorder }]}>
      <View style={styles.topActions}>
        <Pressable style={styles.actionBtn} onPress={onCatchUp}>
          <Text style={styles.actionBtnText}>Catch-up missed play</Text>
        </Pressable>
      </View>

      {isOffLive ? (
        <Pressable style={styles.resumeBtn} onPress={onResumeLive}>
          <Text style={styles.resumeBtnText}>
            Resume live · play #{nextPlayNumber}
          </Text>
        </Pressable>
      ) : null}

      {catchUpMode ? (
        <Text style={styles.modeBanner}>
          Catch-up mode — insert missed snap; clip alignment fixed on export.
        </Text>
      ) : null}

      {editingPlayId ? (
        <Text style={styles.modeBanner}>Editing a previous play</Text>
      ) : null}

      <View style={styles.playsBlock}>
        <Text style={styles.playsLabel}>Previous plays</Text>
        {lastTwo.length === 0 ? (
          <Text style={styles.empty}>No saved plays yet.</Text>
        ) : (
          lastTwo.map((p) => {
            const selected = editingPlayId === p.id;
            return (
              <Pressable
                key={p.id}
                style={[styles.playRow, selected && styles.playRowSelected]}
                onPress={() => onSelectPlay(p)}
              >
                <Text style={styles.playNum}>#{p.playNumber}</Text>
                <View style={styles.playBody}>
                  <Text style={styles.playMain} numberOfLines={1}>
                    {p.playType} · {p.result}
                    {p.gainLoss !== 0
                      ? ` (${p.gainLoss > 0 ? "+" : ""}${p.gainLoss})`
                      : ""}
                  </Text>
                  <Text style={styles.playSub} numberOfLines={1}>
                    {formatPlaySituation(p)} · {formatPlayPlayers(p)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </View>

      <View style={styles.spacer} />

      <View style={styles.saveRow}>
        <Pressable
          style={[
            styles.saveBtn,
            (saveDisabled || saving) && styles.saveBtnDisabled,
          ]}
          onPress={onSave}
          disabled={saveDisabled || saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? "Saving…" : "SAVE PLAY"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: LAYOUT.playLogFlex,
    backgroundColor: LAYOUT.colors.sectionBg,
    borderLeftWidth: 1,
    paddingHorizontal: LAYOUT.padding.section,
    paddingTop: LAYOUT.padding.section,
    paddingBottom: LAYOUT.padding.screen,
  },
  topActions: {
    gap: 8,
    marginBottom: 8,
  },
  actionBtn: {
    backgroundColor: LAYOUT.colors.placeholderBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    minHeight: LAYOUT.minTapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: LAYOUT.colors.navy,
  },
  resumeBtn: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fcd34d",
    minHeight: LAYOUT.minTapTarget,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  resumeBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400e",
  },
  modeBanner: {
    fontSize: 12,
    color: LAYOUT.colors.textMuted,
    marginBottom: 8,
    fontStyle: "italic",
  },
  playsBlock: {
    gap: 8,
  },
  playsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: LAYOUT.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  empty: {
    fontSize: 14,
    color: LAYOUT.colors.placeholderText,
  },
  playRow: {
    flexDirection: "row",
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: LAYOUT.colors.sectionBorder,
    backgroundColor: LAYOUT.colors.panelBg,
    minHeight: LAYOUT.minTapTarget,
  },
  playRowSelected: {
    borderColor: LAYOUT.colors.navy,
    backgroundColor: "#eff6ff",
  },
  playNum: {
    fontSize: 15,
    fontWeight: "700",
    color: LAYOUT.colors.navy,
    fontFamily: "Menlo",
    width: 36,
  },
  playBody: {
    flex: 1,
  },
  playMain: {
    fontSize: 14,
    fontWeight: "600",
    color: LAYOUT.colors.textPrimary,
  },
  playSub: {
    fontSize: 11,
    color: LAYOUT.colors.textMuted,
    marginTop: 2,
  },
  spacer: {
    flex: 1,
  },
  saveRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 8,
  },
  saveBtn: {
    backgroundColor: LAYOUT.colors.saveGreen,
    borderRadius: 12,
    minHeight: LAYOUT.saveBarHeight,
    minWidth: 160,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
