import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  PlayType,
  Result,
  defaultOffensivePlay,
} from "@huddlestat/shared";
import type { LocalPlay } from "../db/types.js";
import {
  applyPasserLeaderDefault,
  buildJerseyGridRankings,
  getGamePasserLeader,
} from "./jerseyGridRank.js";

const TEAM = "WHS";

function mockPlay(overrides: Partial<LocalPlay> & Pick<LocalPlay, "playNumber">): LocalPlay {
  return {
    ...defaultOffensivePlay(overrides.playNumber, TEAM),
    id: `play-${overrides.playNumber}`,
    localGameId: "game-1",
    synced: false,
    convexPlayId: null,
    taggedAt: 0,
    ...overrides,
  };
}

describe("buildJerseyGridRankings", () => {
  test("early game uses POSITION_GROUPS two-deep fallback", () => {
    const entries = buildJerseyGridRankings([], "passer");
    assert.deepEqual(
      entries.map((entry) => entry.jersey),
      ["7", "12"],
    );
    assert.ok(entries.every((entry) => entry.tier === "standard" && entry.count === 0));
  });

  test("rusher tiers follow 25 / 10 / 5 / 1 thresholds", () => {
    const plays: LocalPlay[] = [
      ...Array.from({ length: 25 }, (_, index) =>
        mockPlay({
          playNumber: index + 1,
          playType: PlayType.Run,
          result: Result.Rush,
          rusher: { jersey: "2", name: "" },
        }),
      ),
      ...Array.from({ length: 10 }, (_, index) =>
        mockPlay({
          playNumber: 26 + index,
          playType: PlayType.Run,
          result: Result.Rush,
          rusher: { jersey: "22", name: "" },
        }),
      ),
      ...Array.from({ length: 5 }, (_, index) =>
        mockPlay({
          playNumber: 36 + index,
          playType: PlayType.Run,
          result: Result.Rush,
          rusher: { jersey: "34", name: "" },
        }),
      ),
      mockPlay({
        playNumber: 41,
        playType: PlayType.Run,
        result: Result.Rush,
        rusher: { jersey: "44", name: "" },
      }),
    ];

    const byJersey = Object.fromEntries(
      buildJerseyGridRankings(plays, "rusher").map((entry) => [entry.jersey, entry]),
    );

    assert.equal(byJersey["2"].tier, "hero");
    assert.equal(byJersey["22"].tier, "frequent");
    assert.equal(byJersey["34"].tier, "standard");
    assert.equal(byJersey["44"].tier, "small");
  });

  test("sorts by tier desc, count desc, then jersey asc", () => {
    const plays: LocalPlay[] = [
      mockPlay({
        playNumber: 1,
        playType: PlayType.Run,
        result: Result.Rush,
        rusher: { jersey: "10", name: "" },
      }),
      mockPlay({
        playNumber: 2,
        playType: PlayType.Run,
        result: Result.Rush,
        rusher: { jersey: "10", name: "" },
      }),
      mockPlay({
        playNumber: 3,
        playType: PlayType.Run,
        result: Result.Rush,
        rusher: { jersey: "2", name: "" },
      }),
      mockPlay({
        playNumber: 4,
        playType: PlayType.Run,
        result: Result.Rush,
        rusher: { jersey: "22", name: "" },
      }),
    ];

    const jerseys = buildJerseyGridRankings(plays, "rusher").map((entry) => entry.jersey);
    assert.deepEqual(jerseys.slice(0, 3), ["10", "2", "22"]);
  });

  test("caps tackler hero to one jersey", () => {
    const plays: LocalPlay[] = [
      ...Array.from({ length: 6 }, (_, index) =>
        mockPlay({
          playNumber: index + 1,
          playType: PlayType.Run,
          result: Result.Rush,
          tackler1: { jersey: "45", name: "" },
        }),
      ),
      ...Array.from({ length: 7 }, (_, index) =>
        mockPlay({
          playNumber: 7 + index,
          playType: PlayType.Run,
          result: Result.Rush,
          tackler1: { jersey: "55", name: "" },
        }),
      ),
    ];

    const heroes = buildJerseyGridRankings(plays, "tackler1").filter(
      (entry) => entry.tier === "hero",
    );
    assert.equal(heroes.length, 1);
    assert.equal(heroes[0]?.jersey, "55");
  });

  test("PBU on tipped pass uses light tackler weighting", () => {
    const plays: LocalPlay[] = [
      mockPlay({
        playNumber: 1,
        playType: PlayType.Pass,
        result: Result.TippedPass,
        tackler1: { jersey: "3", name: "" },
      }),
      mockPlay({
        playNumber: 2,
        playType: PlayType.Pass,
        result: Result.TippedPass,
        tackler1: { jersey: "3", name: "" },
      }),
    ];

    const entry = buildJerseyGridRankings(plays, "tackler1").find(
      (row) => row.jersey === "3",
    );
    assert.equal(entry?.count, 1);
    assert.equal(entry?.tier, "small");
  });
});

describe("passer leader default", () => {
  test("getGamePasserLeader returns QB with most pass attempts", () => {
    const plays: LocalPlay[] = [
      mockPlay({
        playNumber: 1,
        playType: PlayType.Pass,
        result: Result.Complete,
        passer: { jersey: "7", name: "" },
      }),
      mockPlay({
        playNumber: 2,
        playType: PlayType.Pass,
        result: Result.Incomplete,
        passer: { jersey: "12", name: "" },
      }),
      mockPlay({
        playNumber: 3,
        playType: PlayType.Pass,
        result: Result.Complete,
        passer: { jersey: "12", name: "" },
      }),
    ];

    assert.equal(getGamePasserLeader(plays), "12");
  });

  test("applyPasserLeaderDefault pre-fills passer on new PassPad snap", () => {
    const plays: LocalPlay[] = [
      mockPlay({
        playNumber: 1,
        playType: PlayType.Pass,
        result: Result.Complete,
        passer: { jersey: "7", name: "" },
      }),
    ];

    const draft = applyPasserLeaderDefault(
      {
        ...defaultOffensivePlay(2, TEAM),
        playType: PlayType.Pass,
        result: Result.Complete,
        passer: { jersey: "", name: "" },
      },
      plays,
    );

    assert.equal(draft.passer.jersey, "7");
  });

  test("applyPasserLeaderDefault does not override an existing passer jersey", () => {
    const plays: LocalPlay[] = [
      mockPlay({
        playNumber: 1,
        playType: PlayType.Pass,
        result: Result.Complete,
        passer: { jersey: "7", name: "" },
      }),
    ];

    const draft = applyPasserLeaderDefault(
      {
        ...defaultOffensivePlay(2, TEAM),
        playType: PlayType.Pass,
        result: Result.Complete,
        passer: { jersey: "12", name: "" },
      },
      plays,
    );

    assert.equal(draft.passer.jersey, "12");
  });
});
