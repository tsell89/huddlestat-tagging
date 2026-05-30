import {
  PlayType,
  Result,
  type PlaylistData,
  type YardLine,
} from "@huddlestat/shared";
import {
  FIELD_MIN,
  FIELD_OPP_GOAL,
  fieldPositionToHudl,
  hudlToFieldPosition,
  yardsAdvanced,
  yardsToOpponentGoal,
} from "@/lib/tagging/fieldPosition100";
import {
  RETURNED_DEFAULT,
  RETURNED_MAX,
  RETURNED_MIN,
  clampToRange,
  computeReturnYards,
  fieldRatioToYardLine,
  fieldYardLineToRatio,
  returnEndHudlYardLine,
  returnEndZoneSide,
  type ReturnEnd,
} from "@/lib/tagging/kickoffReturn";

export type PuntReturnSpots = {
  receivedAt: YardLine;
  returnEnd: ReturnEnd;
};

export type PuntSpots = {
  returnSpots: PuntReturnSpots;
  downedAt: YardLine;
};

/** Spec example: recv:+15 */
export const RECEIVED_DEFAULT = 15 as YardLine;
/** Spec example: end:-32 */
export const PUNT_RETURNED_DEFAULT = -32 as YardLine;

export function defaultPuntReturnSpots(): PuntReturnSpots {
  return {
    receivedAt: RECEIVED_DEFAULT,
    returnEnd: { kind: "yardline", yardLine: PUNT_RETURNED_DEFAULT },
  };
}

export function defaultDownedAt(ballSpot: YardLine): YardLine {
  const pos = hudlToFieldPosition(ballSpot);
  const endPos = Math.min(FIELD_OPP_GOAL - 1, pos + 30);
  return fieldPositionToHudl(Math.max(FIELD_MIN, endPos));
}

export function defaultPuntSpots(ballSpot: YardLine): PuntSpots {
  return {
    returnSpots: defaultPuntReturnSpots(),
    downedAt: defaultDownedAt(ballSpot),
  };
}

export function receivedYardLineToRatio(yardLine: YardLine): number {
  return fieldYardLineToRatio(yardLine);
}

export function receivedRatioToYardLine(ratio: number): YardLine {
  return clampToRange(fieldRatioToYardLine(ratio), RETURNED_MIN, RETURNED_MAX);
}

export function downedYardLineToRatio(yardLine: YardLine): number {
  return fieldYardLineToRatio(yardLine);
}

export function downedRatioToYardLine(ratio: number): YardLine {
  return clampToRange(fieldRatioToYardLine(ratio), RETURNED_MIN, RETURNED_MAX);
}

export {
  returnedYardLineToRatio,
  returnedRatioToYardLine,
  computeReturnYards,
  formatReturnEndDisplay,
  RETURNED_DEFAULT,
} from "@/lib/tagging/kickoffReturn";

export function encodePuntReturnSpotEncoding(spots: PuntReturnSpots): string {
  const end =
    spots.returnEnd.kind === "yardline"
      ? String(spots.returnEnd.yardLine)
      : spots.returnEnd.kind === "touchdown"
        ? "TD"
        : "SA";
  return `recv:${spots.receivedAt}|end:${end}`;
}

export function encodePuntDownedSpotEncoding(downedAt: YardLine): string {
  return `end:${downedAt}`;
}

export function decodePuntReturnFromSpotEncoding(
  spotEncoding?: string,
): PuntReturnSpots | null {
  if (!spotEncoding?.startsWith("recv:")) return null;
  const match = /^recv:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match) return null;
  const receivedAt = Number(match[1]) as YardLine;
  if (match[2] === "TD") {
    return { receivedAt, returnEnd: { kind: "touchdown" } };
  }
  if (match[2] === "SA") {
    return { receivedAt, returnEnd: { kind: "safety" } };
  }
  return {
    receivedAt,
    returnEnd: {
      kind: "yardline",
      yardLine: Number(match[2]) as YardLine,
    },
  };
}

export function decodePuntDownedFromSpotEncoding(
  spotEncoding?: string,
): YardLine | null {
  if (!spotEncoding?.startsWith("end:")) return null;
  if (spotEncoding.startsWith("recv:")) return null;
  const match = /^end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match || match[1] === "TD" || match[1] === "SA") return null;
  return Number(match[1]) as YardLine;
}

export function initPuntSpotsFromDraft(
  draft: PlaylistData | null,
): PuntSpots {
  const ballSpot = draft?.yardLine ?? (-35 as YardLine);
  if (!draft || draft.playType !== PlayType.Punt) {
    return defaultPuntSpots(ballSpot);
  }

  if (draft.result === Result.Return) {
    const decoded = decodePuntReturnFromSpotEncoding(draft.spotEncoding);
    if (decoded) {
      return {
        returnSpots: decoded,
        downedAt: defaultDownedAt(ballSpot),
      };
    }
    if (draft.returnYards !== undefined) {
      const endPos =
        hudlToFieldPosition(RECEIVED_DEFAULT) + draft.returnYards;
      return {
        returnSpots: {
          receivedAt: RECEIVED_DEFAULT,
          returnEnd: {
            kind: "yardline",
            yardLine: fieldPositionToHudl(
              Math.min(FIELD_OPP_GOAL - 1, Math.max(FIELD_MIN, endPos)),
            ),
          },
        },
        downedAt: defaultDownedAt(ballSpot),
      };
    }
    return defaultPuntSpots(ballSpot);
  }

  if (draft.result === Result.Downed) {
    const decoded = decodePuntDownedFromSpotEncoding(draft.spotEncoding);
    return {
      returnSpots: defaultPuntReturnSpots(),
      downedAt: decoded ?? defaultDownedAt(ballSpot),
    };
  }

  return defaultPuntSpots(ballSpot);
}

export function applyPuntSpotsToDraft(
  draft: PlaylistData,
  spots: PuntSpots,
): PlaylistData {
  if (draft.playType !== PlayType.Punt) return draft;

  if (draft.result === Result.Touchback) {
    return {
      ...draft,
      returnYards: 0,
      gainLoss: 0,
      kickYards: yardsToOpponentGoal(draft.yardLine),
      spotEncoding: undefined,
    };
  }

  if (draft.result === Result.Downed) {
    const gainLoss = yardsAdvanced(draft.yardLine, spots.downedAt);
    return {
      ...draft,
      gainLoss,
      kickYards: gainLoss,
      returnYards: undefined,
      spotEncoding: encodePuntDownedSpotEncoding(spots.downedAt),
    };
  }

  if (draft.result === Result.Return) {
    const { returnSpots } = spots;
    const returnYards = computeReturnYards(
      returnSpots.receivedAt,
      returnSpots.returnEnd,
    );
    const endYard = returnEndHudlYardLine(returnSpots.returnEnd);
    const gainLoss = yardsAdvanced(
      draft.yardLine,
      endYard,
      returnEndZoneSide(returnSpots.returnEnd),
    );
    const kickYards = yardsAdvanced(draft.yardLine, returnSpots.receivedAt);
    return {
      ...draft,
      returnYards,
      gainLoss,
      kickYards,
      spotEncoding: encodePuntReturnSpotEncoding(returnSpots),
    };
  }

  return draft;
}
