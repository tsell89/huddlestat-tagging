import { ODK, PlayType, Result } from "./constants.js";
import type { PlayerRef, PlaylistData } from "./index.js";
import { parseCsvLine } from "./pbp/hudlCsv.js";

/** MaxPreps Boys Football import columns (Hudl export omits PancakeBlocks, TotalPoints). */
export const MAXPREPS_FOOTBALL_COLUMNS = [
  "Jersey",
  "RushingNum",
  "RushingYards",
  "RushingLong",
  "ReceivingNum",
  "ReceivingYards",
  "ReceivingLong",
  "PassingComp",
  "PassingAtt",
  "PassingYards",
  "PassingTD",
  "PassingLong",
  "PassingInt",
  "OffensiveFumbles",
  "OffensiveFumblesLost",
  "Tackles",
  "Assists",
  "TotalTackles",
  "TacklesForLoss",
  "Sacks",
  "SacksYardsLost",
  "QBHurries",
  "INTs",
  "INTYards",
  "PassesDefensed",
  "BlockedPunts",
  "BlockedFG",
  "FumbleRecoveries",
  "FumbleRecoveryYards",
  "CausedFumbles",
  "PuntReturnNum",
  "PuntReturnYards",
  "PuntReturnLong",
  "PuntReturnFairCatches",
  "KickoffReturnNum",
  "KickoffReturnYards",
  "KickoffReturnLong",
  "TotalReturnYards",
  "PuntNum",
  "PuntYards",
  "PuntLong",
  "PuntInside20",
  "KickoffNum",
  "KickoffYards",
  "KickoffLong",
  "KickoffTouchbacks",
  "RushingTDNum",
  "ReceivingTDNum",
  "FumbleReturnedTDNum",
  "IntReturnedTDNum",
  "PuntReturnedTDNum",
  "KickoffReturnedTDNum",
  "TotalTDNum",
  "PATKickingMade",
  "PATKickingAtt",
  "PATKickingPoints",
  "PATRushingNum",
  "PATReceivingNum",
  "TotalConversionPoints",
  "FGMade",
  "FGAttempted",
  "FGLong",
  "Safeties",
] as const;

export type MaxPrepsFootballColumn = (typeof MAXPREPS_FOOTBALL_COLUMNS)[number];

export type MaxPrepsPlayerRow = Record<MaxPrepsFootballColumn, number | string>;

function emptyRow(jersey: string): MaxPrepsPlayerRow {
  const row = { Jersey: jersey } as MaxPrepsPlayerRow;
  for (const col of MAXPREPS_FOOTBALL_COLUMNS) {
    if (col !== "Jersey") row[col] = 0;
  }
  return row;
}

function jerseyKey(ref: PlayerRef): string | null {
  const jersey = ref.jersey.trim();
  return jersey ? jersey : null;
}

function ensureRow(
  map: Map<string, MaxPrepsPlayerRow>,
  ref: PlayerRef,
): MaxPrepsPlayerRow {
  const key = jerseyKey(ref);
  if (!key) {
    throw new Error("MaxPreps row requires a jersey number");
  }
  let row = map.get(key);
  if (!row) {
    row = emptyRow(key);
    map.set(key, row);
  }
  return row;
}

function isTouchdownResult(result: PlaylistData["result"]): boolean {
  return result === Result.RushTd || result === Result.CompleteTd;
}

function isReturnTouchdown(play: PlaylistData): boolean {
  return play.completion?.includes("end:TD") === true;
}

function isRushTouchdown(play: PlaylistData): boolean {
  return play.result === Result.RushTd || isReturnTouchdown(play);
}

function isPassTouchdown(play: PlaylistData): boolean {
  return play.result === Result.CompleteTd;
}

function isPassAttempt(play: PlaylistData): boolean {
  if (play.playType === PlayType.Pass) return true;
  if (play.playType !== "") return false;
  return (
    play.result === Result.Complete ||
    play.result === Result.CompleteTd ||
    play.result === Result.Incomplete ||
    play.result === Result.Interception ||
    play.result === Result.Sack
  );
}

function isCompletion(play: PlaylistData): boolean {
  return (
    play.result === Result.Complete || play.result === Result.CompleteTd
  );
}

