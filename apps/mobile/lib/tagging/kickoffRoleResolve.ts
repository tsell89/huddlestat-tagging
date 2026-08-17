import { ODK, PlayType, Result, type PlaylistData } from "@huddlestat/shared";
import { applyPlayTypeChange, getVisiblePlayerSlots } from "./playConfig";

export type KickoffRole = "kick" | "receive";

export function kickoffPlayTypeForRole(
  role: KickoffRole,
): typeof PlayType.Kickoff | typeof PlayType.KickoffReceive {
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

export function firstKickoffPlayerSlot(draft: PlaylistData) {
  return getVisiblePlayerSlots(draft.playType, draft.result)[0] ?? null;
}

export function oppositeKickoffRole(role: KickoffRole): KickoffRole {
  return role === "kick" ? "receive" : "kick";
}

/** 2H kickoff default: opposite of opening coin toss (defer convention). */
export function secondHalfKickoffRoleFromOpening(
  opening: KickoffRole | null,
): KickoffRole {
  if (opening === null) return "receive";
  return oppositeKickoffRole(opening);
}

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
