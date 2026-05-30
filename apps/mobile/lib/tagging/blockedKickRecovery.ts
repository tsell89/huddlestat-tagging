import { PlayType, Result, type PlaylistData, type YardLine } from "@huddlestat/shared";
import {
  FIELD_MIN,
  FIELD_OPP_GOAL,
  fieldPositionToHudl,
  hudlToFieldPosition,
  yardsAdvanced,
} from "@/lib/tagging/fieldPosition100";
import {
  clampToRange,
  computeReturnYards,
  returnEndHudlYardLine,
  returnEndZoneSide,
  type ReturnEnd,
} from "@/lib/tagging/kickoffReturn";
import {
  PUNT_RETURNED_DEFAULT,
  RECEIVED_DEFAULT,
  receivedRatioToYardLine,
  receivedYardLineToRatio,
} from "@/lib/tagging/puntReturn";

export type BlockedKickRecoverySpots = {
  recoveredAt: YardLine;
  returnEnd: ReturnEnd;
};

export function defaultBlockedKickRecoverySpots(
  ballSpot: YardLine,
): BlockedKickRecoverySpots {
  const pos = hudlToFieldPosition(ballSpot);
  const recoverPos = Math.max(FIELD_MIN, pos - 5);
  return {
    recoveredAt: fieldPositionToHudl(recoverPos),
    returnEnd: { kind: "yardline", yardLine: PUNT_RETURNED_DEFAULT },
  };
}

export function encodeBlockedKickSpotEncoding(
  spots: BlockedKickRecoverySpots,
): string {
  const endPart =
    spots.returnEnd.kind === "yardline"
      ? String(returnEndHudlYardLine(spots.returnEnd))
      : spots.returnEnd.kind === "touchdown"
        ? "TD"
        : "SA";
  return `recover:${spots.recoveredAt}|end:${endPart}`;
}

export function decodeBlockedKickFromSpotEncoding(
  spotEncoding?: string,
): BlockedKickRecoverySpots | null {
  if (!spotEncoding?.startsWith("recover:")) return null;
  const match = /^recover:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match) return null;
  const recoveredAt = Number(match[1]) as YardLine;
  if (match[2] === "TD") {
    return { recoveredAt, returnEnd: { kind: "touchdown" } };
  }
  if (match[2] === "SA") {
    return { recoveredAt, returnEnd: { kind: "safety" } };
  }
  return {
    recoveredAt,
    returnEnd: {
      kind: "yardline",
      yardLine: Number(match[2]) as YardLine,
    },
  };
}

export function initBlockedKickSpotsFromDraft(
  draft: PlaylistData | null,
): BlockedKickRecoverySpots {
  const ballSpot = draft?.yardLine ?? RECEIVED_DEFAULT;
  if (
    !draft ||
    (draft.playType !== PlayType.Punt && draft.playType !== PlayType.FieldGoal) ||
    draft.result !== Result.Blocked
  ) {
    return defaultBlockedKickRecoverySpots(ballSpot);
  }
  const decoded = decodeBlockedKickFromSpotEncoding(draft.spotEncoding);
  if (decoded) return decoded;
  return defaultBlockedKickRecoverySpots(ballSpot);
}

export function applyBlockedKickSpotsToDraft(
  draft: PlaylistData,
  spots: BlockedKickRecoverySpots,
): PlaylistData {
  if (
    (draft.playType !== PlayType.Punt && draft.playType !== PlayType.FieldGoal) ||
    draft.result !== Result.Blocked
  ) {
    return draft;
  }
  const returnYards = computeReturnYards(spots.recoveredAt, spots.returnEnd);
  const endYard = returnEndHudlYardLine(spots.returnEnd);
  const gainLoss = yardsAdvanced(
    draft.yardLine,
    endYard,
    returnEndZoneSide(spots.returnEnd),
  );
  return {
    ...draft,
    returnYards,
    gainLoss,
    spotEncoding: encodeBlockedKickSpotEncoding(spots),
  };
}

export { PUNT_RETURNED_DEFAULT } from "@/lib/tagging/puntReturn";
export {
  formatReturnEndDisplay,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
} from "@/lib/tagging/kickoffReturn";
export {
  receivedRatioToYardLine,
  receivedYardLineToRatio,
} from "@/lib/tagging/puntReturn";