function isRushAttempt(play: PlaylistData): boolean {
  if (play.odk !== ODK.Offense) return false;
  if (play.playType === PlayType.Run) return jerseyKey(play.rusher) !== null;
  if (play.playType !== "") return false;
  const rusher = jerseyKey(play.rusher);
  if (!rusher) return false;
  if (play.result === Result.Rush || play.result === Result.RushTd) return true;
  return play.result.includes("Fumble");
}

function isTackleForLoss(play: PlaylistData): boolean {
  if (play.odk !== ODK.Defense) return false;
  if (play.result === Result.Sack) return true;
  return play.gainLoss < 0 && play.result === Result.Rush;
}

function maxLong(current: number, candidate: number): number {
  return candidate > current ? candidate : current;
}

function addReturnStats(
  row: MaxPrepsPlayerRow,
  yards: number,
  kind: "punt" | "kickoff",
): void {
  if (yards > 0) {
    row.TotalReturnYards = (row.TotalReturnYards as number) + yards;
  }
  if (kind === "punt") {
    row.PuntReturnNum = (row.PuntReturnNum as number) + 1;
    row.PuntReturnYards = (row.PuntReturnYards as number) + yards;
    row.PuntReturnLong = maxLong(row.PuntReturnLong as number, yards);
  } else {
    row.KickoffReturnNum = (row.KickoffReturnNum as number) + 1;
    row.KickoffReturnYards = (row.KickoffReturnYards as number) + yards;
    row.KickoffReturnLong = maxLong(row.KickoffReturnLong as number, yards);
  }
}

/**
 * Derive per-player MaxPreps box score rows from committed plays (tagging-team perspective).
 */
