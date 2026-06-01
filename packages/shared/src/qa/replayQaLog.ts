import { readFileSync } from "node:fs";
import {
  nextDraftAfterPlay,
  playlistDataSchema,
  type GamePhase,
  type PlaylistData,
} from "../index.js";
import { padClassMatches } from "../pbp/padClass.js";
import { replayChainMismatches, formatReplayFailures } from "../pbp/replay.js";
import type { PbpGameMeta } from "../pbp/types.js";

export type QaLogLine = Record<string, unknown> & { type?: string };

export type QaReplayDrift = {
  afterPlayNumber: number;
  field: string;
  logged: unknown;
  currentChain: unknown;
};

export type QaReplayReport = {
  file: string;
  session: QaLogLine | null;
  saveCount: number;
  plays: PlaylistData[];
  chainMismatches: ReturnType<typeof replayChainMismatches>;
  drift: QaReplayDrift[];
};

const SITUATION_FIELDS = ["down", "distance", "yardLine", "odk"] as const;

function parseJsonl(text: string): QaLogLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as QaLogLine);
}

function parseSavedPlay(raw: unknown): PlaylistData | null {
  if (!raw || typeof raw !== "object") return null;
  try {
    return playlistDataSchema.parse(raw);
  } catch {
    return null;
  }
}

function metaFromSession(session: QaLogLine | null): PbpGameMeta {
  const team =
    typeof session?.teamCode === "string" ? session.teamCode : "TEAM_A";
  const phase = session?.phaseAfter;
  const overtime =
    phase === "OT" ||
    (typeof session?.gameSlug === "string" && session.gameSlug.includes("ot"));
  return {
    gameId:
      typeof session?.gameSlug === "string"
        ? `qa-${session.gameSlug}`
        : "qa-device",
    teamOffense: team,
    teamDefense: "OPP",
    rules: "HS",
    overtime: Boolean(overtime),
    source: "hand",
    redacted: false,
    periods: 4,
  };
}

/** Compare logged nextDraft at save time vs fresh nextDraftAfterPlay today. */
export function driftFromQaLog(lines: QaLogLine[]): QaReplayDrift[] {
  const drift: QaReplayDrift[] = [];
  for (const line of lines) {
    if (line.type !== "save") continue;
    const saved = parseSavedPlay(line.savedPlay);
    const loggedNext = parseSavedPlay(line.nextDraft);
    if (!saved || !loggedNext) continue;

    const phaseAfter = line.phaseAfter as GamePhase | undefined;
    const overtime = phaseAfter === "OT";
    const team =
      typeof saved.team === "string" && saved.team ? saved.team : "TEAM_A";
    const current = nextDraftAfterPlay(
      saved,
      loggedNext.playNumber,
      team,
      { rules: "HS", overtime },
    );

    for (const field of SITUATION_FIELDS) {
      if (current[field] !== loggedNext[field]) {
        drift.push({
          afterPlayNumber: saved.playNumber,
          field,
          logged: loggedNext[field],
          currentChain: current[field],
        });
      }
    }

    if (!padClassMatches(current, loggedNext)) {
      drift.push({
        afterPlayNumber: saved.playNumber,
        field: "padClass",
        logged: `${loggedNext.playType}/${loggedNext.odk}`,
        currentChain: `${current.playType}/${current.odk}`,
      });
    }
  }
  return drift;
}

export function replayQaLogFile(filePath: string): QaReplayReport {
  const text = readFileSync(filePath, "utf8");
  const lines = parseJsonl(text);
  const session =
    lines.find((line) => line.type === "session") ?? null;
  const saves = lines.filter((line) => line.type === "save");
  const plays = saves
    .map((line) => parseSavedPlay(line.savedPlay))
    .filter((p): p is PlaylistData => p !== null)
    .sort((a, b) => a.playNumber - b.playNumber);

  const meta = metaFromSession(session);
  const chainMismatches =
    plays.length >= 2 ? replayChainMismatches(plays, meta, 20) : [];
  const drift = driftFromQaLog(lines);

  return {
    file: filePath,
    session,
    saveCount: saves.length,
    plays,
    chainMismatches,
    drift,
  };
}

export function formatQaReplayReport(report: QaReplayReport): string {
  const parts: string[] = [
    `QA replay: ${report.file}`,
    `Saves: ${report.saveCount} · Plays extracted: ${report.plays.length}`,
  ];
  if (report.session?.gameSlug) {
    parts.push(`Game: ${String(report.session.gameSlug)}`);
  }
  if (report.chainMismatches.length === 0 && report.drift.length === 0) {
    parts.push("OK — chain replay and logged next-draft both match.");
    return parts.join("\n");
  }
  if (report.chainMismatches.length > 0) {
    parts.push(
      "Chain replay mismatches (saved plays vs nextDraftAfterPlay):",
      formatReplayFailures(report.chainMismatches),
    );
  }
  if (report.drift.length > 0) {
    parts.push(
      "Drift vs log (chain today ≠ nextDraft logged on device at save time):",
      ...report.drift.map(
        (d) =>
          `after play #${d.afterPlayNumber}: ${d.field} logged ${JSON.stringify(d.logged)} now ${JSON.stringify(d.currentChain)}`,
      ),
    );
  }
  return parts.join("\n");
}
