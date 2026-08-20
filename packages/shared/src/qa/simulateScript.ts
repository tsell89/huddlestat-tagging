import {
  nextDraftAfterPlay,
  type PlaylistData,
} from "../index.js";
import { padClassForPlay, type PadClass } from "../pbp/padClass.js";
import {
  formatReplayFailures,
  replayChainMismatches,
} from "../pbp/replay.js";
import { listGameIds, loadGameMeta, loadGamePlays } from "../pbp/loadGame.js";
import type { PbpGameMeta, ReplayMismatch } from "../pbp/types.js";

export type ScriptCheckpoint = {
  afterPlayNumber: number;
  expect: Partial<
    Pick<PlaylistData, "down" | "distance" | "yardLine" | "odk" | "playType">
  > & { padClass?: PadClass };
};

export type SimulateScriptResult = {
  gameId: string;
  plays: PlaylistData[];
  meta: PbpGameMeta;
  chainMismatches: ReplayMismatch[];
  checkpointFailures: string[];
  finalDraft: PlaylistData | null;
  ok: boolean;
};

/** Checkpoints for iPad QA script games (docs/ipad-qa-play-scripts.md). */
export const QA_SCRIPT_CHECKPOINTS: Record<string, ScriptCheckpoint[]> = {
  "qa-script-a": [
    {
      afterPlayNumber: 6,
      expect: {
        playType: "KO",
        odk: "K",
        yardLine: -40,
        down: 0,
        distance: 0,
        padClass: "kickoff",
      },
    },
  ],
  "qa-script-b": [
    {
      afterPlayNumber: 1,
      expect: { playType: "Extra Pt.", odk: "O", padClass: "scoring" },
    },
    {
      afterPlayNumber: 2,
      expect: {
        playType: "KO",
        odk: "K",
        yardLine: -40,
        padClass: "kickoff",
      },
    },
  ],
  "qa-script-b-xp-miss": [
    {
      afterPlayNumber: 2,
      expect: {
        playType: "KO",
        odk: "K",
        yardLine: -40,
        padClass: "kickoff",
      },
    },
  ],
  "qa-script-d": [
    {
      afterPlayNumber: 1,
      expect: { playType: "Extra Pt.", odk: "O", padClass: "scoring" },
    },
    {
      afterPlayNumber: 2,
      expect: { playType: "KO", odk: "K", padClass: "kickoff" },
    },
  ],
  "qa-script-e": [
    {
      afterPlayNumber: 1,
      expect: {
        playType: "Punt Rec",
        odk: "D",
        down: 1,
        distance: 10,
        padClass: "punt",
      },
    },
  ],
};

export function listQaScriptGameIds(): string[] {
  return listGameIds().filter((id) => id.startsWith("qa-script-"));
}

export function simulateScript(
  plays: PlaylistData[],
  meta: PbpGameMeta,
  checkpoints: ScriptCheckpoint[] = [],
): SimulateScriptResult {
  const chainMismatches = replayChainMismatches(plays, meta, 50);
  const checkpointFailures: string[] = [];

  for (const cp of checkpoints) {
    const play = plays.find((p) => p.playNumber === cp.afterPlayNumber);
    if (!play) {
      checkpointFailures.push(
        `checkpoint after #${cp.afterPlayNumber}: play missing`,
      );
      continue;
    }
    const draft = nextDraftAfterPlay(
      play,
      play.playNumber + 1,
      meta.teamOffense,
      { rules: meta.rules, overtime: meta.overtime },
    );
    for (const [key, expected] of Object.entries(cp.expect)) {
      if (key === "padClass") {
        const actual = padClassForPlay(draft);
        if (actual !== expected) {
          checkpointFailures.push(
            `after #${cp.afterPlayNumber}: padClass expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
          );
        }
        continue;
      }
      const actual = draft[key as keyof PlaylistData];
      if (actual !== expected) {
        checkpointFailures.push(
          `after #${cp.afterPlayNumber}: ${key} expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`,
        );
      }
    }
  }

  const last = plays.at(-1) ?? null;
  const finalDraft = last
    ? nextDraftAfterPlay(last, last.playNumber + 1, meta.teamOffense, {
        rules: meta.rules,
        overtime: meta.overtime,
      })
    : null;

  return {
    gameId: meta.gameId,
    plays,
    meta,
    chainMismatches,
    checkpointFailures,
    finalDraft,
    ok: chainMismatches.length === 0 && checkpointFailures.length === 0,
  };
}

export function simulateScriptById(gameId: string): SimulateScriptResult {
  const meta = loadGameMeta(gameId);
  const plays = loadGamePlays(gameId);
  const checkpoints = QA_SCRIPT_CHECKPOINTS[gameId] ?? [];
  return simulateScript(plays, meta, checkpoints);
}

export function formatSimulateFailures(result: SimulateScriptResult): string {
  const parts: string[] = [];
  if (result.chainMismatches.length) {
    parts.push(formatReplayFailures(result.chainMismatches));
  }
  if (result.checkpointFailures.length) {
    parts.push(result.checkpointFailures.join("\n"));
  }
  return parts.join("\n");
}
