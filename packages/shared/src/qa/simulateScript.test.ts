import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { listGameIds } from "../pbp/loadGame.js";
import {
  formatSimulateFailures,
  listQaScriptGameIds,
  simulateScriptById,
} from "./simulateScript.js";

describe("qa script simulate", () => {
  for (const id of listQaScriptGameIds()) {
    test(`${id}: chain + checkpoints`, () => {
      const result = simulateScriptById(id);
      assert.equal(
        result.ok,
        true,
        formatSimulateFailures(result) || "unknown failure",
      );
    });
  }

  test("qa-full-regulation: expanded corpus chain", () => {
    assert.ok(listGameIds().includes("qa-full-regulation"));
    const result = simulateScriptById("qa-full-regulation");
    assert.equal(
      result.ok,
      true,
      formatSimulateFailures(result) || "unknown failure",
    );
    assert.ok(result.plays.length >= 20, "full game should be a long slice");
  });
});
