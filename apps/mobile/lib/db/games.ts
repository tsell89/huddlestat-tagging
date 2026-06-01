import { getDb } from "./index";
import type { LocalGame } from "./types";
import { createId } from "../id";
import type { GamePhase, GameStatus, OtPossession } from "@huddlestat/shared";
import { buildGameSlug } from "@huddlestat/shared";

type GameRow = {
  id: string;
  slug: string;
  team_code: string;
  opponent: string;
  cloud_game_id: string | null;
  home_score: number;
  away_score: number;
  status: GameStatus;
  phase: GamePhase;
  ot_possession: OtPossession | null;
  created_at: number;
  updated_at: number;
};

function rowToGame(row: GameRow): LocalGame {
  return {
    id: row.id,
    slug: row.slug,
    teamCode: row.team_code,
    opponent: row.opponent,
    cloudGameId: row.cloud_game_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    status: row.status,
    phase: row.phase,
    otPossession: row.ot_possession,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLocalGames(): Promise<LocalGame[]> {
  const database = getDb();
  const rows = await database.getAllAsync<GameRow>(
    `SELECT * FROM games ORDER BY updated_at DESC`,
  );
  return rows.map(rowToGame);
}

export async function getLocalGame(id: string): Promise<LocalGame | null> {
  const database = getDb();
  const row = await database.getFirstAsync<GameRow>(
    `SELECT * FROM games WHERE id = ?`,
    [id],
  );
  return row ? rowToGame(row) : null;
}

export async function createLocalGame(
  teamCode: string,
  opponent: string,
): Promise<LocalGame> {
  const database = getDb();
  const now = Date.now();
  const id = createId();
  const slug = buildGameSlug(teamCode, opponent);

  await database.runAsync(
    `INSERT INTO games (id, slug, team_code, opponent, cloud_game_id, home_score, away_score, status, phase, ot_possession, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, 0, 0, 'pregame', 'Q1', NULL, ?, ?)`,
    [id, slug, teamCode.trim(), opponent.trim(), now, now],
  );

  const game = await getLocalGame(id);
  if (!game) throw new Error("Failed to create local game");
  return game;
}

export async function updateLocalGameStatus(
  localId: string,
  status: GameStatus,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE games SET status = ?, updated_at = ? WHERE id = ?`,
    [status, Date.now(), localId],
  );
}

export async function updateLocalScore(
  localId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE games SET home_score = ?, away_score = ?, updated_at = ? WHERE id = ?`,
    [homeScore, awayScore, Date.now(), localId],
  );
}

export async function updateLocalGamePhase(
  localId: string,
  phase: GamePhase,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE games SET phase = ?, updated_at = ? WHERE id = ?`,
    [phase, Date.now(), localId],
  );
}

export async function updateLocalOtPossession(
  localId: string,
  otPossession: OtPossession | null,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE games SET ot_possession = ?, updated_at = ? WHERE id = ?`,
    [otPossession, Date.now(), localId],
  );
}

export async function finalizeLocalGame(localId: string): Promise<void> {
  const database = getDb();
  const now = Date.now();
  await database.runAsync(
    `UPDATE games SET phase = 'FINAL', status = 'final', updated_at = ? WHERE id = ?`,
    [now, localId],
  );
}

export async function markGamePublished(localId: string): Promise<void> {
  const database = getDb();
  const now = Date.now();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE plays SET synced = 1 WHERE local_game_id = ?`,
      [localId],
    );
    await database.runAsync(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [`last_published_at:${localId}`, String(now)],
    );
    await database.runAsync(
      `DELETE FROM meta WHERE key = ?`,
      [`last_publish_error:${localId}`],
    );
  });
}

export async function recordPublishError(
  localId: string,
  message: string,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [`last_publish_error:${localId}`, message],
  );
}

export async function getLastPublishedAt(
  localGameId?: string,
): Promise<number | null> {
  const database = getDb();
  if (localGameId) {
    const row = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM meta WHERE key = ?`,
      [`last_published_at:${localGameId}`],
    );
    return row ? Number(row.value) : null;
  }

  const row = await database.getFirstAsync<{ max_val: number | null }>(
    `SELECT MAX(CAST(value AS INTEGER)) as max_val FROM meta WHERE key LIKE 'last_published_at:%'`,
  );
  return row?.max_val ?? null;
}

export async function getLastPublishError(
  localGameId?: string,
): Promise<string | null> {
  const database = getDb();
  if (localGameId) {
    const row = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM meta WHERE key = ?`,
      [`last_publish_error:${localGameId}`],
    );
    return row?.value ?? null;
  }

  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key LIKE 'last_publish_error:%' ORDER BY key DESC LIMIT 1`,
  );
  return row?.value ?? null;
}
