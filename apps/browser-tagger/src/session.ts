import {
  Hash,
  HS_OT_DISTANCE,
  HS_OT_OFFENSE_YARD_LINE,
  ODK,
  PlayType,
  Result,
  decodePenalty,
  deriveScoreFromPlays,
  encodePenaltySpotEncoding,
  fieldPositionToHudl,
  hudlToFieldPosition,
  nextDraftAfterPlay,
  openingDictatedChain,
  parseWithRules,
  previewParsedPlay,
  shouldFinalizeOtGame,
  yardLineAfterPlay,
  type DictatedChain,
  type DictatedPlayInput,
  type PlaylistData,
} from "@huddlestat/shared";
import { serializeBrowserHudlCsv } from "./csv.js";
import {
  BEFORE_KICKOFF,
  COIN_TOSS_FIRST,
  COIN_TOSS_SITUATION,
  NOT_A_PLAY,
  OT_CONTINUES,
  TEAM_CODE,
  TEAM_NAME,
  chainStory,
  scoreSentence,
  situationSentence,
  type ChainStory,
  type SpotNames,
} from "./story.js";

export const STORAGE_KEY = "hs_browser_tagger_v1";

export type KickRole = "kick" | "receive";
export type BrowserPhase = "tag" | "ot" | "final";

export type BrowserGame = {
  opponent: string;
  plays: PlaylistData[];
  transcripts: string[];
  /** Opening coin-toss choice. Null until that note confirms. */
  kickoff: KickRole | null;
  /** Next snap is this kickoff. Set by a toss or second-half note. Cleared when that snap confirms. */
  nextKickoff: KickRole | null;
  phase: BrowserPhase;
  /** True after Continue. Start over keeps it so the opponent field is not asked again. */
  started: boolean;
};

export type StoredGame = BrowserGame & {
  situation: DictatedChain;
};

export type SituationAdjust = {
  result?: PlaylistData["result"];
  gainLoss?: number;
  yardLine?: number;
  down?: number;
  distance?: number;
  returnYards?: number;
};

export type PreviewKind = "play" | "kickoff" | "final" | "overtime" | "rejected";

export type SnapPreview = {
  transcript: string;
  kind: PreviewKind;
  parsed: DictatedPlayInput;
  play: PlaylistData | null;
  before: DictatedChain;
  next: DictatedChain;
  story: ChainStory;
  canConfirm: boolean;
  /** What to edit when this note is not a valid play yet. Empty when confirm is allowed. */
  ask: string;
  kickoffRole?: KickRole;
  /** The toss note said someone deferred. The this-snap sentence keeps that word. */
  kickoffDeferred?: boolean;
  /** Opening toss. Starts in is “Before the kickoff.” A later kickoff note uses the current situation. */
  openingToss?: boolean;
};

const SACK_YARDS_WARNING = "Sack needs loss yards";

function namesOf(game: BrowserGame): SpotNames {
  return { team: TEAM_NAME, opponent: game.opponent };
}

function encodingForResult(
  encoding: string,
  result: PlaylistData["result"],
): string | undefined {
  if (result === Result.Touchback || result === Result.Incomplete) return undefined;
  if (result === Result.Return || result === Result.Interception) return encoding;
  if (result === Result.Downed || result === Result.FairCatch) {
    const end = /(?:^|\|)end:(TD|SA|-?\d+)/.exec(encoding);
    return end ? `end:${end[1]}` : undefined;
  }
  if (result === Result.Penalty && encoding.startsWith("foul:")) return encoding;
  if (/^(?:catch|recv):/.test(encoding) || encoding.startsWith("end:")) return undefined;
  return encoding;
}
function spotEncodingForReturnYards(spotEncoding: string, returnYards: number): string | undefined {
  const match = /^(catch|recv):(-?\d+)\|end:(TD|SA|-?\d+)$/.exec(spotEncoding);
  if (!match) return undefined;
  const startHudl = Number(match[2]);
  const startPos = hudlToFieldPosition(startHudl);
  const endToken = match[3]!;
  let direction: number;
  if (endToken === "TD") direction = 1;
  else if (endToken === "SA") direction = -1;
  else {
    const delta = hudlToFieldPosition(Number(endToken)) - startPos;
    direction = delta === 0 ? (startHudl > 0 ? -1 : 1) : Math.sign(delta);
  }
  const endPos = startPos + direction * returnYards;
  const end = endPos >= 100 ? "TD" : endPos <= 0 ? "SA" : String(fieldPositionToHudl(endPos));
  return `${match[1]}:${startHudl}|end:${end}`;
}

