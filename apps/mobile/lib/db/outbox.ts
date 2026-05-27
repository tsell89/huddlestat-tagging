import { getDb } from "./index";
import type { OutboxItem, OutboxMutationType, OutboxStatus } from "./types";
import { createId } from "../id";

type OutboxRow = {
  id: string;
  local_game_id: string | null;
  mutation_type: OutboxMutationType;
  payload_json: string;
  created_at: number;
  status: OutboxStatus;
  attempts: number;
  last_error: string | null;
  synced_at: number | null;
};

function rowToOutbox(row: OutboxRow): OutboxItem {
  return {
    id: row.id,
    localGameId: row.local_game_id,
    mutationType: row.mutation_type,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    createdAt: row.created_at,
    status: row.status,
    attempts: row.attempts,
    lastError: row.last_error,
    syncedAt: row.synced_at,
  };
}

export async function enqueueOutbox(
  mutationType: OutboxMutationType,
  payload: Record<string, unknown>,
  localGameId?: string,
): Promise<string> {
  const database = getDb();
  const id = createId();
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO outbox (id, local_game_id, mutation_type, payload_json, created_at, status, attempts)
     VALUES (?, ?, ?, ?, ?, 'pending', 0)`,
    [id, localGameId ?? null, mutationType, JSON.stringify(payload), now],
  );

  return id;
}

/** Rows left on `syncing` after a crash or hung mutation — retry them. */
export async function reclaimStuckOutboxItems(): Promise<number> {
  const database = getDb();
  const result = await database.runAsync(
    `UPDATE outbox SET status = 'pending' WHERE status = 'syncing'`,
  );
  return result.changes ?? 0;
}

export async function listPendingOutbox(): Promise<OutboxItem[]> {
  const database = getDb();
  const rows = await database.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox WHERE status IN ('pending', 'failed', 'syncing') ORDER BY created_at ASC`,
  );
  return rows.map(rowToOutbox);
}

export async function countPendingOutbox(): Promise<number> {
  const database = getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM outbox WHERE status IN ('pending', 'failed', 'syncing')`,
  );
  return row?.count ?? 0;
}

export async function markOutboxSyncing(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE outbox SET status = 'syncing', attempts = attempts + 1 WHERE id = ?`,
    [id],
  );
}

export async function markOutboxSynced(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE outbox SET status = 'synced', synced_at = ?, last_error = NULL WHERE id = ?`,
    [Date.now(), id],
  );
}

export async function markOutboxFailed(
  id: string,
  error: string,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE outbox SET status = 'failed', last_error = ? WHERE id = ?`,
    [error, id],
  );
}

export async function getLastSyncedAt(): Promise<number | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{ synced_at: number }>(
    `SELECT MAX(synced_at) as synced_at FROM outbox WHERE status = 'synced'`,
  );
  return row?.synced_at ?? null;
}

export async function getLastOutboxError(): Promise<string | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{ last_error: string }>(
    `SELECT last_error FROM outbox WHERE status = 'failed' AND last_error IS NOT NULL ORDER BY created_at DESC LIMIT 1`,
  );
  return row?.last_error ?? null;
}
