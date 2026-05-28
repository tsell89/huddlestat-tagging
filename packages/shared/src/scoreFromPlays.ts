import { ODK, PlayType, Result } from "./constants.js";
import type { GamePhase, PlaylistData } from "./index.js";
import { isFailedFourthDown } from "./playChain.js";

export type ScoreFromPlays = {
  us: number;
  them: number;
};

function isTouchdownResult(result: PlaylistData["result"]): boolean {
  return result === Result.RushTd || result === Result.CompleteTd;
}

function isReturnTouchdown(play: PlaylistData): boolean {
  return play.completion?.includes("end:TD") === true;
}

function isTouchdownPlay(play: PlaylistData): boolean {
  return isTouchdownResult(play.result) || isReturnTouchdown(play);
}

function isSafetyPlay(play: PlaylistData): boolean {
  if (play.result === Result.Safety) return true;
  return play.completion?.includes("end:SA") === true;
}

function isScoringGood(play: Pick<PlaylistData, "playType" | "result">): boolean {
  if (play.result !== Result.Good) return false;
  return (
    play.playType === PlayType.FieldGoal ||
    play.playType === PlayType.ExtraPoint ||
    play.playType === PlayType.TwoPoint
  );
}

/** Opponent offensive TD while we are on defense (Run/Pass, odk D). */
function isOpponentOffensiveTd(play: PlaylistData): boolean {
  return (
    play.odk === ODK.Defense &&
    isTouchdownResult(play.result) &&
    (play.playType === PlayType.Run || play.playType === PlayType.Pass)
  );
}

function pointsForTouchdown(play: PlaylistData): ScoreFromPlays {
  if (!isTouchdownPlay(play)) return { us: 0, them: 0 };
  if (play.odk === ODK.Offense) return { us: 6, them: 0 };
  if (isOpponentOffensiveTd(play)) return { us: 0, them: 6 };
  return { us: 6, them: 0 };
}

function pointsForScoringAttempt(play: PlaylistData): ScoreFromPlays {
  if (play.result !== Result.Good) return { us: 0, them: 0 };
  if (play.odk === ODK.Offense) {
    if (play.playType === PlayType.FieldGoal) return { us: 3, them: 0 };
    if (play.playType === PlayType.ExtraPoint) return { us: 1, them: 0 };
    if (play.playType === PlayType.TwoPoint) return { us: 2, them: 0 };
  }
  if (play.odk === ODK.Defense) {
    if (play.playType === PlayType.FieldGoal) return { us: 0, them: 3 };
    if (play.playType === PlayType.ExtraPoint) return { us: 0, them: 1 };
    if (play.playType === PlayType.TwoPoint) return { us: 0, them: 2 };
  }
  return { us: 0, them: 0 };
}

function pointsForSafety(play: PlaylistData): ScoreFromPlays {
  if (!isSafetyPlay(play)) return { us: 0, them: 0 };
  if (play.odk === ODK.Offense) return { us: 0, them: 2 };
  if (play.odk === ODK.Defense) return { us: 2, them: 0 };
  return { us: 0, them: 0 };
}

function addScore(a: ScoreFromPlays, b: ScoreFromPlays): ScoreFromPlays {
  return { us: a.us + b.us, them: a.them + b.them };
}

/** Tagged-team perspective: us = home row in local SQLite. */
export function deriveScoreFromPlays(plays: PlaylistData[]): ScoreFromPlays {
  return plays.reduce(
    (total, play) =>
      addScore(
        total,
        addScore(
          addScore(pointsForTouchdown(play), pointsForScoringAttempt(play)),
          pointsForSafety(play),
        ),
      ),
    { us: 0, them: 0 },
  );
}

function endsOtPossession(play: PlaylistData): boolean {
  if (play.quarter !== 5) return false;
  if (isScoringGood(play)) return true;
  if (play.playType === PlayType.FieldGoal && play.result === Result.NoGood) {
    return true;
  }
  if (isFailedFourthDown(play)) return true;
  if (play.result === Result.Cop) return true;
  if (play.result === Result.Interception) return true;
  if (isSafetyPlay(play)) return true;
  return false;
}

export type OtPossessionCounts = {
  us: number;
  them: number;
};

export function countOtPossessions(plays: PlaylistData[]): OtPossessionCounts {
  const counts: OtPossessionCounts = { us: 0, them: 0 };
  for (const play of plays) {
    if (play.quarter !== 5 || !endsOtPossession(play)) continue;
    if (play.odk === ODK.Offense) counts.us += 1;
    else if (play.odk === ODK.Defense) counts.them += 1;
  }
  return counts;
}

/**
 * HS OT: decisive lead after both teams have completed the same number of OT possessions.
 */
export function shouldFinalizeOtGame(
  plays: PlaylistData[],
  phase: GamePhase,
  score: ScoreFromPlays,
): boolean {
  if (phase !== "OT") return false;
  if (score.us === score.them) return false;
  const possessions = countOtPossessions(plays);
  return (
    possessions.us === possessions.them &&
    possessions.us > 0 &&
    possessions.them > 0
  );
}
