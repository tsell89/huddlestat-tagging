import { Hash, PlayType, Result, emptyPlayerRef } from "./constants.js";
import { defaultKickoffPlay } from "./defaults.js";
import { yardsAdvanced, yardsToScoringGoal } from "./fieldPosition100.js";
import type { PlaylistData } from "./index.js";
import { encodePenaltySpotEncoding, type PenaltyYards } from "./penalty.js";
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

export type DictatedPlayInput = {
  quarter: number;
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
  /** Ball-spot chain string. Down / distance / yard line / ODK still come from playChain. */
  spotEncoding?: string;
  confidence: "high" | "low";
  warnings: string[];
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
  // Speech and shorthand write out of bounds as OOB, O0B, 0OB, or 00B.
  text = text.replace(/\b[0o]{2}b\b/g, "oob");
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
  const m = /\bspot it on (own|opp|opponent|the)\s+(\d+)\b/.exec(text);
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

const NOTE_STOP = new Set([
  "own",
  "opp",
  "opponent",
  "the",
  "to",
  "at",
  "by",
  "and",
  "us",
  "them",
  "blank",
  "return",
  "catch",
  "oob",
  "tackle",
  "tackles",
  "tackled",
  "snider",
  "shs",
  "ball",
  "from",
  "on",
  "vs",
  "of",
  "a",
  "an",
]);

function explicitGain(text: string): number | undefined {
  const signed = [...text.matchAll(/(?:^|[\s,])([+-])\s?(\d+)\b/g)];
  if (signed.length > 0) {
    const last = signed[signed.length - 1]!;
    return (last[1] === "+" ? 1 : -1) * Number(last[2]);
  }
  if (/\bno gain\b/.test(text)) return 0;
  const yards = /(\d+)\s*-?\s*yards?\b/.exec(text);
  if (yards && /\btd\b|touchdown/.test(text)) return Number(yards[1]);
  return undefined;
}

function tdYards(text: string, chain: DictatedChain): number {
  const gain = explicitGain(text);
  if (gain !== undefined && gain > 0) return gain;
  const toGoal = yardsToScoringGoal(chain.yardLine, chain.odk === "D" ? "D" : "O");
  return toGoal > 0 ? toGoal : 0;
}

function themJersey(text: string, jersey: string | undefined): boolean {
  if (!jersey) return false;
  if (new RegExp(`#?${jersey}\\s+them\\s+blank`).test(text)) return true;
  if (new RegExp(`#${jersey}\\s+catch[^()]{0,40}\\(\\s*them\\s+blank`).test(text)) return true;
  return false;
}

function keepJersey(text: string, jersey: string | undefined): string | undefined {
  if (!jersey || themJersey(text, jersey)) return undefined;
  return jersey;
}

function tacklersFromNote(text: string): { t1?: string; t2?: string } {
  const m = /tackles?\s+#?(\d+)(?:\s+and\s+#?(\d+))?/.exec(text);
  if (!m) return {};
  return { t1: keepJersey(text, m[1]), t2: keepJersey(text, m[2]) };
}

/** Own on a kick we boot is the receiving team's own side (positive). */
function noteYard(side: string, yards: number, weKick: boolean): number {
  if (yards === 50) return 50;
  const name = side.toLowerCase();
  if (name === "opp" || name === "opponent") return yards;
  if (name === "snider" || name === "shs") return -yards;
  if (name === "own") return weKick ? yards : -yards;
  if (NOTE_STOP.has(name)) return yards;
  return yards;
}

function spotMention(text: string, kind: "catch" | "end"): { side: string; yards: number } | null {
  const side = "(own|opp|opponent|snider|shs|[a-z]{3,})";
  const pattern =
    kind === "catch"
      ? new RegExp(`(?:catch|caught)\\s+(?:by\\s+)?#?\\d*\\s*(?:at\\s+)?${side}\\s+(\\d+)`)
      : new RegExp(
          `(?:return|oob|downed|fair catch|to)\\s+(?:(?:#?\\d+|them|blank|us)\\s+)*(?:at\\s+)?${side}\\s+(\\d+)`,
        );
  const match = pattern.exec(text);
  if (!match || NOTE_STOP.has(match[1]) && match[1] !== "own" && match[1] !== "opp") {
    if (!match) return null;
  }
  if (!match) return null;
  if (NOTE_STOP.has(match[1]) && match[1] !== "own" && match[1] !== "opp" && match[1] !== "opponent" && match[1] !== "snider" && match[1] !== "shs") {
    return null;
  }
  return { side: match[1], yards: Number(match[2]) };
}

function weKickThisPlay(text: string, chain: DictatedChain): boolean {
  if (/\bko rec\b/.test(text)) return false;
  if (/\b(snider|shs)\s+\d+\s+ko\b/.test(text)) return true;
  const koAt = text.search(/\bko\b/);
  if (koAt >= 0) {
    const before = text.slice(0, koAt);
    if (/\b(snider|shs)\b/.test(before)) return true;
    if (/[a-z]{3,}\s+\d+\s+$/.test(before)) return false;
  }
  if (chain.playTypeGuess === PlayType.KickoffReceive || chain.odk === "D") return false;
  return chain.playTypeGuess === PlayType.Kickoff || chain.odk === "K" || chain.playNumber === 1;
}

function penaltyYards(text: string): PenaltyYards {
  const match = /(\d+)\s*-?\s*yards?\b/.exec(text);
  const n = match ? Number(match[1]) : 10;
  if (n === 5 || n === 10 || n === 15) return n;
  return 10;
}

function penaltyAgainst(text: string, chain: DictatedChain): "O" | "D" {
  if (/\bvs\s+d\b|\bdpi\b|\bdefensive holding\b|\bencroach|\boffside|\bface\s*mask\b|\bfacemask\b/.test(text)) {
    return "D";
  }
  if (/\bfalse start\b|\bdelay of game\b|\billegal procedure\b|\bvs\s+o\b/.test(text)) return "O";
  const againstUs = /\b(?:vs|on|by)\s+(?:snider|shs)\b/.test(text);
  if (againstUs) return chain.odk === "O" ? "O" : "D";
  return chain.odk === "D" ? "O" : "D";
}

function looksLikeGameNote(text: string): boolean {
  return (
    /\bko rec\b|\bko\b/.test(text) ||
    /\brun\b/.test(text) ||
    /\bcomplete\s+#?\d+\b/.test(text) ||
    /\bpass\s+#?\d+\b/.test(text) ||
    /\bincomplete\b/.test(text) ||
    /\bxp\b/.test(text) ||
    /\bfg\b/.test(text) ||
    /\bpunts?\b/.test(text) ||
    /\bsack\b/.test(text) ||
    /\bkneel\b|\bkeeper\b|\bqb\s+#?\d+\s+to\b/.test(text) ||
    /\b(pre-snap|dead-ball|dead ball|encroachment|encroach|offsides|false start|delay of game|dpi|face\s*mask|facemask|illegal|holding|penalt(?:y|ies)|late hit|uns|\bur vs\b)\b/.test(text) ||
    /\bintercept|\bint\s+#?\d+\b|\bpass\b[^.]{0,50}\bint\b/.test(text) ||
    /\bfumble\b/.test(text)
  );
}

function isPenaltyNote(text: string): boolean {
  const playAt = text.search(/\b(pass|run|complete|intercept|fumble|kneel)\b/);
  if (/\bwaved off\b/.test(text)) return false;
  const foulAt = text.search(
    /\b(pre-snap|dead-ball|dead ball|encroachment|encroach|offsides|false start|holding|delay of game|dpi|face\s*mask|facemask|illegal|uns|late hit|penalt(?:y|ies)|\bur vs\b)\b/,
  );
  if (playAt !== -1 && foulAt !== -1 && playAt < foulAt && /\b(intercept|fumble)\b/.test(text)) {
    return false;
  }
  if (playAt !== -1 && foulAt !== -1 && playAt < foulAt && /\b(run|complete|pass)\b/.test(text) && !/^\s*(pre-snap|dead-ball|dead ball|encroach|penalty|offsides|false start)/.test(text)) {
    return false;
  }
  return foulAt !== -1;
}

/**
 * Game-log notes: "Run 4 to Snider 15, +5. Tackle 24 US."
 * Situation in the sentence is ignored. The chain still owns down, distance, and the ball spot.
 */
function parseGameNote(text: string, chain: DictatedChain): DictatedPlayInput | null {
  if (!looksLikeGameNote(text)) return null;
  const tackles = tacklersFromNote(text);
  const withTackle = (play: DictatedPlayInput): DictatedPlayInput => ({
    ...play,
    tackler1Jersey: play.tackler1Jersey ?? tackles.t1,
    tackler2Jersey: play.tackler2Jersey ?? tackles.t2,
  });

  if (/\bkneel\b|\bkeeper\b/.test(text)) {
    const rusher = keepJersey(
      text,
      /\bkneel\s+#?(\d+)/.exec(text)?.[1] ?? /\bqb\s+#?(\d+)\s+keeper/.exec(text)?.[1],
    );
    return withTackle(
      base(chain, {
        playType: PlayType.Run,
        result: Result.Rush,
        gainLoss: explicitGain(text) ?? -1,
        rusherJersey: rusher,
      }),
    );
  }

  if (
    (/\bintercept/.test(text) || /\bint\s+#?\d+\b/.test(text) || /\bpass\b[^.]{0,50}\bint\b/.test(text)) &&
    !(/\bwiped\b/.test(text) && isPenaltyNote(text))
  ) {
    const passer = keepJersey(text, /\bpass\s+#?(\d+)/.exec(text)?.[1]);
    const picked = keepJersey(
      text,
      /\bint(?:ercept(?:ed|ion)?)?(?:\s+by)?\s+#?(\d+)/.exec(text)?.[1],
    );
    const weKick = false;
    const caught = spotMention(text, "catch") ?? spotMention(text.replace(/\bat\s+/, "catch "), "catch");
    const ended = spotMention(text, "end");
    let spotEncoding: string | undefined;
    let returnYards: number | undefined;
    if (caught && ended) {
      const catchHudl = noteYard(caught.side, caught.yards, weKick);
      const endHudl = noteYard(ended.side, ended.yards, weKick);
      spotEncoding = `catch:${catchHudl}|end:${endHudl}`;
      returnYards = Math.abs(yardsAdvanced(catchHudl, endHudl));
    }
    if (!spotEncoding) {
      return withTackle(
        base(chain, {
          playType: PlayType.Pass,
          result: Result.Interception,
          gainLoss: chain.down === 4 ? chain.distance : 0,
          passerJersey: passer,
          interceptedByJersey: picked,
          confidence: "low",
          warnings: ["Interception needs an end spot"],
        }),
      );
    }
    return withTackle(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.Interception,
        gainLoss: chain.down === 4 ? chain.distance : 0,
        passerJersey: passer,
        interceptedByJersey: picked,
        returnYards,
        spotEncoding,
      }),
    );
  }

  if (/\bfumble\b/.test(text)) {
    const gain = explicitGain(text) ?? 0;
    return withTackle(
      base(chain, {
        playType: /\bpass\b|\bcomplete\b/.test(text) ? PlayType.Pass : PlayType.Run,
        result: Result.Fumble,
        gainLoss: gain,
      }),
    );
  }

  if (isPenaltyNote(text)) {
    const yards = penaltyYards(text);
    const against = penaltyAgainst(text, chain);
    const afd = /\bafd\b|automatic first|crosses the sticks|\bdpi\b|\bdefensive holding\b/.test(text);
    const wipedPunt = /\bwiped punt\b|\bpunt\b/.test(text) && /\b(wiped|penalty|illegal)\b/.test(text);
    return base(chain, {
      playType: wipedPunt
        ? PlayType.Punt
        : /\b(pass|complete|incomplete)\b/.test(text)
          ? PlayType.Pass
          : PlayType.Run,
      result: Result.Penalty,
      gainLoss: 0,
      spotEncoding: encodePenaltySpotEncoding({
        foulSpot: chain.yardLine,
        yards,
        against,
        autoFirstDown: afd,
      }),
    });
  }

  if (/\bko\b/.test(text.replace(/next is[^.]{0,40}\bko\b/g, ""))) {
    const weKick = weKickThisPlay(text, chain);
    const kicker = keepJersey(text, /(?:snider|shs|[a-z]+)\s+(\d+)\s+ko\b/.exec(text)?.[1] ?? /\bko\b[^.]{0,12}#?(\d+)/.exec(text)?.[1]);
    if (/\btouchback\b/.test(text)) {
      return base(chain, {
        playType: weKick ? PlayType.Kickoff : PlayType.KickoffReceive,
        result: Result.Touchback,
        kickerJersey: weKick ? kicker : undefined,
      });
    }
    const caught = spotMention(text, "catch");
    const ended = spotMention(text, "end");
    const catchHudl = caught
      ? noteYard(caught.side, caught.yards, weKick)
      : ended
        ? weKick
          ? 20
          : -20
        : undefined;
    const endHudl = ended ? noteYard(ended.side, ended.yards, weKick) : undefined;
    let gain = explicitGain(text);
    if (gain === undefined && catchHudl !== undefined && endHudl !== undefined) {
      gain = Math.abs(yardsAdvanced(catchHudl, endHudl));
    }
    gain = gain ?? 0;
    const spotEncoding =
      catchHudl !== undefined && endHudl !== undefined
        ? `catch:${catchHudl}|end:${endHudl}`
        : undefined;
    const returner = keepJersey(text, /#(\d+)\s+catch/.exec(text)?.[1]);
    const returned = base(chain, {
      playType: weKick ? PlayType.Kickoff : PlayType.KickoffReceive,
      result: Result.Return,
      gainLoss: gain,
      returnYards: gain,
      kickerJersey: weKick ? kicker : undefined,
      returnerJersey: weKick ? undefined : returner,
      spotEncoding,
      ...(spotEncoding
        ? {}
        : {
            confidence: "low" as const,
            warnings: ["Kickoff needs an end spot"],
          }),
    });
    return withTackle(returned);
  }

  if (/\bpunts?\b/.test(text)) {
    const kicker = keepJersey(
      text,
      /\bpunts?\s+#?(\d+)/.exec(text)?.[1] ?? /(\d+)\s+punts?\b/.exec(text)?.[1],
    );
    const opponentPunter = /\b(?!snider\b|shs\b)[a-z]{3,}\s+\d+\s+punts?\b/.test(text);
    const ourPunter = /\b(?:snider|shs)\s+\d+\s+punts?\b/.test(text);
    const weKick = ourPunter || (!opponentPunter && chain.odk !== "D");
    if (/\btouchback\b/.test(text)) {
      return base(chain, {
        playType: PlayType.Punt,
        result: Result.Touchback,
        kickerJersey: kicker,
      });
    }
    const ended = spotMention(text, "end");
    const gain = explicitGain(text);
    if (/\bblocked\b/.test(text)) {
      return withTackle(
        base(chain, {
          playType: PlayType.Punt,
          result: Result.Blocked,
          gainLoss: 0,
          kickerJersey: kicker,
        }),
      );
    }
    if (/\bfair catch\b/.test(text)) {
      if (!ended) {
        return base(chain, {
          playType: PlayType.Punt,
          result: Result.FairCatch,
          gainLoss: 0,
          kickerJersey: kicker,
          confidence: "low",
          warnings: ["Punt needs an end spot"],
        });
      }
      return base(chain, {
        playType: PlayType.Punt,
        result: Result.FairCatch,
        gainLoss: 0,
        kickerJersey: kicker,
        spotEncoding: `end:${noteYard(ended.side, ended.yards, weKick)}`,
      });
    }
    if (/\boob\b|\bdowned\b/.test(text)) {
      if (!ended) {
        return base(chain, {
          playType: PlayType.Punt,
          result: Result.Downed,
          gainLoss: 0,
          kickerJersey: kicker,
          confidence: "low",
          warnings: ["Punt needs an end spot"],
        });
      }
      return base(chain, {
        playType: PlayType.Punt,
        result: Result.Downed,
        gainLoss: 0,
        kickerJersey: kicker,
        spotEncoding: `end:${noteYard(ended.side, ended.yards, weKick)}`,
      });
    }
    if (/\bno return\b/.test(text) && ended) {
      const endHudl = noteYard(ended.side, ended.yards, weKick);
      return base(chain, {
        playType: PlayType.Punt,
        result: Result.Return,
        gainLoss: 0,
        returnYards: 0,
        kickerJersey: kicker,
        spotEncoding: `recv:${endHudl}|end:${endHudl}`,
      });
    }
    const caught = spotMention(text, "catch");
    const returnYards = gain ?? 0;
    let spotEncoding: string | undefined;
    if (caught && ended) {
      spotEncoding = `recv:${noteYard(caught.side, caught.yards, weKick)}|end:${noteYard(ended.side, ended.yards, weKick)}`;
    } else if (ended) {
      const endHudl = noteYard(ended.side, ended.yards, weKick);
      spotEncoding = `recv:${endHudl}|end:${endHudl}`;
    }
    if (!spotEncoding) {
      return withTackle(
        base(chain, {
          playType: PlayType.Punt,
          result: gain === undefined && !caught ? Result.Downed : Result.Return,
          gainLoss: gain === undefined && !caught ? 0 : returnYards,
          returnYards: gain === undefined && !caught ? undefined : returnYards,
          kickerJersey: kicker,
          confidence: "low",
          warnings: ["Punt needs an end spot"],
        }),
      );
    }
    return withTackle(
      base(chain, {
        playType: PlayType.Punt,
        result: Result.Return,
        gainLoss: returnYards,
        returnYards,
        kickerJersey: kicker,
        spotEncoding,
      }),
    );
  }

  if (/\bxp\b|\bextra\s+pt\b/.test(text)) {
    const blocked = /\bblocked\b/.test(text);
    const blockUnit = /\bextra\s+pt\.?\s+block\b/.test(text) || (blocked && /\bblocked\s+by\b/.test(text));
    const good = /\bno good\b/.test(text) ? Result.NoGood : blocked && blockUnit ? Result.Blocked : Result.Good;
    const kicker = keepJersey(text, /\bxp\s+#?(\d+)/.exec(text)?.[1]);
    return withTackle(
      base(chain, {
        playType: blockUnit ? PlayType.ExtraPointBlock : PlayType.ExtraPoint,
        result: blockUnit && blocked ? Result.Blocked : good,
        kickerJersey: blockUnit ? undefined : kicker,
        gainLoss: 0,
      }),
    );
  }

  if (/\bfg\b|\bfield\s+goal\b/.test(text)) {
    const good = /\bno good\b/.test(text) ? Result.NoGood : Result.Good;
    const kicker = keepJersey(text, /\bfg\s+#?(\d+)/.exec(text)?.[1]);
    return base(chain, {
      playType: PlayType.FieldGoal,
      result: good,
      kickerJersey: kicker,
      gainLoss: 0,
      spotEncoding: good === Result.NoGood && /\btouchback\b/.test(text) ? "end:TB" : undefined,
    });
  }

  if (/\bsack\b/.test(text)) {
    const ofPasser =
      /\bsack\s+of\s+#?(\d+)/.exec(text)?.[1] ?? /\bqb\s+#?(\d+)\s+sack/.exec(text)?.[1];
    const byTackler = /\bby\s+#?(\d+)/.exec(text)?.[1] ?? /\bsack\s+#?(\d+)/.exec(text)?.[1];
    const assist = /\bassist\s+#?(\d+)/.exec(text)?.[1];
    const gain = explicitGain(text);
    return withTackle(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.Sack,
        gainLoss: gain,
        passerJersey: keepJersey(text, ofPasser),
        tackler1Jersey: keepJersey(text, byTackler),
        tackler2Jersey: keepJersey(text, assist),
        confidence: gain === undefined ? "low" : "high",
        warnings: gain === undefined ? ["Sack needs loss yards"] : [],
      }),
    );
  }

  if (/\bincomplete\b/.test(text)) {
    const passer = keepJersey(
      text,
      /\bincomplete\s+#?(\d+)/.exec(text)?.[1] ??
        /\bpasser\s+#?(\d+)/.exec(text)?.[1] ??
        /^#?(\d+)\s+incomplete/.exec(text)?.[1],
    );
    return withTackle(
      base(chain, {
        playType: PlayType.Pass,
        result: Result.Incomplete,
        gainLoss: 0,
        passerJersey: passer,
      }),
    );
  }

  if (/\bcomplete\b/.test(text)) {
    const players = /\bcomplete\s+#?(\d+)(?:\s*(?:to\s+)?#?(\d+))?/.exec(text);
    const themSkill = /\bcomplete\s+#?\d+(?:\s+to\s+#?\d+)?\s+them\s+blank/.test(text);
    const td = /\btd\b|touchdown/.test(text);
    return withTackle(
      base(chain, {
        playType: PlayType.Pass,
        result: td ? Result.CompleteTd : Result.Complete,
        gainLoss: td ? tdYards(text, chain) : (explicitGain(text) ?? 0),
        passerJersey: themSkill ? undefined : keepJersey(text, players?.[1]),
        receiverJersey: themSkill ? undefined : keepJersey(text, players?.[2]),
      }),
    );
  }

  const qbScramble = /\bqb\s+#?(\d+)\s+to\b/.exec(text);
  if (qbScramble) {
    return withTackle(
      base(chain, {
        playType: PlayType.Run,
        result: Result.Rush,
        gainLoss: explicitGain(text) ?? 0,
        rusherJersey: keepJersey(text, qbScramble[1]),
      }),
    );
  }

  const thrown = /\bpass\s+#?(\d+)\s+to\s+#?(\d+)/.exec(text);
  if (thrown) {
    const td = /\btd\b|touchdown/.test(text);
    const themSkill = /\bpass\s+#?\d+\s+to\s+#?\d+\s+them\s+blank/.test(text);
    return withTackle(
      base(chain, {
        playType: PlayType.Pass,
        result: td ? Result.CompleteTd : Result.Complete,
        gainLoss: td ? tdYards(text, chain) : (explicitGain(text) ?? 0),
        passerJersey: themSkill ? undefined : keepJersey(text, thrown[1]),
        receiverJersey: themSkill ? undefined : keepJersey(text, thrown[2]),
      }),
    );
  }

  const run = /\brun\s+#?(\d+)\b/.exec(text) ?? /\b(?:qb\s+)?#?(\d+)\s+run\b/.exec(text);
  const namedRush = Boolean(run) || explicitGain(text) !== undefined || /\btd\b|touchdown/.test(text);
  if (/\brun\b/.test(text) && namedRush) {
    const td = /\btd\b|touchdown/.test(text);
    return withTackle(
      base(chain, {
        playType: PlayType.Run,
        result: td ? Result.RushTd : Result.Rush,
        gainLoss: td ? tdYards(text, chain) : (explicitGain(text) ?? 0),
        rusherJersey: keepJersey(text, run?.[1]),
      }),
    );
  }

  return null;
}

/** Deterministic text → DictatedPlayInput. Does not invent down/distance/YL/ODK. */
export function parseWithRules(rawTranscript: string, chain: DictatedChain): DictatedPlayInput {
  const raw = rawTranscript
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/→/g, " to ")
    .replace(/->/g, " to ");
  if (!raw) {
    return {
      quarter: chain.quarter,
      confidence: "low",
      warnings: ["Empty transcript"],
    };
  }
  const text = normalizeTranscript(raw);
  const note = parseGameNote(text, chain);
  if (note) return note;

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
        confidence: loss !== undefined ? "high" : "low",
        warnings: loss !== undefined ? [] : ["Sack needs loss yards"],
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

  if (/\bincomplete\b/.test(text)) {
    const passer =
      takeJersey(text, /\bpasser\s+(\d+)/) || takeJersey(text, /^(\d+)\s+incomplete/);
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
    return withModifiers(
      base(chain, {
        playType: PlayType.Punt,
        result: tb ? Result.Touchback : Result.Downed,
        confidence: tb ? "high" : "low",
        warnings: tb ? [] : ["Punt result assumed Downed — confirm the end spot"],
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
      ? defaultKickoffPlay(1, team, { quarter: parsed.quarter })
      : nextDraftAfterPlay(existing[existing.length - 1]!, playNumber, team, {
          rules: "HS",
        });
  const play = normalizePlayOnSave({
    ...draft,
    playNumber,
    quarter: parsed.quarter,
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
    recoveredBy: parsed.recoveredByJersey
      ? jerseyOnly(parsed.recoveredByJersey)
      : draft.recoveredBy,
    returnYards: parsed.returnYards,
    kickYards: parsed.kickYards,
    spotEncoding: parsed.spotEncoding ?? draft.spotEncoding,
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