export function openingGame(opponent = "Northrop"): BrowserGame {
  const name = opponent.trim() || "Northrop";
  return {
    opponent: name,
    plays: [],
    transcripts: [],
    kickoff: null,
    nextKickoff: null,
    phase: "tag",
    started: false,
  };
}

/** Kickoff waiting to be tagged: a second-half note, or the opening toss before any snap. */
export function pendingKick(game: BrowserGame): KickRole | null {
  if (game.phase === "ot" || game.phase === "final") return null;
  if (game.nextKickoff) return game.nextKickoff;
  if (game.plays.length === 0 && game.kickoff) return game.kickoff;
  return null;
}

export function hasOpeningSituation(game: BrowserGame): boolean {
  return game.kickoff != null || game.nextKickoff != null || game.plays.length > 0 || game.phase === "ot";
}

function kickoffQuarter(game: BrowserGame): number {
  if (game.plays.length === 0) return 1;
  const last = game.plays[game.plays.length - 1]!.quarter;
  return last < 3 ? 3 : last;
}

export function kickoffChain(role: KickRole, playNumber: number, quarter: number): DictatedChain {
  if (role === "receive") {
    return {
      down: 0,
      distance: 0,
      yardLine: 40,
      odk: ODK.Kicking,
      hash: Hash.Middle,
      quarter,
      playNumber,
      playTypeGuess: PlayType.KickoffReceive,
    };
  }
  return { ...openingDictatedChain(quarter), playNumber, playTypeGuess: PlayType.Kickoff };
}

/** First OT snap. Snider has the ball at the opponent 10. */
function otOpeningChain(playNumber: number): DictatedChain {
  return {
    down: 1,
    distance: HS_OT_DISTANCE,
    yardLine: HS_OT_OFFENSE_YARD_LINE,
    odk: ODK.Offense,
    hash: Hash.Middle,
    quarter: 5,
    playNumber,
    playTypeGuess: "",
  };
}

export function currentChain(plays: PlaylistData[], phase: BrowserPhase = "tag"): DictatedChain {
  if (plays.length === 0) return openingDictatedChain(1);
  const last = plays[plays.length - 1]!;
  const next = nextDraftAfterPlay(last, last.playNumber + 1, TEAM_CODE, {
    rules: "HS",
    overtime: phase === "ot" || last.quarter === 5,
  });
  return {
    down: next.down,
    distance: next.distance,
    yardLine: next.yardLine,
    odk: next.odk,
    hash: last.hash ?? "M",
    quarter: last.quarter,
    playNumber: next.playNumber,
    playTypeGuess: next.playType || "",
  };
}

/** Where the last confirmed snap ended. A waiting kickoff or overtime spot is not this yard line. */
export function lastPlayEndYard(game: BrowserGame): number | null {
  const play = game.plays[game.plays.length - 1];
  if (!play) return null;
  return yardLineAfterPlay(play);
}

export function situationChain(game: BrowserGame): DictatedChain {
  const kick = pendingKick(game);
  if (kick) return kickoffChain(kick, game.plays.length + 1, kickoffQuarter(game));
  if (game.phase === "ot" && !game.plays.some((play) => play.quarter === 5)) {
    return otOpeningChain(game.plays.length + 1);
  }
  return currentChain(game.plays, game.phase);
}

export function scoreLine(game: BrowserGame): string {
  const score = deriveScoreFromPlays(game.plays);
  return scoreSentence(namesOf(game), score.us, score.them);
}

export function situationLine(game: BrowserGame): string {
  if (game.phase === "final") return scoreLine(game);
  if (!hasOpeningSituation(game)) return COIN_TOSS_SITUATION;
  return situationSentence(situationChain(game), namesOf(game));
}

export function fileStem(opponent: string, year = new Date().getFullYear()): string {
  const safe = opponent.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "Opponent";
  return `Snider-${safe}-${year}`;
}

function emptyParsed(quarter: number, warnings: string[] = []): DictatedPlayInput {
  return { quarter, confidence: "low", warnings };
}

