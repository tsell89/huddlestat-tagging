import { Hash, ODK, PlayType, Result, emptyPlayerRef } from "./constants.js";
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
    odk: ODK.Kicking,
    yardLine: -40,
    down: 0,
    distance: 0,
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
    playType: PlayType.Kickoff,
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
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
