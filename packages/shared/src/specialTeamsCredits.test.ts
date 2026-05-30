import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PlayType, Result, emptyPlayerRef } from "./constants.js";
import type { PlaylistData } from "./index.js";
import {
  KICKOFF_TOUCHBACK_YARDS,
  TOUCHBACK_NET_PLACEMENT_YARDS,
  applySpecialTeamsCreditsToMap,
  deriveKickoffKickYards,
  deriveKickoffNetYards,
  derivePuntEndPosition,
  derivePuntKickYards,
  derivePuntNetYards,
  isExcludedPunt,
  isPuntInside20,
  type SpecialTeamsCreditAccumulator,
} from "./specialTeamsCredits.js";

function player(jersey: string) {
  return { jersey, name: `Player ${jersey}` };
}

function offensePlay(
  overrides: Partial<PlaylistData> & Pick<PlaylistData, "playType">,
): PlaylistData {
  return {
    playNumber: 1,
    quarter: 1,
    odk: ODK.Offense,
    yardLine: -35,
    down: 4,
    distance: 10,
    hash: "M",
    gainLoss: 0,
    passer: emptyPlayerRef,
    receiver: emptyPlayerRef,
    rusher: emptyPlayerRef,
    result: Result.Downed,
    team: "SHS",
    tackler1: emptyPlayerRef,
    tackler2: emptyPlayerRef,
    recoveredBy: emptyPlayerRef,
    returner: emptyPlayerRef,
    kicker: player("94"),
    interceptedBy: emptyPlayerRef,
    ...overrides,
  };
}

function credits(play: PlaylistData): Map<string, SpecialTeamsCreditAccumulator> {
  const map = new Map<string, SpecialTeamsCreditAccumulator>();
  applySpecialTeamsCreditsToMap(play, map);
  return map;
}

describe("derivePuntKickYards — B3", () => {
  test("kickYards wins over conflicting gainLoss", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      kickYards: 42,
      gainLoss: -99,
    });
    assert.equal(derivePuntKickYards(play), 42);
  });

  test("touchback uses full distance to opponent goal", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      yardLine: -45,
      result: Result.Touchback,
    });
    assert.equal(derivePuntKickYards(play), 55);
  });

  test("legacy gainLoss fallback when kickYards missing", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      kickYards: undefined,
      gainLoss: -38,
    });
    assert.equal(derivePuntKickYards(play), 38);
  });

  test("blocked punt excluded from punter stats", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      result: Result.Blocked,
      kickYards: 30,
    });
    assert.equal(isExcludedPunt(play), true);
    assert.equal(derivePuntKickYards(play), 0);
    assert.equal(credits(play).get("94")?.puntNum ?? 0, 0);
  });

  test("punt-pad fumble excluded", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      result: Result.Fumble,
      kickYards: 30,
    });
    assert.equal(isExcludedPunt(play), true);
    assert.equal(credits(play).get("94")?.puntNum ?? 0, 0);
  });
});

describe("isPuntInside20 — B4", () => {
  test("position 81 counts; position 80 does not", () => {
    const inside = offensePlay({
      playType: PlayType.Punt,
      yardLine: 43,
      kickYards: 33,
      result: Result.Downed,
    });
    assert.equal(derivePuntEndPosition(inside), 90);
    assert.equal(isPuntInside20(inside), true);

    const onTwenty = offensePlay({
      playType: PlayType.Punt,
      yardLine: -48,
      kickYards: 32,
      result: Result.Penalty,
    });
    assert.equal(derivePuntEndPosition(onTwenty), 80);
    assert.equal(isPuntInside20(onTwenty), false);
  });

  test("touchback does not count", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      result: Result.Touchback,
      kickYards: 55,
    });
    assert.equal(isPuntInside20(play), false);
  });

  test("return uses end spot from spotEncoding", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      yardLine: -35,
      kickYards: 40,
      result: Result.Return,
      returnYards: 15,
      spotEncoding: "recv:+10|end:-25",
    });
    const endPos = derivePuntEndPosition(play);
    assert.equal(endPos, 25);
    assert.equal(isPuntInside20(play), false);
  });
});

describe("deriveKickoffKickYards — B8", () => {
  test("touchback = 60", () => {
    const play = offensePlay({
      playType: PlayType.Kickoff,
      yardLine: -40,
      result: Result.Touchback,
    });
    assert.equal(deriveKickoffKickYards(play), KICKOFF_TOUCHBACK_YARDS);
  });

  test("return uses kick spot to catch spot, not gainLoss", () => {
    const play = offensePlay({
      playType: PlayType.Kickoff,
      yardLine: -40,
      result: Result.Return,
      gainLoss: 25,
      returnYards: 25,
      spotEncoding: "catch:-5|end:-25",
    });
    assert.equal(deriveKickoffKickYards(play), 35);
  });
});

describe("net yards — B10a", () => {
  test("punt touchback net subtracts 20", () => {
    const play = offensePlay({
      playType: PlayType.Punt,
      yardLine: -45,
      result: Result.Touchback,
    });
    assert.equal(derivePuntNetYards(play), 55 - TOUCHBACK_NET_PLACEMENT_YARDS);
  });

  test("kickoff return net subtracts return yards", () => {
    const play = offensePlay({
      playType: PlayType.Kickoff,
      yardLine: -40,
      result: Result.Return,
      kickYards: 35,
      returnYards: 25,
    });
    assert.equal(deriveKickoffNetYards(play), 10);
  });
});

describe("applySpecialTeamsCreditsToMap — B6 PAT", () => {
  test("PATKickingPoints always equals PATKickingMade", () => {
    const made = offensePlay({
      playType: PlayType.ExtraPoint,
      result: Result.Good,
    });
    const missed = offensePlay({
      playNumber: 2,
      playType: PlayType.ExtraPoint,
      result: Result.NoGood,
    });
    const blocked = offensePlay({
      playNumber: 3,
      playType: PlayType.ExtraPointBlock,
      result: Result.Blocked,
    });
    const map = new Map<string, SpecialTeamsCreditAccumulator>();
    applySpecialTeamsCreditsToMap(made, map);
    applySpecialTeamsCreditsToMap(missed, map);
    applySpecialTeamsCreditsToMap(blocked, map);
    const row = map.get("94")!;
    assert.equal(row.patKickingMade, 1);
    assert.equal(row.patKickingAtt, 3);
    assert.equal(row.patKickingPoints, 1);
    assert.equal(row.patKickingPoints, row.patKickingMade);
  });

  test("two-point never increments PATKicking columns", () => {
    const play = offensePlay({
      playType: PlayType.TwoPoint,
      result: Result.Good,
      kicker: emptyPlayerRef,
      rusher: player("12"),
    });
    const row = credits(play).get("12")!;
    assert.equal(row.patRushingNum, 1);
    assert.equal(row.totalConversionPoints, 2);
    assert.equal(row.patKickingAtt, 0);
    assert.equal(row.patKickingMade, 0);
    assert.equal(row.patKickingPoints, 0);
  });

  test("two successful XP kicks → 2|2|2", () => {
    const map = new Map<string, SpecialTeamsCreditAccumulator>();
    for (let i = 0; i < 2; i++) {
      applySpecialTeamsCreditsToMap(
        offensePlay({
          playNumber: i + 1,
          playType: PlayType.ExtraPoint,
          result: Result.Good,
        }),
        map,
      );
    }
    const row = map.get("94")!;
    assert.equal(row.patKickingMade, 2);
    assert.equal(row.patKickingAtt, 2);
    assert.equal(row.patKickingPoints, 2);
  });
});
