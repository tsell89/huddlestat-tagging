import { PlayType, type PlaylistData } from "@huddlestat/shared";
import { getDb } from "@/lib/db/index";
import {
  applyPlayTypeChange,
  getVisiblePlayerSlots,
} from "@/lib/tagging/playConfig";
import {
  isKickoffDraft,
  oppositeKickoffRole,
  resolveKickoffRoleAfterSave,
  secondHalfKickoffRoleFromOpening,
  type KickoffRole,
} from "@/lib/tagging/kickoffRoleResolve";

export type { KickoffRole } from "@/lib/tagging/kickoffRoleResolve";
export {
  isKickoffDraft,
  oppositeKickoffRole,
  resolveKickoffRoleAfterSave,
  secondHalfKickoffRoleFromOpening,
};

export function kickoffPlayTypeForRole(role: KickoffRole): typeof PlayType.Kickoff | typeof PlayType.KickoffReceive {
  return role === "kick" ? PlayType.Kickoff : PlayType.KickoffReceive;
}

export function kickoffRoleFromDraft(draft: PlaylistData): KickoffRole {
  return draft.playType === PlayType.KickoffReceive ? "receive" : "kick";
}

export function applyKickoffRole(
  draft: PlaylistData,
  role: KickoffRole,
): PlaylistData {
  const playType = kickoffPlayTypeForRole(role);
  if (draft.playType === playType) return draft;
  return applyPlayTypeChange({ ...draft, playType }, playType);
}

const META_PREFIX = "kickoff_role:";
const OPENING_META_PREFIX = "opening_kickoff_role:";

function metaKey(gameId: string): string {
  return `${META_PREFIX}${gameId}`;
}

function openingMetaKey(gameId: string): string {
  return `${OPENING_META_PREFIX}${gameId}`;
}

export async function getKickoffRole(gameId: string): Promise<KickoffRole> {
  const database = getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [metaKey(gameId)],
  );
  return row?.value === "receive" ? "receive" : "kick";
}

export async function setKickoffRole(
  gameId: string,
  role: KickoffRole,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
    [metaKey(gameId), role],
  );
}

/** Opening coin toss choice — persisted once per game for 2H opposite default. */
export async function getOpeningKickoffRole(
  gameId: string,
): Promise<KickoffRole | null> {
  const database = getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = ?`,
    [openingMetaKey(gameId)],
  );
  if (!row) return null;
  return row.value === "receive" ? "receive" : "kick";
}

async function writeOpeningKickoffRole(
  gameId: string,
  role: KickoffRole,
): Promise<void> {
  const database = getDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
    [openingMetaKey(gameId), role],
  );
}

/** Backfill opening choice from play 1 when resuming a game (write once). */
export async function recordOpeningKickoffRole(
  gameId: string,
  role: KickoffRole,
): Promise<void> {
  const existing = await getOpeningKickoffRole(gameId);
  if (existing !== null) return;
  await writeOpeningKickoffRole(gameId, role);
}

/**
 * Persist coin-toss choice from the kickoff toggle.
 * Overwritable until the first play is saved; locked after that.
 */
export async function persistOpeningKickoffRole(
  gameId: string,
  role: KickoffRole,
  savedPlayCount: number,
): Promise<void> {
  const existing = await getOpeningKickoffRole(gameId);
  if (existing !== null && savedPlayCount > 0) return;
  await writeOpeningKickoffRole(gameId, role);
}

/** 2H kickoff default: opposite of opening coin toss (defer convention). */
export async function secondHalfKickoffRole(
  gameId: string,
): Promise<KickoffRole> {
  return secondHalfKickoffRoleFromOpening(await getOpeningKickoffRole(gameId));
}

export function firstKickoffPlayerSlot(draft: PlaylistData) {
  return getVisiblePlayerSlots(draft.playType, draft.result)[0] ?? null;
}
