/**
 * Penalty spot encoding + enforcement (Package H+).
 *
 * Encoding (backward compatible):
 *   foul:Y                         → holding MVP: 10 yd vs offense, no auto-1st
 *   foul:Y|yd:N|vs:O|afd:0         → explicit
 *   foul:Y|yd:10|vs:D|afd:1        → defensive holding / DPI-style
 *
 * Y = Hudl foul spot (tagged-team). N ∈ {5,10,15}. vs:O|D = against possession O/D.
 * afd:1 = automatic first down after enforcement.
 */
import { ODK, type YardLine } from "./constants.js";
import {
  FIELD_OPP_GOAL,
  FIELD_OWN_GOAL,
  fieldPositionToHudl,
  hudlToFieldPosition,
} from "./fieldPosition100.js";
import type { PlaylistData } from "./index.js";

export const PENALTY_YARD_OPTIONS = [5, 10, 15] as const;
export type PenaltyYards = (typeof PENALTY_YARD_OPTIONS)[number];

export type PenaltyAgainst = "O" | "D";

export type DecodedPenalty = {
  foulSpot: YardLine;
  yards: PenaltyYards;
  /** Against the possession team's offense or defense. */
  against: PenaltyAgainst;
  autoFirstDown: boolean;
};

/** Legacy holding MVP defaults when only foul:Y is present. */
export const HOLDING_PENALTY_YARDS = 10 as PenaltyYards;

const PENALTY_RE =
  /^foul:(-?\d+)(?:\|yd:(5|10|15))?(?:\|vs:(O|D))?(?:\|afd:(0|1))?$/;

export function decodePenalty(spotEncoding?: string): DecodedPenalty | null {
  if (!spotEncoding?.startsWith("foul:")) return null;
  const match = PENALTY_RE.exec(spotEncoding);
  if (!match) return null;
  return {
    foulSpot: Number(match[1]) as YardLine,
    yards: (match[2] ? Number(match[2]) : HOLDING_PENALTY_YARDS) as PenaltyYards,
    against: (match[3] as PenaltyAgainst | undefined) ?? "O",
    autoFirstDown: match[4] === "1",
  };
}

/** @deprecated Prefer decodePenalty — returns foul spot only. */
export function decodePenaltyFoulSpot(spotEncoding?: string): YardLine | null {
  return decodePenalty(spotEncoding)?.foulSpot ?? null;
}

export function encodePenaltySpotEncoding(parts: {
  foulSpot: YardLine;
  yards?: PenaltyYards;
  against?: PenaltyAgainst;
  autoFirstDown?: boolean;
}): string {
  const yards = parts.yards ?? HOLDING_PENALTY_YARDS;
  const against = parts.against ?? "O";
  const afd = parts.autoFirstDown ? 1 : 0;
  // Compact legacy form for classic holding.
  if (yards === 10 && against === "O" && afd === 0) {
    return `foul:${parts.foulSpot}`;
  }
  return `foul:${parts.foulSpot}|yd:${yards}|vs:${against}|afd:${afd}`;
}

/**
 * Half-distance when penalty yards would reach/pass the goal line
 * in the enforcement direction (NFHS-style).
 */
export function enforcePenaltyFieldPosition(
  foulPos: number,
  taggedDelta: number,
): number {
  if (taggedDelta === 0) return foulPos;
  if (taggedDelta < 0) {
    const want = -taggedDelta;
    const distToOwn = foulPos - FIELD_OWN_GOAL;
    const apply =
      want >= distToOwn ? Math.max(1, Math.floor(distToOwn / 2)) : want;
    return Math.max(FIELD_OWN_GOAL + 1, foulPos - apply);
  }
  const want = taggedDelta;
  const distToOpp = FIELD_OPP_GOAL - foulPos;
  const apply =
    want >= distToOpp ? Math.max(1, Math.floor(distToOpp / 2)) : want;
  return Math.min(FIELD_OPP_GOAL - 1, foulPos + apply);
}

/**
 * Possession-axis signed yards: against O retreats (negative), against D advances.
 * Flip onto tagged axis when odk is D.
 */
export function penaltyTaggedDelta(
  yards: number,
  against: PenaltyAgainst,
  odk: PlaylistData["odk"],
): number {
  const possessionDelta = against === "O" ? -yards : yards;
  return odk === ODK.Defense ? -possessionDelta : possessionDelta;
}

export type PenaltySituation = {
  down: number;
  distance: number;
  yardLine: YardLine;
};

export function advancePenaltySituation(
  play: Pick<
    PlaylistData,
    "down" | "distance" | "yardLine" | "odk" | "spotEncoding"
  >,
): PenaltySituation {
  const decoded =
    decodePenalty(play.spotEncoding) ??
    ({
      foulSpot: play.yardLine,
      yards: HOLDING_PENALTY_YARDS,
      against: "O" as const,
      autoFirstDown: false,
    } satisfies DecodedPenalty);

  const foulPos = hudlToFieldPosition(decoded.foulSpot);
  const taggedDelta = penaltyTaggedDelta(
    decoded.yards,
    decoded.against,
    play.odk,
  );
  const newPos = enforcePenaltyFieldPosition(foulPos, taggedDelta);
  const newYardLine = fieldPositionToHudl(newPos) as YardLine;

  const losPos = hudlToFieldPosition(play.yardLine);
  // First-down marker on tagged axis (possession marches toward opp goal on O,
  // toward our goal on D).
  const markerPos =
    play.odk === ODK.Defense
      ? losPos - play.distance
      : losPos + play.distance;

  if (decoded.autoFirstDown) {
    const toGoal =
      play.odk === ODK.Defense
        ? Math.max(1, newPos - FIELD_OWN_GOAL)
        : Math.max(1, FIELD_OPP_GOAL - newPos);
    return {
      down: 1,
      distance: Math.min(10, toGoal),
      yardLine: newYardLine,
    };
  }

  const remaining =
    play.odk === ODK.Defense
      ? Math.max(1, newPos - markerPos)
      : Math.max(1, markerPos - newPos);

  return {
    down: play.down,
    distance: remaining,
    yardLine: newYardLine,
  };
}
