import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { loadScenario, listScenarioNames } from "./pbp/loadScenario.js";
import {
  formatReplayFailures,
  replayChainMismatches,
} from "./pbp/replay.js";

describe("pbp scenarios", () => {
  for (const name of listScenarioNames()) {
    test(`scenario ${name}: replay chain`, () => {
      const { meta, plays } = loadScenario(name);
      assert.ok(plays.length >= 2);
      const mismatches = replayChainMismatches(plays, meta);
      assert.equal(
        mismatches.length,
        0,
        formatReplayFailures(mismatches),
      );
    });
  }
});
