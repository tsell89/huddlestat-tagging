import { PlayType, Result, type PlaylistData, type YardLine } from "@huddlestat/shared";
import {
  CAUGHT_DEFAULT,
  RETURNED_DEFAULT,
  clampToRange,
  computeReturnYards,
  decodeKickoffReturnFromSpotEncoding,
  defaultKickoffReturnSpots,
  encodeKickoffReturnSpotEncoding,
  returnEndHudlYardLine,
  returnEndZoneSide,
  type KickoffReturnSpots,
} from "@/lib/tagging/kickoffReturn";
import {
  hudlToFieldPosition,
  fieldPositionToHudl,
  yardsAdvanced,
} from "@/lib/tagging/fieldPosition100";
import { FIELD_MIN, FIELD_OPP_GOAL } from "@/lib/tagging/fieldPosition100";

export type InterceptionReturnSpots = KickoffReturnSpots;

export function defaultInterceptionReturnSpots(
  ballSpot: YardLine,
): InterceptionReturnSpots {
  const pos = hudlToFieldPosition(ballSpot);
  const catchPos = Math.min(FIELD_OPP_GOAL - 1, pos + 15);
  const endPos = Math.min(FIELD_OPP_GOAL - 1, catchPos + 10);
  return {
    caughtAt: fieldPositionToHudl(Math.max(FIELD_MIN, catchPos)) as YardLine,
    returnEnd: {
      kind: "yardline",
      yardLine: fieldPositionToHudl(endPos) as YardLine,
    },
  };
}

export function initInterceptionSpotsFromDraft(
  draft: PlaylistData | null,
): InterceptionReturnSpots {
  const ballSpot = draft?.yardLine ?? CAUGHT_DEFAULT;
  if (
    !draft ||
    draft.playType !== PlayType.Pass ||
    draft.result !== Result.Interception
  ) {
    return defaultInterceptionReturnSpots(ballSpot);
  }
  const decoded = decodeKickoffReturnFromSpotEncoding(draft.spotEncoding);
  if (decoded) return decoded;
  if (draft.returnYards !== undefined) {
    const endPos = hudlToFieldPosition(CAUGHT_DEFAULT) + draft.returnYards;
    return {
      caughtAt: CAUGHT_DEFAULT,
      returnEnd: {
        kind: "yardline",
        yardLine: fieldPositionToHudl(
          clampToRange(endPos, FIELD_MIN, FIELD_OPP_GOAL - 1),
        ),
      },
    };
  }
  return defaultInterceptionReturnSpots(ballSpot);
}

export function applyInterceptionSpotsToDraft(
  draft: PlaylistData,
  spots: InterceptionReturnSpots,
): PlaylistData {
  if (draft.playType !== PlayType.Pass || draft.result !== Result.Interception) {
    return draft;
  }
  const returnYards = computeReturnYards(spots.caughtAt, spots.returnEnd);
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
    spotEncoding: encodeKickoffReturnSpotEncoding(spots),
  };
}

export { defaultKickoffReturnSpots, RETURNED_DEFAULT };
