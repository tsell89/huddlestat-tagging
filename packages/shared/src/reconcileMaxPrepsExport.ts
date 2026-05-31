import { PlayType } from "./constants.js";
import {
  derivePuntEndPosition,
  isExcludedPunt,
  isPuntInside20,
} from "./specialTeamsCredits.js";
import type { PlaylistData } from "./index.js";
import {
  MAXPREPS_FOOTBALL_COLUMNS,
  type MaxPrepsFootballColumn,
  type MaxPrepsPlayerRow,
} from "./maxPrepsBoxScore.js";

export type MaxPrepsFieldDelta = {
  jersey: string;
  field: MaxPrepsFootballColumn;
  derived: number | string;
  golden: number | string;
};

export type MaxPrepsSuspectPlay = {
  playNumber: number;
  reason: string;
  field?: MaxPrepsFootballColumn;
};

export type MaxPrepsReconciliationReport = {
  deltas: MaxPrepsFieldDelta[];
  suspectPlays: MaxPrepsSuspectPlay[];
};

const KICKING_FIELDS: MaxPrepsFootballColumn[] = [
  "PuntNum",
  "PuntYards",
  "PuntLong",
  "PuntInside20",
  "KickoffNum",
  "KickoffYards",
  "KickoffLong",
  "KickoffTouchbacks",
  "FGMade",
  "FGAttempted",
  "FGLong",
  "PATKickingMade",
  "PATKickingAtt",
  "PATKickingPoints",
];

function rowByJersey(
  rows: MaxPrepsPlayerRow[],
  jersey: string,
): MaxPrepsPlayerRow | undefined {
  return rows.find((r) => String(r.Jersey) === jersey);
}

function suspectPlaysForPuntInside20(
  plays: PlaylistData[],
  jersey: string,
  goldenInside: number,
): MaxPrepsSuspectPlay[] {
  const suspects: MaxPrepsSuspectPlay[] = [];
  const punts = plays.filter(
    (p) =>
      p.playType === PlayType.Punt &&
      p.kicker.jersey.trim() === jersey &&
      !isExcludedPunt(p),
  );

  for (const play of punts) {
    const endPos = derivePuntEndPosition(play);
    const counts = isPuntInside20(play);
    if (counts) {
      suspects.push({
        playNumber: play.playNumber,
        field: "PuntInside20",
        reason: `Counts inside-20 under HuddleStat rules (end position ${endPos ?? "unknown"})`,
      });
    } else if (endPos !== null && endPos >= 80 && endPos < 81) {
      suspects.push({
        playNumber: play.playNumber,
        field: "PuntInside20",
        reason: `Excluded — end position ${endPos} (on the 20; golden may count, strict 81+ required)`,
      });
    } else if (endPos !== null && endPos >= 81 && !counts) {
      suspects.push({
        playNumber: play.playNumber,
        field: "PuntInside20",
        reason: `Borderline — end position ${endPos} but not credited (result ${play.result})`,
      });
    }
  }

  if (goldenInside > punts.filter(isPuntInside20).length) {
    const excluded = suspects.filter((s) => s.reason.includes("Excluded"));
    if (excluded.length === 0 && punts.length > 0) {
      suspects.push({
        playNumber: punts[0]!.playNumber,
        field: "PuntInside20",
        reason: `Golden PuntInside20=${goldenInside} exceeds derived; review punt end spots`,
      });
    }
  }

  return suspects;
}

/**
 * Compare derived MaxPreps rows to a golden Hudl `.txt` fixture — report only, never throw (B11).
 *
 * **Scope:** CI / fixture validation (`derived !== golden` suspects). Not a Friday
 * `unofficial_friday` vs Saturday Hudl official diff product (C9 — Hudl wins).
 */
export function reconcileMaxPrepsExport(
  derived: MaxPrepsPlayerRow[],
  golden: MaxPrepsPlayerRow[],
  plays: PlaylistData[],
): MaxPrepsReconciliationReport {
  const deltas: MaxPrepsFieldDelta[] = [];
  const suspectPlays: MaxPrepsSuspectPlay[] = [];

  const jerseys = new Set<string>();
  for (const row of [...derived, ...golden]) {
    jerseys.add(String(row.Jersey));
  }

  for (const jersey of jerseys) {
    const dRow = rowByJersey(derived, jersey);
    const gRow = rowByJersey(golden, jersey);
    if (!dRow || !gRow) continue;

    for (const field of KICKING_FIELDS) {
      const derivedVal = dRow[field] ?? 0;
      const goldenVal = gRow[field] ?? 0;
      if (derivedVal !== goldenVal) {
        deltas.push({ jersey, field, derived: derivedVal, golden: goldenVal });
        if (field === "PuntInside20") {
          suspectPlays.push(
            ...suspectPlaysForPuntInside20(
              plays,
              jersey,
              goldenVal as number,
            ),
          );
        }
      }
    }
  }

  return { deltas, suspectPlays };
}

/** All numeric MaxPreps columns (for optional full diff). */
export function allMaxPrepsNumericFields(): MaxPrepsFootballColumn[] {
  return MAXPREPS_FOOTBALL_COLUMNS.filter((c) => c !== "Jersey");
}
