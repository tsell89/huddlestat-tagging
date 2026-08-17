import { Hash, ODK, PlayType, Result, emptyPlayerRef } from "./constants.js";
import {
  HS_OT_DEFENSE_YARD_LINE,
  HS_OT_DISTANCE,
  HS_OT_OFFENSE_YARD_LINE,
} from "./fieldPosition100.js";
import type { PlaylistData, YardLine } from "./index.js";

/** Hudl yard line at opponent 3 (extra-point attempt). */
export const XP_YARD_LINE = 3 as YardLine;

/** Hudl yard line at opponent goal (two-point attempt). */
export const TWO_POINT_YARD_LINE = 1 as YardLine;

/** Play #1 — kickoff (Hudl: ODK K, down/distance 0, own 40) */
export function defaultKickoffPlay(
  playNumber: number,
  team: string,
  overrides?: Partial<PlaylistData>,
): PlaylistData {
  return {
    playNumber,
    quarter: 1,
    odk: ODK.Kicking,
    yardLine: -40,
    down: 0,
    distance: 0,
    hash: Hash.Middle,
    gainLoss: 0,
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    result: Result.Return,
    team,
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    playType: PlayType.Kickoff,
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
    ...overrides,
  };
}

/** Scoring snap after a touchdown (XP/2pt or block by ODK). */
export function defaultScoringPlayAfterTd(
  playNumber: number,
  team: string,
  odk: (typeof ODK)[keyof typeof ODK],
): PlaylistData {
  const defense = odk === ODK.Defense;
  const playType = defense ? PlayType.ExtraPointBlock : PlayType.ExtraPoint;
  const result = defense ? Result.Blocked : Result.Good;
  return {
    ...defaultOffensivePlay(playNumber, team),
    odk,
    playType,
    result,
    yardLine: XP_YARD_LINE,
    down: 1,
    distance: 1,
    gainLoss: 0,
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
    spotEncoding: undefined,
    returnYards: undefined,
    kickYards: undefined,
  };
}

/** Next HS OT possession after XP/2pt ends a team's OT series (alternating O/D). */
export function defaultHsOtPossessionSnap(
  nextPlayNumber: number,
  team: string,
  odk: (typeof ODK)[keyof typeof ODK],
): PlaylistData {
  const yardLine =
    odk === ODK.Offense ? HS_OT_OFFENSE_YARD_LINE : HS_OT_DEFENSE_YARD_LINE;
  return {
    ...defaultOffensivePlay(nextPlayNumber, team),
    odk,
    yardLine,
    down: 1,
    distance: HS_OT_DISTANCE,
    playType: "",
    result: "",
    gainLoss: 0,
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
    spotEncoding: undefined,
    returnYards: undefined,
    kickYards: undefined,
  };
}

/** Next snap after our 4th-down punt — defense tags opponent Punt Rec. */
export function defaultPuntReceivePlay(
  playNumber: number,
  team: string,
  overrides?: Partial<PlaylistData>,
): PlaylistData {
  return {
    ...defaultOffensivePlay(playNumber, team),
    odk: ODK.Defense,
    playType: PlayType.PuntReceive,
    ...overrides,
  };
}

/** Defaults for a new offensive snap (caller fills playNumber + team) */
export function defaultOffensivePlay(
  playNumber: number,
  team: string,
  overrides?: Partial<PlaylistData>,
): PlaylistData {
  return {
    playNumber,
    quarter: 1,
    odk: ODK.Offense,
    yardLine: -25,
    down: 1,
    distance: 10,
    hash: Hash.Middle,
    gainLoss: 0,
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    result: "",
    team,
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    playType: "",
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
    ...overrides,
  };
}
