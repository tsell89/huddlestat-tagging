import {
  PlayType,
  Result,
  HS_TOUCHBACK_YARD_LINE,
  type PlaylistData,
  type YardLine,
} from "@huddlestat/shared";
import {
  FIELD_MIN,
  FIELD_OPP_GOAL,
  FIELD_OWN_GOAL,
  HUDL_END_ZONE,
  HUDL_MIDFIELD,
  fieldPositionToHudl,
  hudlToFieldPosition,
  hudlToSliderRatio,
  sliderRatioToHudl,
  yardsAdvanced,
  yardsToOpponentGoal,
  yardsToOwnGoal,
  type EndZoneSide,
} from "@/lib/tagging/fieldPosition100";

export type ReturnEnd =
  | { kind: "yardline"; yardLine: YardLine }
  | { kind: "endzone"; side: "own" | "opponent" }
  | { kind: "touchdown" }
  | { kind: "safety" };

export function encodeReturnEndPart(end: ReturnEnd): string {
  if (end.kind === "yardline") return String(end.yardLine);
  if (end.kind === "touchdown") return "TD";
  if (end.kind === "safety") return "SA";
  return end.side === "own" ? "0" : "1";
}

export type KickoffReturnSpots = {
  caughtAt: YardLine;
  returnEnd: ReturnEnd;
};

/** Hudl: own −49…−1, mid 50, opp +49…+1, end zone 0 (TD or safety — use ReturnEnd.kind) */
export const FIELD_LEFT = -1 as YardLine;
export const FIELD_MID = HUDL_MIDFIELD;
export const FIELD_GOAL = HUDL_END_ZONE;

export const CAUGHT_MIN = -49 as YardLine;
export const CAUGHT_MAX = 49 as YardLine;
export const CAUGHT_DEFAULT = -5 as YardLine;
export const KICK_CAUGHT_DEFAULT = 5 as YardLine;

export const RETURNED_MIN = -49 as YardLine;
export const RETURNED_MAX = 49 as YardLine;
export const RETURNED_DEFAULT = -25 as YardLine;
export const KICK_RETURNED_DEFAULT = 25 as YardLine;

export function defaultKickoffReturnSpots(
  weKicked = false,
): KickoffReturnSpots {
  if (weKicked) {
    return {
      caughtAt: KICK_CAUGHT_DEFAULT,
      returnEnd: { kind: "yardline", yardLine: KICK_RETURNED_DEFAULT },
    };
  }
  return {
    caughtAt: CAUGHT_DEFAULT,
    returnEnd: { kind: "yardline", yardLine: RETURNED_DEFAULT },
  };
}

export function fieldYardLineToRatio(yardLine: YardLine): number {
  return hudlToSliderRatio(yardLine);
}

export function fieldRatioToYardLine(ratio: number): YardLine {
  return sliderRatioToHudl(ratio);
}

export function caughtYardLineToRatio(yardLine: YardLine): number {
  return fieldYardLineToRatio(clampToRange(yardLine, CAUGHT_MIN, CAUGHT_MAX));
}

export function caughtRatioToYardLine(ratio: number): YardLine {
  const y = fieldRatioToYardLine(ratio);
  return clampToRange(y, CAUGHT_MIN, CAUGHT_MAX);
}

export function returnedYardLineToRatio(yardLine: YardLine): number {
  return fieldYardLineToRatio(yardLine);
}

export function returnedRatioToYardLine(ratio: number): YardLine {
  return clampToRange(fieldRatioToYardLine(ratio), RETURNED_MIN, RETURNED_MAX);
}

export function clampToRange(n: number, min: number, max: number): YardLine {
  return Math.min(max, Math.max(min, Math.round(n))) as YardLine;
}

export function returnEndHudlYardLine(returnEnd: ReturnEnd): YardLine {
  if (returnEnd.kind === "yardline") return returnEnd.yardLine;
  if (returnEnd.kind === "endzone") {
    return returnEnd.side === "own" ? FIELD_GOAL : (1 as YardLine);
  }
  return FIELD_GOAL;
}

export function returnEndZoneSide(returnEnd: ReturnEnd): EndZoneSide | undefined {
  if (returnEnd.kind === "safety" || (returnEnd.kind === "endzone" && returnEnd.side === "own")) {
    return "own";
  }
  if (
    returnEnd.kind === "touchdown" ||
    (returnEnd.kind === "endzone" && returnEnd.side === "opponent")
  ) {
    return "opponent";
  }
  return undefined;
}

export function yardLineAfterPlay(
  play: Pick<
    PlaylistData,
    "playType" | "result" | "yardLine" | "gainLoss" | "spotEncoding"
  >,
): YardLine {
  if (play.playType === PlayType.Kickoff) {
    if (play.result === Result.Touchback) {
      return HS_TOUCHBACK_YARD_LINE;
    }
    if (play.result === Result.Return) {
      const spots = decodeKickoffReturnFromSpotEncoding(play.spotEncoding);
      if (spots) {
        return returnEndHudlYardLine(spots.returnEnd);
      }
    }
  }
  const endPos = hudlToFieldPosition(play.yardLine) + play.gainLoss;
  return fieldPositionToHudl(endPos);
}

