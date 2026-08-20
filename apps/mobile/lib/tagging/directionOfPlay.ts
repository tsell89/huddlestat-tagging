import { ODK, PlayType, type PlaylistData } from "@huddlestat/shared";
import type { KickoffRole } from "@/lib/tagging/kickoffRoleResolve";

/**
 * Whether the ball is advancing toward the opponent end this possession
 * (drives DirectionOfPlayControl arrow + defend-end layout).
 */
export function isAdvancingTowardOpponent(
  draft: PlaylistData,
  kickoffRole: KickoffRole,
): boolean {
  if (draft.odk === ODK.Offense) return true;
  if (draft.odk === ODK.Defense) return false;
  // Special teams (ODK K): receive → we return toward opp; kick → return comes at us.
  if (
    draft.playType === PlayType.KickoffReceive ||
    kickoffRole === "receive"
  ) {
    return true;
  }
  return false;
}
