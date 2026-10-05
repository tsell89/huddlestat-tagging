import { PlayType } from "./constants.js";

/**
 * Hudl YARD LN is from the team that has the ball.
 * Negative = that team's own end. Positive = the opponent's end.
 * The chain keeps Snider-tagged spots (negative = Snider's end). Defense
 * and kickoff-receive rows are flipped here, at export. A PAT is already
 * the goal they are attacking (+3 / +1), so it is left alone.
 */
export function yardLineForHudlExport(play: {
  yardLine: number;
  playType: string;
  odk: string;
}): number {
  const yardLine = play.yardLine;
  if (yardLine === 0 || yardLine === 50) return yardLine;
  if (
    play.playType === PlayType.ExtraPointBlock ||
    play.playType === PlayType.TwoPointBlock
  ) {
    return yardLine;
  }
  const theirSpot =
    play.odk === "D" || play.playType === PlayType.KickoffReceive;
  if (!theirSpot) return yardLine;
  return -yardLine;
}
