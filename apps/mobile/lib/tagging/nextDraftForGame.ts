import {
  defaultHsOtPossessionSnap,
  liveDraftFromLastPlay,
  nextDraftAfterPlay,
  ODK,
  type PlayChainOptions,
  type PlaylistData,
} from "@huddlestat/shared";
import type { GamePhase, OtPossession } from "@huddlestat/shared";

export function playChainOptionsForGame(phase: GamePhase): PlayChainOptions | undefined {
  if (phase === "OT") {
    return { rules: "HS", overtime: true };
  }
  return undefined;
}

export function nextDraftForGame(
  lastPlay: PlaylistData,
  nextPlayNumber: number,
  team: string,
  phase: GamePhase,
): PlaylistData {
  return liveDraftFromLastPlay(
    lastPlay,
    nextPlayNumber,
    team,
    playChainOptionsForGame(phase),
  );
}

export function nextDraftAfterPlayForGame(
  savedPlay: PlaylistData,
  nextPlayNumber: number,
  team: string,
  phase: GamePhase,
): PlaylistData {
  return nextDraftAfterPlay(
    savedPlay,
    nextPlayNumber,
    team,
    playChainOptionsForGame(phase),
  );
}

/** First OT snap after Start OT modal (HS alternating possession @ the 10). */
export function defaultOtOpeningDraft(
  playNumber: number,
  team: string,
  otPossession: OtPossession,
): PlaylistData {
  const odk = otPossession === "us" ? ODK.Offense : ODK.Defense;
  return {
    ...defaultHsOtPossessionSnap(playNumber, team, odk),
    quarter: 5,
  };
}