export function computeReturnYards(
  caughtAt: YardLine,
  returnEnd: ReturnEnd,
  weKicked = false,
): number {
  if (
    returnEnd.kind === "touchdown" ||
    (returnEnd.kind === "endzone" && returnEnd.side === "opponent")
  ) {
    return weKicked ? yardsToOwnGoal(caughtAt) : yardsToOpponentGoal(caughtAt);
  }
  if (
    returnEnd.kind === "safety" ||
    (returnEnd.kind === "endzone" && returnEnd.side === "own")
  ) {
    return weKicked ? yardsToOpponentGoal(caughtAt) : yardsToOwnGoal(caughtAt);
  }
  if (returnEnd.kind !== "yardline") return 0;
  const raw = yardsAdvanced(
    caughtAt,
    returnEnd.yardLine,
    returnEndZoneSide(returnEnd),
  );
  return weKicked ? -raw : raw;
}

export function formatFieldPosition(yardLine: YardLine): string {
  if (yardLine === FIELD_GOAL) return "0";
  if (yardLine === FIELD_MID) return "50";
  if (yardLine < 0) return `Own ${Math.abs(yardLine)}`;
  return `Opp ${yardLine}`;
}

export function formatReturnEndDisplay(returnEnd: ReturnEnd): string {
  if (
    returnEnd.kind === "touchdown" ||
    (returnEnd.kind === "endzone" && returnEnd.side === "opponent")
  ) {
    return "Touchdown";
  }
  if (
    returnEnd.kind === "safety" ||
    (returnEnd.kind === "endzone" && returnEnd.side === "own")
  ) {
    return "Safety";
  }
  if (returnEnd.kind !== "yardline") return "Safety";
  return formatFieldPosition(returnEnd.yardLine);
}

export function encodeKickoffReturnSpotEncoding(spots: KickoffReturnSpots): string {
  return `catch:${spots.caughtAt}|end:${encodeReturnEndPart(spots.returnEnd)}`;
}

export function decodeKickoffReturnFromSpotEncoding(
  spotEncoding?: string,
): KickoffReturnSpots | null {
  if (!spotEncoding?.startsWith("catch:")) return null;
  const match = /^catch:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match) return null;
  const caughtAt = Number(match[1]) as YardLine;
  if (match[2] === "TD") {
    return { caughtAt, returnEnd: { kind: "touchdown" } };
  }
  if (match[2] === "SA") {
    return { caughtAt, returnEnd: { kind: "safety" } };
  }
  return {
    caughtAt,
    returnEnd: {
      kind: "yardline",
      yardLine: Number(match[2]) as YardLine,
    },
  };
}

export function spotsFromSavedReturn(
  returnYards: number | undefined,
  spotEncoding?: string,
  weKicked = false,
): KickoffReturnSpots {
  const decoded = decodeKickoffReturnFromSpotEncoding(spotEncoding);
  if (decoded) return decoded;
  const yards = returnYards ?? 0;
  if (yards === 0) return defaultKickoffReturnSpots(weKicked);
  const catchDefault = weKicked ? KICK_CAUGHT_DEFAULT : CAUGHT_DEFAULT;
  const endPos = hudlToFieldPosition(catchDefault) + (weKicked ? -yards : yards);
  return {
    caughtAt: catchDefault,
    returnEnd: {
      kind: "yardline",
      yardLine: fieldPositionToHudl(
        Math.min(FIELD_OPP_GOAL - 1, Math.max(FIELD_MIN, endPos)),
      ),
    },
  };
}

export function initKickoffSpotsFromDraft(
  draft: PlaylistData | null,
): KickoffReturnSpots {
  const weKicked = draft?.playType === PlayType.Kickoff;
  if (!draft) return defaultKickoffReturnSpots(false);
  if (draft.result === Result.Touchback) {
    return defaultKickoffReturnSpots(weKicked);
  }
  return spotsFromSavedReturn(draft.returnYards, draft.spotEncoding, weKicked);
}

/** HS kickoff touchback gross yards (kick spot → end zone). */
const KICKOFF_TOUCHBACK_YARDS = 60;

export function applyKickoffSpotsToDraft(
  draft: PlaylistData,
  spots: KickoffReturnSpots,
): PlaylistData {
  if (draft.result === Result.Touchback) {
    return {
      ...draft,
      returnYards: 0,
      gainLoss: 0,
      kickYards: KICKOFF_TOUCHBACK_YARDS,
      spotEncoding: undefined,
    };
  }
  if (draft.result !== Result.Return) {
    return draft;
  }
  const weKicked = draft.playType === PlayType.Kickoff;
  const returnYards = computeReturnYards(
    spots.caughtAt,
    spots.returnEnd,
    weKicked,
  );
  const kickYards = yardsAdvanced(draft.yardLine, spots.caughtAt);
  return {
    ...draft,
    returnYards,
    gainLoss: returnYards,
    kickYards,
    spotEncoding: encodeKickoffReturnSpotEncoding(spots),
  };
}

export function touchbackDraftPatch(draft: PlaylistData): PlaylistData {
  return {
    ...draft,
    returnYards: 0,
    gainLoss: 0,
    spotEncoding: undefined,
    returner: { jersey: "", name: "" },
    tackler1: { jersey: "", name: "" },
    tackler2: { jersey: "", name: "" },
  };
}

export function kickoffSlotLabel(
  slot: "kicker" | "returner" | "tackler1" | "tackler2" | string,
): string {
  if (slot === "tackler1" || slot === "tackler2") return "Tackler";
  if (slot === "kicker") return "Kicker";
  if (slot === "returner") return "Returner";
  return slot;
}

export {
  FIELD_OPP_GOAL,
  FIELD_OWN_GOAL,
  HUDL_END_ZONE,
  HUDL_MIDFIELD,
  fieldPositionToHudl,
  hudlToFieldPosition,
  yardsAdvanced,
  yardsToOpponentGoal,
  yardsToOwnGoal,
  type EndZoneSide,
} from "@/lib/tagging/fieldPosition100";
