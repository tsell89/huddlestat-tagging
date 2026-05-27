import {
  ODK,
  PlayType,
  Result,
  emptyPlayerRef,
} from "./constants.js";
import {
  defaultKickoffPlay,
  defaultOffensivePlay,
  defaultScoringPlayAfterTd,
} from "./defaults.js";
import type { PlaylistData, YardLine } from "./index.js";
import {
  FIELD_OWN_GOAL,
  HS_TOUCHBACK_YARD_LINE,
  fieldPositionToHudl,
  flipHudlYardLinePerspective,
  hudlToFieldPosition,
  yardsAdvanced,
} from "./fieldPosition100.js";

export type SituationFields = Pick<
  PlaylistData,
  "down" | "distance" | "yardLine"
>;

export type PlayChainInput = Pick<
  PlaylistData,
  | "down"
  | "distance"
  | "yardLine"
  | "gainLoss"
  | "playType"
  | "result"
  | "completion"
  | "odk"
>;

const emptyPlayers: Pick<
  PlaylistData,
  | "passer"
  | "receiver"
  | "rusher"
  | "tackler1"
  | "tackler2"
  | "recoveredBy"
  | "returner"
  | "kicker"
  | "interceptedBy"
  | "returnYards"
  | "kickYards"
  | "completion"
> = {
  passer: emptyPlayerRef,
  receiver: emptyPlayerRef,
  rusher: emptyPlayerRef,
  tackler1: emptyPlayerRef,
  tackler2: emptyPlayerRef,
  recoveredBy: emptyPlayerRef,
  returner: emptyPlayerRef,
  kicker: emptyPlayerRef,
  interceptedBy: emptyPlayerRef,
  returnYards: undefined,
  kickYards: undefined,
  completion: undefined,
};

function decodeKickoffReturnEnd(completion?: string): YardLine | null {
  if (!completion?.startsWith("catch:")) return null;
  const match = /^catch:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(completion);
  if (!match) return null;
  if (match[2] === "TD" || match[2] === "SA") return 0;
  return Number(match[2]) as YardLine;
}

function decodePuntReturnEnd(completion?: string): YardLine | null {
  if (!completion?.startsWith("recv:")) return null;
  const match = /^recv:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(completion);
  if (!match) return null;
  if (match[2] === "TD" || match[2] === "SA") return 0;
  return Number(match[2]) as YardLine;
}

function decodePuntDownedEnd(completion?: string): YardLine | null {
  if (!completion?.startsWith("end:")) return null;
  const match = /^end:(TD|SA|-?\d+)$/.exec(completion);
  if (!match || match[1] === "TD" || match[1] === "SA") return null;
  return Number(match[1]) as YardLine;
}

/** INT / live-ball return — catch:+15|end:-32 */
function decodeCatchReturnEnd(completion?: string): YardLine | null {
  return decodeKickoffReturnEnd(completion);
}

/** Blocked punt/FG recovery — recover:+15|end:-32 */
function decodeBlockedKickEnd(completion?: string): YardLine | null {
  if (!completion?.startsWith("recover:")) return null;
  const match = /^recover:(-?\d+)(?:\|end:(TD|SA|-?\d+))?$/.exec(completion);
  if (!match) return null;
  if (!match[2] || match[2] === "TD" || match[2] === "SA") return 0;
  return Number(match[2]) as YardLine;
}

export type FumbleRecoverySide = "offense" | "defense";

export type FumbleCompletion = {
  fumbleAt: YardLine;
  endYardLine: YardLine;
  recoveredAt?: YardLine;
  recoveredBy: FumbleRecoverySide;
};

