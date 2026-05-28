import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { catchUpHintMessage, isQuarterBreakHint } from "./catchUpHint.js";

describe("catchUpHintMessage", () => {
  test("returns null for null hint", () => {
    assert.equal(catchUpHintMessage(null), null);
  });

  test("quarter and halftime copy", () => {
    assert.match(catchUpHintMessage("quarter-review-q1")!, /End of Q1/);
    assert.match(catchUpHintMessage("quarter-review-q2")!, /Halftime/);
    assert.match(catchUpHintMessage("halftime-kickoff")!, /2H kickoff @ Own 40/);
    assert.match(catchUpHintMessage("quarter-review-q4")!, /End of Q4/);
  });
});

describe("isQuarterBreakHint", () => {
  test("generic catch-up is not a quarter break", () => {
    assert.equal(isQuarterBreakHint("generic"), false);
    assert.equal(isQuarterBreakHint(null), false);
  });

  test("quarter and halftime hints are quarter breaks", () => {
    assert.equal(isQuarterBreakHint("quarter-review-q1"), true);
    assert.equal(isQuarterBreakHint("halftime-kickoff"), true);
  });
});
