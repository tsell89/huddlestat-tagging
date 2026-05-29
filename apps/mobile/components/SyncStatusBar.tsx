import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSync } from "@/context/sync-context";
import { getSyncApiUrlLabel } from "@/lib/sync/config";
import { playsToSyncLabel } from "@/lib/sync/copy";

function formatLastPushed(ts: number | null): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleTimeString();
}

type SyncStatusBarProps = {
  localGameId?: string;
};

export function SyncStatusBar({ localGameId }: SyncStatusBarProps) {
  const {
    playsToSync,
    lastPushedAt,
    isSyncing,
    isOnline,
    canSync,
    configWarning,
    lastError,
    syncNow,
  } = useSync();

  const statusColor = configWarning || !isOnline
    ? "#b45309"
    : playsToSync > 0
      ? "#1d4ed8"
      : "#15803d";

  const statusLine = canSync
    ? `${playsToSyncLabel(playsToSync)} · last publish ${formatLastPushed(lastPushedAt)}${!isOnline ? " · offline" : ""}`
    : "Cloud sync off — set EXPO_PUBLIC_SYNC_API_URL to publish stats";

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={styles.text}>{statusLine}</Text>
        {configWarning ? (
          <Text style={styles.warn} numberOfLines={2}>
            {configWarning}
          </Text>
        ) : null}
        {lastError ? (
          <Text style={styles.error} numberOfLines={3}>
            {lastError}
            {getSyncApiUrlLabel() ? `\nServer: ${getSyncApiUrlLabel()}` : ""}
          </Text>
        ) : null}
      </View>
      {localGameId && canSync ? (
        <Pressable
          style={[
            styles.button,
            (isSyncing || !isOnline || !!configWarning) && styles.buttonDisabled,
          ]}
          onPress={() => void syncNow(localGameId)}
          disabled={isSyncing || !isOnline || !!configWarning}
        >
          <Text style={styles.buttonText}>
            {isSyncing ? "Publishing…" : playsToSync > 0 ? "Publish now" : "Publish"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#1e293b",
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    left: -14,
    top: 6,
  },
  text: {
    color: "#e2e8f0",
    fontSize: 13,
    marginLeft: 4,
  },
  warn: {
    color: "#fcd34d",
    fontSize: 12,
    marginLeft: 4,
  },
  error: {
    color: "#fca5a5",
    fontSize: 12,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
