import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { checkPlayInvariants } from "./pbp/invariants.js";
import { listGameIds, loadGamePlays } from "./pbp/loadGame.js";
import { listScenarioNames, loadScenario } from "./pbp/loadScenario.js";

describe("pbp invariants", () => {
  for (const gameId of listGameIds()) {
    test(`game ${gameId}`, () => {
      const plays = loadGamePlays(gameId);
      const violations = plays.flatMap((p) => checkPlayInvariants(p));
      assert.equal(
        violations.length,
        0,
        violations.map((v) => `#${v.playNumber} ${v.rule}: ${v.detail}`).join("\n"),
      );
    });
  }

  for (const name of listScenarioNames()) {
    test(`scenario ${name}`, () => {
      const { plays } = loadScenario(name);
      const violations = plays.flatMap((p) => checkPlayInvariants(p));
      assert.equal(violations.length, 0);
    });
  }
});
