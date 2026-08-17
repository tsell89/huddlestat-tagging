import {
  ODK,
  PlayType,
  Result,
  type PlaylistData,
  type YardLine,
} from "@huddlestat/shared";
import {
  decodeFumbleSpotEncoding,
  type FumbleRecoverySide,
} from "@huddlestat/shared";
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
  encodeReturnEndPart,
  returnEndHudlYardLine,
  returnEndZoneSide,
  type ReturnEnd,
} from "@/lib/tagging/kickoffReturn";
import {
  isPendingTackleConfirm,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";

export type FumbleRecoverySpots = {
  fumbleAt: YardLine;
  recoveredBy: FumbleRecoverySide;
  recoveredAt: YardLine;
  returnEnd: ReturnEnd;
};

export function fumbleReturnEndToTackleEnd(end: ReturnEnd): TackleEnd {
  if (end.kind === "touchdown") return { kind: "touchdown" };
  if (end.kind === "safety") return { kind: "safety" };
  if (end.kind === "endzone") return { kind: "endzone", side: end.side };
  return { kind: "yardline", yardLine: end.yardLine };
}

export function tackleEndToFumbleReturnEnd(end: TackleEnd): ReturnEnd {
  if (end.kind === "touchdown") return { kind: "touchdown" };
  if (end.kind === "safety") return { kind: "safety" };
  if (end.kind === "endzone") return { kind: "endzone", side: end.side };
  return { kind: "yardline", yardLine: end.yardLine };
}

/** Defense return dragged into an EZ but not yet confirmed as TD / safety. */
export function isPendingFumbleReturnConfirm(
  spots: FumbleRecoverySpots,
): boolean {
  if (spots.recoveredBy !== "defense") return false;
  return isPendingTackleConfirm(fumbleReturnEndToTackleEnd(spots.returnEnd));
}

export function defaultFumbleRecoverySpots(
  ballSpot: YardLine,
): FumbleRecoverySpots {
  const pos = hudlToFieldPosition(ballSpot);
  const fumblePos = Math.min(FIELD_OPP_GOAL - 1, pos + 3);
  const fumbleAt = fieldPositionToHudl(fumblePos);
  return {
    fumbleAt,
    recoveredBy: "offense",
    recoveredAt: fumbleAt,
    returnEnd: { kind: "yardline", yardLine: fumbleAt },
  };
}

export function encodeFumbleSpotEncoding(spots: FumbleRecoverySpots): string {
  const by = spots.recoveredBy === "offense" ? "O" : "D";
  const endPart = encodeReturnEndPart(spots.returnEnd);
  if (
    spots.recoveredBy === "defense" &&
    spots.recoveredAt !== spots.fumbleAt
  ) {
    return `fumble:${spots.fumbleAt}|recover:${spots.recoveredAt}|end:${endPart}|by:${by}`;
  }
  return `fumble:${spots.fumbleAt}|end:${endPart}|by:${by}`;
}

export function decodeFumbleSpotsFromSpotEncoding(
  spotEncoding?: string,
): FumbleRecoverySpots | null {
  const decoded = decodeFumbleSpotEncoding(spotEncoding);
  if (!decoded) return null;
  const returnEnd: ReturnEnd =
    decoded.endKind === "touchdown"
      ? { kind: "touchdown" }
      : decoded.endKind === "safety"
        ? { kind: "safety" }
        : { kind: "yardline", yardLine: decoded.endYardLine };
  return {
    fumbleAt: decoded.fumbleAt,
    recoveredBy: decoded.recoveredBy,
    recoveredAt: decoded.recoveredAt ?? decoded.endYardLine,
    returnEnd,
  };
}

export function initFumbleSpotsFromDraft(
  draft: PlaylistData | null,
): FumbleRecoverySpots {
  const ballSpot = draft?.yardLine ?? (-25 as YardLine);
  if (
    !draft ||
    (draft.playType !== PlayType.Run && draft.playType !== PlayType.Pass) ||
    draft.result !== Result.Fumble
  ) {
    return defaultFumbleRecoverySpots(ballSpot);
  }
  const decoded = decodeFumbleSpotsFromSpotEncoding(draft.spotEncoding);
  if (decoded) return decoded;
  return defaultFumbleRecoverySpots(ballSpot);
}

export function applyFumbleSpotsToDraft(
  draft: PlaylistData,
  spots: FumbleRecoverySpots,
): PlaylistData {
  if (
    (draft.playType !== PlayType.Run && draft.playType !== PlayType.Pass) ||
    draft.result !== Result.Fumble
  ) {
    return draft;
  }
  const endYard = returnEndHudlYardLine(spots.returnEnd);
  const taggedGain = yardsAdvanced(
    draft.yardLine,
    endYard,
    returnEndZoneSide(spots.returnEnd),
  );
  const gainLoss =
    draft.odk === ODK.Defense ? -taggedGain : taggedGain;
  const returnYards =
    spots.recoveredBy === "defense"
      ? computeReturnYards(spots.recoveredAt, spots.returnEnd)
      : undefined;
  return {
    ...draft,
    gainLoss,
    returnYards,
    spotEncoding: encodeFumbleSpotEncoding(spots),
  };
}

export {
  clampToRange,
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  formatReturnEndDisplay,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
} from "@/lib/tagging/kickoffReturn";
