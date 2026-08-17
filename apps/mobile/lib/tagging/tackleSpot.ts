import { PlayType, Result, type PlaylistData, type YardLine } from "@huddlestat/shared";
import {
  canStepHudlYardLine,
  FIELD_MIN,
  FIELD_OPP_GOAL,
  FIELD_OWN_GOAL,
  HUDL_END_ZONE,
  fieldPositionToHudl,
  hudlToFieldPosition,
  yardsAdvanced,
  yardsToOpponentGoal,
  yardsToOwnGoal,
} from "./fieldPosition100";
import { formatFieldPosition } from "./kickoffReturn";

export type TackleEnd =
  | { kind: "yardline"; yardLine: YardLine }
  | { kind: "touchdown" }
  | { kind: "safety" };

export function needsTackleSpot(
  playType: PlaylistData["playType"],
  result: PlaylistData["result"],
): boolean {
  if (playType === PlayType.Run) {
    return result === Result.Rush || result === Result.RushTd;
  }
  if (playType === PlayType.Pass) {
    return (
      result === Result.Complete ||
      result === Result.CompleteTd ||
      result === Result.Sack
    );
  }
  return false;
}

export function isTouchdownTackleResult(
  result: PlaylistData["result"],
): boolean {
  return result === Result.RushTd || result === Result.CompleteTd;
}

export function defaultTackleEnd(
  ballSpot: YardLine,
  result: PlaylistData["result"],
): TackleEnd {
  if (isTouchdownTackleResult(result)) {
    return { kind: "touchdown" };
  }
  return { kind: "yardline", yardLine: ballSpot };
}

export function computeTackleGainLoss(
  ballSpot: YardLine,
  end: TackleEnd,
): number {
  if (end.kind === "touchdown") {
    return yardsToOpponentGoal(ballSpot);
  }
  if (end.kind === "safety") {
    return yardsToOwnGoal(ballSpot);
  }
  if (end.kind === "yardline" && Math.round(end.yardLine) === HUDL_END_ZONE) {
    return yardsAdvanced(ballSpot, end.yardLine, "own");
  }
  return yardsAdvanced(ballSpot, end.yardLine);
}

export function formatTackleEndDisplay(end: TackleEnd): string {
  if (end.kind === "touchdown") return "Touchdown";
  if (end.kind === "safety") return "Safety";
  if (Math.round(end.yardLine) === HUDL_END_ZONE) return "Own goal line";
  return formatFieldPosition(end.yardLine);
}

/** Own goal line (0) — confirm safety here. */
export const TACKLE_SLIDER_OWN_GOAL = HUDL_END_ZONE;

/** Left draggable yard line after goal = Own 1 (−1). */
export const TACKLE_SLIDER_OWN_ONE = -1 as YardLine;

/** Right draggable yard line before opp goal = Opp 1 (+1). */
export const TACKLE_SLIDER_OPP_ONE = 1 as YardLine;

/** Green end-zone padding on the field strip (goal line inset from strip edge). */
export const TACKLE_STRIP_END_ZONE_PX = 24;

/** Full field 0–100 (goal line to goal line) → slider ratio 0–1. */
export function tackleFieldPositionToRatio(pos: number): number {
  const p = Math.round(Math.min(FIELD_OPP_GOAL, Math.max(FIELD_OWN_GOAL, pos)));
  if (p <= 50) return (p / 50) * 0.5;
  return 0.5 + ((p - 50) / 50) * 0.5;
}

export function tackleRatioToFieldPosition(ratio: number): number {
  const r = Math.min(1, Math.max(0, ratio));
  if (r <= 0.5) return Math.round((r / 0.5) * 50);
  return Math.round(50 + ((r - 0.5) / 0.5) * 50);
}

export function tackleStripCenterX(trackWidth: number, fieldPos: number): number {
  const fieldWidth = Math.max(0, trackWidth - 2 * TACKLE_STRIP_END_ZONE_PX);
  return TACKLE_STRIP_END_ZONE_PX + tackleFieldPositionToRatio(fieldPos) * fieldWidth;
}

export function tackleStripRatioFromCenterX(
  trackWidth: number,
  centerX: number,
): number {
  const fieldWidth = Math.max(0, trackWidth - 2 * TACKLE_STRIP_END_ZONE_PX);
  if (fieldWidth <= 0) return 0;
  return Math.min(
    1,
    Math.max(0, (centerX - TACKLE_STRIP_END_ZONE_PX) / fieldWidth),
  );
}

export function tackleYardLineToFieldPos(yardLine: YardLine): number {
  const y = Math.round(yardLine);
  if (y === HUDL_END_ZONE) return FIELD_OWN_GOAL;
  return hudlToFieldPosition(yardLine);
}

export function tackleYardLineToRatio(yardLine: YardLine): number {
  return tackleFieldPositionToRatio(tackleYardLineToFieldPos(yardLine));
}

export function tackleRatioToYardLine(ratio: number): YardLine {
  const pos = tackleRatioToFieldPosition(ratio);
  if (pos <= FIELD_OWN_GOAL) return TACKLE_SLIDER_OWN_GOAL;
  // Opponent goal is confirmed separately because Hudl 0 is ambiguous.
  if (pos >= FIELD_OPP_GOAL) return TACKLE_SLIDER_OPP_ONE;
  return fieldPositionToHudl(pos);
}

export function isAtOwnGoalLine(yardLine: YardLine): boolean {
  return Math.round(yardLine) === HUDL_END_ZONE;
}

