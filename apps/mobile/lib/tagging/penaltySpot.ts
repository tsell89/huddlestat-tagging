import {
  HOLDING_PENALTY_YARDS,
  decodePenaltyFoulSpot,
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

export function defaultPenaltyFoulSpot(ballSpot: YardLine): YardLine {
  return ballSpot;
}

export function encodePenaltySpotEncoding(foulSpot: YardLine): string {
  return `foul:${foulSpot}`;
}

export function initPenaltyFoulSpotFromDraft(
  draft: PlaylistData | null,
): YardLine {
  const ballSpot = draft?.yardLine ?? (-25 as YardLine);
  if (!draft || draft.result !== Result.Penalty) {
    return defaultPenaltyFoulSpot(ballSpot);
  }
  return decodePenaltyFoulSpot(draft.spotEncoding) ?? defaultPenaltyFoulSpot(ballSpot);
}

export function applyPenaltySpotToDraft(
  draft: PlaylistData,
  foulSpot: YardLine,
): PlaylistData {
  if (draft.result !== Result.Penalty) return draft;
  return {
    ...draft,
    gainLoss: 0,
    spotEncoding: encodePenaltySpotEncoding(foulSpot),
  };
}

export function foulYardLineToRatio(yardLine: YardLine): number {
  return fieldYardLineToRatio(yardLine);
}

export function foulRatioToYardLine(ratio: number): YardLine {
  return clampToRange(fieldRatioToYardLine(ratio), RETURNED_MIN, RETURNED_MAX);
}
