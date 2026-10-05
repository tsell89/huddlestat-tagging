import {
  PlayType,
  Result,
  formatDownDistance,
  type DictatedChain,
  type PlaylistData,
} from "@huddlestat/shared";

export const TEAM_CODE = "SHS";
export const TEAM_NAME = "Snider";

export type SpotNames = { team: string; opponent: string };

export const COIN_TOSS_SITUATION = "Dictate the coin toss.";
export const COIN_TOSS_FIRST = "Dictate the coin toss first.";
export const NOT_A_PLAY = "That doesn't look like a play yet. Edit it.";
export const BEFORE_KICKOFF = "Before the kickoff.";
export const OT_CONTINUES = "Overtime continues.";

export function spotLabel(yardLine: number, names: SpotNames): string {
  if (yardLine === 50) return "the 50";
  if (yardLine === 0) return "Touchdown";
  if (yardLine < 0) return `${names.team} ${Math.abs(yardLine)}`;
  return `${names.opponent} ${yardLine}`;
}

/** End-zone results read Safety or Touchdown. A yard line of 0 is not shown as 0. */
export function playEndLabel(play: PlaylistData, nextYard: number, names: SpotNames): string {
  const encoding = play.spotEncoding ?? "";
  if (encoding.includes("end:SA") || play.result === Result.Safety) return "Safety";
  if (
    encoding.includes("end:TD") ||
    play.result === Result.RushTd ||
    play.result === Result.CompleteTd
  ) {
    return "Touchdown";
  }
  if (nextYard === 0) return "Touchdown";
  return spotLabel(nextYard, names);
}

export function scoreSentence(names: SpotNames, us: number, them: number): string {
  return `${names.team} ${us}, ${names.opponent} ${them}.`;
}

export function situationSentence(
  chain: Pick<DictatedChain, "down" | "distance" | "yardLine" | "odk" | "playTypeGuess">,
  names: SpotNames,
): string {
  const spot = spotLabel(chain.yardLine, names);
  const guess = chain.playTypeGuess ?? "";
  if (guess === PlayType.Kickoff) {
    return `Kickoff. ${names.team} kicks from ${spot}.`;
  }
  if (guess === PlayType.KickoffReceive) {
    return `Kickoff. ${names.opponent} kicks from ${spot}.`;
  }
  if (guess === PlayType.Punt || guess === PlayType.PuntReceive) {
    const kicking = chain.odk === "D" ? names.opponent : names.team;
    return `${kicking} punts from ${spot}.`;
  }
  if (
    guess === PlayType.ExtraPoint ||
    guess === PlayType.TwoPoint ||
    guess === PlayType.ExtraPointBlock ||
    guess === PlayType.TwoPointBlock
  ) {
    return `${names.team} ${guess} from ${spot}.`;
  }
  const offense = chain.odk === "D" ? names.opponent : names.team;
  const downDistance = formatDownDistance(
    chain.down,
    chain.distance,
    chain.yardLine,
    chain.odk,
  );
  return `${offense} ball, ${downDistance} at ${spot}.`;
}

/** Situation line when the tagger has edited down or distance by hand. */
export function pageSituationSentence(
  chain: Pick<DictatedChain, "down" | "distance" | "yardLine" | "odk" | "playTypeGuess">,
  names: SpotNames,
  scrimmageEdit: boolean,
): string {
  if (scrimmageEdit && chain.down >= 1 && chain.down <= 4) {
    const offense = chain.odk === "D" ? names.opponent : names.team;
    const spot = spotLabel(chain.yardLine, names);
    return `${offense} ball, ${formatDownDistance(chain.down, chain.distance, chain.yardLine, chain.odk)} at ${spot}.`;
  }
  return situationSentence(chain, names);
}

function yardsPhrase(gain: number): string {
  if (gain > 0) return `+${gain}`;
  if (gain < 0) return String(gain);
  return "no gain";
}

function tacklePhrase(play: PlaylistData): string {
  const jerseys = [play.tackler1.jersey, play.tackler2.jersey].filter(Boolean);
  if (jerseys.length === 0) return "";
  return ` Tackle ${jerseys.map((jersey) => `#${jersey}`).join(" and ")}.`;
}

