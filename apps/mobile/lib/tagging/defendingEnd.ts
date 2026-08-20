/**
 * Device-relative end our team defends this period (iPad landscape field view).
 * UI orientation only — does not change Hudl export or 0–100 yard math.
 */
export type DefendingEnd = "left" | "right";

export function oppositeDefendingEnd(end: DefendingEnd): DefendingEnd {
  return end === "left" ? "right" : "left";
}

/** Offense advances toward the end we do not defend. */
export function attackingEnd(defending: DefendingEnd): DefendingEnd {
  return oppositeDefendingEnd(defending);
}

/**
 * Map offense-axis slider ratio (0 = own/−1, 1 = opp/+1) to device display ratio.
 * When we defend right, the track is mirrored so Own sits on the right.
 */
export function orientedRatio(
  mathRatio: number,
  defendingEnd: DefendingEnd,
): number {
  const r = Math.min(1, Math.max(0, mathRatio));
  return defendingEnd === "left" ? r : 1 - r;
}

/** Inverse of {@link orientedRatio}: display ratio → offense-axis math ratio. */
export function mathRatioFromOriented(
  displayRatio: number,
  defendingEnd: DefendingEnd,
): number {
  return orientedRatio(displayRatio, defendingEnd);
}

/** Ball advances toward this device end for the current possession. */
export function ballGoingEnd(
  defending: DefendingEnd,
  /** True when our team (or return team we tag as advancing toward opp) is advancing. */
  advancingTowardOpponent: boolean,
): DefendingEnd {
  return advancingTowardOpponent ? attackingEnd(defending) : defending;
}

export function formatDefendingEndLabel(end: DefendingEnd): string {
  return end === "left" ? "Defend left" : "Defend right";
}

/** 2H default: opposite of opening (after Q1→Q2 flip, same as opposite of opening). */
export function secondHalfDefendingEndFromOpening(
  opening: DefendingEnd | null,
): DefendingEnd {
  if (opening === null) return "left";
  return oppositeDefendingEnd(opening);
}

/**
 * Auto-flip defending end at Q1→Q2 and Q3→Q4. Returns null when phase
 * transition does not switch ends.
 */
export function defendingEndAfterQuarterBreak(
  fromPhase: string,
  toPhase: string,
  current: DefendingEnd,
): DefendingEnd | null {
  if (
    (fromPhase === "Q1" && toPhase === "Q2") ||
    (fromPhase === "Q3" && toPhase === "Q4")
  ) {
    return oppositeDefendingEnd(current);
  }
  return null;
}
