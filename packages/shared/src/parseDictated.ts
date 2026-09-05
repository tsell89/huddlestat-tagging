import { Hash, PlayType, Result, emptyPlayerRef } from "./constants.js";
import { defaultKickoffPlay } from "./defaults.js";
import type { PlaylistData } from "./index.js";
import { nextDraftAfterPlay, normalizePlayOnSave } from "./playChain.js";

export type DictatedChain = {
  down: number;
  distance: number;
  yardLine: number;
  odk: PlaylistData["odk"];
  hash: string;
  quarter: number;
  playNumber: number;
  playTypeGuess?: string;
};

/**
 * Speaker-described snap. Situation (down / distance / YL / ODK) is omitted
 * unless the speaker explicitly overrode it — `playChain` owns the rest.
 */
export type DictatedPlayInput = {
  quarter?: number;
  playType?: PlaylistData["playType"];
  result?: PlaylistData["result"];
  gainLoss?: number;
  hash?: PlaylistData["hash"];
  yardLine?: number;
  down?: number;
  distance?: number;
  odk?: PlaylistData["odk"];
  rusherJersey?: string;
  passerJersey?: string;
  receiverJersey?: string;
  tackler1Jersey?: string;
  tackler2Jersey?: string;
  kickerJersey?: string;
  returnerJersey?: string;
  interceptedByJersey?: string;
  recoveredByJersey?: string;
  returnYards?: number;
  kickYards?: number;
  spotEncoding?: string;
  /** Omitted on JSONL compile inputs; parseWithRules always sets this. */
  confidence?: "high" | "low";
  warnings?: string[];
};

