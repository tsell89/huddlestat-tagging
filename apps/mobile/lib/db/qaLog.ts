import { getDb } from "./index";
import { createId } from "../id";

export type QaLogEntryType = "session" | "save" | "phase" | "cursor";

type QaLogRow = {
  id: string;
  local_game_id: string;
  seq: number;
  entry_type: QaLogEntryType;
  payload_json: string;
  created_at: number;
};

export async function countQaLogEntries(localGameId: string): Promise<number> {
  const database = getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM qa_log WHERE local_game_id = ?`,
    [localGameId],
  );
  return row?.count ?? 0;
}

export async function hasQaSession(localGameId: string): Promise<boolean> {
  const database = getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM qa_log WHERE local_game_id = ? AND entry_type = 'session'`,
    [localGameId],
  );
  return (row?.count ?? 0) > 0;
}

async function nextSeq(localGameId: string): Promise<number> {
  const database = getDb();
  const row = await database.getFirstAsync<{ max_seq: number | null }>(
    `SELECT MAX(seq) as max_seq FROM qa_log WHERE local_game_id = ?`,
    [localGameId],
  );
  return (row?.max_seq ?? 0) + 1;
}

export async function appendQaLogEntry(
  localGameId: string,
  entryType: QaLogEntryType,
  payload: Record<string, unknown>,
): Promise<number> {
  const database = getDb();
  const seq = await nextSeq(localGameId);
  const id = createId();
  const createdAt = Date.now();

  await database.runAsync(
    `INSERT INTO qa_log (id, local_game_id, seq, entry_type, payload_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, localGameId, seq, entryType, JSON.stringify(payload), createdAt],
  );

  return seq;
}

export async function listQaLogEntries(localGameId: string): Promise<
  { seq: number; entryType: QaLogEntryType; payload: Record<string, unknown> }[]
> {
  const database = getDb();
  const rows = await database.getAllAsync<QaLogRow>(
    `SELECT * FROM qa_log WHERE local_game_id = ? ORDER BY seq ASC`,
    [localGameId],
  );
  return rows.map((row) => ({
    seq: row.seq,
    entryType: row.entry_type as QaLogEntryType,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
  }));
}

export async function exportQaLogJsonl(localGameId: string): Promise<string> {
  const entries = await listQaLogEntries(localGameId);
  return entries
    .map(({ entryType, payload }) =>
      JSON.stringify({ type: entryType, ...payload }),
    )
    .join("\n")
    .concat(entries.length > 0 ? "\n" : "");
}