/** Fumble — fumble:-25|end:-22|by:O or fumble:-25|recover:10|end:-32|by:D */
export function decodeFumbleCompletion(
  completion?: string,
): FumbleCompletion | null {
  if (!completion?.startsWith("fumble:")) return null;
  const match =
    /^fumble:(-?\d+)(?:\|recover:(-?\d+))?\|end:(TD|SA|-?\d+)\|by:(O|D)$/.exec(
      completion,
    );
  if (!match) return null;
  const fumbleAt = Number(match[1]) as YardLine;
  const recoveredAt = match[2] ? (Number(match[2]) as YardLine) : undefined;
  const endToken = match[3];
  const endYardLine =
    endToken === "TD" || endToken === "SA"
      ? 0
      : (Number(endToken) as YardLine);
  return {
    fumbleAt,
    endYardLine,
    recoveredAt,
    recoveredBy: match[4] === "O" ? "offense" : "defense",
  };
}

/** Holding penalty — foul:-42 (MVP: 10 yards from spot of foul). */
export function decodePenaltyFoulSpot(completion?: string): YardLine | null {
  if (!completion?.startsWith("foul:")) return null;
  const match = /^foul:(-?\d+)$/.exec(completion);
  if (!match) return null;
  return Number(match[1]) as YardLine;
}

export const HOLDING_PENALTY_YARDS = 10;

function isFgPlay(playType: PlaylistData["playType"]): boolean {
  return playType === PlayType.FieldGoal;
}

function isFgNoGoodInField(completion?: string): boolean {
  return completion === "end:field";
}

function isFgNoGoodTouchback(completion?: string): boolean {
  return completion === "end:TB";
}

function isDefenseFumbleRecovery(completion?: string): boolean {
  const decoded = decodeFumbleCompletion(completion);
  return decoded?.recoveredBy === "defense";
}

function isLiveBallTurnover(play: PlayChainInput): boolean {
  if (play.result === Result.Cop) return true;
  if (play.result === Result.Interception) return true;
  if (play.result === Result.Fumble && isDefenseFumbleRecovery(play.completion)) {
    return true;
  }
  if (
    isFgPlay(play.playType) &&
    play.result === Result.NoGood &&
    isFgNoGoodInField(play.completion)
  ) {
    return true;
  }
  if (
    play.result === Result.Blocked &&
    (isPuntPlay(play.playType) || isFgPlay(play.playType))
  ) {
    return true;
  }
  return false;
}

function penaltySituation(play: PlayChainInput): SituationFields {
  const foulSpot = decodePenaltyFoulSpot(play.completion) ?? play.yardLine;
  const foulPos = hudlToFieldPosition(foulSpot);
  const newPos = Math.max(
    FIELD_OWN_GOAL,
    foulPos - HOLDING_PENALTY_YARDS,
  );
  const newYardLine = fieldPositionToHudl(newPos);
  const firstDownMarker =
    hudlToFieldPosition(play.yardLine) + play.distance;
  const newDistance = Math.max(1, firstDownMarker - newPos);
  return {
    down: play.down,
    distance: newDistance,
    yardLine: newYardLine,
  };
}

function isNoGainResult(result: PlaylistData["result"]): boolean {
  return result === Result.Incomplete || result === Result.TippedPass;
}

function isScrimmagePlay(playType: PlaylistData["playType"]): boolean {
  return playType === PlayType.Run || playType === PlayType.Pass;
}

function isKickoffPlay(playType: PlaylistData["playType"]): boolean {
  return (
    playType === PlayType.Kickoff || playType === PlayType.KickoffReceive
  );
}

function isPuntPlay(playType: PlaylistData["playType"]): boolean {
  return playType === PlayType.Punt || playType === PlayType.PuntReceive;
}

function isTouchdownResult(result: PlaylistData["result"]): boolean {
  return result === Result.RushTd || result === Result.CompleteTd;
}

function isScoringGood(play: Pick<PlaylistData, "playType" | "result">): boolean {
  if (play.result !== Result.Good) return false;
  return (
    play.playType === PlayType.FieldGoal ||
    play.playType === PlayType.ExtraPoint ||
    play.playType === PlayType.TwoPoint
  );
}

/** Completed scoring snap that advances to kickoff (Good XP/2pt/FG or blocked attempt). */
function isScoringComplete(
  play: Pick<PlaylistData, "playType" | "result">,
): boolean {
  if (isScoringGood(play)) return true;
  if (play.result !== Result.Blocked) return false;
  return (
    play.playType === PlayType.ExtraPointBlock ||
    play.playType === PlayType.TwoPointBlock
  );
}

