import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PlayType,
  Result,
  defaultOffensivePlay,
  defaultPuntReceivePlay,
} from "@huddlestat/shared";
import {
  applyPuntSpotsToDraft,
  computeReturnYards,
  defaultPuntSpots,
  initPuntSpotsFromDraft,
  isPuntSpotPlayType,
} from "./puntReturn.js";

const TEAM = "WHS";

describe("isPuntSpotPlayType", () => {
  test("includes Punt and PuntReceive", () => {
    assert.equal(isPuntSpotPlayType(PlayType.Punt), true);
    assert.equal(isPuntSpotPlayType(PlayType.PuntReceive), true);
    assert.equal(isPuntSpotPlayType(PlayType.Kickoff), false);
  });
});

describe("Punt Rec spot persistence", () => {
  test("applyPuntSpotsToDraft persists return spots on PuntReceive", () => {
    const draft = {
      ...defaultPuntReceivePlay(5, TEAM),
      result: Result.Return,
      yardLine: -40,
    };
    const spots = defaultPuntSpots(draft.yardLine);
    const saved = applyPuntSpotsToDraft(draft, spots);
    assert.ok(saved.spotEncoding?.startsWith("recv:"));
    assert.equal(typeof saved.returnYards, "number");
    assert.equal(typeof saved.gainLoss, "number");
  });

  test("initPuntSpotsFromDraft restores PuntReceive return encoding", () => {
    const draft = {
      ...defaultPuntReceivePlay(5, TEAM),
      result: Result.Return,
      yardLine: -40,
      spotEncoding: "recv:-5|end:-25",
      returnYards: 20,
      gainLoss: 15,
    };
    const spots = initPuntSpotsFromDraft(draft);
    assert.equal(spots.returnSpots.receivedAt, -5);
    assert.deepEqual(spots.returnSpots.returnEnd, {
      kind: "yardline",
      yardLine: -25,
    });
  });

  test("applyPuntSpotsToDraft still works for kicking-team Punt", () => {
    const draft = {
      ...defaultOffensivePlay(5, TEAM),
      playType: PlayType.Punt,
      result: Result.Downed,
      yardLine: -35,
      down: 4,
      distance: 8,
    };
    const spots = defaultPuntSpots(draft.yardLine);
    const saved = applyPuntSpotsToDraft(draft, spots);
    assert.ok(saved.spotEncoding?.startsWith("end:"));
  });
});

describe("computeReturnYards with end zone starting spots", () => {
  test("catch in own end zone (0) returned for TD is 100 yards", () => {
    assert.equal(computeReturnYards(0, { kind: "touchdown" }), 100);
  });

  test("catch in own end zone (0) returned to Own 20 (-20) is 20 yards", () => {
    assert.equal(computeReturnYards(0, { kind: "yardline", yardLine: -20 }), 20);
  });

  test("catch in own end zone (0) tackled for safety is 0 yards", () => {
    assert.equal(computeReturnYards(0, { kind: "safety" }), 0);
  });

  test("catch at Own 5 (-5) returned for TD is 95 yards", () => {
    assert.equal(computeReturnYards(-5, { kind: "touchdown" }), 95);
  });
});
