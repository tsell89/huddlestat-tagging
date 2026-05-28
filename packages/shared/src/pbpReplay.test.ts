import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { listGameIds, loadGameMeta, loadGamePlays } from "./pbp/loadGame.js";
import {
  formatReplayFailures,
  replayChainMismatches,
} from "./pbp/replay.js";

describe("pbp replay chain", () => {
  for (const gameId of listGameIds()) {
    test(`game ${gameId}: nextDraftAfterPlay matches next snap`, () => {
      const meta = loadGameMeta(gameId);
      const plays = loadGamePlays(gameId);
      assert.ok(plays.length >= 2, "need at least 2 plays");

      const mismatches = replayChainMismatches(plays, meta);
      assert.equal(
        mismatches.length,
        0,
        formatReplayFailures(mismatches),
      );
    });
  }
});