/** Ball spot after a play ends (next snap inherits this). */
export function yardLineAfterPlay(
  play: Pick<
    PlaylistData,
    "playType" | "result" | "yardLine" | "gainLoss" | "completion"
  >,
): YardLine {
  if (isKickoffPlay(play.playType) && play.result === Result.Touchback) {
    return HS_TOUCHBACK_YARD_LINE;
  }

  if (
    isPuntPlay(play.playType) &&
    play.result === Result.Touchback
  ) {
    return HS_TOUCHBACK_YARD_LINE;
  }

  if (isKickoffPlay(play.playType) && play.result === Result.Return) {
    const end = decodeKickoffReturnEnd(play.completion);
    if (end !== null) return end;
  }

  if (isPuntPlay(play.playType) && play.result === Result.Return) {
    const end = decodePuntReturnEnd(play.completion);
    if (end !== null) return end;
  }

  if (isPuntPlay(play.playType) && play.result === Result.Downed) {
    const end = decodePuntDownedEnd(play.completion);
    if (end !== null) return end;
  }

  if (play.result === Result.Interception) {
    const end = decodeCatchReturnEnd(play.completion);
    if (end !== null) return end;
  }

  if (play.result === Result.Fumble) {
    const fumble = decodeFumbleCompletion(play.completion);
    if (fumble) return fumble.endYardLine;
  }

  if (
    play.result === Result.Blocked &&
    (isPuntPlay(play.playType) || isFgPlay(play.playType))
  ) {
    const end = decodeBlockedKickEnd(play.completion);
    if (end !== null) return end;
  }

  if (isFgPlay(play.playType) && play.result === Result.NoGood) {
    if (isFgNoGoodTouchback(play.completion)) {
      return HS_TOUCHBACK_YARD_LINE;
    }
    if (isFgNoGoodInField(play.completion)) {
      return play.yardLine;
    }
  }

  if (play.result === Result.Penalty) {
    const foulSpot = decodePenaltyFoulSpot(play.completion) ?? play.yardLine;
    const foulPos = hudlToFieldPosition(foulSpot);
    const newPos = Math.max(
      FIELD_OWN_GOAL,
      foulPos - HOLDING_PENALTY_YARDS,
    );
    return fieldPositionToHudl(newPos);
  }

  if (isNoGainResult(play.result)) {
    return play.yardLine;
  }

  const endPos = hudlToFieldPosition(play.yardLine) + play.gainLoss;
  return fieldPositionToHudl(endPos);
}

/** Whether a 4th-down scrimmage play failed to convert (turnover on downs). */
export function isFailedFourthDown(
  play: Pick<
    PlaylistData,
    "down" | "distance" | "gainLoss" | "playType" | "result"
  >,
): boolean {
  if (play.down !== 4) return false;
  if (!isScrimmagePlay(play.playType)) return false;
  if (isNoGainResult(play.result)) return true;
  return play.gainLoss < play.distance;
}

/** Apply save-time normalization: incomplete gainLoss=0, auto COP on failed 4th. */
export function normalizePlayOnSave(play: PlaylistData): PlaylistData {
  let normalized = play;

  if (isNoGainResult(play.result)) {
    normalized = { ...normalized, gainLoss: 0 };
  }

  if (isFailedFourthDown(normalized)) {
    normalized = { ...normalized, result: Result.Cop };
  }

  return normalized;
}

function turnoverSituation(
  play: PlayChainInput,
  endYardLine: YardLine,
): SituationFields {
  return {
    down: 1,
    distance: 10,
    yardLine: flipHudlYardLinePerspective(endYardLine),
  };
}