export function deriveMaxPrepsBoxScoreFromPlays(
  plays: PlaylistData[],
): MaxPrepsPlayerRow[] {
  const map = new Map<string, MaxPrepsPlayerRow>();

  for (const play of plays) {
    if (play.odk === ODK.Offense && isRushAttempt(play)) {
      const row = ensureRow(map, play.rusher);
      const yards = play.gainLoss;
      row.RushingNum = (row.RushingNum as number) + 1;
      row.RushingYards = (row.RushingYards as number) + yards;
      row.RushingLong = maxLong(row.RushingLong as number, yards);
      if (isRushTouchdown(play)) {
        row.RushingTDNum = (row.RushingTDNum as number) + 1;
        row.TotalTDNum = (row.TotalTDNum as number) + 1;
      }
    }

    if (play.odk === ODK.Offense && isPassAttempt(play)) {
      const passerJersey = jerseyKey(play.passer);
      if (!passerJersey) continue;
      const passer = ensureRow(map, play.passer);
      passer.PassingAtt = (passer.PassingAtt as number) + 1;
      if (isCompletion(play)) {
        passer.PassingComp = (passer.PassingComp as number) + 1;
        passer.PassingYards = (passer.PassingYards as number) + play.gainLoss;
        passer.PassingLong = maxLong(
          passer.PassingLong as number,
          play.gainLoss,
        );
      }
      if (play.result === Result.Interception) {
        passer.PassingInt = (passer.PassingInt as number) + 1;
      }
      if (isPassTouchdown(play)) {
        passer.PassingTD = (passer.PassingTD as number) + 1;
      }

      if (isCompletion(play)) {
        const receiver = jerseyKey(play.receiver);
        if (receiver) {
          const row = ensureRow(map, play.receiver);
          row.ReceivingNum = (row.ReceivingNum as number) + 1;
          row.ReceivingYards = (row.ReceivingYards as number) + play.gainLoss;
          row.ReceivingLong = maxLong(row.ReceivingLong as number, play.gainLoss);
          if (isPassTouchdown(play)) {
            row.ReceivingTDNum = (row.ReceivingTDNum as number) + 1;
            row.TotalTDNum = (row.TotalTDNum as number) + 1;
          }
        }
      }
    }

    if (play.odk === ODK.Offense && play.result.includes("Fumble")) {
      const ballCarrier = jerseyKey(play.rusher) ?? jerseyKey(play.passer);
      if (ballCarrier) {
        const row = map.get(ballCarrier) ?? emptyRow(ballCarrier);
        map.set(ballCarrier, row);
        row.OffensiveFumbles = (row.OffensiveFumbles as number) + 1;
        if (
          play.result.includes("Lost") ||
          play.recoveredBy.jersey.trim() !== ""
        ) {
          row.OffensiveFumblesLost = (row.OffensiveFumblesLost as number) + 1;
        }
      }
    }

    if (play.odk === ODK.Defense) {
      const t1 = jerseyKey(play.tackler1);
      const t2 = jerseyKey(play.tackler2);
      if (t1) {
        const row = ensureRow(map, play.tackler1);
        row.Tackles = (row.Tackles as number) + 1;
      }
      if (t2) {
        const row = ensureRow(map, play.tackler2);
        row.Assists = (row.Assists as number) + 1;
      }
      if (isTackleForLoss(play)) {
        const credit = t1 ?? t2;
        if (credit) {
          const row = map.get(credit) ?? emptyRow(credit);
          map.set(credit, row);
          row.TacklesForLoss = (row.TacklesForLoss as number) + 1;
        }
      }
      if (play.result === Result.Sack) {
        const credit = t1 ?? t2;
        if (credit) {
          const row = map.get(credit) ?? emptyRow(credit);
          map.set(credit, row);
          row.Sacks = (row.Sacks as number) + 1;
          row.SacksYardsLost = (row.SacksYardsLost as number) + Math.abs(
            play.gainLoss,
          );
        }
      }
      const interceptor = jerseyKey(play.interceptedBy);
      if (interceptor && play.result === Result.Interception) {
        const row = ensureRow(map, play.interceptedBy);
        row.INTs = (row.INTs as number) + 1;
        const returnYards = play.returnYards ?? 0;
        row.INTYards = (row.INTYards as number) + returnYards;
        if (isReturnTouchdown(play)) {
          row.IntReturnedTDNum = (row.IntReturnedTDNum as number) + 1;
          row.TotalTDNum = (row.TotalTDNum as number) + 1;
        }
      }
      const recoverer = jerseyKey(play.recoveredBy);
      if (recoverer && play.result.includes("Fumble")) {
        const row = ensureRow(map, play.recoveredBy);
        row.FumbleRecoveries = (row.FumbleRecoveries as number) + 1;
        row.FumbleRecoveryYards =
          (row.FumbleRecoveryYards as number) + (play.returnYards ?? 0);
      }
    }

    if (play.playType === PlayType.Punt && play.odk === ODK.Offense) {
      const kickerJersey = jerseyKey(play.kicker);
      if (!kickerJersey) continue;
      const row = ensureRow(map, play.kicker);
      row.PuntNum = (row.PuntNum as number) + 1;
      const yards = play.kickYards ?? Math.abs(play.gainLoss);
      row.PuntYards = (row.PuntYards as number) + yards;
      row.PuntLong = maxLong(row.PuntLong as number, yards);
    }

    if (play.playType === PlayType.Kickoff && play.odk === ODK.Offense) {
      const kickerJersey = jerseyKey(play.kicker);
      if (!kickerJersey) continue;
      const row = ensureRow(map, play.kicker);
      row.KickoffNum = (row.KickoffNum as number) + 1;
      const yards = play.kickYards ?? 0;
      row.KickoffYards = (row.KickoffYards as number) + yards;
      row.KickoffLong = maxLong(row.KickoffLong as number, yards);
      if (play.result === Result.Touchback) {
        row.KickoffTouchbacks = (row.KickoffTouchbacks as number) + 1;
      }
    }

    if (play.playType === PlayType.FieldGoal && play.odk === ODK.Offense) {
      const kickerJersey = jerseyKey(play.kicker);
      if (!kickerJersey) continue;
      const row = ensureRow(map, play.kicker);
      row.FGAttempted = (row.FGAttempted as number) + 1;
      const kickYards = play.kickYards ?? 0;
      row.FGLong = maxLong(row.FGLong as number, kickYards);
      if (play.result === Result.Good) {
        row.FGMade = (row.FGMade as number) + 1;
      }
    }

    if (play.playType === PlayType.ExtraPoint && play.odk === ODK.Offense) {
      if (play.result === Result.Good) {
        const kickerJersey = jerseyKey(play.kicker);
        const rusherJersey = jerseyKey(play.rusher);
        if (kickerJersey) {
          const row = ensureRow(map, play.kicker);
          row.PATKickingAtt = (row.PATKickingAtt as number) + 1;
          row.PATKickingMade = (row.PATKickingMade as number) + 1;
          row.PATKickingPoints = (row.PATKickingPoints as number) + 1;
        } else if (rusherJersey) {
          const row = ensureRow(map, play.rusher);
          row.PATRushingNum = (row.PATRushingNum as number) + 1;
          row.TotalConversionPoints = (row.TotalConversionPoints as number) + 1;
        }
      } else if (play.result === Result.NoGood && jerseyKey(play.kicker)) {
        const row = ensureRow(map, play.kicker);
        row.PATKickingAtt = (row.PATKickingAtt as number) + 1;
      }
    }

    if (play.playType === PlayType.TwoPoint && play.odk === ODK.Offense) {
      if (play.result === Result.Good) {
        const rusher = jerseyKey(play.rusher);
        const receiver = jerseyKey(play.receiver);
        if (rusher) {
          const row = ensureRow(map, play.rusher);
          row.PATRushingNum = (row.PATRushingNum as number) + 1;
          row.TotalConversionPoints = (row.TotalConversionPoints as number) + 2;
        } else if (receiver) {
          const row = ensureRow(map, play.receiver);
          row.PATReceivingNum = (row.PATReceivingNum as number) + 1;
          row.TotalConversionPoints = (row.TotalConversionPoints as number) + 2;
        }
      }
    }

    if (
      play.playType === PlayType.PuntReceive ||
      play.playType === PlayType.KickoffReceive
    ) {
      const returner = jerseyKey(play.returner);
      if (returner) {
        const row = ensureRow(map, play.returner);
        const yards = play.returnYards ?? play.gainLoss;
        addReturnStats(
          row,
          yards,
          play.playType === PlayType.PuntReceive ? "punt" : "kickoff",
        );
        if (isReturnTouchdown(play)) {
          if (play.playType === PlayType.PuntReceive) {
            row.PuntReturnedTDNum = (row.PuntReturnedTDNum as number) + 1;
          } else {
            row.KickoffReturnedTDNum = (row.KickoffReturnedTDNum as number) + 1;
          }
          row.TotalTDNum = (row.TotalTDNum as number) + 1;
        }
      }
    }

    if (play.result === Result.Safety || play.completion?.includes("end:SA")) {
      const credit = jerseyKey(play.tackler1) ?? jerseyKey(play.tackler2);
      if (credit && play.odk === ODK.Defense) {
        const row = map.get(credit) ?? emptyRow(credit);
        map.set(credit, row);
        row.Safeties = (row.Safeties as number) + 1;
      }
    }
  }

  for (const row of map.values()) {
    row.TotalTackles =
      (row.Tackles as number) + (row.Assists as number);
    if (!row.TotalTDNum) {
      row.TotalTDNum =
        (row.RushingTDNum as number) +
        (row.ReceivingTDNum as number) +
        (row.FumbleReturnedTDNum as number) +
        (row.IntReturnedTDNum as number) +
        (row.PuntReturnedTDNum as number) +
        (row.KickoffReturnedTDNum as number);
    }
  }

  return [...map.values()]
    .filter((row) => hasAnyStat(row))
    .sort((a, b) => compareJersey(String(a.Jersey), String(b.Jersey)));
}

