/**
 * Pure lifecycle simulation for defending-end flips across a regulation game.
 * Complements unit tests in defendingEnd.test.ts — mirrors applyPhaseChange
 * geometry without SQLite / React Native.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  defendingEndAfterQuarterBreak,
  mathRatioFromOriented,
  orientedRatio,
  secondHalfDefendingEndFromOpening,
  type DefendingEnd,
} from "./defendingEnd.js";

/** Simulate opening → Q2 flip → Q3 restore → Q4 flip (docs/handoff-switching-ends.md). */
function simulateRegulationEnds(opening: DefendingEnd): DefendingEnd[] {
  const q1 = opening;
  const q2 = defendingEndAfterQuarterBreak("Q1", "Q2", q1)!;
  const q3 = secondHalfDefendingEndFromOpening(opening);
  const q4 = defendingEndAfterQuarterBreak("Q3", "Q4", q3)!;
  return [q1, q2, q3, q4];
}

describe("defending-end regulation lifecycle (ends switching)", () => {
  test("opening left → Q2 right → Q3 left → Q4 right", () => {
    assert.deepEqual(simulateRegulationEnds("left"), [
      "left",
      "right",
      "left",
      "right",
    ]);
  });

  test("opening right → Q2 left → Q3 right → Q4 left", () => {
    assert.deepEqual(simulateRegulationEnds("right"), [
      "right",
      "left",
      "right",
      "left",
    ]);
  });

  test("HALFTIME→Q3 default matches opening, not opposite of Q2", () => {
    const opening: DefendingEnd = "right";
    const q2 = defendingEndAfterQuarterBreak("Q1", "Q2", opening)!;
    assert.equal(q2, "left");
    assert.equal(secondHalfDefendingEndFromOpening(opening), opening);
    assert.notEqual(secondHalfDefendingEndFromOpening(opening), q2);
  });

  test("Q2→HALFTIME and Q4→OT do not auto-flip", () => {
    assert.equal(defendingEndAfterQuarterBreak("Q2", "HALFTIME", "right"), null);
    assert.equal(defendingEndAfterQuarterBreak("Q4", "OT", "left"), null);
  });
});

describe("slider mirror under defend-right (Own/Opp labels unchanged)", () => {
  test("Own-side math ratio 0 displays on device right when defending right", () => {
    assert.equal(orientedRatio(0, "right"), 1);
    assert.equal(orientedRatio(1, "right"), 0);
  });

  test("drag on device-left under defend-right commits Opp math (ratio 1)", () => {
    // Device left = displayRatio 0 → mathRatio 1 when mirrored
    assert.equal(mathRatioFromOriented(0, "right"), 1);
    assert.equal(mathRatioFromOriented(1, "right"), 0);
  });

  test("flip mid-drive does not change stored Hudl math — only display", () => {
    const mathOwn5 = 0.05; // approximate Own 5 on 0–1 axis
    const displayLeft = orientedRatio(mathOwn5, "left");
    const displayRight = orientedRatio(mathOwn5, "right");
    assert.notEqual(displayLeft, displayRight);
    assert.ok(
      Math.abs(mathRatioFromOriented(displayRight, "right") - mathOwn5) < 1e-12,
    );
  });
});
