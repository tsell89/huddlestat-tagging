import { ODK, PlayType, Result, type PlaylistData } from "@huddlestat/shared";

export type KickoffRole = "kick" | "receive";

export function isKickoffDraft(draft: PlaylistData): boolean {
  return (
    draft.playType === PlayType.Kickoff ||
    draft.playType === PlayType.KickoffReceive
  );
}

function isScoringGood(play: Pick<PlaylistData, "playType" | "result">): boolean {
  return (
    play.result === Result.Good &&
    (play.playType === PlayType.FieldGoal ||
      play.playType === PlayType.ExtraPoint ||
      play.playType === PlayType.TwoPoint)
  );
}

function isPatBlockComplete(
  play: Pick<PlaylistData, "playType" | "result" | "odk">,
): boolean {
  return (
    play.odk === ODK.Defense &&
    play.result === Result.Blocked &&
    (play.playType === PlayType.ExtraPointBlock ||
      play.playType === PlayType.TwoPointBlock)
  );
}

/** UX-14: default kickoff role after a scoring play when the chain next snap is kickoff. */
export function resolveKickoffRoleAfterSave(
  savedPlay: PlaylistData,
  nextChainDraft: PlaylistData,
  currentRole: KickoffRole,
): KickoffRole {
  if (!isKickoffDraft(nextChainDraft)) {
    return currentRole;
  }

  if (savedPlay.odk === ODK.Offense && isScoringGood(savedPlay)) {
    return "kick";
  }

  if (savedPlay.odk === ODK.Defense && isScoringGood(savedPlay)) {
    return "receive";
  }

  if (isPatBlockComplete(savedPlay)) {
    return "receive";
  }

  return currentRole;
}
