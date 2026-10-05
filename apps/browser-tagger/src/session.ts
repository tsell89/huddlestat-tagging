import {
  Result,
  decodePenalty,
  encodePenaltySpotEncoding,
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
