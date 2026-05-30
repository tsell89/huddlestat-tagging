import { z } from "zod";

export {
  Hash,
  ODK,
  PlayType,
  Result,
  emptyPlayerRef,
  type YardLine,
} from "./constants.js";
export {
  defaultHsOtPossessionSnap,
  defaultKickoffPlay,
  defaultOffensivePlay,
  defaultPuntReceivePlay,
  defaultScoringPlayAfterTd,
  TWO_POINT_YARD_LINE,
  XP_YARD_LINE,
} from "./defaults.js";
export {
  FIELD_OPP_GOAL,
  FIELD_OWN_GOAL,
  HS_OT_DEFENSE_YARD_LINE,
  HS_OT_DISTANCE,
  HS_OT_OFFENSE_YARD_LINE,
  HS_TOUCHBACK_YARD_LINE,
  HUDL_END_ZONE,
  HUDL_MIDFIELD,
  fieldPositionToHudl,
  flipHudlYardLinePerspective,
  hudlForOpponentOffenseAtFieldSpot,
  hudlToFieldPosition,
  yardsAdvanced,
  yardsToOpponentGoal,
  type EndZoneSide,
} from "./fieldPosition100.js";
export {
  advanceSituation,
  decodeFumbleSpotEncoding,
  decodePenaltyFoulSpot,
  HOLDING_PENALTY_YARDS,
  isFailedFourthDown,
  liveDraftFromLastPlay,
  nextDraftAfterPlay,
  normalizePlayOnSave,
  yardLineAfterPlay,
  type FumbleRecoverySide,
  type PlayChainInput,
  type PlayChainOptions,
  type SituationFields,
} from "./playChain.js";

export const odkSchema = z.enum(["O", "D", "K"]);

export const hashSchema = z.enum(["L", "M", "R"]);

export const playTypeSchema = z.enum([
  "Run",
  "Pass",
  "KO",
  "KO Rec",
  "Punt",
  "Punt Rec",
  "FG",
  "Extra Pt.",
  "Extra Pt. Block",
  "2 Pt.",
  "2 Pt. Block",
]);

export const resultSchema = z.enum([
  "Rush",
  "Complete",
  "Incomplete",
  "Penalty",
  "Good",
  "No Good",
  "Touchback",
  "Return",
  "Rush, TD",
  "Complete, TD",
  "Downed",
  "Sack",
  "Fumble",
  "Interception",
  "Safety",
  "Blocked",
  "Timeout",
  "Tipped Pass",
  "COP",
]);

/**
 * Hudl yard line: own −49…−1, midfield 50, opp +49…+1, end zone 0.
 * Hudl 0 = opponent TD or own safety — disambiguate in spotEncoding/result (see docs/field-position-model.md).
 * Internal field math uses positions 0 (own EZ) and 100 (opp EZ); see fieldPosition100.ts.
 */

export function isValidHudlYardLine(n: number): boolean {
  return (
    n === 0 ||
    n === 50 ||
    (n <= -1 && n >= -49) ||
    (n >= 1 && n <= 49)
  );
}

export const yardLineSchema = z
  .number()
  .int()
  .refine(isValidHudlYardLine, {
    message:
      "Yard line must be own −49…−1, midfield 50, opp +49…+1, or 0 (end zone)",
  });

/** Format yard line for Hudl export (signed integer as string) */
export function formatYardLine(yardLine: number): string {
  return String(yardLine);
}

/** Friendly display for situation header */
export function displayYardLine(yardLine: number): string {
  if (yardLine === 0) return "0";
  if (yardLine < 0) return `-${Math.abs(yardLine)}`;
  return String(yardLine);
}

/** Down and distance display */
export function formatDownDistance(down: number, distance: number): string {
  if (down === 0) return "0 & 0";
  const ordinals = ["", "1st", "2nd", "3rd", "4th"] as const;
  const downLabel = ordinals[down] ?? `${down}th`;
  return `${downLabel} & ${distance}`;
}

/** Player reference on a play (jersey + name, matches export columns) */
export const playerRefSchema = z.object({
  jersey: z.string(),
  name: z.string(),
});

export type PlayerRef = z.infer<typeof playerRefSchema>;

/** Regulation quarters 1–4; 5 = overtime (game phase stored separately on game row). */
export const quarterSchema = z.number().int().min(1).max(5);

export const gamePhaseSchema = z.enum([
  "Q1",
  "Q2",
  "Q3",
  "Q4",
  "HALFTIME",
  "OT",
  "FINAL",
]);

export type GamePhase = z.infer<typeof gamePhaseSchema>;

export const otPossessionSchema = z.enum(["us", "them"]);

export type OtPossession = z.infer<typeof otPossessionSchema>;

/**
 * Hudl PlaylistData row shape — 32 columns (QTR after PLAY #).
 * PLAY # is the join key for video clip matching.
 */
