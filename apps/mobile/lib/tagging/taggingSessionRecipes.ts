import { PlayType, Result } from "@huddlestat/shared";
import {
  reduceTaggingSession,
  runActions,
  startSession,
  type TaggingAction,
  type TaggingSession,
} from "./taggingSession";
import type { KickoffRole } from "./kickoffRoleResolve";

export type RecipeName =
  | "newGameReceive"
  | "scriptA"
  | "q2"
  | "halftime"
  | "q3Kickoff"
  | "q4Tied"
  | "otUsBall";

const TEAM = "SHS";

const START_RECEIVE = {
  teamCode: TEAM,
  openingKickoffRole: "receive" as KickoffRole,
};

/** Script A plays 1–6 from docs/ipad-qa-play-scripts.md. */
export const SCRIPT_A_ACTIONS: TaggingAction[] = [
  {
    type: "kickoffSpots",
    spots: { caughtAt: -5, returnEnd: { kind: "yardline", yardLine: -25 } },
  },
  { type: "save" },
  { type: "playType", playType: PlayType.Run },
  { type: "result", result: Result.Rush },
  { type: "tackle", end: { kind: "yardline", yardLine: 25 } },
  { type: "save" },
  { type: "playType", playType: PlayType.Pass },
  { type: "result", result: Result.Incomplete },
  { type: "save" },
  { type: "playType", playType: PlayType.Run },
  { type: "result", result: Result.Rush },
  { type: "tackle", end: { kind: "yardline", yardLine: 23 } },
  { type: "save" },
  { type: "playType", playType: PlayType.Pass },
  { type: "result", result: Result.Sack },
  { type: "tackle", end: { kind: "yardline", yardLine: 28 } },
  { type: "save" },
  { type: "playType", playType: PlayType.FieldGoal },
  { type: "result", result: Result.Good },
  { type: "save" },
];

const SHORT_Q1_KO: TaggingAction[] = [
  {
    type: "kickoffSpots",
    spots: { caughtAt: -5, returnEnd: { kind: "yardline", yardLine: -25 } },
  },
  { type: "save" },
];

const TO_Q2: TaggingAction[] = [...SHORT_Q1_KO, { type: "phaseAdvance" }];

const TO_HALFTIME: TaggingAction[] = [...TO_Q2, { type: "phaseAdvance" }];

const TO_Q3_KICKOFF: TaggingAction[] = [...TO_HALFTIME, { type: "phaseAdvance" }];

/** Our FG + opponent FG so deriveScoreFromPlays is 3–3, then phase bar to Q4. */
const TO_Q4_TIED: TaggingAction[] = [
  {
    type: "kickoffSpots",
    spots: { caughtAt: -5, returnEnd: { kind: "yardline", yardLine: -25 } },
  },
  { type: "save" },
  { type: "playType", playType: PlayType.Run },
  { type: "result", result: Result.Rush },
  { type: "tackle", end: { kind: "yardline", yardLine: 25 } },
  { type: "save" },
  { type: "playType", playType: PlayType.FieldGoal },
  { type: "result", result: Result.Good },
  { type: "save" },
  { type: "result", result: Result.Touchback },
  { type: "save" },
  { type: "playType", playType: PlayType.FieldGoal },
  { type: "result", result: Result.Good },
  { type: "save" },
  { type: "phaseAdvance" },
  { type: "phaseAdvance" },
  { type: "phaseAdvance" },
  { type: "phaseAdvance" },
];

export const RECIPE_ACTIONS: Record<RecipeName, TaggingAction[]> = {
  newGameReceive: [],
  scriptA: SCRIPT_A_ACTIONS,
  q2: TO_Q2,
  halftime: TO_HALFTIME,
  q3Kickoff: TO_Q3_KICKOFF,
  q4Tied: TO_Q4_TIED,
  otUsBall: [...TO_Q4_TIED, { type: "startOt", possession: "us" }],
};

export function recipe(name: RecipeName): TaggingSession {
  return runActions(startSession(START_RECEIVE), RECIPE_ACTIONS[name]);
}

/** Run Script A one save at a time so tests can snapshot after each play. */
export function runScriptAThroughPlay(playNumber: number): TaggingSession {
  let state = startSession(START_RECEIVE);
  let saves = 0;
  for (const action of SCRIPT_A_ACTIONS) {
    state = reduceTaggingSession(state, action);
    if (action.type === "save") {
      saves += 1;
      if (saves === playNumber) return state;
    }
  }
  return state;
}