function storyOf(
  game: BrowserGame,
  preview: Pick<
    SnapPreview,
    | "kind"
    | "before"
    | "next"
    | "play"
    | "canConfirm"
    | "kickoffRole"
    | "kickoffDeferred"
    | "openingToss"
    | "parsed"
  >,
): ChainStory {
  const names = namesOf(game);
  if (preview.kind === "kickoff" && preview.kickoffRole) {
    const next = kickoffChain(preview.kickoffRole, game.plays.length + 1, kickoffQuarter(game));
    return {
      before: preview.openingToss ? BEFORE_KICKOFF : situationSentence(preview.before, names),
      happened: kickoffSnapSentence(preview.kickoffRole, names, preview.kickoffDeferred === true),
      next: situationSentence(next, names),
    };
  }
  if (preview.kind === "final") {
    return {
      before: situationSentence(preview.before, names),
      happened: "Game over.",
      next: scoreLine(game),
    };
  }
  if (preview.kind === "overtime") {
    return {
      before: situationSentence(preview.before, names),
      happened: "Overtime.",
      next: situationSentence(otOpeningChain(game.plays.length + 1), names),
    };
  }
  if (preview.kind === "play" && preview.play) {
    const story = chainStory({
      names,
      before: preview.before,
      play: preview.play,
      next: preview.next,
      canConfirm: true,
      warnings: [],
    });
    if (!preview.canConfirm) {
      return { ...story, next: "The next snap stays put until this one confirms." };
    }
    return story;
  }
  if (!preview.canConfirm || !preview.play) {
    return {
      before: hasOpeningSituation(game) ? situationSentence(preview.before, names) : BEFORE_KICKOFF,
      happened: snapAsk(preview.parsed),
      next: "The next snap stays put until this one confirms.",
    };
  }
  return chainStory({
    names,
    before: preview.before,
    play: preview.play,
    next: preview.next,
    canConfirm: true,
    warnings: preview.parsed.warnings,
  });
}

