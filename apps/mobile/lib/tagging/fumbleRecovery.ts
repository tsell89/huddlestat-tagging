import {
  PlayType,
  Result,
  type PlaylistData,
  type YardLine,
} from "@huddlestat/shared";
import {
  decodeFumbleCompletion,
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

export function encodeFumbleInCompletion(spots: FumbleRecoverySpots): string {
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

export function decodeFumbleSpotsFromCompletion(
  completion?: string,
): FumbleRecoverySpots | null {
  const decoded = decodeFumbleCompletion(completion);
  if (!decoded) return null;
  const end: ReturnEnd =
    decoded.endYardLine === 0
      ? { kind: "touchdown" }
      : { kind: "yardline", yardLine: decoded.endYardLine };
  return {
    fumbleAt: decoded.fumbleAt,
    recoveredBy: decoded.recoveredBy,
    recoveredAt: decoded.recoveredAt ?? decoded.endYardLine,
    returnEnd: end,
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
  const decoded = decodeFumbleSpotsFromCompletion(draft.completion);
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
  const gainLoss = yardsAdvanced(draft.yardLine, endYard);
  return {
    ...draft,
    gainLoss,
    completion: encodeFumbleInCompletion(spots),
  };
}

export {
  clampToRange,
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  formatReturnEndDisplay,
  receivedRatioToYardLine,
  receivedYardLineToRatio,
  returnedRatioToYardLine,
  returnedYardLineToRatio,
} from "@/lib/tagging/kickoffReturn";
