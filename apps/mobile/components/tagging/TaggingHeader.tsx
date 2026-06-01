import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { GamePhase, PlaylistData } from "@huddlestat/shared";
import type { LocalGame } from "@/lib/db/types";
import { formatSituationLine } from "@/lib/tagging/formatSituation";
import { headerPhaseLabel } from "@/lib/tagging/phaseAdvance";
import { LAYOUT } from "@/lib/tagging/layoutConstants";

type TaggingHeaderProps = {
  game: LocalGame;
  draft: PlaylistData;
  unsyncedCount: number;
  onUndo?: () => void;
  undoEnabled?: boolean;
  phaseAdvance?: { label: string; onPress: () => void } | null;
};

export function TaggingHeader({
  game,
  draft,
  unsyncedCount,
  onUndo,
  undoEnabled = false,
  phaseAdvance,
}: TaggingHeaderProps) {
  const { colors } = LAYOUT;
  const phaseLabel = headerPhaseLabel(game.phase);

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
          <Text style={styles.phaseBadge}> · {phaseLabel}</Text>
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

      {phaseAdvance ? (
        <Pressable
          style={styles.phaseAdvanceBtn}
          onPress={phaseAdvance.onPress}
          hitSlop={4}
        >
          <Text style={styles.phaseAdvanceText}>{phaseAdvance.label}</Text>
        </Pressable>
      ) : null}

      <View style={styles.right}>
        <Text style={styles.score}>
          {game.homeScore}–{game.awayScore}
        </Text>
        <Text style={styles.status}>
          {game.status}
          {game.phase === "OT" && game.otPossession
            ? ` · ${game.otPossession === "us" ? "our ball" : "their ball"}`
            : ""}
        </Text>
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
  phaseBadge: {
    color: "#fde68a",
    fontSize: 14,
    fontWeight: "700",
  },
  phaseAdvanceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#4ade80",
    backgroundColor: "rgba(74, 222, 128, 0.12)",
    maxWidth: 160,
    minHeight: LAYOUT.minTapTarget,
    justifyContent: "center",
  },
  phaseAdvanceText: {
    color: "#bbf7d0",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
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
