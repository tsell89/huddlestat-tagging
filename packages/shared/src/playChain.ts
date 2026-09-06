import {
  ODK,
  PlayType,
  Result,
  emptyPlayerRef,
} from "./constants.js";
import {
  defaultHsOtPossessionSnap,
  defaultKickoffPlay,
  defaultOffensivePlay,
  defaultPuntReceivePlay,
  defaultScoringPlayAfterTd,
} from "./defaults.js";
import type { PlaylistData, YardLine } from "./index.js";
import { advancePenaltySituation, decodePenalty, enforcePenaltyFieldPosition, penaltyTaggedDelta } from "./penalty.js";
import {
  HS_TOUCHBACK_YARD_LINE,
  capDistanceToGoal,
  fieldPositionToHudl,
  flipHudlYardLinePerspective,
  hudlForOpponentOffenseAtFieldSpot,
  hudlToFieldPosition,
  yardsAdvanced,
} from "./fieldPosition100.js";

export {
  HOLDING_PENALTY_YARDS,
  decodePenalty,
  decodePenaltyFoulSpot,
  encodePenaltySpotEncoding,
  advancePenaltySituation,
  enforcePenaltyFieldPosition,
  penaltyTaggedDelta,
  PENALTY_YARD_OPTIONS,
  type DecodedPenalty,
  type PenaltyAgainst,
  type PenaltyYards,
} from "./penalty.js";

export type SituationFields = Pick<
  PlaylistData,
  "down" | "distance" | "yardLine"
>;

/**
 * 1st & 10, or 1st & Goal when the team with the ball is inside the 10.
 * Pass the **next** snap's ODK — D series attacks our goal, O attacks theirs.
 */
export function firstAndTenOrGoal(
  yardLine: YardLine,
  possession: PlaylistData["odk"] = ODK.Offense,
): SituationFields {
  return {
    down: 1,
    distance: capDistanceToGoal(10, yardLine, possession),
    yardLine,
  };
}

export type PlayChainInput = Pick<
  PlaylistData,
  | "down"
  | "distance"
  | "yardLine"
  | "gainLoss"
  | "playType"
  | "result"
  | "spotEncoding"
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
  | "spotEncoding"
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
  spotEncoding: undefined,
};

function decodeTackleYardLineEnd(spotEncoding?: string): YardLine | null {
  if (!spotEncoding?.startsWith("tackle:")) return null;
  const match = /^tackle:(-?\d+)\|end:(-?\d+)$/.exec(spotEncoding);
  if (!match) return null;
  return Number(match[2]) as YardLine;
}

function decodeKickoffReturnEnd(spotEncoding?: string): YardLine | null {
  if (!spotEncoding?.startsWith("catch:")) return null;
  const match = /^catch:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match) return null;
  if (match[2] === "TD" || match[2] === "SA") return 0;
  return Number(match[2]) as YardLine;
}

function decodePuntReturnEnd(spotEncoding?: string): YardLine | null {
  if (!spotEncoding?.startsWith("recv:")) return null;
  const match = /^recv:(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match) return null;
  if (match[2] === "TD" || match[2] === "SA") return 0;
  return Number(match[2]) as YardLine;
}

function decodePuntDownedEnd(spotEncoding?: string): YardLine | null {
  if (!spotEncoding?.startsWith("end:")) return null;
  const match = /^end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match || match[1] === "TD" || match[1] === "SA") return null;
  return Number(match[1]) as YardLine;
}

/** INT / live-ball return — catch:+15|end:-32 */
function decodeCatchReturnEnd(spotEncoding?: string): YardLine | null {
  return decodeKickoffReturnEnd(spotEncoding);
}

/** Blocked punt/FG recovery — recover:+15|end:-32 */
function decodeBlockedKickEnd(spotEncoding?: string): YardLine | null {
  if (!spotEncoding?.startsWith("recover:")) return null;
  const match = /^recover:(-?\d+)(?:\|end:(TD|SA|-?\d+))?$/.exec(spotEncoding);
  if (!match) return null;
  if (!match[2] || match[2] === "TD" || match[2] === "SA") return 0;
  return Number(match[2]) as YardLine;
}

export type FumbleRecoverySide = "offense" | "defense";

export type FumbleEndKind = "yardline" | "touchdown" | "safety";

export type DecodedFumbleSpot = {
  fumbleAt: YardLine;
  endYardLine: YardLine;
  endKind: FumbleEndKind;
  recoveredAt?: YardLine;
  recoveredBy: FumbleRecoverySide;
};

