import {
  HS_TOUCHBACK_YARD_LINE,
  fieldPositionToHudl,
  hudlToFieldPosition,
  yardsAdvanced,
} from "../fieldPosition100.js";
import {
  PlayType,
  Result,
  isFailedFourthDown,
  normalizePlayOnSave,
  yardLineAfterPlay,
  type PlaylistData,
} from "../index.js";

export type InvariantViolation = {
  playNumber: number;
  rule: string;
  detail: string;
};

function endHudlFromSpotEncoding(
  play: PlaylistData,
): number | null {
  const c = play.spotEncoding;
  if (!c) {
    if (
      play.result === Result.Rush ||
      play.result === Result.Complete ||
      play.result === Result.Sack
    ) {
      const endPos =
        hudlToFieldPosition(play.yardLine) + play.gainLoss;
      return fieldPositionToHudl(endPos);
    }
    return null;
  }
  const endMatch = /\|end:(TD|SA|-?\d+)/.exec(c) ?? /^end:(TD|SA|-?\d+)/.exec(c);
  if (!endMatch) return null;
  if (endMatch[1] === "TD" || endMatch[1] === "SA") return 0;
  return Number(endMatch[1]);
}

export function checkPlayInvariants(play: PlaylistData): InvariantViolation[] {
  const out: InvariantViolation[] = [];

  if (
    play.result === Result.Incomplete ||
    play.result === Result.TippedPass
  ) {
    const saved = normalizePlayOnSave(play);
    if (saved.gainLoss !== 0) {
      out.push({
        playNumber: play.playNumber,
        rule: "incomplete_gain_zero",
        detail: `gainLoss ${saved.gainLoss} should be 0`,
      });
    }
  }

  if (
    (play.playType === PlayType.Kickoff ||
      play.playType === PlayType.KickoffReceive ||
      play.playType === PlayType.PuntReceive) &&
    play.result === Result.Touchback
  ) {
    const end = yardLineAfterPlay(play);
    if (end !== HS_TOUCHBACK_YARD_LINE) {
      out.push({
        playNumber: play.playNumber,
        rule: "touchback_own_20",
        detail: `end yardLine ${end}, expected ${HS_TOUCHBACK_YARD_LINE}`,
      });
    }
  }

  if (isFailedFourthDown(play)) {
    const saved = normalizePlayOnSave(play);
    if (saved.result !== Result.Cop) {
      out.push({
        playNumber: play.playNumber,
        rule: "failed_fourth_cop",
        detail: `result ${saved.result}, expected COP`,
      });
    }
  }

  if (play.result === Result.Sack && play.playType !== PlayType.Pass) {
    out.push({
      playNumber: play.playNumber,
      rule: "sack_is_pass",
      detail: `playType ${play.playType}`,
    });
  }

  const endHudl = endHudlFromSpotEncoding(play);
  if (endHudl !== null && play.spotEncoding) {
    const catchMatch = /catch:(-?\d+)/.exec(play.spotEncoding);
    const startHudl = catchMatch ? Number(catchMatch[1]) : play.yardLine;
    const expectedGain = yardsAdvanced(startHudl, endHudl);
    if (
      play.result === Result.Return &&
      play.returnYards !== undefined &&
      play.returnYards !== expectedGain &&
      play.playType !== PlayType.Kickoff
    ) {
      out.push({
        playNumber: play.playNumber,
        rule: "return_yards_match",
        detail: `returnYards ${play.returnYards} vs computed ${expectedGain}`,
      });
    }
    if (
      play.result === Result.Return &&
      play.playType === PlayType.Kickoff &&
      play.returnYards !== undefined &&
      play.returnYards !== -expectedGain
    ) {
      out.push({
        playNumber: play.playNumber,
        rule: "we_kick_return_yards_match",
        detail: `returnYards ${play.returnYards} vs receiving-team ${-expectedGain}`,
      });
    }
  }

  if (
    play.spotEncoding?.startsWith("tackle:") &&
    (play.result === Result.Rush ||
      play.result === Result.Complete ||
      play.result === Result.Sack)
  ) {
    const endMatch = /\|end:(-?\d+)$/.exec(play.spotEncoding);
    if (endMatch) {
      const endHudl = Number(endMatch[1]);
      const taggedGain = yardsAdvanced(play.yardLine, endHudl);
      const expectedGain =
        play.odk === "D" ? -taggedGain : taggedGain;
      if (play.gainLoss !== expectedGain) {
        out.push({
          playNumber: play.playNumber,
          rule: "scrimmage_gain_matches_spot",
          detail: `odk ${play.odk} gainLoss ${play.gainLoss} vs offensive ${expectedGain} (${play.yardLine} → ${endHudl})`,
        });
      }
    }
  }

  return out;
}
