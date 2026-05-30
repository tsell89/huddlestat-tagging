import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { emptyPlayerRef } from "@huddlestat/shared";
import type { LocalPlay } from "../db/types";
import { playToPublishPayload } from "./publishPayload";

function samplePlay(overrides: Partial<LocalPlay> = {}): LocalPlay {
  return {
    id: "play-1",
    localGameId: "game-1",
    playNumber: 1,
    quarter: 1,
    odk: "K",
    yardLine: -40,
    down: 0,
    distance: 0,
    hash: "M",
    gainLoss: 20,
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    result: "Return",
    team: "TEAM_A",
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    playType: "KO",
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
    synced: false,
    convexPlayId: null,
    taggedAt: 1,
    ...overrides,
  };
}

describe("playToPublishPayload", () => {
  test("dual-writes completion alias when spotEncoding is set", () => {
    const payload = playToPublishPayload(
      samplePlay({ spotEncoding: "catch:-5|end:-25" }),
    );
    assert.equal(payload.spotEncoding, "catch:-5|end:-25");
    assert.equal(
      (payload as { completion?: string }).completion,
      "catch:-5|end:-25",
    );
    assert.ok(!("id" in payload));
    assert.ok(!("localGameId" in payload));
  });

  test("omits completion alias when spotEncoding is unset", () => {
    const payload = playToPublishPayload(samplePlay());
    assert.equal(payload.spotEncoding, undefined);
    assert.ok(!("completion" in payload));
  });
});
