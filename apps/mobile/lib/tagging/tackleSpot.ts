import { PlayType, Result, type PlaylistData, type YardLine } from "@huddlestat/shared";
import {
  FIELD_MIN,
  FIELD_OPP_GOAL,
  FIELD_OWN_GOAL,
  fieldPositionToHudl,
  hudlToFieldPosition,
  yardsAdvanced,
  yardsToOpponentGoal,
  yardsToOwnGoal,
} from "@/lib/tagging/fieldPosition100";
import { formatFieldPosition } from "@/lib/tagging/kickoffReturn";

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
  return yardsAdvanced(ballSpot, end.yardLine);
}

export function formatTackleEndDisplay(end: TackleEnd): string {
  if (end.kind === "touchdown") return "Touchdown";
  if (end.kind === "safety") return "Safety";
  return formatFieldPosition(end.yardLine);
}

/** Left end of tackle slider = Own 1 (−1). */
export const TACKLE_SLIDER_OWN_ONE = -1 as YardLine;

/** Right end of tackle slider = Opp 1 (+1). */
export const TACKLE_SLIDER_OPP_ONE = 1 as YardLine;

export function isTackleLeftExtreme(yardLine: YardLine): boolean {
  return hudlToFieldPosition(yardLine) <= FIELD_MIN;
}

export function isTackleRightExtreme(yardLine: YardLine): boolean {
  return hudlToFieldPosition(yardLine) >= FIELD_OPP_GOAL - 1;
}

export function sliderYardLineForTackleEnd(
  end: TackleEnd,
  ballSpot: YardLine,
): YardLine {
  if (end.kind === "yardline") return end.yardLine;
  if (end.kind === "touchdown") return TACKLE_SLIDER_OPP_ONE;
  if (end.kind === "safety") return TACKLE_SLIDER_OWN_ONE;
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

  const gainLoss = computeTackleGainLoss(draft.yardLine, end);
  return {
    ...draft,
    gainLoss,
    spotEncoding: encodeTackleSpotEncoding(draft.yardLine, end),
  };
}