function buildNumberWordMap(): [string, number][] {
  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = [
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const pairs: [string, number][] = [["zero", 0]];
  for (let i = 1; i <= 9; i++) pairs.push([ones[i]!, i]);
  for (let i = 0; i < 10; i++) pairs.push([teens[i]!, 10 + i]);
  for (let t = 2; t <= 9; t++) {
    pairs.push([tens[t]!, t * 10]);
    for (let o = 1; o <= 9; o++) {
      pairs.push([`${tens[t]} ${ones[o]}`, t * 10 + o]);
      pairs.push([`${tens[t]}-${ones[o]}`, t * 10 + o]);
    }
  }
  return pairs.sort((a, b) => b[0].length - a[0].length);
}

const NUMBER_WORDS = buildNumberWordMap();

function replaceNumberWords(text: string): string {
  let out = text;
  for (const [word, n] of NUMBER_WORDS) {
    const re = new RegExp(`\\b${word.replace(/[ -]/g, "[- ]")}\\b`, "g");
    out = out.replace(re, String(n));
  }
  return out;
}

function normalizeTranscript(raw: string): string {
  let text = raw.toLowerCase().replace(/[.,!?]+/g, " ").replace(/\s+/g, " ").trim();
  text = text.replace(/\b(to|too|two)\s+(runs?|rushes|rush)\b/g, "2 $2");
  text = replaceNumberWords(text);
  return text.replace(/\s+/g, " ").trim();
}

function takeJersey(text: string, label: RegExp): string | undefined {
  const m = label.exec(text);
  return m?.[1];
}

function extractHash(text: string): PlaylistData["hash"] | undefined {
  if (/\bleft\s+hash\b/.test(text)) return Hash.Left;
  if (/\bright\s+hash\b/.test(text)) return Hash.Right;
  if (/\b(middle|mid)\s+hash\b/.test(text)) return Hash.Middle;
  return undefined;
}

function extractSpot(text: string): number | undefined {
  const m =
    /\bspot(?: it)? on (own|opp|opponent|the)\s+(\d+)\b/.exec(text) ||
    /\b(?:downed|fair catch)\s+at (own|opp|opponent|the)\s+(\d+)\b/.exec(text);
  if (!m) return undefined;
  const side = m[1];
  const n = Number(m[2]);
  if (n === 50) return 50;
  if (side === "own") return -n;
  if (side === "opp" || side === "opponent") return n;
  return n === 50 ? 50 : n;
}

function extractTacklers(text: string): { t1?: string; t2?: string } {
  const m =
    /\btackled by (\d+)(?:\s+and\s+(\d+))?/.exec(text) ||
    /\btackler(?:s)? (\d+)(?:\s+and\s+(\d+))?/.exec(text);
  if (!m) return {};
  return { t1: m[1], t2: m[2] };
}

function withModifiers(parsed: DictatedPlayInput, text: string): DictatedPlayInput {
  const hash = extractHash(text);
  const yardLine = extractSpot(text);
  const tacklers = extractTacklers(text);
  const kicker = parsed.kickerJersey ?? takeJersey(text, /\bkicker\s+(\d+)/);
  const returner = parsed.returnerJersey ?? takeJersey(text, /\breturner\s+(\d+)/);
  if (hash) parsed = { ...parsed, hash };
  if (yardLine !== undefined) parsed = { ...parsed, yardLine };
  if (tacklers.t1 && !parsed.tackler1Jersey) parsed = { ...parsed, tackler1Jersey: tacklers.t1 };
  if (tacklers.t2 && !parsed.tackler2Jersey) parsed = { ...parsed, tackler2Jersey: tacklers.t2 };
  if (kicker) parsed = { ...parsed, kickerJersey: kicker };
  if (returner) parsed = { ...parsed, returnerJersey: returner };
  return parsed;
}

function base(chain: DictatedChain, extra: Partial<DictatedPlayInput> = {}): DictatedPlayInput {
  return {
    quarter: chain.quarter,
    confidence: "high",
    warnings: [],
    ...extra,
  };
}

/**
 * Drop chain-owned situation fields unless the speaker overrode hash / spot.
 * Down, distance, and ODK always come from `playChain`.
 */
export function stripChainOwnedSituation(parsed: DictatedPlayInput): DictatedPlayInput {
  const { down: _down, distance: _distance, odk: _odk, ...rest } = parsed;
  return rest;
}

/** Deterministic text → DictatedPlayInput. Does not invent down/distance/YL/ODK. */
export function parseWithRules(rawTranscript: string, chain: DictatedChain): DictatedPlayInput {
  const raw = rawTranscript.trim();
  if (!raw) {
    return {
      quarter: chain.quarter,
      confidence: "low",
      warnings: ["Empty transcript"],
    };
  }
  const text = normalizeTranscript(raw);

  if (/turnover on downs/.test(text)) {
    const gain = /\bfor\s+(-?\d+)/.exec(text);
    return withModifiers(
      base(chain, {
        playType: PlayType.Run,
        result: Result.Rush,
        gainLoss: gain ? Number(gain[1]) : 0,
        confidence: "high",
      }),
      text,
    );
  }

  if (/kickoff\s+touchback/.test(text) || (/\btouchback\b/.test(text) && /\bkick/.test(text))) {
    return withModifiers(
      base(chain, { playType: PlayType.Kickoff, result: Result.Touchback }),
      text,
    );
  }

  const koRet = /kickoff\s+return\s+(-?\d+)/.exec(text);
  if (koRet || /kickoff\s+return/.test(text)) {
    const yards = koRet ? Number(koRet[1]) : undefined;
    return withModifiers(
      base(chain, {
        playType: PlayType.Kickoff,
        result: Result.Return,
        returnYards: yards,
        gainLoss: yards,
      }),
      text,
    );
  }

  if (/extra\s+point|\bpat\b/.test(text)) {
    const good = /\b(good|no\s+good|blocked)\b/.exec(text);
    const result =
      good?.[1] === "blocked"
        ? Result.Blocked
        : good?.[1]?.includes("no")
          ? Result.NoGood
          : Result.Good;
    return withModifiers(base(chain, { playType: PlayType.ExtraPoint, result }), text);
  }

  if (/\b(fg|field\s+goal)\b/.test(text)) {
    const good = /\b(good|no\s+good)\b/.exec(text);
    const result = good?.[1]?.includes("no") ? Result.NoGood : Result.Good;
    return withModifiers(base(chain, { playType: PlayType.FieldGoal, result }), text);
  }

  const sack = /\bsack(?:ed)?(?:\s+(?:for\s+)?(?:a\s+)?loss\s+of\s+(\d+))?/.exec(text);
  if (sack) {
    const loss = sack[1] ? Number(sack[1]) : undefined;
    return withModifiers(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.Sack,
        gainLoss: loss !== undefined ? -loss : undefined,
      }),
      text,
    );
  }

  const intercepted = /\b(?:int|interception)\s+by\s+(\d+)/.exec(text);
  if (intercepted || /\bintercepted\b/.test(text)) {
    return withModifiers(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.Interception,
        interceptedByJersey: intercepted?.[1],
      }),
      text,
    );
  }

  if (
    /\bincomplete\b/.test(text) ||
    /threw it away|throw it away|throwaway|spikes it|spiked it/.test(text)
  ) {
    const passer =
      takeJersey(text, /\bpasser\s+(\d+)/) ||
      takeJersey(text, /^(\d+)\s+incomplete/) ||
      takeJersey(text, /(\d+)\s+(?:threw|throws|throwaway|spikes|spiked)/);
    return withModifiers(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.Incomplete,
        passerJersey: passer,
        gainLoss: 0,
      }),
      text,
    );
  }

  const completeTd =
    /(\d+)\s+complete(?:s)?\s+to\s+(\d+)\s+for\s+(-?\d+).*(?:td|touchdown)/.exec(text) ||
    /(\d+)\s+complete(?:s)?\s+to\s+(\d+).*(?:td|touchdown)\s+for\s+(-?\d+)/.exec(text);
  if (completeTd) {
    return withModifiers(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.CompleteTd,
        passerJersey: completeTd[1],
        receiverJersey: completeTd[2],
        gainLoss: Number(completeTd[3]),
      }),
      text,
    );
  }

  const complete = /(\d+)\s+complete(?:s)?\s+to\s+(\d+)\s+for\s+(-?\d+)/.exec(text);
  if (complete) {
    return withModifiers(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.Complete,
        passerJersey: complete[1],
        receiverJersey: complete[2],
        gainLoss: Number(complete[3]),
      }),
      text,
    );
  }

  const rushTd =
    /(\d+)\s+(?:runs?|rush(?:es)?)\s+(?:td|touchdown)\s+for\s+(-?\d+)/.exec(text) ||
    /(\d+)\s+rush\s+td\s+for\s+(-?\d+)/.exec(text);
  if (rushTd) {
    return withModifiers(
      base(chain, {
        playType: PlayType.Run,
        result: Result.RushTd,
        rusherJersey: rushTd[1],
        gainLoss: Number(rushTd[2]),
      }),
      text,
    );
  }

  const rush = /(\d+)\s+(?:runs?|rushes|rush)\s+for\s+(-?\d+)/.exec(text);
  if (rush) {
    return withModifiers(
      base(chain, {
        playType: PlayType.Run,
        result: Result.Rush,
        rusherJersey: rush[1],
        gainLoss: Number(rush[2]),
      }),
      text,
    );
  }

  if (/\bpunt\b/.test(text)) {
    const tb = /\btouchback\b/.test(text);
    const fair = /\bfair catch\b/.test(text);
    const downed = /\bdowned\b/.test(text);
    const result = tb
      ? Result.Touchback
      : fair
        ? Result.FairCatch
        : Result.Downed;
    return withModifiers(
      base(chain, {
        playType: PlayType.Punt,
        result,
        confidence: tb || fair || downed ? "high" : "low",
        warnings: tb || fair || downed ? [] : ["Punt result assumed Downed — confirm the end spot"],
      }),
      text,
    );
  }

  const hashOnly = extractHash(text);
  const spotOnly = extractSpot(text);
  if (hashOnly || spotOnly !== undefined) {
    return {
      quarter: chain.quarter,
      hash: hashOnly,
      yardLine: spotOnly,
      confidence: "low",
      warnings: ["No snap — situation override only. Dictate the play, then Confirm."],
    };
  }

  return {
    quarter: chain.quarter,
    confidence: "low",
    warnings: ["Not a football snap"],
  };
}

