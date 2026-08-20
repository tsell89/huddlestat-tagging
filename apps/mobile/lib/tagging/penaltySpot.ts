import {
  HOLDING_PENALTY_YARDS,
  PENALTY_YARD_OPTIONS,
  decodePenalty,
  decodePenaltyFoulSpot,
  encodePenaltySpotEncoding,
  type DecodedPenalty,
  type PenaltyAgainst,
  type PenaltyYards,
  type PlaylistData,
  type YardLine,
} from "@huddlestat/shared";
import { Result } from "@huddlestat/shared";
import {
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  clampToRange,
  RETURNED_MIN,
  RETURNED_MAX,
} from "@/lib/tagging/kickoffReturn";

export const HOLDING_YARDS = HOLDING_PENALTY_YARDS;
export { PENALTY_YARD_OPTIONS };
export type { PenaltyAgainst, PenaltyYards, DecodedPenalty };

export type PenaltyDraftFields = {
  foulSpot: YardLine;
  yards: PenaltyYards;
  against: PenaltyAgainst;
  autoFirstDown: boolean;
};

export function defaultPenaltyFoulSpot(ballSpot: YardLine): YardLine {
  return ballSpot;
}

export function defaultPenaltyDraft(ballSpot: YardLine): PenaltyDraftFields {
  return {
    foulSpot: defaultPenaltyFoulSpot(ballSpot),
    yards: HOLDING_PENALTY_YARDS,
    against: "O",
    autoFirstDown: false,
  };
}

/** Default AFD when switching Against — D on, O off (manual toggle still allowed after). */
export function autoFirstDownWhenAgainst(against: PenaltyAgainst): boolean {
  return against === "D";
}

export function initPenaltyDraftFromPlay(
  draft: PlaylistData | null,
): PenaltyDraftFields {
  const ballSpot = draft?.yardLine ?? (-25 as YardLine);
  if (!draft || draft.result !== Result.Penalty) {
    return defaultPenaltyDraft(ballSpot);
  }
  const decoded = decodePenalty(draft.spotEncoding);
  if (!decoded) return defaultPenaltyDraft(ballSpot);
  return {
    foulSpot: decoded.foulSpot,
    yards: decoded.yards,
    against: decoded.against,
    autoFirstDown: decoded.autoFirstDown,
  };
}

/** @deprecated Prefer initPenaltyDraftFromPlay */
export function initPenaltyFoulSpotFromDraft(
  draft: PlaylistData | null,
): YardLine {
  return initPenaltyDraftFromPlay(draft).foulSpot;
}

export function applyPenaltyDraftToPlay(
  draft: PlaylistData,
  penalty: PenaltyDraftFields,
): PlaylistData {
  if (draft.result !== Result.Penalty) return draft;
  return {
    ...draft,
    gainLoss: 0,
    spotEncoding: encodePenaltySpotEncoding(penalty),
  };
}

/** @deprecated Prefer applyPenaltyDraftToPlay */
export function applyPenaltySpotToDraft(
  draft: PlaylistData,
  foulSpot: YardLine,
): PlaylistData {
  const current = initPenaltyDraftFromPlay(draft);
  return applyPenaltyDraftToPlay(draft, { ...current, foulSpot });
}

export function foulYardLineToRatio(yardLine: YardLine): number {
  return fieldYardLineToRatio(yardLine);
}

export function foulRatioToYardLine(ratio: number): YardLine {
  return clampToRange(fieldRatioToYardLine(ratio), RETURNED_MIN, RETURNED_MAX);
}

/** Keep decode available for callers that only need the spot. */
export { decodePenaltyFoulSpot };
