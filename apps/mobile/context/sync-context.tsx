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
import { countUnsyncedPlays } from "@/lib/db/plays";
import { getLastPublishedAt, getLastPublishError } from "@/lib/db/games";
import {
  isCloudSyncConfigured,
  getDeviceSyncWarning,
} from "@/lib/sync/config";
import {
  publishGameSnapshot,
  snapshotKindForManualSync,
  type PublishResult,
  type SnapshotKind,
} from "@/lib/sync/engine";

type SyncContextValue = {
  playsToSync: number;
  lastPushedAt: number | null;
  isSyncing: boolean;
  isOnline: boolean;
  canSync: boolean;
  configWarning: string | null;
  lastError: string | null;
  publishSnapshot: (
    localGameId: string,
    snapshotKind: SnapshotKind,
  ) => Promise<PublishResult | null>;
  syncNow: (localGameId: string) => Promise<PublishResult | null>;
  refreshCounts: () => Promise<void>;
};

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [playsToSync, setPlaysToSync] = useState(0);
  const [lastPushedAt, setLastPushedAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const canSync = isCloudSyncConfigured();
  const configWarning = getDeviceSyncWarning();

  const refreshCounts = useCallback(async () => {
    const [unsynced, lastPublished, publishError] = await Promise.all([
      countUnsyncedPlays(),
      getLastPublishedAt(),
      getLastPublishError(),
    ]);
    setPlaysToSync(unsynced);
    setLastPushedAt(lastPublished);
    setLastError(publishError);
  }, []);

  const publishSnapshot = useCallback(
    async (
      localGameId: string,
      snapshotKind: SnapshotKind,
    ): Promise<PublishResult | null> => {
      if (!canSync) return null;
      if (configWarning) throw new Error(configWarning);
      if (syncingRef.current) return null;

      syncingRef.current = true;
      setIsSyncing(true);
      setLastError(null);
      try {
        const result = await publishGameSnapshot(localGameId, snapshotKind);
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
    },
    [canSync, configWarning, refreshCounts],
  );

  const syncNow = useCallback(
    async (localGameId: string): Promise<PublishResult | null> => {
      const { getLocalGame } = await import("@/lib/db/games");
      const game = await getLocalGame(localGameId);
      if (!game) throw new Error("Local game not found");
      const snapshotKind = snapshotKindForManualSync({
        phase: game.phase,
        status: game.status,
      });
      return publishSnapshot(localGameId, snapshotKind);
    },
    [publishSnapshot],
  );

  useEffect(() => {
    void refreshCounts();
    const interval = setInterval(() => void refreshCounts(), 3000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(
        state.isConnected === true && state.isInternetReachable !== false,
      );
    });
    return () => unsubscribe();
  }, []);

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
        publishSnapshot,
        syncNow,
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
