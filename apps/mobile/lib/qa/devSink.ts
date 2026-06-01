/**
 * Dev-only: mirror QA log entries to the Mac sidecar (scripts/qa-log-server.mjs).
 * Enabled when EXPO_PUBLIC_QA_LOG_URL is set (dev:mobile:qa sets this automatically).
 */
import Constants from "expo-constants";

function qaLogServerUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_QA_LOG_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (!__DEV__) return null;

  // Fallback: same host as Metro packager (set via REACT_NATIVE_PACKAGER_HOSTNAME).
  const packagerHost =
    Constants.expoConfig?.hostUri ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest
      ?.debuggerHost;
  if (!packagerHost) return null;

  const host = packagerHost.replace(/^exp:\/\//, "").split(":")[0];
  if (!host) return null;
  return `http://${host}:8099`;
}

export function mirrorQaEntryToMac(
  entryType: "session" | "save" | "phase" | "cursor",
  payload: Record<string, unknown>,
): void {
  if (!__DEV__) return;
  const base = qaLogServerUrl();
  if (!base) return;

  void fetch(`${base}/qa-log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: entryType, ...payload, at: Date.now() }),
  }).catch(() => {
    // Sidecar not running — SQLite log still has the entry.
  });
}

export function isMacQaLogEnabled(): boolean {
  return __DEV__ && qaLogServerUrl() !== null;
}