function jerseyOnly(jersey?: string): PlaylistData["rusher"] {
  const trimmed = jersey?.trim() ?? "";
  return trimmed ? { jersey: trimmed, name: "" } : emptyPlayerRef;
}

export function openingDictatedChain(quarter = 1): DictatedChain {
  return {
    down: 0,
    distance: 0,
    yardLine: -40,
    odk: "K",
    hash: Hash.Middle,
    quarter,
    playNumber: 1,
    playTypeGuess: PlayType.Kickoff,
  };
}

/**
 * Apply a parsed snap onto the current draft (chain unless the speaker overrode it).
 * In-memory only — does not write a game.
 */
export function previewParsedPlay(
  existing: PlaylistData[],
  parsed: DictatedPlayInput,
  team = "SHS",
): { play: PlaylistData; next: PlaylistData } {
  const playNumber = existing.length + 1;
  const draft =
    existing.length === 0
      ? defaultKickoffPlay(1, team, { quarter: parsed.quarter ?? 1 })
      : nextDraftAfterPlay(existing[existing.length - 1]!, playNumber, team, {
          rules: "HS",
        });
  const play = normalizePlayOnSave({
    ...draft,
    playNumber,
    quarter: parsed.quarter ?? draft.quarter,
    team,
    playType: parsed.playType || draft.playType,
    result: parsed.result ?? draft.result,
    odk: parsed.odk ?? draft.odk,
    yardLine: parsed.yardLine ?? draft.yardLine,
    down: parsed.down ?? draft.down,
    distance: parsed.distance ?? draft.distance,
    hash: parsed.hash ?? draft.hash,
    gainLoss: parsed.gainLoss ?? 0,
    rusher: parsed.rusherJersey ? jerseyOnly(parsed.rusherJersey) : draft.rusher,
    passer: parsed.passerJersey ? jerseyOnly(parsed.passerJersey) : draft.passer,
    receiver: parsed.receiverJersey ? jerseyOnly(parsed.receiverJersey) : draft.receiver,
    tackler1: parsed.tackler1Jersey ? jerseyOnly(parsed.tackler1Jersey) : draft.tackler1,
    tackler2: parsed.tackler2Jersey ? jerseyOnly(parsed.tackler2Jersey) : draft.tackler2,
    kicker: parsed.kickerJersey ? jerseyOnly(parsed.kickerJersey) : draft.kicker,
    returner: parsed.returnerJersey ? jerseyOnly(parsed.returnerJersey) : draft.returner,
    interceptedBy: parsed.interceptedByJersey
      ? jerseyOnly(parsed.interceptedByJersey)
      : draft.interceptedBy,
    returnYards: parsed.returnYards,
    kickYards: parsed.kickYards,
  });
  return {
    play,
    next: nextDraftAfterPlay(play, playNumber + 1, team, { rules: "HS" }),
  };
}

/** Parser left situation unset (chain owns down / distance / YL / ODK). */
export function parserOmitsSituation(parsed: DictatedPlayInput): boolean {
  return (
    parsed.down === undefined &&
    parsed.distance === undefined &&
    parsed.yardLine === undefined &&
    parsed.odk === undefined
  );
}

/** High-confidence snap the tagger may Confirm. */
export function parsedSnapIsConfirmable(parsed: DictatedPlayInput): boolean {
  if (!parsed.playType || parsed.result === undefined || parsed.result === "") {
    return false;
  }
  return parsed.confidence !== "low";
}