/** What the tagger should ask for when the note is not ready to confirm. */
export function snapAsk(parsed: DictatedPlayInput): string {
  const specific = parsed.warnings
    .map((warning) => warning.trim())
    .filter((warning) => warning && warning !== "Not a football snap" && warning !== "Empty transcript");
  if (specific.length > 0) return specific.join(" ");
  if (parsed.playType && parsed.result === undefined) return "Name the result.";
  if (!parsed.playType && parsed.result !== undefined) return "Name the play.";
  if (!parsed.playType && parsed.result === undefined) return "Name the play and the result.";
  return NOT_A_PLAY;
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function actorBefore(text: string, phrase: RegExp, team: string, opponent: string): string | null {
  const match = phrase.exec(text);
  if (!match || match.index === undefined) return null;
  const before = text.slice(0, match.index);
  let found: { name: string; at: number } | null = null;
  for (const name of [team, opponent]) {
    if (!name) continue;
    const re = new RegExp(`\\b${escapeReg(name)}\\b`, "gi");
    let hit: RegExpExecArray | null;
    while ((hit = re.exec(before))) {
      if (!found || hit.index >= found.at) found = { name, at: hit.index };
    }
  }
  return found?.name ?? null;
}

/** Coin-toss and second-half notes. The note chooses who kicks. The chain supplies the 40. */
export function parseKickoffNote(
  raw: string,
  labels: SpotNames,
): { role: KickRole; thisSnap: string; deferred: boolean } | null {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return null;
  if (!/\b(defer(?:red|s)?|kicking off|kicks off|will kick|will receive|is receiving)\b/i.test(text)) {
    return null;
  }
  if (/\b(catch|[0o]{2}b|tackle|tackled|runs?|rush|complete|incomplete|punt|touchback|sack|fumble)\b/i.test(text)) {
    return null;
  }
  if (/\bko\b/i.test(text) && /\d/.test(text)) return null;

  const team = labels.team;
  const opponent = labels.opponent;
  const kicking = actorBefore(text, /\b(?:kicking off|kicks off|will kick|is kicking)\b/i, team, opponent);
  const receiving = actorBefore(text, /\b(?:will receive|receives|is receiving)\b/i, team, opponent);
  let role: KickRole | null = null;
  if (kicking && kicking.toLowerCase() === team.toLowerCase()) role = "kick";
  else if (kicking && kicking.toLowerCase() === opponent.toLowerCase()) role = "receive";
  else if (receiving && receiving.toLowerCase() === team.toLowerCase()) role = "receive";
  else if (receiving && receiving.toLowerCase() === opponent.toLowerCase()) role = "kick";
  if (!role) return null;
  const deferred = /\bdefer/i.test(text);
  return { role, thisSnap: kickoffSnapSentence(role, labels, deferred), deferred };
}

function kickoffSnapSentence(role: KickRole, labels: SpotNames, deferred: boolean): string {
  if (deferred && role === "kick") return `${labels.team} deferred. ${labels.team} is kicking off.`;
  if (deferred && role === "receive") return `${labels.opponent} deferred. ${labels.team} will receive.`;
  if (role === "kick") return `${labels.team} is kicking off.`;
  return `${labels.opponent} is kicking off.`;
}

function isFinalNote(text: string): boolean {
  return /^(?:final|game over)\.?$/i.test(text.trim());
}

function canEndGame(game: BrowserGame): boolean {
  const score = deriveScoreFromPlays(game.plays);
  if (game.phase === "ot") return shouldFinalizeOtGame(game.plays, "OT", score);
  const quarter = game.plays.length ? game.plays[game.plays.length - 1]!.quarter : 1;
  if (quarter >= 4 && score.us === score.them) return false;
  return true;
}

function applyParseGuards(parsed: DictatedPlayInput): DictatedPlayInput {
  if (parsed.result === Result.Sack && parsed.gainLoss === undefined) {
    return {
      ...parsed,
      confidence: "low",
      warnings: parsed.warnings.includes(SACK_YARDS_WARNING)
        ? parsed.warnings
        : [...parsed.warnings, SACK_YARDS_WARNING],
    };
  }
  return parsed;
}

/** Human correction after speech parse. Does not invent a play type or ODK. */
export function applyAdjust(
  parsed: DictatedPlayInput,
  adjust?: SituationAdjust,
): DictatedPlayInput {
  if (!adjust) return parsed;
  const next: DictatedPlayInput = { ...parsed };
  if (adjust.result !== undefined) next.result = adjust.result;
  if (adjust.result !== undefined && next.spotEncoding) {
    next.spotEncoding = encodingForResult(next.spotEncoding, adjust.result);
  }
  if (adjust.gainLoss !== undefined) next.gainLoss = adjust.gainLoss;
  if (adjust.yardLine !== undefined) {
    next.yardLine = adjust.yardLine;
    if (next.result === Result.Penalty && next.spotEncoding) {
      const penalty = decodePenalty(next.spotEncoding);
      if (penalty) {
        next.spotEncoding = encodePenaltySpotEncoding({
          ...penalty,
          foulSpot: adjust.yardLine,
        });
      }
    }
  }
  if (adjust.down !== undefined) next.down = adjust.down;
  if (adjust.distance !== undefined) next.distance = adjust.distance;
  if (adjust.returnYards !== undefined) {
    next.returnYards = adjust.returnYards;
    if (adjust.gainLoss === undefined && next.result === Result.Return) {
      next.gainLoss = adjust.returnYards;
    }
  } else if (adjust.gainLoss !== undefined && next.result === Result.Return) {
    next.returnYards = adjust.gainLoss;
  }
  if (next.result === Result.Return && typeof next.returnYards === "number" && next.spotEncoding) {
    const shifted = spotEncodingForReturnYards(next.spotEncoding, next.returnYards);
    if (shifted) next.spotEncoding = shifted;
  }

  if (next.result === Result.Sack && typeof next.gainLoss === "number") {
    const warnings = next.warnings.filter((warning) => warning !== SACK_YARDS_WARNING);
    return {
      ...next,
      warnings,
      confidence: warnings.length === 0 ? "high" : next.confidence,
    };
  }
  return next;
}

function compileSnap(
  game: BrowserGame,
  parsed: DictatedPlayInput,
): { play: PlaylistData; next: DictatedChain } {
  const before = situationChain(game);
  const kick = pendingKick(game);
  const freshKick = kick != null;
  const compiled = previewParsedPlay(freshKick ? [] : game.plays, parsed, TEAM_CODE);
  let play = compiled.play;
  if (freshKick || game.phase === "ot") {
    const kickoffType =
      kick === "receive" ? PlayType.KickoffReceive : kick === "kick" ? PlayType.Kickoff : play.playType;
    play = {
      ...play,
      playNumber: game.plays.length + 1,
      quarter: game.phase === "ot" ? 5 : before.quarter,
      down: before.down,
      distance: before.distance,
      yardLine: parsed.yardLine ?? before.yardLine,
      odk: game.phase === "ot" ? before.odk : ODK.Kicking,
      playType: parsed.playType || kickoffType,
    };
  }
  const next = currentChain([...game.plays, play], game.phase === "ot" ? "ot" : "tag");
  return { play, next };
}

function rejected(
  game: BrowserGame,
  transcript: string,
  parsed: DictatedPlayInput,
  before: DictatedChain,
): SnapPreview {
  const preview: SnapPreview = {
    transcript,
    kind: "rejected",
    parsed,
    play: null,
    before,
    next: before,
    canConfirm: false,
    ask: snapAsk(parsed),
    story: { before: "", happened: "", next: "" },
  };
  preview.story = storyOf(game, preview);
  return preview;
}

export function previewSnap(
  game: BrowserGame,
  transcript: string,
  adjust?: SituationAdjust,
): SnapPreview {
  const text = transcript.trim();
  const names = namesOf(game);
  const before = hasOpeningSituation(game) ? situationChain(game) : openingDictatedChain(1);

  if (!text) return rejected(game, transcript, emptyParsed(before.quarter, ["Empty transcript"]), before);

  const kickoff = adjust ? null : parseKickoffNote(text, names);
  if (kickoff) {
    const openingToss = game.plays.length === 0 && game.kickoff == null && game.phase === "tag";
    const next = kickoffChain(kickoff.role, game.plays.length + 1, kickoffQuarter(game));
    const preview: SnapPreview = {
      transcript,
      kind: "kickoff",
      parsed: emptyParsed(before.quarter),
      play: null,
      before,
      next,
      canConfirm: true,
      ask: "",
      kickoffRole: kickoff.role,
      kickoffDeferred: kickoff.deferred,
      openingToss,
      story: { before: "", happened: "", next: "" },
    };
    preview.story = storyOf(game, preview);
    return preview;
  }

  if (!hasOpeningSituation(game)) {
    return rejected(game, transcript, emptyParsed(before.quarter, [COIN_TOSS_FIRST]), before);
  }

  if (!adjust && isFinalNote(text)) {
    if (game.phase === "ot" && !canEndGame(game)) {
      return rejected(game, transcript, emptyParsed(before.quarter, [OT_CONTINUES]), before);
    }
    if (!canEndGame(game)) {
      const preview: SnapPreview = {
        transcript,
        kind: "overtime",
        parsed: emptyParsed(before.quarter),
        play: null,
        before,
        next: otOpeningChain(game.plays.length + 1),
        canConfirm: true,
        ask: "",
        story: { before: "", happened: "", next: "" },
      };
      preview.story = storyOf(game, preview);
      return preview;
    }
    const preview: SnapPreview = {
      transcript,
      kind: "final",
      parsed: emptyParsed(before.quarter),
      play: null,
      before,
      next: before,
      canConfirm: true,
      ask: "",
      story: { before: "", happened: "", next: "" },
    };
    preview.story = storyOf(game, preview);
    return preview;
  }

  const parsed = applyAdjust(applyParseGuards(parseWithRules(text, before)), adjust);
  const built = Boolean(parsed.playType && parsed.result !== undefined);
  if (!built) {
    return rejected(game, transcript, parsed, before);
  }
  const canConfirm = parsed.confidence === "high";
  const compiled = compileSnap(game, parsed);
  const preview: SnapPreview = {
    transcript,
    kind: "play",
    parsed,
    play: compiled.play,
    before,
    next: compiled.next,
    canConfirm,
    ask: canConfirm ? "" : snapAsk(parsed),
    story: { before: "", happened: "", next: "" },
  };
  preview.story = storyOf(game, preview);
  return preview;
}

export function confirmSnap(
  game: BrowserGame,
  transcript: string,
  adjust?: SituationAdjust,
): BrowserGame {
  const preview = previewSnap(game, transcript, adjust);
  if (!preview.canConfirm) {
    throw new Error(preview.ask || preview.story.happened || "Not a football snap — nothing confirmed");
  }
  if (preview.kind === "kickoff" && preview.kickoffRole) {
    return {
      ...game,
      kickoff: game.kickoff ?? preview.kickoffRole,
      nextKickoff: preview.kickoffRole,
    };
  }
  if (preview.kind === "overtime") {
    return { ...game, phase: "ot", nextKickoff: null };
  }
  if (preview.kind === "final") {
    return { ...game, phase: "final", nextKickoff: null };
  }
  if (!preview.play) {
    throw new Error(preview.story.happened || "Not a football snap — nothing confirmed");
  }
  return {
    ...game,
    plays: [...game.plays, preview.play],
    transcripts: [...game.transcripts, transcript.trim()],
    nextKickoff: null,
  };
}

/** Drop the last snap so the next confirm writes that slot again. */
export function withoutLastPlay(game: BrowserGame): BrowserGame {
  if (game.plays.length === 0) return game;
  const plays = game.plays.slice(0, -1);
  return {
    ...game,
    plays,
    transcripts: game.transcripts.slice(0, -1),
    nextKickoff: plays.length === 0 ? game.kickoff : game.nextKickoff,
    phase: game.phase === "final" ? "tag" : game.phase,
  };
}

export function undoLast(game: BrowserGame): { game: BrowserGame; transcript: string } {
  if (game.plays.length === 0) return { game, transcript: "" };
  return {
    game: withoutLastPlay(game),
    transcript: game.transcripts[game.transcripts.length - 1] ?? "",
  };
}

/** Second undo, while the last snap is already back in the box, must not drop the play before it. */
export function takeBackLastPlay(
  game: BrowserGame,
  correcting: boolean,
):
  | { kind: "already" }
  | { kind: "empty" }
  | { kind: "undone"; game: BrowserGame; transcript: string } {
  if (correcting) return { kind: "already" };
  if (game.plays.length === 0) return { kind: "empty" };
  const undone = undoLast(game);
  return { kind: "undone", game: undone.game, transcript: undone.transcript };
}

function hasWord(text: string, word: string): boolean {
  if (!word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

export function parseSpotLabel(
  text: string,
  labels: { team: string; opponent: string },
): { ok: true; yardLine: number } | { ok: false; message: string } {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  if (lower === "50" || lower === "the 50" || lower === "midfield") {
    return { ok: true, yardLine: 50 };
  }
  const match = lower.match(/-?\d+/);
  if (!match) return { ok: false, message: "Yard line needs a number" };
  const n = Math.abs(Number(match[0]));
  if (n === 0) return { ok: true, yardLine: 0 };
  if (n === 50) return { ok: true, yardLine: 50 };
  if (n > 49) return { ok: false, message: "Yard line is 1–49, or the 50" };
  const team = labels.team.toLowerCase();
  const opp = labels.opponent.toLowerCase();
  if (hasWord(lower, "own") || hasWord(lower, team)) {
    return { ok: true, yardLine: -n };
  }
  if (hasWord(lower, "opp") || hasWord(lower, "opponent") || hasWord(lower, opp)) {
    return { ok: true, yardLine: n };
  }
  if (raw.startsWith("-")) return { ok: true, yardLine: -n };
  if (raw.startsWith("+")) return { ok: true, yardLine: n };
  return {
    ok: false,
    message: `Say whose yard line — ${labels.team} ${n} or ${labels.opponent} ${n}`,
  };
}

export function startOver(game: BrowserGame): BrowserGame {
  return { ...openingGame(game.opponent), started: game.started };
}

export function hudlCsv(game: BrowserGame): string {
  return serializeBrowserHudlCsv(game.plays);
}

export function csvFilename(opponent: string, year = new Date().getFullYear()): string {
  return `${fileStem(opponent, year)}.playlist.csv`;
}

export function storedGame(game: BrowserGame): StoredGame {
  return {
    opponent: game.opponent,
    plays: game.plays,
    transcripts: game.transcripts,
    kickoff: game.kickoff,
    nextKickoff: game.nextKickoff,
    phase: game.phase,
    started: game.started,
    situation: hasOpeningSituation(game) ? situationChain(game) : openingDictatedChain(1),
  };
}

function kickRole(value: unknown): KickRole | null {
  return value === "kick" || value === "receive" ? value : null;
}

export function gameFromStored(raw: string | null): BrowserGame {
  if (!raw) return openingGame();
  try {
    const data = JSON.parse(raw) as Partial<StoredGame>;
    if (!Array.isArray(data.plays) || !Array.isArray(data.transcripts)) {
      return openingGame();
    }
    const opponent =
      typeof data.opponent === "string" && data.opponent.trim()
        ? data.opponent.trim()
        : "Northrop";
    const plays = data.plays as PlaylistData[];
    const kickoff = kickRole(data.kickoff) ?? (plays.length > 0 ? "kick" : null);
    return {
      opponent,
      plays,
      transcripts: data.transcripts.filter((line) => typeof line === "string"),
      kickoff,
      nextKickoff: kickRole(data.nextKickoff),
      phase: data.phase === "ot" || data.phase === "final" ? data.phase : "tag",
      started: data.started === true || plays.length > 0,
    };
  } catch {
    return openingGame();
  }
}
