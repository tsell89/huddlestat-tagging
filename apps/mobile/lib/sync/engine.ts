import type { ConvexReactClient } from "convex/react";
import type { CloudGameId } from "../convex-api";
import { api } from "../convex-api";
import {
  countPendingOutbox,
  listPendingOutbox,
  markOutboxFailed,
  markOutboxSynced,
  markOutboxSyncing,
  enqueueOutbox,
  reclaimStuckOutboxItems,
} from "../db/outbox";
import { withTimeout } from "./timeout";
import { getLocalGame, setConvexGameId, updateLocalGameStatus } from "../db/games";
import { markPlaySynced } from "../db/plays";
import type { OutboxItem } from "../db/types";
import type { PlaylistData } from "@huddlestat/shared";

export type SyncResult = {
  synced: number;
  failed: number;
  remaining: number;
};

const SYNC_MUTATION_TIMEOUT_MS = 25_000;

function mutationTimeoutMessage(label: string): string {
  return `${label} timed out — on a physical iPad use a https://….convex.cloud dev URL (npx convex login, then npx convex dev), not local http://.`;
}

async function runMutation<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withTimeout(
    fn(),
    SYNC_MUTATION_TIMEOUT_MS,
    mutationTimeoutMessage(label),
  );
}

async function ensureGameRegistered(
  client: ConvexReactClient,
  localGameId: string,
): Promise<CloudGameId> {
  const game = await getLocalGame(localGameId);
  if (!game) throw new Error("Local game not found");

  if (game.convexGameId) {
    return game.convexGameId as CloudGameId;
  }

  const result = await runMutation("Register game", () =>
    client.mutation(api.games.getOrCreate, {
      teamCode: game.teamCode,
      opponent: game.opponent,
      slug: game.slug,
    }),
  );

  await setConvexGameId(localGameId, result.gameId);
  return result.gameId;
}

async function processOutboxItem(
  client: ConvexReactClient,
  item: OutboxItem,
): Promise<void> {
  await markOutboxSyncing(item.id);

  switch (item.mutationType) {
    case "games.getOrCreate": {
      const { localGameId } = item.payload as { localGameId: string };
      await ensureGameRegistered(client, localGameId);
      break;
    }
    case "games.updateStatus": {
      const { localGameId, status } = item.payload as {
        localGameId: string;
        status: "pregame" | "live" | "final";
      };
      const gameId = await ensureGameRegistered(client, localGameId);
      await runMutation("Update game status", () =>
        client.mutation(api.games.updateStatus, { gameId, status }),
      );
      await updateLocalGameStatus(localGameId, status);
      break;
    }
    case "plays.create": {
      const { localGameId, localPlayId, play } = item.payload as {
        localGameId: string;
        localPlayId: string;
        play: PlaylistData;
      };
      const gameId = await ensureGameRegistered(client, localGameId);
      const convexPlayId = await runMutation("Upload play", () =>
        client.mutation(api.plays.create, {
          gameId,
          playNumber: play.playNumber,
          quarter: play.quarter,
          odk: play.odk,
          yardLine: play.yardLine,
          down: play.down,
          distance: play.distance,
          hash: play.hash,
          gainLoss: play.gainLoss,
          passer: play.passer,
          receiver: play.receiver,
          rusher: play.rusher,
          result: play.result,
          team: play.team,
          tackler1: play.tackler1,
          tackler2: play.tackler2,
          recoveredBy: play.recoveredBy,
          returnYards: play.returnYards,
          returner: play.returner,
          playType: play.playType,
          kicker: play.kicker,
          kickYards: play.kickYards,
          interceptedBy: play.interceptedBy,
          completion: play.completion,
        }),
      );
      await markPlaySynced(localPlayId, convexPlayId);
      const game = await getLocalGame(localGameId);
      if (game?.status === "pregame") {
        await runMutation("Start game", () =>
          client.mutation(api.games.updateStatus, {
            gameId,
            status: "live",
          }),
        );
        await updateLocalGameStatus(localGameId, "live");
      }
      break;
    }
    default:
      throw new Error(`Unknown mutation type: ${item.mutationType}`);
  }

  await markOutboxSynced(item.id);
}

export async function registerGameForSync(
  localGameId: string,
): Promise<void> {
  const game = await getLocalGame(localGameId);
  if (!game) throw new Error("Local game not found");
  if (game.convexGameId) return;

  await enqueueOutbox(
    "games.getOrCreate",
    { localGameId },
    localGameId,
  );
}

export async function flushOutbox(
  client: ConvexReactClient,
): Promise<SyncResult> {
  await reclaimStuckOutboxItems();
  const pending = await listPendingOutbox();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const localGameId =
        item.localGameId ??
        (item.payload.localGameId as string | undefined);
      if (localGameId) {
        await ensureGameRegistered(client, localGameId);
      }
      await processOutboxItem(client, item);
      synced += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markOutboxFailed(item.id, message);
      failed += 1;
      // Stop on first failure to preserve FIFO ordering
      break;
    }
  }

  const remaining = await countPendingOutbox();
  return { synced, failed, remaining };
}
