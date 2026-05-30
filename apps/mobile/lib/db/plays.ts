import { getDb } from "./index";
import type { LocalPlay, PlayRow } from "./types";
import { playToRow, rowToLocalPlay } from "./types";
import { createId } from "../id";
import type { PlaylistData } from "@huddlestat/shared";
import { playlistDataSchema } from "@huddlestat/shared";
export async function listPlaysForGame(localGameId: string): Promise<LocalPlay[]> {
  const database = getDb();
  const rows = await database.getAllAsync<PlayRow>(
    `SELECT * FROM plays WHERE local_game_id = ? ORDER BY play_number ASC`,
    [localGameId],
  );
  return rows.map(rowToLocalPlay);
}

export async function getNextPlayNumber(localGameId: string): Promise<number> {
  const database = getDb();
  const row = await database.getFirstAsync<{ max_num: number | null }>(
    `SELECT MAX(play_number) as max_num FROM plays WHERE local_game_id = ?`,
    [localGameId],
  );
  return (row?.max_num ?? 0) + 1;
}

export async function saveLocalPlay(
  localGameId: string,
  play: PlaylistData,
): Promise<LocalPlay> {
  const parsed = playlistDataSchema.parse(play);
  const database = getDb();
  const id = createId();
  const taggedAt = Date.now();

  const localPlay: LocalPlay = {
    ...parsed,
    id,
    localGameId,
    synced: false,
    convexPlayId: null,
    taggedAt,
  };

  const row = playToRow(localPlay);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `INSERT INTO plays (
        id, local_game_id, play_number, quarter, odk, yard_line, down, distance, hash,
        gain_loss, passer_json, receiver_json, rusher_json, result, team,
        tackler1_json, tackler2_json, recovered_by_json, return_yards, returner_json,
        play_type, kicker_json, kick_yards, intercepted_by_json, spot_encoding,
        synced, convex_play_id, tagged_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
      [
        row.id,
        row.local_game_id,
        row.play_number,
        row.quarter,
        row.odk,
        row.yard_line,
        row.down,
        row.distance,
        row.hash,
        row.gain_loss,
        row.passer_json,
        row.receiver_json,
        row.rusher_json,
        row.result,
        row.team,
        row.tackler1_json,
        row.tackler2_json,
        row.recovered_by_json,
        row.return_yards,
        row.returner_json,
        row.play_type,
        row.kicker_json,
        row.kick_yards,
        row.intercepted_by_json,
        row.spot_encoding,
        row.tagged_at,
      ],
    );

    await database.runAsync(
      `UPDATE games SET updated_at = ? WHERE id = ?`,
      [taggedAt, localGameId],
    );
  });

  return localPlay;
}

export async function markPlaySynced(
  localPlayId: string,
  convexPlayId: string,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `UPDATE plays SET synced = 1, convex_play_id = ? WHERE id = ?`,
    [convexPlayId, localPlayId],
  );
}

export async function countUnsyncedPlays(localGameId?: string): Promise<number> {
  const database = getDb();
  if (localGameId) {
    const row = await database.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM plays WHERE local_game_id = ? AND synced = 0`,
      [localGameId],
    );
    return row?.count ?? 0;
  }
  const row = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM plays WHERE synced = 0`,
  );
  return row?.count ?? 0;
}

export async function updateLocalPlay(
  localPlayId: string,
  play: PlaylistData,
): Promise<LocalPlay> {
  const parsed = playlistDataSchema.parse(play);
  const database = getDb();
  const taggedAt = Date.now();

  const existing = await database.getFirstAsync<PlayRow>(
    `SELECT * FROM plays WHERE id = ?`,
    [localPlayId],
  );
  if (!existing) throw new Error("Play not found");

  const localPlay: LocalPlay = {
    ...parsed,
    id: localPlayId,
    localGameId: existing.local_game_id,
    synced: false,
    convexPlayId: null,
    taggedAt,
  };

  const row = playToRow(localPlay);

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `UPDATE plays SET
        play_number = ?, quarter = ?, odk = ?, yard_line = ?, down = ?, distance = ?, hash = ?,
        gain_loss = ?, passer_json = ?, receiver_json = ?, rusher_json = ?, result = ?,
        team = ?, tackler1_json = ?, tackler2_json = ?, recovered_by_json = ?,
        return_yards = ?, returner_json = ?, play_type = ?, kicker_json = ?,
        kick_yards = ?, intercepted_by_json = ?, spot_encoding = ?,
        synced = 0, convex_play_id = NULL, tagged_at = ?
      WHERE id = ?`,
      [
        row.play_number,
        row.quarter,
        row.odk,
        row.yard_line,
        row.down,
        row.distance,
        row.hash,
        row.gain_loss,
        row.passer_json,
        row.receiver_json,
        row.rusher_json,
        row.result,
        row.team,
        row.tackler1_json,
        row.tackler2_json,
        row.recovered_by_json,
        row.return_yards,
        row.returner_json,
        row.play_type,
        row.kicker_json,
        row.kick_yards,
        row.intercepted_by_json,
        row.spot_encoding,
        row.tagged_at,
        localPlayId,
      ],
    );

    await database.runAsync(
      `UPDATE games SET updated_at = ? WHERE id = ?`,
      [taggedAt, existing.local_game_id],
    );
  });

  return localPlay;
}