function hasAnyStat(row: MaxPrepsPlayerRow): boolean {
  for (const col of MAXPREPS_FOOTBALL_COLUMNS) {
    if (col === "Jersey") continue;
    const val = row[col];
    if (typeof val === "number" && val !== 0) return true;
  }
  return false;
}

function compareJersey(a: string, b: string): number {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

/** Parse a Hudl/MaxPreps pipe-delimited export for fixture tests. */
export function parseMaxPrepsTxt(text: string): MaxPrepsPlayerRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0]!.split("|");
  return lines.slice(1).map((line) => {
    const cells = line.split("|");
    const row = emptyRow(cells[0] ?? "");
    for (let i = 0; i < header.length; i++) {
      const col = header[i] as MaxPrepsFootballColumn;
      if (!MAXPREPS_FOOTBALL_COLUMNS.includes(col)) continue;
      const raw = cells[i] ?? "";
      row[col] = raw === "" ? 0 : Number.isNaN(Number(raw)) ? raw : Number(raw);
    }
    return row;
  });
}

function formatCell(value: number | string): string {
  if (value === 0 || value === "") return "";
  return String(value);
}

/** Serialize MaxPreps rows to Hudl-compatible pipe-delimited `.txt`. */
export function serializeMaxPrepsTxt(rows: MaxPrepsPlayerRow[]): string {
  const header = MAXPREPS_FOOTBALL_COLUMNS.join("|");
  const body = rows.map((row) =>
    MAXPREPS_FOOTBALL_COLUMNS.map((col) => formatCell(row[col])).join("|"),
  );
  return [header, ...body].join("\n") + "\n";
}