/** Advance down, distance, and ball spot after a play. */
export function advanceSituation(play: PlayChainInput): SituationFields {
  if (isKickoffPlay(play.playType)) {
    return {
      down: 1,
      distance: 10,
      yardLine: yardLineAfterPlay(play),
    };
  }

  if (play.result === Result.Penalty) {
    return penaltySituation(play);
  }

  if (play.result === Result.Interception) {
    return turnoverSituation(play, yardLineAfterPlay(play));
  }

  if (play.result === Result.Fumble) {
    const fumble = decodeFumbleCompletion(play.completion);
    if (fumble?.recoveredBy === "defense") {
      return turnoverSituation(play, fumble.endYardLine);
    }
    if (fumble) {
      const endYardLine = fumble.endYardLine;
      const gain = yardsAdvanced(play.yardLine, endYardLine);
      const firstDown = gain >= play.distance;
      if (firstDown) {
        return { down: 1, distance: 10, yardLine: endYardLine };
      }
      if (play.down >= 4) {
        return turnoverSituation(play, endYardLine);
      }
      return {
        down: play.down + 1,
        distance: Math.max(1, play.distance - gain),
        yardLine: endYardLine,
      };
    }
  }

  if (isFgPlay(play.playType) && play.result === Result.NoGood) {
    if (isFgNoGoodTouchback(play.completion)) {
      return {
        down: 1,
        distance: 10,
        yardLine: HS_TOUCHBACK_YARD_LINE,
      };
    }
    if (isFgNoGoodInField(play.completion)) {
      return turnoverSituation(play, play.yardLine);
    }
  }

  if (
    play.result === Result.Blocked &&
    (isPuntPlay(play.playType) || isFgPlay(play.playType))
  ) {
    const end = yardLineAfterPlay(play);
    return turnoverSituation(play, end);
  }

  if (isNoGainResult(play.result)) {
    if (play.down >= 4) {
      return turnoverSituation(play, play.yardLine);
    }
    return {
      down: play.down + 1,
      distance: play.distance,
      yardLine: play.yardLine,
    };
  }

  const endYardLine = yardLineAfterPlay(play);
  const gain = play.gainLoss;
  const firstDown = gain >= play.distance;

  if (firstDown) {
    return { down: 1, distance: 10, yardLine: endYardLine };
  }

  if (play.down >= 4) {
    return turnoverSituation(play, endYardLine);
  }

  return {
    down: play.down + 1,
    distance: Math.max(1, play.distance - gain),
    yardLine: endYardLine,
  };
}

/** Next tagging draft after saving a play. */
export function nextDraftAfterPlay(
  savedPlay: PlaylistData,
  nextPlayNumber: number,
  team: string,
): PlaylistData {
  const play = normalizePlayOnSave(savedPlay);

  if (isScoringComplete(play)) {
    return defaultKickoffPlay(nextPlayNumber, team);
  }

  if (isTouchdownResult(play.result) && isScrimmagePlay(play.playType)) {
    return defaultScoringPlayAfterTd(nextPlayNumber, team, play.odk);
  }

  const situation = advanceSituation(play);
  const afterKickoff = isKickoffPlay(play.playType);
  const afterTurnover =
    isLiveBallTurnover(play) ||
    (play.down === 4 && isScrimmagePlay(play.playType) && !afterKickoff);

  const afterFgNoGoodTouchback =
    isFgPlay(play.playType) &&
    play.result === Result.NoGood &&
    isFgNoGoodTouchback(play.completion);

  if (afterKickoff) {
    return {
      ...defaultOffensivePlay(nextPlayNumber, team),
      ...situation,
      ...emptyPlayers,
    };
  }

  if (afterTurnover || afterFgNoGoodTouchback) {
    return {
      ...defaultOffensivePlay(nextPlayNumber, team),
      ...situation,
      odk:
        play.odk === ODK.Offense
          ? ODK.Defense
          : play.odk === ODK.Defense
            ? ODK.Offense
            : ODK.Offense,
      ...emptyPlayers,
    };
  }

  return {
    ...defaultOffensivePlay(nextPlayNumber, team),
    ...situation,
    ...emptyPlayers,
  };
}

/** Live draft from the last saved play (same chain as after save). */
export function liveDraftFromLastPlay(
  lastPlay: PlaylistData,
  nextPlayNumber: number,
  team: string,
): PlaylistData {
  return nextDraftAfterPlay(lastPlay, nextPlayNumber, team);
}