/** Fumble — fumble:-25|end:-22|by:O or fumble:-25|recover:10|end:-32|by:D */
export function decodeFumbleSpotEncoding(
  spotEncoding?: string,
): DecodedFumbleSpot | null {
  if (!spotEncoding?.startsWith("fumble:")) return null;
  const match =
    /^fumble:(-?\d+)(?:\|recover:(-?\d+))?\|end:(TD|SA|-?\d+)\|by:(O|D)$/.exec(
      spotEncoding,
    );
  if (!match) return null;
  const fumbleAt = Number(match[1]) as YardLine;
  const recoveredAt = match[2] ? (Number(match[2]) as YardLine) : undefined;
  const endToken = match[3];
  const endKind: FumbleEndKind =
    endToken === "TD"
      ? "touchdown"
      : endToken === "SA"
        ? "safety"
        : "yardline";
  const endYardLine =
    endKind === "yardline" ? (Number(endToken) as YardLine) : 0;
  return {
    fumbleAt,
    endYardLine,
    endKind,
    recoveredAt,
    recoveredBy: match[4] === "O" ? "offense" : "defense",
  };
}

function isFgPlay(playType: PlaylistData["playType"]): boolean {
  return playType === PlayType.FieldGoal;
}

function isFgNoGoodInField(spotEncoding?: string): boolean {
  return spotEncoding === "end:field";
}

function isFgNoGoodTouchback(spotEncoding?: string): boolean {
  return spotEncoding === "end:TB";
}

function isDefenseFumbleRecovery(spotEncoding?: string): boolean {
  const decoded = decodeFumbleSpotEncoding(spotEncoding);
  return decoded?.recoveredBy === "defense";
}

