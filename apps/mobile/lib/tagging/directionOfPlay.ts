/**
 * Whether the ball is advancing toward the opponent end this possession
 * (drives DirectionOfPlayControl arrow + defend-end layout).
 *
 * COP / return exceptions mirror INT handling: when the ball flips and is
 * returned toward our end (or we return toward theirs), arrow must follow
 * the live ball — not the pre-play ODK shell.
 */
import {
  decodeFumbleSpotEncoding,
  ODK,
  PlayType,
  Result,
  type PlaylistData,
} from "@huddlestat/shared";
import type { KickoffRole } from "@/lib/tagging/kickoffRoleResolve";

function isDefenseFumbleRecovery(draft: PlaylistData): boolean {
  return (
    draft.result === Result.Fumble &&
    decodeFumbleSpotEncoding(draft.spotEncoding)?.recoveredBy === "defense"
  );
}

function isBlockedKick(
  draft: PlaylistData,
): draft is PlaylistData & { playType: typeof PlayType.Punt | typeof PlayType.FieldGoal } {
  return (
    draft.result === Result.Blocked &&
    (draft.playType === PlayType.Punt || draft.playType === PlayType.FieldGoal)
  );
}

export function isAdvancingTowardOpponent(
  draft: PlaylistData,
  kickoffRole: KickoffRole,
): boolean {
  // Our pass intercepted — return goes toward our defending end.
  if (draft.odk === ODK.Offense && draft.result === Result.Interception) {
    return false;
  }
  // Defense recovers our fumble — return toward our end.
  if (draft.odk === ODK.Offense && isDefenseFumbleRecovery(draft)) {
    return false;
  }
  // Their return of our punt — toward our end.
  if (
    draft.odk === ODK.Offense &&
    draft.playType === PlayType.Punt &&
    draft.result === Result.Return
  ) {
    return false;
  }
  // Blocked kick recovered / returned toward our end (usual HS path).
  if (draft.odk === ODK.Offense && isBlockedKick(draft)) {
    return false;
  }
  if (draft.odk === ODK.Offense) return true;

  // Our defensive / special-teams returns advance toward the opponent end.
  if (draft.result === Result.Interception) {
    return true;
  }
  if (isDefenseFumbleRecovery(draft)) {
    return true;
  }
  if (
    draft.playType === PlayType.KickoffReceive ||
    draft.playType === PlayType.PuntReceive
  ) {
    return true;
  }
  // We return / recover their punt or FG.
  if (
    draft.odk === ODK.Defense &&
    (draft.playType === PlayType.Punt || draft.playType === PlayType.FieldGoal) &&
    (draft.result === Result.Return || draft.result === Result.Blocked)
  ) {
    return true;
  }

  if (draft.odk === ODK.Defense) return false;

  // Special teams kickoff (ODK K): receive role → we return toward opp.
  if (kickoffRole === "receive") return true;
  return false;
}
