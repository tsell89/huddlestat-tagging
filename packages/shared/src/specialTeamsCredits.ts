import { ODK, PlayType, Result, type PlayerRef } from "./constants.js";
import {
  hudlToFieldPosition,
  yardsAdvanced,
  yardsToOpponentGoal,
  type EndZoneSide,
} from "./fieldPosition100.js";
import type { PlaylistData } from "./index.js";

/** HS kickoff touchback gross yards (kick spot → end zone). */
export const KICKOFF_TOUCHBACK_YARDS = 60;

/** Touchback placement subtracted from gross for net kickoff/punt yards. */
export const TOUCHBACK_NET_PLACEMENT_YARDS = 20;

export type SpecialTeamsCreditAccumulator = {
  puntNum: number;
  puntYards: number;
  puntLong: number;
  puntInside20: number;
  kickoffNum: number;
  kickoffYards: number;
  kickoffLong: number;
  kickoffTouchbacks: number;
  fgMade: number;
  fgAttempted: number;
  fgLong: number;
  patKickingMade: number;
  patKickingAtt: number;
  patKickingPoints: number;
  patRushingNum: number;
  patReceivingNum: number;
  totalConversionPoints: number;
};

function jerseyKey(ref: PlayerRef): string | null {
  const jersey = ref.jersey.trim();
  return jersey ? jersey : null;
}

function ensureCredit(
  map: Map<string, SpecialTeamsCreditAccumulator>,
  jersey: string,
): SpecialTeamsCreditAccumulator {
  let row = map.get(jersey);
  if (!row) {
    row = {
      puntNum: 0,
      puntYards: 0,
      puntLong: 0,
      puntInside20: 0,
      kickoffNum: 0,
      kickoffYards: 0,
      kickoffLong: 0,
      kickoffTouchbacks: 0,
      fgMade: 0,
      fgAttempted: 0,
      fgLong: 0,
      patKickingMade: 0,
      patKickingAtt: 0,
      patKickingPoints: 0,
      patRushingNum: 0,
      patReceivingNum: 0,
      totalConversionPoints: 0,
    };
    map.set(jersey, row);
  }
  return row;
}

function endHudlFromSpotEncoding(spotEncoding?: string): number | null {
  if (!spotEncoding || spotEncoding.startsWith("foul:")) return null;
  const match = /(?:^|\|)end:(TD|SA|-?\d+)/.exec(spotEncoding);
  if (!match) return null;
  if (match[1] === "TD") return 0;
  if (match[1] === "SA") return 0;
  return Number(match[1]);
}

function endZoneSideFromSpotEncoding(spotEncoding?: string): EndZoneSide {
  if (spotEncoding?.includes("end:SA")) return "own";
  return "opponent";
}

function recvHudlFromSpotEncoding(spotEncoding?: string): number | null {
  const match = spotEncoding?.match(/recv:(-?\d+)/);
  return match ? Number(match[1]) : null;
}

function catchHudlFromSpotEncoding(spotEncoding?: string): number | null {
  const match = spotEncoding?.match(/catch:(-?\d+)/);
  return match ? Number(match[1]) : null;
}

function positionFromEndHudl(hudl: number, spotEncoding?: string): number {
  if (hudl === 0) {
    return endZoneSideFromSpotEncoding(spotEncoding) === "own" ? 0 : 100;
  }
  return hudlToFieldPosition(hudl);
}

function isSpecialTeamsSide(odk: PlaylistData["odk"]): boolean {
  return odk === ODK.Offense || odk === ODK.Kicking;
}

/** Punt never left the punter — blocked or fumble on punt pad. */
export function isExcludedPunt(play: PlaylistData): boolean {
  if (play.playType !== PlayType.Punt || !isSpecialTeamsSide(play.odk)) {
    return true;
  }
  if (play.result === Result.Blocked) return true;
  if (play.result.includes("Fumble")) return true;
  return false;
}

function isCreditedPunt(play: PlaylistData): boolean {
  return play.playType === PlayType.Punt && isSpecialTeamsSide(play.odk) && !isExcludedPunt(play);
}

/** Gross punt kick distance (B3). */
export function derivePuntKickYards(play: PlaylistData): number {
  if (!isCreditedPunt(play)) return 0;

  if (play.kickYards !== undefined) return play.kickYards;

  if (play.result === Result.Touchback) {
    return yardsToOpponentGoal(play.yardLine);
  }

  const recvHudl = recvHudlFromSpotEncoding(play.spotEncoding);
  if (recvHudl !== null) {
    return yardsAdvanced(play.yardLine, recvHudl);
  }

  const endHudl = endHudlFromSpotEncoding(play.spotEncoding);
  if (endHudl !== null) {
    return yardsAdvanced(
      play.yardLine,
      endHudl,
      endHudl === 0 ? endZoneSideFromSpotEncoding(play.spotEncoding) : undefined,
    );
  }

  if (play.gainLoss !== 0) {
    return Math.abs(play.gainLoss);
  }

  return 0;
}

/** Play end spot on 0–100 axis for punts (B4). */
export function derivePuntEndPosition(play: PlaylistData): number | null {
  if (!isCreditedPunt(play)) return null;
  if (play.result === Result.Touchback) return null;

  const endHudl = endHudlFromSpotEncoding(play.spotEncoding);
  if (endHudl !== null) {
    return positionFromEndHudl(endHudl, play.spotEncoding);
  }

  const startPos = hudlToFieldPosition(play.yardLine);
  const kickYards =
    play.kickYards !== undefined ? play.kickYards : derivePuntKickYards(play);
  if (play.result === Result.Return && play.returnYards !== undefined) {
    return startPos + kickYards + play.returnYards;
  }
  return startPos + kickYards;
}

