import { Hash, ODK, PlayType, Result, emptyPlayerRef } from "../constants.js";
import {
  fieldPositionToHudl,
  flipHudlYardLinePerspective,
} from "../fieldPosition100.js";
import { defaultKickoffPlay, defaultOffensivePlay } from "../defaults.js";
import type { PlaylistData } from "../index.js";

/** Subset of CFBD API Play fields used for mapping. */
export type CfbdPlay = {
  id: number;
  driveNumber?: number;
  playNumber: number;
  offense: string;
  defense: string;
  down: number | null;
  distance: number | null;
  yardsToGoal: number | null;
  yardsGained: number | null;
  playType: string;
  playText?: string;
  scoring?: boolean;
  period?: number;
};

export type CfbdMapContext = {
  teamOffense: string;
  /** When true, `teamOffense` is on offense for this snap */
  isOurOffense: boolean;
};

function periodToQuarter(period?: number): number {
  if (period === undefined || period < 1) return 1;
  return Math.min(period, 5);
}

function emptyPlay(
  playNumber: number,
  team: string,
  overrides: Partial<PlaylistData>,
  period?: number,
): PlaylistData {
  return {
    ...defaultOffensivePlay(playNumber, team),
    quarter: periodToQuarter(period),
    ...overrides,
  };
}

function yardsToGoalToHudl(
  yardsToGoal: number,
  isOurOffense: boolean,
): number {
  const pos = 100 - yardsToGoal;
  const hudl = fieldPositionToHudl(pos);
  return isOurOffense ? hudl : flipHudlYardLinePerspective(hudl);
}

function classifyCfbdPlay(
  play: CfbdPlay,
): Pick<PlaylistData, "playType" | "result" | "completion"> {
  const t = play.playType.toLowerCase();
  const text = (play.playText ?? "").toLowerCase();

  if (t.includes("kickoff")) {
    if (text.includes("touchback")) {
      return {
        playType: PlayType.KickoffReceive,
        result: Result.Touchback,
        completion: undefined,
      };
    }
    return {
      playType: PlayType.Kickoff,
      result: Result.Return,
      completion: "catch:-5|end:-25",
    };
  }
  if (t.includes("penalty")) {
    const foulMatch = /at the (\w+) (\d+)/i.exec(play.playText ?? "");
    let foulHudl: number | undefined;
    if (foulMatch) {
      const n = Number(foulMatch[2]);
      const side = foulMatch[1]?.toLowerCase();
      if (side?.includes("opp")) {
        foulHudl = n;
      } else {
        foulHudl = -n;
      }
    }
    return {
      playType: PlayType.Run,
      result: Result.Penalty,
      completion: foulHudl !== undefined ? `foul:${foulHudl}` : undefined,
    };
  }
  if (t.includes("sack")) {
    return { playType: PlayType.Pass, result: Result.Sack };
  }
  if (t.includes("incompletion") || t.includes("incomplete")) {
    return { playType: PlayType.Pass, result: Result.Incomplete };
  }
  if (t.includes("pass reception") || (t.includes("pass") && t.includes("gain"))) {
    return { playType: PlayType.Pass, result: Result.Complete };
  }
  if (t.includes("rush") || t.includes("run")) {
    return { playType: PlayType.Run, result: Result.Rush };
  }
  if (t.includes("field goal") && t.includes("good")) {
    return { playType: PlayType.FieldGoal, result: Result.Good };
  }
  if (t.includes("field goal") && (t.includes("miss") || t.includes("no good"))) {
    const intoEz = text.includes("end zone") || text.includes("endzone");
    return {
      playType: PlayType.FieldGoal,
      result: Result.NoGood,
      completion: intoEz ? "end:TB" : "end:field",
    };
  }
  if (t.includes("punt")) {
    if (text.includes("touchback")) {
      return { playType: PlayType.PuntReceive, result: Result.Touchback };
    }
    return { playType: PlayType.Punt, result: Result.Downed, completion: "end:-35" };
  }

  return { playType: "", result: "" };
}

export function mapCfbdPlay(
  play: CfbdPlay,
  ctx: CfbdMapContext,
): PlaylistData | null {
  const down = play.down ?? 0;
  const distance = play.distance ?? 0;
  const ytg = play.yardsToGoal;
  if (ytg === null) return null;

  const yardLine = yardsToGoalToHudl(ytg, ctx.isOurOffense);
  const gainLoss = play.yardsGained ?? 0;
  const classified = classifyCfbdPlay(play);
  const odk = ctx.isOurOffense ? ODK.Offense : ODK.Defense;

  const quarter = periodToQuarter(play.period);

  if (classified.playType === PlayType.Kickoff) {
    return {
      ...defaultKickoffPlay(play.playNumber, ctx.teamOffense),
      quarter,
      odk: ODK.Kicking,
      yardLine: -40,
      down: 0,
      distance: 0,
      result: classified.result,
      gainLoss,
      completion: classified.completion,
      hash: Hash.Middle,
    };
  }

  if (classified.playType === PlayType.KickoffReceive) {
    return {
      ...defaultKickoffPlay(play.playNumber, ctx.teamOffense),
      quarter,
      playType: PlayType.KickoffReceive,
      odk: ODK.Kicking,
      result: classified.result,
      gainLoss: 0,
      hash: Hash.Middle,
    };
  }

  return emptyPlay(
    play.playNumber,
    ctx.teamOffense,
    {
      odk,
      yardLine,
      down,
      distance,
      gainLoss,
      hash: Hash.Middle,
      ...classified,
    },
    play.period,
  );
}

/** Build isOurOffense from drive offense string. */
export function isOurTeamOnOffense(
  offenseAbbrev: string,
  teamOffense: string,
): boolean {
  return (
    offenseAbbrev.toUpperCase() === teamOffense.toUpperCase() ||
    offenseAbbrev.toUpperCase() === "TEAM_A"
  );
}
