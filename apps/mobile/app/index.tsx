import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { listLocalGames } from "@/lib/db/games";
import { listPlaysForGame } from "@/lib/db/plays";
import type { LocalGame } from "@/lib/db/types";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { useSync } from "@/context/sync-context";
import { playsToSyncHint } from "@/lib/sync/copy";
import { getLiveGameUrl } from "@/lib/sync/config";

const convexConfigured = Boolean(process.env.EXPO_PUBLIC_CONVEX_URL);

type GameSummary = LocalGame & {
  playCount: number;
  unsyncedPlayCount: number;
};

export default function HomeScreen() {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { playsToSync, refreshCounts } = useSync();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listLocalGames();
      const withCounts = await Promise.all(
        list.map(async (game) => {
          const plays = await listPlaysForGame(game.id);
          return {
            ...game,
            playCount: plays.length,
            unsyncedPlayCount: plays.filter((p) => !p.synced).length,
          };
        }),
      );
      setGames(withCounts);
      await refreshCounts();
    } finally {
      setLoading(false);
    }
  }, [refreshCounts]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const resumeGame = games.find((g) => g.playCount > 0) ?? games[0];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" hidden />
      <SyncStatusBar />

      <View style={styles.header}>
        <Text style={styles.brand}>HuddleStat</Text>
        <Text style={styles.subtitle}>iPad Tagger · offline-first</Text>
      </View>

      {!convexConfigured ? (
        <View style={styles.warn}>
          <Text style={styles.warnTitle}>Convex not configured</Text>
          <Text style={styles.warnBody}>
            Set EXPO_PUBLIC_CONVEX_URL in apps/mobile/.env (from npx convex dev) to
            enable sync to the live web dashboard.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {resumeGame ? (
          <Pressable
            style={styles.resumeBtn}
            onPress={() => router.push(`/game/${resumeGame.id}`)}
          >
            <Text style={styles.resumeBtnTitle}>Continue tagging</Text>
            <Text style={styles.resumeBtnSub}>
              {resumeGame.teamCode} vs {resumeGame.opponent} · {resumeGame.playCount}{" "}
              play{resumeGame.playCount === 1 ? "" : "s"}
              {resumeGame.unsyncedPlayCount > 0
                ? ` · ${resumeGame.unsyncedPlayCount} to sync`
                : ""}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push("/game/new")}
        >
          <Text style={styles.primaryBtnText}>+ New game</Text>
        </Pressable>
        {playsToSync > 0 ? (
          <Text style={styles.pendingHint}>{playsToSyncHint(playsToSync)}</Text>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Your games</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1e3a5f" />
      ) : games.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No games yet</Text>
          <Text style={styles.emptyBody}>
            Create a game to tag plays locally. Push stats when online — plays
            appear on the public live page instantly.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {games.map((game) => (
            <Pressable
              key={game.id}
              style={styles.gameCard}
              onPress={() => router.push(`/game/${game.id}`)}
            >
              <View style={styles.gameCardMain}>
                <Text style={styles.gameTitle}>
                  {game.teamCode} vs {game.opponent}
                </Text>
                <Text style={styles.gameSlug}>{getLiveGameUrl(game.slug)}</Text>
              </View>
              <View style={styles.gameMeta}>
                <Text style={styles.gameStatus}>
                  {game.playCount > 0
                    ? `${game.playCount} play${game.playCount === 1 ? "" : "s"}${game.unsyncedPlayCount > 0 ? ` · ${game.unsyncedPlayCount} to sync` : ""}`
                    : game.status}
                </Text>
                <Text style={styles.gameScore}>
                  {game.homeScore}–{game.awayScore}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Phase 2 · SQLite + outbox · PlaylistData schema
        </Text>
        {convexConfigured ? (
          <Text style={styles.footerLink}>
            Web viewer: set NEXT_PUBLIC_CONVEX_URL on apps/web
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 40,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 32,
    paddingBottom: 24,
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1e3a5f",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 4,
  },
  warn: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  warnTitle: {
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  warnBody: {
    color: "#a16207",
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginBottom: 24,
    gap: 12,
  },
  resumeBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "stretch",
    maxWidth: 480,
  },
  resumeBtnTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  resumeBtnSub: {
    color: "#dcfce7",
    fontSize: 14,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: "#1e3a5f",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  pendingHint: {
    fontSize: 14,
    color: "#1d4ed8",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
    maxWidth: 480,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 12,
    paddingBottom: 16,
  },
  gameCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  gameCardMain: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  gameSlug: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "Menlo",
    marginTop: 4,
  },
  gameMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  gameStatus: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
  },
  gameScore: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  footer: {
    paddingTop: 16,
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  footerLink: {
    fontSize: 12,
    color: "#64748b",
  },
});
