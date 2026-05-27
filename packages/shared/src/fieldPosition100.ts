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

/** Same physical spot, opposite team’s offensive perspective. */
export function flipHudlYardLinePerspective(yardLine: FieldYardLine): FieldYardLine {
  const pos = hudlToFieldPosition(yardLine);
  return fieldPositionToHudl(FIELD_OPP_GOAL - pos);
}