function isLiveBallTurnover(play: PlayChainInput): boolean {
  if (play.result === Result.Cop) return true;
  if (play.result === Result.Interception) return true;
  if (play.result === Result.Fumble && isDefenseFumbleRecovery(play.spotEncoding)) {
    return true;
  }
  if (
    isFgPlay(play.playType) &&
    play.result === Result.NoGood &&
    isFgNoGoodInField(play.spotEncoding)
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
  return advancePenaltySituation(play);
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

function isReturnTouchdown(play: Pick<PlaylistData, "spotEncoding">): boolean {
  const c = play.spotEncoding;
  if (!c) return false;
  // Scrimmage TDs may use tackle:LOS|end:TD — not a return.
  if (c.startsWith("tackle:")) return false;
  return /end:TD/.test(c);
}

/** ODK for XP/2pt after a return TD (tagged-team perspective). */
function scoringOdkAfterReturnTd(
  play: Pick<PlaylistData, "playType" | "odk" | "spotEncoding">,
): (typeof ODK)[keyof typeof ODK] {
  if (
    play.playType === PlayType.KickoffReceive ||
    play.playType === PlayType.PuntReceive
  ) {
    return ODK.Offense;
  }
  // Our KO/Punt returned or blocked for their TD → we defend the PAT.
  if (
    play.playType === PlayType.Kickoff ||
    play.playType === PlayType.Punt
  ) {
    return ODK.Defense;
  }
  if (play.spotEncoding?.includes("|by:O")) {
    return play.odk === ODK.Defense ? ODK.Defense : ODK.Offense;
  }
  return play.odk === ODK.Defense ? ODK.Offense : ODK.Defense;
}

/** Who gets the XP/2pt snap after a TD (O = Extra Pt. Good, D = Extra Pt. Block). */
export function scoringOdkForTouchdown(
  play: Pick<PlaylistData, "playType" | "odk" | "result" | "spotEncoding">,
): (typeof ODK)[keyof typeof ODK] {
  if (isReturnTouchdown(play)) return scoringOdkAfterReturnTd(play);
  return play.odk === ODK.Defense ? ODK.Defense : ODK.Offense;
}

function isSuccessfulPuntEnding(play: PlayChainInput): boolean {
  if (!isPuntPlay(play.playType) || play.result === Result.Blocked) {
    return false;
  }
  if (isLiveBallTurnover(play)) return false;
  return (
    play.result === Result.Downed ||
    play.result === Result.FairCatch ||
    play.result === Result.Return ||
    play.result === Result.Touchback
  );
}

function isSuccessfulFourthDownPunt(play: PlaylistData): boolean {
  return play.playType === PlayType.Punt && play.down === 4 && isSuccessfulPuntEnding(play);
}

/**
 * Ball spot for defense Punt Rec after our successful punt (4th-down flip).
 *
 * All yardage uses the tagged team's 0–100 field (0 = our goal, 100 = opponent goal).
 *
 * - Downed: `end:N` on the Punt row is our-offense Hudl → field spot → opponent-offense Hudl.
 * - Return: `recv:|end:` is already opponent-offense Hudl at the return end spot.
 * - Touchback: HS receiving spot (Own 20) already in opponent-offense Hudl.
 */
function puntReceiveSituation(play: PlayChainInput): SituationFields {
  const endHudl = yardLineAfterPlay(play);
  const nextOdk =
    play.odk === ODK.Offense ? ODK.Defense : ODK.Offense;

  if (play.result === Result.Return || play.result === Result.Touchback) {
    return firstAndTenOrGoal(endHudl, nextOdk);
  }

  const fieldSpot = hudlToFieldPosition(endHudl);
  return firstAndTenOrGoal(
    hudlForOpponentOffenseAtFieldSpot(fieldSpot),
    nextOdk,
  );
}

function isTouchdownResult(result: PlaylistData["result"]): boolean {
  return result === Result.RushTd || result === Result.CompleteTd;
}

/** Safety via explicit result or live-ball end:SA (not a TD). */
function isSafetyOutcome(
  play: Pick<PlaylistData, "result" | "spotEncoding">,
): boolean {
  if (play.result === Result.Safety) return true;
  return play.spotEncoding?.includes("end:SA") === true;
}

function isScoringGood(play: Pick<PlaylistData, "playType" | "result">): boolean {
  if (play.result !== Result.Good) return false;
  return (
    play.playType === PlayType.FieldGoal ||
    play.playType === PlayType.ExtraPoint ||
    play.playType === PlayType.TwoPoint ||
    play.playType === PlayType.ExtraPointBlock ||
    play.playType === PlayType.TwoPointBlock
  );
}

function isHsOtScoringSnap(play: Pick<PlaylistData, "playType">): boolean {
  return (
    play.playType === PlayType.ExtraPoint ||
    play.playType === PlayType.TwoPoint ||
    play.playType === PlayType.ExtraPointBlock ||
    play.playType === PlayType.TwoPointBlock
  );
}

export type PlayChainOptions = {
  /** Game rules — HS OT uses alternating possessions from the 10, not kickoff. */
  rules?: "HS" | "NCAA" | "NFL";
  /** True when the game is in an overtime period. */
  overtime?: boolean;
};

/** Completed scoring snap that advances to kickoff (or OT possession). */
function isScoringComplete(
  play: Pick<PlaylistData, "playType" | "result">,
): boolean {
  if (isScoringGood(play)) return true;
  // Missed XP / 2pt still ends the try — kickoff (or OT flip).
  if (
    play.result === Result.NoGood &&
    (play.playType === PlayType.ExtraPoint ||
      play.playType === PlayType.TwoPoint ||
      play.playType === PlayType.ExtraPointBlock ||
      play.playType === PlayType.TwoPointBlock)
  ) {
    return true;
  }
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
    "playType" | "result" | "yardLine" | "gainLoss" | "spotEncoding" | "odk"
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
    const end = decodeKickoffReturnEnd(play.spotEncoding);
    if (end !== null) return end;
  }

  if (isPuntPlay(play.playType) && play.result === Result.Return) {
    const end = decodePuntReturnEnd(play.spotEncoding);
    if (end !== null) return end;
  }

  if (
    isPuntPlay(play.playType) &&
    (play.result === Result.Downed || play.result === Result.FairCatch)
  ) {
    const end = decodePuntDownedEnd(play.spotEncoding);
    if (end !== null) return end;
  }

  const tackleEnd = decodeTackleYardLineEnd(play.spotEncoding);
  if (tackleEnd !== null) return tackleEnd;

  if (play.result === Result.Interception) {
    const end = decodeCatchReturnEnd(play.spotEncoding);
    if (end !== null) return end;
  }

  if (play.result === Result.Fumble) {
    const fumble = decodeFumbleSpotEncoding(play.spotEncoding);
    if (fumble) return fumble.endYardLine;
  }

  if (
    play.result === Result.Blocked &&
    (isPuntPlay(play.playType) || isFgPlay(play.playType))
  ) {
    const end = decodeBlockedKickEnd(play.spotEncoding);
    if (end !== null) return end;
  }

  if (isFgPlay(play.playType) && play.result === Result.NoGood) {
    if (isFgNoGoodTouchback(play.spotEncoding)) {
      return HS_TOUCHBACK_YARD_LINE;
    }
    if (isFgNoGoodInField(play.spotEncoding)) {
      return play.yardLine;
    }
  }

  if (play.result === Result.Penalty) {
    const decoded = decodePenalty(play.spotEncoding) ?? {
      foulSpot: play.yardLine,
      yards: 10 as const,
      against: "O" as const,
      autoFirstDown: false,
    };
    const foulPos = hudlToFieldPosition(decoded.foulSpot);
    const taggedDelta = penaltyTaggedDelta(
      decoded.yards,
      decoded.against,
      play.odk,
    );
    return fieldPositionToHudl(
      enforcePenaltyFieldPosition(foulPos, taggedDelta),
    );
  }

  if (isNoGainResult(play.result) || play.result === Result.Timeout) {
    return play.yardLine;
  }

  // gainLoss is possession yards; tagged-axis advance flips on odk D.
  const axisGain =
    play.odk === ODK.Defense ? -play.gainLoss : play.gainLoss;
  const endPos = hudlToFieldPosition(play.yardLine) + axisGain;
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
  if (play.result === Result.Penalty) return false;
  if (play.result === Result.Timeout) return false;
  if (isTouchdownResult(play.result)) return false;
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
  const nextOdk =
    play.odk === ODK.Offense ? ODK.Defense : ODK.Offense;
  return firstAndTenOrGoal(
    flipHudlYardLinePerspective(endYardLine),
    nextOdk,
  );
}

/** Advance down, distance, and ball spot after a play. */
export function advanceSituation(play: PlayChainInput): SituationFields {
  // Timeout does not change the snap situation.
  if (play.result === Result.Timeout) {
    return {
      down: play.down,
      distance: play.distance,
      yardLine: play.yardLine,
    };
  }

  if (isKickoffPlay(play.playType)) {
    return firstAndTenOrGoal(yardLineAfterPlay(play));
  }

  if (play.result === Result.Penalty) {
    return penaltySituation(play);
  }

  if (play.result === Result.Interception) {
    return turnoverSituation(play, yardLineAfterPlay(play));
  }

  if (play.result === Result.Fumble) {
    const fumble = decodeFumbleSpotEncoding(play.spotEncoding);
    if (fumble?.recoveredBy === "defense") {
      return turnoverSituation(play, fumble.endYardLine);
    }
    if (fumble) {
      const endYardLine = fumble.endYardLine;
      const taggedGain = yardsAdvanced(play.yardLine, endYardLine);
      const gain = play.odk === ODK.Defense ? -taggedGain : taggedGain;
      const firstDown = gain >= play.distance;
      if (firstDown) {
        return firstAndTenOrGoal(endYardLine, play.odk);
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
    if (isFgNoGoodTouchback(play.spotEncoding)) {
      const nextOdk =
        play.odk === ODK.Offense ? ODK.Defense : ODK.Offense;
      return firstAndTenOrGoal(HS_TOUCHBACK_YARD_LINE, nextOdk);
    }
    if (isFgNoGoodInField(play.spotEncoding)) {
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
    return firstAndTenOrGoal(endYardLine, play.odk);
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
  options?: PlayChainOptions,
): PlaylistData {
  const play = normalizePlayOnSave(savedPlay);

  // Timeout: same series, same spot — clock only.
  if (play.result === Result.Timeout) {
    return {
      ...defaultOffensivePlay(nextPlayNumber, team),
      down: play.down,
      distance: play.distance,
      yardLine: play.yardLine,
      odk: play.odk,
      ...emptyPlayers,
    };
  }

  if (isScoringComplete(play)) {
    if (
      options?.rules === "HS" &&
      options.overtime &&
      isHsOtScoringSnap(play)
    ) {
      const nextOdk =
        play.odk === ODK.Offense ? ODK.Defense : ODK.Offense;
      return defaultHsOtPossessionSnap(nextPlayNumber, team, nextOdk);
    }
    return defaultKickoffPlay(nextPlayNumber, team);
  }

  // Safety → free kick (NFHS: scored-upon team kicks from their 20).
  if (isSafetyOutcome(play)) {
    if (play.odk === ODK.Offense) {
      // We were scored upon → we free-kick from Own 20.
      return {
        ...defaultKickoffPlay(nextPlayNumber, team),
        playType: PlayType.Kickoff,
        yardLine: -20,
      };
    }
    // We scored the safety → they free-kick; we receive from Opp 20.
    return {
      ...defaultKickoffPlay(nextPlayNumber, team),
      playType: PlayType.KickoffReceive,
      yardLine: 20,
    };
  }

  if (
    isReturnTouchdown(play) ||
    (isTouchdownResult(play.result) && isScrimmagePlay(play.playType))
  ) {
    return defaultScoringPlayAfterTd(
      nextPlayNumber,
      team,
      scoringOdkForTouchdown(play),
    );
  }

  if (isSuccessfulFourthDownPunt(play)) {
    // Opponent punt (we are on D): dead-ball endings → our O at the tagged end spot.
    // (Return still goes through Punt Rec with odk O.)
    if (play.odk === ODK.Defense) {
      if (
        play.result === Result.Downed ||
        play.result === Result.FairCatch ||
        play.result === Result.Touchback
      ) {
        const endHudl =
          play.result === Result.Touchback
            ? HS_TOUCHBACK_YARD_LINE
            : yardLineAfterPlay(play);
        return {
          ...defaultOffensivePlay(nextPlayNumber, team),
          ...firstAndTenOrGoal(endHudl, ODK.Offense),
          odk: ODK.Offense,
          ...emptyPlayers,
        };
      }
      return {
        ...defaultPuntReceivePlay(nextPlayNumber, team),
        odk: ODK.Offense,
        ...puntReceiveSituation(play),
        ...emptyPlayers,
      };
    }
    return {
      ...defaultPuntReceivePlay(nextPlayNumber, team),
      ...puntReceiveSituation(play),
      ...emptyPlayers,
    };
  }

  // After tagging the receive ending: D series if we received our own punt;
  // O series if we returned their punt (Punt Rec odk O).
  if (
    play.playType === PlayType.PuntReceive &&
    isSuccessfulPuntEnding(play)
  ) {
    const endHudl = yardLineAfterPlay(play);
    if (play.odk === ODK.Offense) {
      return {
        ...defaultOffensivePlay(nextPlayNumber, team),
        ...firstAndTenOrGoal(endHudl, ODK.Offense),
        odk: ODK.Offense,
        ...emptyPlayers,
      };
    }
    const nextYardLine =
      endHudl < 0 ? flipHudlYardLinePerspective(endHudl) : endHudl;
    return {
      ...defaultOffensivePlay(nextPlayNumber, team),
      ...firstAndTenOrGoal(nextYardLine, ODK.Defense),
      odk: ODK.Defense,
      ...emptyPlayers,
    };
  }

  const situation = advanceSituation(play);
  const afterKickoff = isKickoffPlay(play.playType);
  // Failed 4th is already COP via normalizePlayOnSave → isLiveBallTurnover.
  // Do not treat converted 4th (gain >= distance) as a turnover.
  const afterTurnover = isLiveBallTurnover(play);

  const afterFgNoGoodTouchback =
    isFgPlay(play.playType) &&
    play.result === Result.NoGood &&
    isFgNoGoodTouchback(play.spotEncoding);

  if (afterKickoff) {
    const weKicked = play.playType === PlayType.Kickoff;
    // Onside / short kick recovered by kicking team — keep offense + spot as tagged.
    const weRecovered =
      weKicked && play.recoveredBy?.jersey?.trim() !== "";
    return {
      ...defaultOffensivePlay(nextPlayNumber, team),
      ...situation,
      // Receiving-team Own N → our Opp N when we kicked (their 20, not ours).
      yardLine:
        weKicked && !weRecovered && situation.yardLine < 0
          ? flipHudlYardLinePerspective(situation.yardLine)
          : situation.yardLine,
      odk: weRecovered
        ? ODK.Offense
        : weKicked
          ? ODK.Defense
          : ODK.Offense,
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
    odk: isScrimmagePlay(play.playType) ? play.odk : ODK.Offense,
    ...emptyPlayers,
  };
}

/** Live draft from the last saved play (same chain as after save). */
export function liveDraftFromLastPlay(
  lastPlay: PlaylistData,
  nextPlayNumber: number,
  team: string,
  options?: PlayChainOptions,
): PlaylistData {
  return nextDraftAfterPlay(lastPlay, nextPlayNumber, team, options);
}
