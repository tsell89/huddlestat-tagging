import { PlayType, type PlaylistData } from "@huddlestat/shared";
import { getDb } from "@/lib/db/index";
import {
  applyPlayTypeChange,
  getVisiblePlayerSlots,
} from "@/lib/tagging/playConfig";

export type KickoffRole = "kick" | "receive";

const META_PREFIX = "kickoff_role:";

function metaKey(gameId: string): string {
  return `${META_PREFIX}${gameId}`;
}

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

export function firstKickoffPlayerSlot(draft: PlaylistData) {
  return getVisiblePlayerSlots(draft.playType, draft.result)[0] ?? null;
}
