import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import type { ConvexReactClient } from "convex/react";
import { flushOutbox, type SyncResult } from "@/lib/sync/engine";
import { getDeviceSyncWarning } from "@/lib/sync/config";
import { countUnsyncedPlays } from "@/lib/db/plays";
import {
  countPendingOutbox,
  getLastOutboxError,
  getLastSyncedAt,
  reclaimStuckOutboxItems,
} from "@/lib/db/outbox";

type SyncContextValue = {
  /** Unsynced tagged plays (what the user cares about) */
  playsToSync: number;
  lastPushedAt: number | null;
  isSyncing: boolean;
  isOnline: boolean;
  canSync: boolean;
  configWarning: string | null;
  lastError: string | null;
  pushStats: () => Promise<SyncResult>;
  refreshCounts: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({
  children,
  client,
}: {
  children: ReactNode;
  client: ConvexReactClient | null;
}) {
  const [playsToSync, setPlaysToSync] = useState(0);
  const [lastPushedAt, setLastPushedAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const wasOfflineRef = useRef(false);
  const canSync = client !== null;
  const configWarning = getDeviceSyncWarning();

  const refreshCounts = useCallback(async () => {
    const [unsynced, last, outboxError] = await Promise.all([
      countUnsyncedPlays(),
      getLastSyncedAt(),
      getLastOutboxError(),
    ]);
    setPlaysToSync(unsynced);
    setLastPushedAt(last);
    setLastError(outboxError);
  }, []);

  const pushStats = useCallback(async (): Promise<SyncResult> => {
    if (!client) {
      throw new Error("Convex is not configured (EXPO_PUBLIC_CONVEX_URL)");
    }
    if (configWarning) {
      throw new Error(configWarning);
    }
    if (syncingRef.current) {
      return { synced: 0, failed: 0, remaining: playsToSync };
    }
    syncingRef.current = true;
    setIsSyncing(true);
    setLastError(null);
    try {
      const result = await flushOutbox(client);
      if (result.failed > 0) {
        const err = await getLastOutboxError();
        setLastError(err ?? "Sync failed — tap Sync now to retry");
      }
      await refreshCounts();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(message);
      throw err;
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [client, configWarning, playsToSync, refreshCounts]);

  useEffect(() => {
    void (async () => {
      await reclaimStuckOutboxItems();
      await refreshCounts();
    })();
    const interval = setInterval(() => void refreshCounts(), 3000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online && wasOfflineRef.current && client && !configWarning) {
        void pushStats().catch(() => undefined);
      }
      wasOfflineRef.current = !online;
    });
    return () => unsubscribe();
  }, [client, configWarning, pushStats]);

  return (
    <SyncContext.Provider
      value={{
        playsToSync,
        lastPushedAt,
        isSyncing,
        isOnline,
        canSync,
        configWarning,
        lastError,
        pushStats,
        refreshCounts,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within SyncProvider");
  }
  return ctx;
}