/** Inside the 20 = field position 81–100 (B4). */
export function isPuntInside20(play: PlaylistData): boolean {
  if (!isCreditedPunt(play)) return false;
  if (play.result === Result.Touchback) return false;
  const endPos = derivePuntEndPosition(play);
  return endPos !== null && endPos >= 81;
}

/** HuddleStat-only net punt yards (B10a). */
export function derivePuntNetYards(play: PlaylistData): number {
  const gross = derivePuntKickYards(play);
  if (!isCreditedPunt(play) || gross === 0) return 0;
  if (play.result === Result.Touchback) {
    return gross - TOUCHBACK_NET_PLACEMENT_YARDS;
  }
  const returnYards = play.returnYards ?? 0;
  return gross - returnYards;
}

/** Gross kickoff distance (B8). */
export function deriveKickoffKickYards(play: PlaylistData): number {
  if (play.playType !== PlayType.Kickoff || !isSpecialTeamsSide(play.odk)) {
    return 0;
  }

  if (play.kickYards !== undefined) return play.kickYards;

  if (play.result === Result.Touchback) {
    return KICKOFF_TOUCHBACK_YARDS;
  }

  const catchHudl = catchHudlFromSpotEncoding(play.spotEncoding);
  if (catchHudl !== null) {
    return Math.abs(yardsAdvanced(play.yardLine, catchHudl));
  }

  return 0;
}

/** HuddleStat-only net kickoff yards (B10a). */
export function deriveKickoffNetYards(play: PlaylistData): number {
  const gross = deriveKickoffKickYards(play);
  if (gross === 0) return 0;
  if (play.result === Result.Touchback) {
    return gross - TOUCHBACK_NET_PLACEMENT_YARDS;
  }
  const returnYards = play.returnYards ?? 0;
  return gross - returnYards;
}

function deriveFgKickYards(play: PlaylistData): number {
  if (play.kickYards !== undefined && play.kickYards > 0) {
    return play.kickYards;
  }
  return yardsToOpponentGoal(play.yardLine) + 17;
}

function isExtraPointKick(play: PlaylistData): boolean {
  return (
    (play.playType === PlayType.ExtraPoint ||
      play.playType === PlayType.ExtraPointBlock) &&
    jerseyKey(play.kicker) !== null
  );
}

/** Apply locked B3–B8 / B6 special-teams credits for one play. */
export function applySpecialTeamsCreditsToMap(
  play: PlaylistData,
  map: Map<string, SpecialTeamsCreditAccumulator>,
): void {
  if (!isSpecialTeamsSide(play.odk)) return;

  if (isCreditedPunt(play)) {
    const kicker = jerseyKey(play.kicker);
    if (!kicker) return;
    const row = ensureCredit(map, kicker);
    const yards = derivePuntKickYards(play);
    row.puntNum += 1;
    row.puntYards += yards;
    if (yards > row.puntLong) row.puntLong = yards;
    if (isPuntInside20(play)) row.puntInside20 += 1;
  }

  if (play.playType === PlayType.Kickoff) {
    const kicker = jerseyKey(play.kicker);
    if (!kicker) return;
    const row = ensureCredit(map, kicker);
    const yards = deriveKickoffKickYards(play);
    row.kickoffNum += 1;
    row.kickoffYards += yards;
    if (yards > row.kickoffLong) row.kickoffLong = yards;
    if (play.result === Result.Touchback) {
      row.kickoffTouchbacks += 1;
    }
  }

  if (play.playType === PlayType.FieldGoal) {
    const kicker = jerseyKey(play.kicker);
    if (!kicker) return;
    const row = ensureCredit(map, kicker);
    row.fgAttempted += 1;
    const kickYards = deriveFgKickYards(play);
    if (kickYards > row.fgLong) row.fgLong = kickYards;
    if (play.result === Result.Good) {
      row.fgMade += 1;
    }
  }

  if (isExtraPointKick(play)) {
    const kicker = jerseyKey(play.kicker)!;
    const row = ensureCredit(map, kicker);
    row.patKickingAtt += 1;
    if (play.result === Result.Good) {
      row.patKickingMade += 1;
      row.patKickingPoints += 1;
    }
  } else if (
    play.playType === PlayType.ExtraPoint &&
    play.result === Result.Good
  ) {
    const rusher = jerseyKey(play.rusher);
    if (rusher) {
      ensureCredit(map, rusher).patRushingNum += 1;
      ensureCredit(map, rusher).totalConversionPoints += 1;
    }
  }

  if (play.playType === PlayType.TwoPoint && play.result === Result.Good) {
    const rusher = jerseyKey(play.rusher);
    const receiver = jerseyKey(play.receiver);
    if (rusher) {
      ensureCredit(map, rusher).patRushingNum += 1;
      ensureCredit(map, rusher).totalConversionPoints += 2;
    } else if (receiver) {
      ensureCredit(map, receiver).patReceivingNum += 1;
      ensureCredit(map, receiver).totalConversionPoints += 2;
    }
  }
}
