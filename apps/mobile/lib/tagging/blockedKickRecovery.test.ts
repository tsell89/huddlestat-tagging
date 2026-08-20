import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PlayType,
  Result,
  defaultPuntReceivePlay,
} from "@huddlestat/shared";
import {
  applyBlockedKickSpotsToDraft,
  defaultBlockedKickRecoverySpots,
} from "./blockedKickRecovery.js";

const TEAM = "WHS";

describe("blocked kick spots — PuntReceive", () => {
  test("applyBlockedKickSpotsToDraft persists recover encoding", () => {
    const draft = {
      ...defaultPuntReceivePlay(6, TEAM),
      result: Result.Blocked,
      yardLine: -35,
    };
    const spots = defaultBlockedKickRecoverySpots(draft.yardLine);
    const saved = applyBlockedKickSpotsToDraft(draft, spots);
    assert.ok(saved.spotEncoding?.startsWith("recover:"));
    assert.equal(saved.playType, PlayType.PuntReceive);
  });
});
