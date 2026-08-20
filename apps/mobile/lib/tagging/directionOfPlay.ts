import { ODK, PlayType, Result, type PlaylistData } from "@huddlestat/shared";
import type { KickoffRole } from "@/lib/tagging/kickoffRoleResolve";

/**
 * Whether the ball is advancing toward the opponent end this possession
 * (drives DirectionOfPlayControl arrow + defend-end layout).
 */
export function isAdvancingTowardOpponent(
  draft: PlaylistData,
  kickoffRole: KickoffRole,
): boolean {
  // Our pass intercepted — return goes toward our defending end.
  if (draft.odk === ODK.Offense && draft.result === Result.Interception) {
    return false;
  }
  if (draft.odk === ODK.Offense) return true;

  // Our defensive / special-teams returns advance toward the opponent end.
  if (
    draft.result === Result.Interception ||
    draft.playType === PlayType.KickoffReceive ||
    draft.playType === PlayType.PuntReceive
  ) {
    return true;
  }

  if (draft.odk === ODK.Defense) return false;

  // Special teams kickoff (ODK K): receive role → we return toward opp.
  if (kickoffRole === "receive") return true;
  return false;
}
