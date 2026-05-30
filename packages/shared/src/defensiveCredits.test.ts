import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PlayType, Result, emptyPlayerRef } from "./constants.js";
import type { PlaylistData } from "./index.js";
import {
  applyDefensiveCreditsToMap,
  type DefensiveCreditAccumulator,
} from "./defensiveCredits.js";

function player(jersey: string) {
  return { jersey, name: `Player ${jersey}` };
}

function defensePlay(
  overrides: Partial<PlaylistData> & Pick<PlaylistData, "result" | "gainLoss">,
): PlaylistData {
  return {
    playNumber: 1,
    quarter: 1,
    odk: ODK.Defense,
    yardLine: 25,
    down: 1,
    distance: 10,
    hash: "M",
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    team: "SHS",
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    playType: PlayType.Run,
    kicker: emptyPlayerRef,
    interceptedBy: emptyPlayerRef,
    ...overrides,
  };
}

function credits(
  play: PlaylistData,
): Map<string, DefensiveCreditAccumulator> {
  const map = new Map<string, DefensiveCreditAccumulator>();
  applyDefensiveCreditsToMap(play, map);
  return map;
}

describe("applyDefensiveCreditsToMap — tackle credit A2/A3", () => {
  test("T1 only → solo", () => {
    const map = credits(
      defensePlay({
        result: Result.Rush,
        gainLoss: 3,
        tackler1: player("11"),
      }),
    );
    assert.deepEqual(map.get("11"), {
      soloTackles: 1,
      assistTackles: 0,
      tacklesForLoss: 0,
      sacks: 0,
    });
  });

  test("T2 only → solo (not assist)", () => {
    const map = credits(
      defensePlay({
        result: Result.Rush,
        gainLoss: 3,
        tackler2: player("22"),
      }),
    );
    assert.deepEqual(map.get("22"), {
      soloTackles: 1,
      assistTackles: 0,
      tacklesForLoss: 0,
      sacks: 0,
    });
  });

  test("both tacklers → T1 solo, T2 assist", () => {
    const map = credits(
      defensePlay({
        result: Result.Rush,
        gainLoss: 2,
        tackler1: player("11"),
        tackler2: player("22"),
      }),
    );
    assert.equal(map.get("11")!.soloTackles, 1);
    assert.equal(map.get("11")!.assistTackles, 0);
    assert.equal(map.get("22")!.soloTackles, 0);
    assert.equal(map.get("22")!.assistTackles, 1);
  });
});

describe("applyDefensiveCreditsToMap — TFL A5", () => {
  test("one tackler → solo + TFL", () => {
    const map = credits(
      defensePlay({
        result: Result.Rush,
        gainLoss: -4,
        tackler1: player("44"),
      }),
    );
    assert.equal(map.get("44")!.soloTackles, 1);
    assert.equal(map.get("44")!.tacklesForLoss, 1);
  });

  test("two tacklers → both assist + TFL each", () => {
    const map = credits(
      defensePlay({
        result: Result.Rush,
        gainLoss: -5,
        tackler1: player("11"),
        tackler2: player("24"),
      }),
    );
    assert.equal(map.get("11")!.soloTackles, 0);
    assert.equal(map.get("11")!.assistTackles, 1);
    assert.equal(map.get("11")!.tacklesForLoss, 1);
    assert.equal(map.get("24")!.soloTackles, 0);
    assert.equal(map.get("24")!.assistTackles, 1);
    assert.equal(map.get("24")!.tacklesForLoss, 1);
  });
});

describe("applyDefensiveCreditsToMap — sacks A4", () => {
  test("one tackler → full sack credit only (no defensive sack yards)", () => {
    const map = credits(
      defensePlay({
        result: Result.Sack,
        gainLoss: -8,
        playType: PlayType.Pass,
        tackler1: player("90"),
      }),
    );
    assert.equal(map.get("90")!.soloTackles, 1);
    assert.equal(map.get("90")!.tacklesForLoss, 1);
    assert.equal(map.get("90")!.sacks, 1);
  });

  test("two tacklers → 0.5 sack each (no defensive sack yards)", () => {
    const map = credits(
      defensePlay({
        result: Result.Sack,
        gainLoss: -10,
        playType: PlayType.Pass,
        tackler1: player("90"),
        tackler2: player("11"),
      }),
    );
    assert.equal(map.get("90")!.assistTackles, 1);
    assert.equal(map.get("11")!.assistTackles, 1);
    assert.equal(map.get("90")!.tacklesForLoss, 1);
    assert.equal(map.get("11")!.tacklesForLoss, 1);
    assert.equal(map.get("90")!.sacks, 0.5);
    assert.equal(map.get("11")!.sacks, 0.5);
  });
});
