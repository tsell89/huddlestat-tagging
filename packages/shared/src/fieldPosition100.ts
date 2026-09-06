/** Hudl signed yard line — see docs/field-position-model.md */
export type FieldYardLine = number;

export const FIELD_OWN_GOAL = 0;
export const FIELD_MIN = 1;
export const FIELD_MIDLINE = 50;
export const FIELD_OPP_GOAL = 100;

export const HUDL_MIDFIELD = 50 as FieldYardLine;
export const HUDL_END_ZONE = 0 as FieldYardLine;

/** HS touchback spot — Own 20 */
export const HS_TOUCHBACK_YARD_LINE = -20 as FieldYardLine;

/** HS overtime: offense snaps at opponent 10 (1st & goal from the 10). */
export const HS_OT_OFFENSE_YARD_LINE = 10 as FieldYardLine;

/** HS overtime: defense tags opponent at our 10 (Hudl −10). */
export const HS_OT_DEFENSE_YARD_LINE = -10 as FieldYardLine;

/** HS overtime: first-down distance to goal (goal-to-go from the 10). */
export const HS_OT_DISTANCE = 10;

export type EndZoneSide = "own" | "opponent";

export function hudlToFieldPosition(
  hudl: FieldYardLine,
  endZone: EndZoneSide = "opponent",
): number {
  const y = Math.round(hudl);
  if (y === HUDL_END_ZONE) {
    return endZone === "own" ? FIELD_OWN_GOAL : FIELD_OPP_GOAL;
  }
  if (y === HUDL_MIDFIELD) return FIELD_MIDLINE;
  if (y < 0) return Math.abs(y);
  if (y >= 1 && y <= 49) return FIELD_OPP_GOAL - y;
  return FIELD_MIDLINE;
}

export function fieldPositionToHudl(position: number): FieldYardLine {
  const p = Math.round(
    Math.min(FIELD_OPP_GOAL, Math.max(FIELD_OWN_GOAL, position)),
  );
  if (p === FIELD_OWN_GOAL || p === FIELD_OPP_GOAL) {
    return HUDL_END_ZONE;
  }
  if (p === FIELD_MIDLINE) return HUDL_MIDFIELD;
  if (p < FIELD_MIDLINE) return -p as FieldYardLine;
  return (FIELD_OPP_GOAL - p) as FieldYardLine;
}

export function yardsAdvanced(
  fromHudl: FieldYardLine,
  toHudl: FieldYardLine,
  toEndZone: EndZoneSide = "opponent",
): number {
  return (
    hudlToFieldPosition(toHudl, toEndZone) - hudlToFieldPosition(fromHudl)
  );
}

export function yardsToOpponentGoal(fromHudl: FieldYardLine): number {
  return FIELD_OPP_GOAL - hudlToFieldPosition(fromHudl);
}

/**
 * Scrimmage distance cannot exceed yards to the opponent goal.
 * Kickoff (`down === 0`) is exempt — do not call this for KO drafts.
 */
/**
 * Yards the team with the ball needs to score (tagged-team Hudl).
 * Offense attacks opponent goal; defense series attacks our goal.
 */
export function yardsToScoringGoal(
  yardLine: FieldYardLine,
  odk: "O" | "D" | "K" = "O",
): number {
  if (odk === "D") return hudlToFieldPosition(yardLine);
  return yardsToOpponentGoal(yardLine);
}

export function capDistanceToGoal(
  distance: number,
  yardLine: FieldYardLine,
  odk: "O" | "D" | "K" = "O",
): number {
  const toGoal = yardsToScoringGoal(yardLine, odk);
  if (toGoal <= 0) return Math.max(1, distance);
  return Math.max(1, Math.min(distance, toGoal));
}

/** True when down/distance is legal at this Hudl yard line. Kickoff always legal. */
export function isLegalScrimmageDistance(
  down: number,
  distance: number,
  yardLine: FieldYardLine,
  odk: "O" | "D" | "K" = "O",
): boolean {
  if (down === 0 || odk === "K") return true;
  if (distance < 1) return false;
  return distance <= yardsToScoringGoal(yardLine, odk);
}

/** UI labels: Own 5 not -5; midfield 50. */
export function labelYardLine(hudl: FieldYardLine): string {
  if (hudl === HUDL_MIDFIELD) return "50";
  if (hudl === HUDL_END_ZONE) return "End zone";
  if (hudl < 0) return `Own ${Math.abs(hudl)}`;
  return `Opp ${hudl}`;
}

/**
 * Hudl for the other team's offense at a physical field spot (0–100 from our goal).
 * Same spot on the field: their position is `FIELD_OPP_GOAL − fieldSpot`.
 */
export function hudlForOpponentOffenseAtFieldSpot(fieldSpot: number): FieldYardLine {
  return fieldPositionToHudl(FIELD_OPP_GOAL - fieldSpot);
}

/**
 * Same physical spot, other team's offensive Hudl (convert via 0–100, not signed Hudl math).
 */
export function flipHudlYardLinePerspective(yardLine: FieldYardLine): FieldYardLine {
  const fieldSpot = hudlToFieldPosition(yardLine);
  return hudlForOpponentOffenseAtFieldSpot(fieldSpot);
}