const playlistDataRowSchema = z.object({
  playNumber: z.number().int().positive(),
  quarter: quarterSchema.default(1),
  odk: odkSchema,
  yardLine: yardLineSchema,
  down: z.number().int().min(0).max(4),
  distance: z.number().int().min(0),
  hash: hashSchema,
  gainLoss: z.number().int(),
  passer: playerRefSchema,
  receiver: playerRefSchema,
  rusher: playerRefSchema,
  result: resultSchema.or(z.literal("")),
  team: z.string(),
  tackler1: playerRefSchema,
  tackler2: playerRefSchema,
  recoveredBy: playerRefSchema,
  returnYards: z.number().int().optional(),
  returner: playerRefSchema,
  playType: playTypeSchema.or(z.literal("")),
  kicker: playerRefSchema,
  kickYards: z.number().int().optional(),
  interceptedBy: playerRefSchema,
  /** Ball-spot chain string; CSV column COMPLETION (see ADR-0001). */
  spotEncoding: z.string().optional(),
});

/** Accept legacy JSON rows that still use `completion` until consumers migrate. */
export const playlistDataSchema = z.preprocess((input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return input;
  }
  const row = input as Record<string, unknown>;
  if (row.spotEncoding !== undefined || row.completion === undefined) {
    return input;
  }
  const { completion, ...rest } = row;
  return { ...rest, spotEncoding: completion };
}, playlistDataRowSchema);

export type PlaylistData = z.infer<typeof playlistDataSchema>;

/** Column headers exactly as Hudl exports them */
export const PLAYLIST_DATA_HEADERS = [
  "PLAY #",
  "QTR",
  "ODK",
  "YARD LN",
  "DN",
  "DIST",
  "HASH",
  "GN/LS",
  "PASSER_Jersey",
  "PASSER_Name",
  "RECEIVER_Jersey",
  "RECEIVER_Name",
  "RUSHER_Jersey",
  "RUSHER_Name",
  "RESULT",
  "TEAM",
  "TACKLER1_Jersey",
  "TACKLER1_Name",
  "TACKLER2_Jersey",
  "TACKLER2_Name",
  "RECOVERED BY_Jersey",
  "RECOVERED BY_Name",
  "RET YARDS",
  "RETURNER_Jersey",
  "RETURNER_Name",
  "PLAY TYPE",
  "KICKER_Jersey",
  "KICKER_Name",
  "KICK YARDS",
  "INTERCEPTED BY_Jersey",
  "INTERCEPTED BY_Name",
  /** Maps to PlaylistData.spotEncoding (not pass complete/incomplete). */
  "COMPLETION",
] as const;

/** Convert a PlaylistData row to Hudl export column order */
export function toPlaylistDataRow(row: PlaylistData): string[] {
  return [
    String(row.playNumber),
    String(row.quarter),
    row.odk,
    formatYardLine(row.yardLine),
    String(row.down),
    String(row.distance),
    row.hash,
    String(row.gainLoss),
    row.passer.jersey,
    row.passer.name,
    row.receiver.jersey,
    row.receiver.name,
    row.rusher.jersey,
    row.rusher.name,
    row.result,
    row.team,
    row.tackler1.jersey,
    row.tackler1.name,
    row.tackler2.jersey,
    row.tackler2.name,
    row.recoveredBy.jersey,
    row.recoveredBy.name,
    row.returnYards !== undefined ? String(row.returnYards) : "",
    row.returner.jersey,
    row.returner.name,
    row.playType,
    row.kicker.jersey,
    row.kicker.name,
    row.kickYards !== undefined ? String(row.kickYards) : "",
    row.interceptedBy.jersey,
    row.interceptedBy.name,
    row.spotEncoding ?? "",
  ];
}

export type GameStatus = "pregame" | "live" | "final";

export const gameStatusSchema = z.enum(["pregame", "live", "final"]);

/** Slug for public /game/[slug] pages — stable per local game session */
export {
  deriveScoreFromPlays,
  shouldFinalizeOtGame,
  type ScoreFromPlays,
} from "./scoreFromPlays.js";

export {
  applyDefensiveCreditsToMap,
  isTackleForLossPlay,
  type DefensiveCreditAccumulator,
} from "./defensiveCredits.js";
export {
  applySpecialTeamsCreditsToMap,
  deriveKickoffKickYards,
  deriveKickoffNetYards,
  derivePuntEndPosition,
  derivePuntKickYards,
  derivePuntNetYards,
  isExcludedPunt,
  isPuntInside20,
  KICKOFF_TOUCHBACK_YARDS,
  TOUCHBACK_NET_PLACEMENT_YARDS,
  type SpecialTeamsCreditAccumulator,
} from "./specialTeamsCredits.js";
export {
  reconcileMaxPrepsExport,
  allMaxPrepsNumericFields,
  type MaxPrepsFieldDelta,
  type MaxPrepsReconciliationReport,
  type MaxPrepsSuspectPlay,
} from "./reconcileMaxPrepsExport.js";
export {
  deriveMaxPrepsBoxScoreFromPlays,
  MAXPREPS_FOOTBALL_COLUMNS,
  maxPrepsRowEquals,
  parseMaxPrepsTxt,
  parsePartialPlaylistCsv,
  serializeMaxPrepsTxt,
  type MaxPrepsFootballColumn,
  type MaxPrepsPlayerRow,
} from "./maxPrepsBoxScore.js";

export function buildGameSlug(teamCode: string, opponent: string): string {
  const safe = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${safe(teamCode)}-vs-${safe(opponent)}-${Date.now()}`;
}
