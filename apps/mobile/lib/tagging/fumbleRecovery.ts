import {
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
  returnEndHudlYardLine,
  returnEndZoneSide,
  type ReturnEnd,
} from "@/lib/tagging/kickoffReturn";

export type FumbleRecoverySpots = {
  fumbleAt: YardLine;
  recoveredBy: FumbleRecoverySide;
  recoveredAt: YardLine;
  returnEnd: ReturnEnd;
};

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
  const endPart =
    spots.returnEnd.kind === "yardline"
      ? String(returnEndHudlYardLine(spots.returnEnd))
      : spots.returnEnd.kind === "touchdown"
        ? "TD"
        : "SA";
  const by = spots.recoveredBy === "offense" ? "O" : "D";
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
  const gainLoss = yardsAdvanced(
    draft.yardLine,
    endYard,
    returnEndZoneSide(spots.returnEnd),
  );
  return {
    ...draft,
    gainLoss,
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