export function isAtOwnOne(yardLine: YardLine): boolean {
  return Math.round(yardLine) === TACKLE_SLIDER_OWN_ONE;
}

export function isTackleLeftExtreme(yardLine: YardLine): boolean {
  return isAtOwnGoalLine(yardLine);
}

export function isTackleRightExtreme(yardLine: YardLine): boolean {
  if (Math.round(yardLine) === HUDL_END_ZONE) return false;
  return Math.round(yardLine) === TACKLE_SLIDER_OPP_ONE;
}

export function tackleStepYardLine(
  hudl: YardLine,
  deltaInternal: number,
): YardLine {
  const y = Math.round(hudl);
  if (y === HUDL_END_ZONE && deltaInternal > 0) return TACKLE_SLIDER_OWN_ONE;
  if (y === TACKLE_SLIDER_OWN_ONE && deltaInternal < 0) return TACKLE_SLIDER_OWN_GOAL;
  if (y === HUDL_END_ZONE) return TACKLE_SLIDER_OWN_GOAL;
  return fieldPositionToHudl(
    Math.min(
      FIELD_OPP_GOAL - 1,
      Math.max(FIELD_MIN, hudlToFieldPosition(hudl) + deltaInternal),
    ),
  );
}

export function canTackleStepYardLine(
  hudl: YardLine,
  deltaInternal: number,
): boolean {
  const y = Math.round(hudl);
  if (y === HUDL_END_ZONE && deltaInternal > 0) return true;
  if (y === TACKLE_SLIDER_OWN_ONE && deltaInternal < 0) return true;
  if (y === HUDL_END_ZONE) return false;
  return canStepHudlYardLine(hudl, deltaInternal);
}

export function sliderYardLineForTackleEnd(
  end: TackleEnd,
  ballSpot: YardLine,
): YardLine {
  if (end.kind === "yardline") return end.yardLine;
  if (end.kind === "touchdown") return TACKLE_SLIDER_OPP_ONE;
  if (end.kind === "safety") return TACKLE_SLIDER_OWN_GOAL;
  return ballSpot;
}

export function encodeTackleSpotEncoding(
  ballSpot: YardLine,
  end: TackleEnd,
): string {
  const endPart =
    end.kind === "yardline"
      ? String(end.yardLine)
      : end.kind === "touchdown"
        ? "TD"
        : "SA";
  return `tackle:${ballSpot}|end:${endPart}`;
}

export function decodeTackleFromSpotEncoding(
  spotEncoding?: string,
): { ballSpot: YardLine; end: TackleEnd } | null {
  if (!spotEncoding?.startsWith("tackle:")) return null;
  const match = /^tackle:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match) return null;
  const ballSpot = Number(match[1]) as YardLine;
  if (match[2] === "TD") {
    return { ballSpot, end: { kind: "touchdown" } };
  }
  if (match[2] === "SA") {
    return { ballSpot, end: { kind: "safety" } };
  }
  return {
    ballSpot,
    end: { kind: "yardline", yardLine: Number(match[2]) as YardLine },
  };
}

export function initTackleEndFromDraft(draft: PlaylistData): TackleEnd {
  const decoded = decodeTackleFromSpotEncoding(draft.spotEncoding);
  if (decoded) return decoded.end;

  if (isTouchdownTackleResult(draft.result)) {
    return { kind: "touchdown" };
  }

  if (draft.gainLoss !== 0) {
    const endPos = hudlToFieldPosition(draft.yardLine) + draft.gainLoss;
    if (endPos >= FIELD_OPP_GOAL) return { kind: "touchdown" };
    if (endPos <= FIELD_OWN_GOAL) return { kind: "safety" };
    return {
      kind: "yardline",
      yardLine: fieldPositionToHudl(
        Math.min(FIELD_OPP_GOAL - 1, Math.max(FIELD_MIN, endPos)),
      ),
    };
  }

  return defaultTackleEnd(draft.yardLine, draft.result);
}

export function applyTackleSpotToDraft(
  draft: PlaylistData,
  end: TackleEnd,
): PlaylistData {
  if (!needsTackleSpot(draft.playType, draft.result)) {
    return draft;
  }

  const normalizedEnd: TackleEnd =
    draft.result === Result.Sack && end.kind === "touchdown"
      ? { kind: "yardline", yardLine: TACKLE_SLIDER_OPP_ONE }
      : end;
  const gainLoss = computeTackleGainLoss(draft.yardLine, normalizedEnd);
  const result = resultForTackleEnd(draft, normalizedEnd);
  return {
    ...draft,
    result,
    gainLoss,
    spotEncoding: encodeTackleSpotEncoding(draft.yardLine, normalizedEnd),
  };
}

function resultForTackleEnd(
  draft: PlaylistData,
  end: TackleEnd,
): PlaylistData["result"] {
  if (end.kind === "touchdown") {
    return draft.playType === PlayType.Run ? Result.RushTd : Result.CompleteTd;
  }
  if (end.kind === "safety") {
    // Keep Rush/Complete/Sack. end:SA carries the scoring semantic without
    // losing the underlying play result.
    return draft.result;
  }

  if (draft.playType === PlayType.Run) {
    if (draft.result === Result.RushTd) {
      return Result.Rush;
    }
  }
  if (draft.playType === PlayType.Pass) {
    if (draft.result === Result.CompleteTd) return Result.Complete;
  }
  return draft.result;
}