/** Parse partial PlaylistData CSV (23-col Hudl export without QTR / PLAY TYPE). */
export function parsePartialPlaylistCsv(
  text: string,
  team: string,
): PlaylistData[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]!);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  function cell(row: string[], name: string): string {
    const i = idx[name];
    return i === undefined ? "" : (row[i] ?? "").trim();
  }

  function ref(row: string[], jerseyCol: string, nameCol: string): PlayerRef {
    return {
      jersey: cell(row, jerseyCol),
      name: cell(row, nameCol),
    };
  }

  return lines.slice(1).map((line) => {
    const row = parseCsvLine(line);
    const gnRaw = cell(row, "GN/LS");
    const retRaw = cell(row, "RET YARDS");
    const result = cell(row, "RESULT") as PlaylistData["result"];
    const odk = cell(row, "ODK") as PlaylistData["odk"];

    let playType = "" as PlaylistData["playType"];
    if (odk === ODK.Kicking || result === Result.Touchback) {
      playType = PlayType.Kickoff;
    } else if (result === Result.Rush || result === Result.RushTd) {
      playType = PlayType.Run;
    } else if (result === Result.Good || result === Result.NoGood) {
      playType = PlayType.ExtraPoint;
    } else if (
      result === Result.Complete ||
      result === Result.CompleteTd ||
      result === Result.Incomplete ||
      result === Result.Interception ||
      result === Result.Sack
    ) {
      playType = PlayType.Pass;
    }

    return {
      playNumber: Number(cell(row, "PLAY #")),
      quarter: 1,
      odk,
      yardLine: Number(cell(row, "YARD LN")) as PlaylistData["yardLine"],
      down: Number(cell(row, "DN")),
      distance: Number(cell(row, "DIST") || "0"),
      hash: cell(row, "HASH") as PlaylistData["hash"],
      gainLoss: gnRaw === "" ? 0 : Number(gnRaw),
      passer: ref(row, "PASSER_Jersey", "PASSER_Name"),
      receiver: ref(row, "RECEIVER_Jersey", "RECEIVER_Name"),
      rusher: ref(row, "RUSHER_Jersey", "RUSHER_Name"),
      result,
      team: cell(row, "TEAM") || team,
      tackler1: ref(row, "TACKLER1_Jersey", "TACKLER1_Name"),
      tackler2: ref(row, "TACKLER2_Jersey", "TACKLER2_Name"),
      recoveredBy: ref(row, "RECOVERED BY_Jersey", "RECOVERED BY_Name"),
      returnYards: retRaw === "" ? undefined : Number(retRaw),
      returner: ref(row, "RETURNER_Jersey", "RETURNER_Name"),
      playType,
      kicker: { jersey: "", name: "" },
      interceptedBy: { jersey: "", name: "" },
    } satisfies PlaylistData;
  });
}

export function maxPrepsRowEquals(
  actual: MaxPrepsPlayerRow,
  expected: MaxPrepsPlayerRow,
  fields: MaxPrepsFootballColumn[],
): boolean {
  return fields.every((field) => actual[field] === expected[field]);
}
