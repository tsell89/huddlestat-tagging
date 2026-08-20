import { getDb } from "@/lib/db/index";
import {
  secondHalfDefendingEndFromOpening,
  type DefendingEnd,
} from "@/lib/tagging/defendingEnd";

export type { DefendingEnd } from "@/lib/tagging/defendingEnd";
export {
  attackingEnd,
  ballGoingEnd,
  defendingEndAfterQuarterBreak,
  formatDefendingEndLabel,
  mathRatioFromOriented,
  oppositeDefendingEnd,
  orientedRatio,
  secondHalfDefendingEndFromOpening,
} from "@/lib/tagging/defendingEnd";

const META_PREFIX = "defending_end:";
const OPENING_META_PREFIX = "opening_defending_end:";

function metaKey(gameId: string): string {
  return `${META_PREFIX}${gameId}`;
}

function openingMetaKey(gameId: string): string {
  return `${OPENING_META_PREFIX}${gameId}`;
}

function parseDefendingEnd(value: string | undefined | null): DefendingEnd {
  return value === "right" ? "right" : "left";
}

export async function getDefendingEnd(gameId: string): Promise<DefendingEnd> {
  const database = getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [metaKey(gameId)],
  );
  return parseDefendingEnd(row?.value);
}

export async function setDefendingEnd(
  gameId: string,
  end: DefendingEnd,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
    [metaKey(gameId), end],
  );
}

/** Opening period choice — persisted once per game for 2H / audit. */
export async function getOpeningDefendingEnd(
  gameId: string,
): Promise<DefendingEnd | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [openingMetaKey(gameId)],
  );
  if (!row) return null;
  return parseDefendingEnd(row.value);
}

async function writeOpeningDefendingEnd(
  gameId: string,
  end: DefendingEnd,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
    [openingMetaKey(gameId), end],
  );
}

/** Backfill opening choice when resuming (write once). */
export async function recordOpeningDefendingEnd(
  gameId: string,
  end: DefendingEnd,
): Promise<void> {
  const existing = await getOpeningDefendingEnd(gameId);
  if (existing !== null) return;
  await writeOpeningDefendingEnd(gameId, end);
}

/**
 * Persist opening defending end from the direction control or first save.
 * Overwritable in Q1 until the first play is saved.
 * Locked after first save, and never rewritten once phase leaves Q1
 * (Q1→Q2 records opening pre-flip via {@link recordOpeningDefendingEnd}).
 */
export async function persistOpeningDefendingEnd(
  gameId: string,
  end: DefendingEnd,
  savedPlayCount: number,
  phase?: string,
): Promise<void> {
  if (savedPlayCount > 0) return;
  if (phase !== undefined && phase !== "Q1") return;
  await writeOpeningDefendingEnd(gameId, end);
}

/** 2H default: same as opening (teams have flipped twice by Q3). */
export async function secondHalfDefendingEnd(
  gameId: string,
): Promise<DefendingEnd> {
  return secondHalfDefendingEndFromOpening(await getOpeningDefendingEnd(gameId));
}
