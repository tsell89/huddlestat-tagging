import type { YardLine } from "@huddlestat/shared";

/**
 * Internal field coordinate along the offense’s march toward the opponent goal.
 *
 * | Position | Meaning        | Hudl export (see EndZoneSide for 0) |
 * |----------|----------------|-------------------------------------|
 * | 0        | Own end zone   | 0 (safety / tackled in own EZ)      |
 * | 1–49     | Own 1 – Own 49 | −1 … −49                            |
 * | 50       | Midfield       | 50 (not −50)                        |
 * | 51–99    | Opp 49 – Opp 1 | +49 … +1                            |
 * | 100      | Opp end zone   | 0 (touchdown)                       |
 *
 * Hudl **0** is overloaded: use `EndZoneSide` whenever converting 0 ↔ position.
 */
export const FIELD_OWN_GOAL = 0;
export const FIELD_MIN = 1;
export const FIELD_MIDLINE = 50;
export const FIELD_OPP_GOAL = 100;

/** @deprecated Alias for opponent goal line position */
export const FIELD_TOUCHDOWN = FIELD_OPP_GOAL;

/** Hudl midfield (positive 50, not −50) */
export const HUDL_MIDFIELD = 50 as YardLine;

/** Hudl end-zone marker — opponent TD or own safety (disambiguate with EndZoneSide) */
export const HUDL_END_ZONE = 0 as YardLine;

/** @deprecated Use HUDL_END_ZONE */
export const HUDL_TOUCHDOWN = HUDL_END_ZONE;

export type EndZoneSide = "own" | "opponent";

export function hudlToFieldPosition(
  hudl: YardLine,
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

export function fieldPositionToHudl(position: number): YardLine {
  const p = Math.round(
    Math.min(FIELD_OPP_GOAL, Math.max(FIELD_OWN_GOAL, position)),
  );
  if (p === FIELD_OWN_GOAL) {
    return HUDL_END_ZONE;
  }
  if (p === FIELD_OPP_GOAL) {
    return HUDL_END_ZONE;
  }
  if (p === FIELD_MIDLINE) return HUDL_MIDFIELD;
  if (p < FIELD_MIDLINE) return -p as YardLine;
  return (FIELD_OPP_GOAL - p) as YardLine;
}

/** Yards advanced on the 1–100 axis. Pass `toEndZone: "own"` when `toHudl` is 0 (safety). */
export function yardsAdvanced(
  fromHudl: YardLine,
  toHudl: YardLine,
  toEndZone: EndZoneSide = "opponent",
): number {
  return (
    hudlToFieldPosition(toHudl, toEndZone) - hudlToFieldPosition(fromHudl)
  );
}

/** Yards from a spot to the opponent end zone (touchdown). */
export function yardsToOpponentGoal(fromHudl: YardLine): number {
  return FIELD_OPP_GOAL - hudlToFieldPosition(fromHudl);
}

/** Yards from a spot back into the own end zone (safety), negative when retreating. */
export function yardsToOwnGoal(fromHudl: YardLine): number {
  return FIELD_OWN_GOAL - hudlToFieldPosition(fromHudl);
}

/** @deprecated Use yardsToOpponentGoal */
export function yardsToTouchdown(fromHudl: YardLine): number {
  return yardsToOpponentGoal(fromHudl);
}

/** Slider ratio 0–1 from Hudl spot (left −1 → mid 50 → right +1). */
export function hudlToSliderRatio(hudl: YardLine): number {
  if (Math.round(hudl) === HUDL_END_ZONE) return 1;
  const pos = hudlToFieldPosition(hudl);
  if (pos <= FIELD_MIDLINE) {
    return ((pos - FIELD_MIN) / (FIELD_MIDLINE - FIELD_MIN)) * 0.5;
  }
  const oppEnd = FIELD_OPP_GOAL - 1;
  return 0.5 + ((pos - FIELD_MIDLINE) / (oppEnd - FIELD_MIDLINE)) * 0.5;
}

/** Hudl spot from slider ratio (end zones via Touchdown / Safety buttons, not drag). */
export function sliderRatioToHudl(ratio: number): YardLine {
  const r = Math.min(1, Math.max(0, ratio));
  let pos: number;
  if (r <= 0.5) {
    pos = Math.round(FIELD_MIN + (r / 0.5) * (FIELD_MIDLINE - FIELD_MIN));
  } else {
    const oppEnd = FIELD_OPP_GOAL - 1;
    pos = Math.round(
      FIELD_MIDLINE + ((r - 0.5) / 0.5) * (oppEnd - FIELD_MIDLINE),
    );
  }
  return fieldPositionToHudl(pos);
}

export function formatHudlYardLine(
  yardLine: YardLine,
  endZone?: EndZoneSide,
): string {
  if (yardLine === HUDL_END_ZONE) {
    return endZone === "own" ? "Safety (0)" : "Touchdown (0)";
  }
  if (yardLine === HUDL_MIDFIELD) return "50";
  if (yardLine < 0) return `Own ${Math.abs(yardLine)} (${yardLine})`;
  return `Opp ${yardLine} (+${yardLine})`;
}