export function chainHappened(play: PlaylistData, endSpot: string): string {
  const tackle = tacklePhrase(play);
  if (play.playType === PlayType.Kickoff || play.playType === PlayType.KickoffReceive) {
    if (play.result === Result.Touchback) return "Touchback.";
    if (play.result === Result.Return) return `Returned to ${endSpot}.${tackle}`;
    return `${play.result}. Ball at ${endSpot}.`;
  }
  if (play.playType === PlayType.Punt || play.playType === PlayType.PuntReceive) {
    if (play.result === Result.Touchback) return "Touchback.";
    if (play.result === Result.Return) return `Punt returned to ${endSpot}.${tackle}`;
    return `Punt ${play.result.toLowerCase()}. Ball at ${endSpot}.`;
  }

  const yards = yardsPhrase(play.gainLoss);
  if (play.playType === PlayType.Pass) {
    const from = play.passer.jersey ? `#${play.passer.jersey}` : "Pass";
    const to = play.receiver.jersey ? ` to #${play.receiver.jersey}` : "";
    if (play.result === Result.Incomplete) return `${from} incomplete.${tackle}`;
    if (play.result === Result.Interception) return `${from} intercepted.${tackle}`;
    if (play.result === Result.Sack) return `${from} sacked for ${yards}.${tackle}`;
    if (play.result === Result.Penalty) return `Penalty. Ball at ${endSpot}.`;
    const td = play.result === Result.CompleteTd ? " for a touchdown" : "";
    return `${from}${to}, complete${td}, ${yards}. Ball at ${endSpot}.${tackle}`;
  }

  if (play.result === Result.Penalty) return `Penalty. Ball at ${endSpot}.`;
  const who = play.rusher.jersey ? `#${play.rusher.jersey}` : play.playType || "Play";
  if (play.result === Result.RushTd) {
    return `${who} runs for a touchdown, ${yards}. Ball at ${endSpot}.${tackle}`;
  }
  if (play.result === Result.Rush) {
    return `${who} runs for ${yards}. Ball at ${endSpot}.${tackle}`;
  }
  return `${who} ${play.result}. Ball at ${endSpot}.${tackle}`;
}

export function previousHappened(play: PlaylistData, names: SpotNames, nextYard: number): string {
  const endSpot = playEndLabel(play, nextYard, names);
  const line = chainHappened(play, endSpot);
  if (line.includes(endSpot)) return line;
  return `${line.replace(/\.\s*$/, "")}. Ball at ${endSpot}.`;
}

export function whoLine(play: PlaylistData | null): string {
  if (!play) return "";
  const jersey = (player: { jersey: string }) => (player.jersey ? player.jersey : "");
  const bits: string[] = [];
  if (jersey(play.kicker)) bits.push(`Kick #${jersey(play.kicker)}`);
  if (jersey(play.returner)) bits.push(`Return #${jersey(play.returner)}`);
  if (jersey(play.rusher)) bits.push(`Run #${jersey(play.rusher)}`);
  if (jersey(play.passer)) bits.push(`Pass #${jersey(play.passer)}`);
  if (jersey(play.receiver)) bits.push(`Catch #${jersey(play.receiver)}`);
  const tacklers = [jersey(play.tackler1), jersey(play.tackler2)].filter(Boolean);
  if (tacklers.length) bits.push(`Tackle ${tacklers.map((n) => `#${n}`).join(" and ")}`);
  if (jersey(play.interceptedBy)) bits.push(`Intercept #${jersey(play.interceptedBy)}`);
  if (jersey(play.recoveredBy)) bits.push(`Recover #${jersey(play.recoveredBy)}`);
  return bits.join(" · ");
}

export type ChainStory = {
  before: string;
  happened: string;
  next: string;
};

export function chainStory(input: {
  names: SpotNames;
  before: DictatedChain;
  play: PlaylistData | null;
  next: DictatedChain;
  canConfirm: boolean;
  warnings: string[];
}): ChainStory {
  const before = situationSentence(input.before, input.names);
  if (!input.canConfirm || !input.play) {
    return {
      before,
      happened:
        input.warnings.filter(Boolean).join(" ") ||
        NOT_A_PLAY,
      next: "The next snap stays put until this one confirms.",
    };
  }
  const start: DictatedChain = {
    ...input.before,
    down: input.play.down,
    distance: input.play.distance,
    yardLine: input.play.yardLine,
    odk: input.play.odk,
    playTypeGuess: input.play.playType,
  };
  const endSpot = playEndLabel(input.play, input.next.yardLine, input.names);
  return {
    before: situationSentence(start, input.names),
    happened: chainHappened(input.play, endSpot),
    next: situationSentence(input.next, input.names),
  };
}
