import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { headerPhaseLabel, phaseAdvanceAction } from "./phaseAdvance";

describe("headerPhaseLabel", () => {
  test("returns one label per phase", () => {
    assert.equal(headerPhaseLabel("Q1"), "Q1");
    assert.equal(headerPhaseLabel("HALFTIME"), "Halftime");
    assert.equal(headerPhaseLabel("OT"), "OT");
  });
});

describe("phaseAdvanceAction", () => {
  test("steps Q1 → Q2 → halftime → Q3 → Q4", () => {
    assert.deepEqual(phaseAdvanceAction("Q1", 0, 0), {
      label: "Go to 2nd quarter",
      nextPhase: "Q2",
    });
    assert.deepEqual(phaseAdvanceAction("Q2", 7, 0), {
      label: "Go to halftime",
      nextPhase: "HALFTIME",
    });
    assert.deepEqual(phaseAdvanceAction("HALFTIME", 7, 0), {
      label: "Start 2nd half",
      nextPhase: "Q3",
    });
    assert.deepEqual(phaseAdvanceAction("Q3", 14, 7), {
      label: "Go to 4th quarter",
      nextPhase: "Q4",
    });
  });

  test("Q4 tied offers OT; not tied ends game", () => {
    assert.deepEqual(phaseAdvanceAction("Q4", 14, 14), {
      label: "Start overtime",
      nextPhase: "OT",
    });
    assert.deepEqual(phaseAdvanceAction("Q4", 21, 14), {
      label: "End game",
      nextPhase: "FINAL",
    });
  });

  test("hides advance in OT and FINAL", () => {
    assert.equal(phaseAdvanceAction("OT", 21, 21), null);
    assert.equal(phaseAdvanceAction("FINAL", 21, 14), null);
  });
});
