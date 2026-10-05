import {
  Result,
  decodePenalty,
  encodePenaltySpotEncoding,
  fieldPositionToHudl,
  hudlToFieldPosition,
  nextDraftAfterPlay,
  openingDictatedChain,
  parseWithRules,
  previewParsedPlay,
  type DictatedChain,
  type DictatedPlayInput,
  type PlaylistData,
} from "@huddlestat/shared";
import { serializeBrowserHudlCsv } from "./csv.js";
import { TEAM_CODE, TEAM_NAME, chainStory, type ChainStory } from "./story.js";

export const STORAGE_KEY = "hs_browser_tagger_v1";

export type BrowserGame = {
  opponent: string;
  plays: PlaylistData[];
  transcripts: string[];
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

export type SnapPreview = {
  transcript: string;
  parsed: DictatedPlayInput;
  play: PlaylistData | null;
  before: DictatedChain;
  next: DictatedChain;
  story: ChainStory;
  canConfirm: boolean;
};

const SACK_YARDS_WARNING = "Sack needs loss yards";

/** Move a return's end spot by the corrected return yards, same direction as the parsed end. */
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
  return { opponent: name, plays: [], transcripts: [] };
}

export function currentChain(plays: PlaylistData[]): DictatedChain {
  if (plays.length === 0) return openingDictatedChain(1);
  const last = plays[plays.length - 1]!;
  const next = nextDraftAfterPlay(last, last.playNumber + 1, TEAM_CODE, {
    rules: "HS",
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

export function previewSnap(
  game: BrowserGame,
  transcript: string,
  adjust?: SituationAdjust,
): SnapPreview {
  const before = currentChain(game.plays);
  const parsed = applyAdjust(applyParseGuards(parseWithRules(transcript, before)), adjust);
  const names = { team: TEAM_NAME, opponent: game.opponent };
  const canConfirm = Boolean(
    parsed.playType && parsed.result !== undefined && parsed.confidence === "high",
  );
  if (!canConfirm) {
    return {
      transcript,
      parsed,
      play: null,
      before,
      next: before,
      canConfirm: false,
      story: chainStory({
        names,
        before,
        play: null,
        next: before,
        canConfirm: false,
        warnings: parsed.warnings,
      }),
    };
  }
  const compiled = previewParsedPlay(game.plays, parsed, TEAM_CODE);
  const withPlay = [...game.plays, compiled.play];
  const next = currentChain(withPlay);
  return {
    transcript,
    parsed,
    play: compiled.play,
    before,
    next,
    canConfirm: true,
    story: chainStory({
      names,
      before,
      play: compiled.play,
      next,
      canConfirm: true,
      warnings: parsed.warnings,
    }),
  };
}

export function confirmSnap(
  game: BrowserGame,
  transcript: string,
  adjust?: SituationAdjust,
): BrowserGame {
  const preview = previewSnap(game, transcript, adjust);
  if (!preview.canConfirm || !preview.play) {
    throw new Error(
      preview.parsed.warnings.join(" ") || "Not a football snap — nothing confirmed",
    );
  }
  return {
    ...game,
    plays: [...game.plays, preview.play],
    transcripts: [...game.transcripts, transcript.trim()],
  };
}

export function undoLast(game: BrowserGame): { game: BrowserGame; transcript: string } {
  if (game.plays.length === 0) return { game, transcript: "" };
  return {
    game: {
      ...game,
      plays: game.plays.slice(0, -1),
      transcripts: game.transcripts.slice(0, -1),
    },
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
  return openingGame(game.opponent);
}

export function hudlCsv(game: BrowserGame): string {
  return serializeBrowserHudlCsv(game.plays);
}

export function csvFilename(opponent: string): string {
  const safe =
    opponent
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "game";
  return `snider-vs-${safe}.playlist.csv`;
}

export function storedGame(game: BrowserGame): StoredGame {
  return {
    opponent: game.opponent,
    plays: game.plays,
    transcripts: game.transcripts,
    situation: currentChain(game.plays),
  };
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
    return {
      opponent,
      plays: data.plays as PlaylistData[],
      transcripts: data.transcripts.filter((line) => typeof line === "string"),
    };
  } catch {
    return openingGame();
  }
}
