import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { PlaylistData } from "@huddlestat/shared";
import type { LocalGame } from "@/lib/db/types";
import { formatSituationLine } from "@/lib/tagging/formatSituation";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type TaggingHeaderProps = {
  game: LocalGame;
  draft: PlaylistData;
  unsyncedCount: number;
  onUndo?: () => void;
  undoEnabled?: boolean;
};

export function TaggingHeader({
  game,
  draft,
  unsyncedCount,
  onUndo,
  undoEnabled = false,
}: TaggingHeaderProps) {
  const { colors } = LAYOUT;

  return (
    <View style={[styles.bar, { borderBottomColor: colors.sectionBorder }]}>
      <Pressable
        onPress={() => router.replace("/")}
        style={styles.backBtn}
        hitSlop={8}
      >
        <Text style={styles.backText}>← Games</Text>
      </Pressable>

      <View style={styles.center}>
        <Text style={styles.playLine}>
          <Text style={styles.playNum}>PLAY #{draft.playNumber}</Text>
          {"  ·  "}
          {formatSituationLine(draft)}
        </Text>
        <Text style={styles.metaLine} numberOfLines={1}>
          {game.teamCode} vs {game.opponent}
          {unsyncedCount > 0
            ? ` · ${unsyncedCount} to sync`
            : ""}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.score}>
          {game.homeScore}–{game.awayScore}
        </Text>
        <Text style={styles.status}>{game.status}</Text>
      </View>

      <Pressable
        style={[styles.undoBtn, !undoEnabled && styles.undoBtnDisabled]}
        onPress={onUndo}
        disabled={!undoEnabled}
        hitSlop={8}
      >
        <Text
          style={[
            styles.undoText,
            !undoEnabled && styles.undoTextDisabled,
          ]}
        >
          UNDO
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: LAYOUT.padding.screen,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: LAYOUT.colors.navy,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  backText: {
    color: LAYOUT.colors.navyLight,
    fontSize: 15,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    gap: 2,
  },
  playLine: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  playNum: {
    color: LAYOUT.colors.navyLight,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  metaLine: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  right: {
    alignItems: "flex-end",
    minWidth: 72,
  },
  score: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  status: {
    color: "#94a3b8",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  undoBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    minHeight: LAYOUT.minTapTarget,
    justifyContent: "center",
  },
  undoBtnDisabled: {
    opacity: 0.45,
  },
  undoText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  undoTextDisabled: {
    color: "#94a3b8",
  },
});
