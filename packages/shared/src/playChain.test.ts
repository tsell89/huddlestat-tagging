import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  ODK,
  PlayType,
  Result,
  advanceSituation,
  defaultKickoffPlay,
  defaultOffensivePlay,
  emptyPlayerRef,
  isFailedFourthDown,
  FIELD_OPP_GOAL,
  hudlToFieldPosition,
  nextDraftAfterPlay,
  normalizePlayOnSave,
  yardLineAfterPlay,
  yardsAdvanced,
  type PlaylistData,
} from "./index.js";

const TEAM = "WHS";

function basePlay(
  overrides: Partial<PlaylistData>,
): PlaylistData {
  return {
    ...defaultOffensivePlay(1, TEAM),
    ...overrides,
  };
}

describe("canonical drive (spec §2.4)", () => {
  test("play 1: kickoff return to Own 25 → 1st & 10 @ Own 25", () => {
    const ko: PlaylistData = {
      ...defaultKickoffPlay(1, TEAM),
      yardLine: -40,
      down: 0,
      distance: 0,
      result: Result.Return,
      gainLoss: 20,
      returnYards: 20,
      spotEncoding: "catch:-5|end:-25",
    };

    assert.equal(yardLineAfterPlay(ko), -25);
    assert.deepEqual(advanceSituation(ko), {
      down: 1,
      distance: 10,
      yardLine: -25,
    });
  });

  test("play 2: run Own 25 to Opp 25 (+50) → 1st & 10 @ Opp 25", () => {
    const run = basePlay({
      playNumber: 2,
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: -25,
      down: 1,
      distance: 10,
      gainLoss: 50,
    });

    assert.equal(yardLineAfterPlay(run), 25);
    assert.deepEqual(advanceSituation(run), {
      down: 1,
      distance: 10,
      yardLine: 25,
    });
  });

  test("sack: 3rd & 8 @ Opp 23, loss of 5 → 4th & 13 @ Opp 28", () => {
    const sack = basePlay({
      playNumber: 3,
      playType: PlayType.Pass,
      result: Result.Sack,
      yardLine: 23,
      down: 3,
      distance: 8,
      gainLoss: -5,
    });

    assert.equal(yardLineAfterPlay(sack), 28);
    assert.deepEqual(advanceSituation(sack), {
      down: 4,
      distance: 13,
      yardLine: 28,
    });
  });

  test("FG good on 4th → next draft is kickoff", () => {
    const fg = basePlay({
      playNumber: 4,
      playType: PlayType.FieldGoal,
      result: Result.Good,
      yardLine: 28,
      down: 4,
      distance: 13,
      gainLoss: 0,
      kicker: { jersey: "3", name: "Kicker" },
      kickYards: 38,
    });

    const next = nextDraftAfterPlay(fg, 5, TEAM);
    assert.equal(next.playType, PlayType.Kickoff);
    assert.equal(next.odk, ODK.Kicking);
    assert.equal(next.down, 0);
    assert.equal(next.playNumber, 5);
  });
});

describe("TD → scoring → kickoff chain", () => {
  test("rush TD (offense) → Extra Pt. Good pre-loaded", () => {
    const td = basePlay({
      playNumber: 3,
      playType: PlayType.Run,
      result: Result.RushTd,
      yardLine: 5,
      down: 1,
      distance: 10,
      gainLoss: 5,
      odk: ODK.Offense,
    });

    const scoring = nextDraftAfterPlay(td, 4, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPoint);
    assert.equal(scoring.result, Result.Good);
    assert.equal(scoring.odk, ODK.Offense);
    assert.equal(scoring.yardLine, 3);
    assert.equal(scoring.playNumber, 4);
  });

  test("complete TD (offense) → Extra Pt. Good pre-loaded", () => {
    const td = basePlay({
      playNumber: 7,
      playType: PlayType.Pass,
      result: Result.CompleteTd,
      yardLine: 12,
      down: 2,
      distance: 8,
      gainLoss: 12,
      odk: ODK.Offense,
    });

    const scoring = nextDraftAfterPlay(td, 8, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPoint);
    assert.equal(scoring.result, Result.Good);
  });

  test("rush TD (defense perspective) → Extra Pt. Block pre-loaded", () => {
    const td = basePlay({
      playNumber: 10,
      playType: PlayType.Run,
      result: Result.RushTd,
      yardLine: -5,
      down: 1,
      distance: 10,
      gainLoss: 5,
      odk: ODK.Defense,
    });

    const scoring = nextDraftAfterPlay(td, 11, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPointBlock);
    assert.equal(scoring.result, Result.Blocked);
    assert.equal(scoring.odk, ODK.Defense);
  });

  test("XP Good → kickoff", () => {
    const xp = basePlay({
      playNumber: 4,
      playType: PlayType.ExtraPoint,
      result: Result.Good,
      yardLine: 3,
      down: 1,
      distance: 1,
      gainLoss: 0,
      odk: ODK.Offense,
      kicker: { jersey: "3", name: "Kicker" },
    });

    const ko = nextDraftAfterPlay(xp, 5, TEAM);
    assert.equal(ko.playType, PlayType.Kickoff);
    assert.equal(ko.odk, ODK.Kicking);
    assert.equal(ko.down, 0);
    assert.equal(ko.playNumber, 5);
  });

  test("KO return TD → Extra Pt scoring pad (odk O)", () => {
    const koRec = basePlay({
      playNumber: 1,
      playType: PlayType.KickoffReceive,
      result: Result.Return,
      odk: ODK.Offense,
      yardLine: -40,
      down: 0,
      distance: 0,
      spotEncoding: "catch:-5|end:TD",
    });

    assert.equal(yardsAdvanced(-5, 0, "opponent"), 95);

    const scoring = nextDraftAfterPlay(koRec, 2, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPoint);
    assert.equal(scoring.result, Result.Good);
    assert.equal(scoring.odk, ODK.Offense);
    assert.equal(scoring.yardLine, 3);
  });

  test("punt return TD (odk D) → Extra Pt scoring pad (odk O)", () => {
    const puntRec = basePlay({
      playNumber: 8,
      playType: PlayType.PuntReceive,
      result: Result.Return,
      odk: ODK.Defense,
      yardLine: 35,
      down: 1,
      distance: 10,
      spotEncoding: "recv:20|end:TD",
    });

    const scoring = nextDraftAfterPlay(puntRec, 9, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPoint);
    assert.equal(scoring.odk, ODK.Offense);
    assert.equal(scoring.yardLine, 3);
  });

  test("INT return TD (odk D) → Extra Pt scoring pad (odk O)", () => {
    const pick = basePlay({
      playNumber: 3,
      playType: PlayType.Pass,
      result: Result.Interception,
      odk: ODK.Defense,
      yardLine: -30,
      down: 2,
      distance: 8,
      spotEncoding: "catch:20|end:TD",
    });

    const scoring = nextDraftAfterPlay(pick, 4, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPoint);
    assert.equal(scoring.odk, ODK.Offense);
    assert.equal(scoring.yardLine, 3);
  });

  test("4th-down punt return TD routes to scoring before punt-rec flip", () => {
    const punt = basePlay({
      playNumber: 5,
      playType: PlayType.Punt,
      result: Result.Return,
      odk: ODK.Offense,
      yardLine: 40,
      down: 4,
      distance: 8,
      spotEncoding: "recv:20|end:TD",
    });

    const scoring = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPointBlock);
    assert.equal(scoring.odk, ODK.Defense);
    assert.equal(scoring.yardLine, 3);
  });

  test("blocked punt recover|end:TD → Extra Pt. Block (they scored on our punt)", () => {
    const blocked = basePlay({
      playNumber: 6,
      playType: PlayType.Punt,
      result: Result.Blocked,
      odk: ODK.Offense,
      yardLine: 35,
      down: 4,
      distance: 8,
      spotEncoding: "recover:20|end:TD",
    });

    const scoring = nextDraftAfterPlay(blocked, 7, TEAM);
    assert.equal(scoring.playType, PlayType.ExtraPointBlock);
    assert.equal(scoring.odk, ODK.Defense);
    assert.equal(scoring.yardLine, 3);
  });

  test("return end:SA does not route to scoring pad", () => {
    const koRec = basePlay({
      playNumber: 1,
      playType: PlayType.KickoffReceive,
      result: Result.Return,
      odk: ODK.Offense,
      yardLine: -40,
      down: 0,
      distance: 0,
      spotEncoding: "catch:-5|end:SA",
    });

    const next = nextDraftAfterPlay(koRec, 2, TEAM);
    assert.notEqual(next.playType, PlayType.ExtraPoint);
    assert.notEqual(next.playType, PlayType.ExtraPointBlock);
    assert.equal(next.down, 1);
    assert.equal(next.yardLine, 0);
  });

  test("HS OT: XP Good → opponent possession @ Own 10 (defense)", () => {
    const xp = basePlay({
      playNumber: 2,
      playType: PlayType.ExtraPoint,
      result: Result.Good,
      yardLine: 3,
      down: 1,
      distance: 1,
      gainLoss: 0,
      odk: ODK.Offense,
    });

    const next = nextDraftAfterPlay(xp, 3, TEAM, {
      rules: "HS",
      overtime: true,
    });
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, -10);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.playType, "");
  });

  test("HS OT: regulation XP (no overtime flag) → kickoff", () => {
    const xp = basePlay({
      playNumber: 4,
      playType: PlayType.ExtraPoint,
      result: Result.Good,
      yardLine: 3,
      odk: ODK.Offense,
    });

    const ko = nextDraftAfterPlay(xp, 5, TEAM, { rules: "HS", overtime: false });
    assert.equal(ko.playType, PlayType.Kickoff);
  });

  test("2 Pt. Good → kickoff", () => {
    const twoPt = basePlay({
      playNumber: 6,
      playType: PlayType.TwoPoint,
      result: Result.Good,
      yardLine: 1,
      down: 1,
      distance: 2,
      gainLoss: 0,
      odk: ODK.Offense,
    });

    const ko = nextDraftAfterPlay(twoPt, 7, TEAM);
    assert.equal(ko.playType, PlayType.Kickoff);
    assert.equal(ko.odk, ODK.Kicking);
  });

  test("XP block (defense) → kickoff", () => {
    const block = basePlay({
      playNumber: 11,
      playType: PlayType.ExtraPointBlock,
      result: Result.Blocked,
      yardLine: 3,
      down: 1,
      distance: 1,
      gainLoss: 0,
      odk: ODK.Defense,
      tackler1: { jersey: "44", name: "Blocker" },
    });

    const ko = nextDraftAfterPlay(block, 12, TEAM);
    assert.equal(ko.playType, PlayType.Kickoff);
    assert.equal(ko.odk, ODK.Kicking);
    assert.equal(ko.down, 0);
    assert.equal(ko.playNumber, 12);
  });

  test("2 Pt. block (defense) → kickoff", () => {
    const block = basePlay({
      playNumber: 13,
      playType: PlayType.TwoPointBlock,
      result: Result.Blocked,
      yardLine: 1,
      down: 1,
      distance: 2,
      gainLoss: 0,
      odk: ODK.Defense,
    });

    const ko = nextDraftAfterPlay(block, 14, TEAM);
    assert.equal(ko.playType, PlayType.Kickoff);
    assert.equal(ko.odk, ODK.Kicking);
  });
});

describe("touchback @ Own 20 (HS)", () => {
  test("kickoff touchback places next snap at Own 20", () => {
    const ko = {
      ...defaultKickoffPlay(1, TEAM),
      result: Result.Touchback,
      gainLoss: 0,
    };

    assert.equal(yardLineAfterPlay(ko), -20);
    assert.deepEqual(advanceSituation(ko), {
      down: 1,
      distance: 10,
      yardLine: -20,
    });
  });

  test("kickoff receive touchback places next snap at Own 20", () => {
    const koRec = {
      ...defaultKickoffPlay(1, TEAM),
      playType: PlayType.KickoffReceive,
      result: Result.Touchback,
      gainLoss: 0,
    };

    assert.equal(yardLineAfterPlay(koRec), -20);
    assert.deepEqual(advanceSituation(koRec), {
      down: 1,
      distance: 10,
      yardLine: -20,
    });
  });

  test("kickoff receive return uses spotEncoding end spot", () => {
    const koRec = {
      ...defaultKickoffPlay(1, TEAM),
      playType: PlayType.KickoffReceive,
      result: Result.Return,
      gainLoss: 20,
      returnYards: 20,
      spotEncoding: "catch:-5|end:-25",
    };

    assert.equal(yardLineAfterPlay(koRec), -25);
    assert.deepEqual(advanceSituation(koRec), {
      down: 1,
      distance: 10,
      yardLine: -25,
    });
  });
});

describe("punt receive chain", () => {
  test("4th-down punt downed → next odk D and Punt Rec", () => {
    const punt = basePlay({
      playNumber: 5,
      playType: PlayType.Punt,
      result: Result.Downed,
      yardLine: -28,
      down: 4,
      distance: 2,
      gainLoss: -35,
      spotEncoding: "end:35",
      odk: ODK.Offense,
    });

    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.playType, PlayType.PuntReceive);
    assert.equal(next.yardLine, -35);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
  });

  test("4th-down punt return → next odk D and Punt Rec at return end", () => {
    const punt = basePlay({
      playNumber: 5,
      playType: PlayType.Punt,
      result: Result.Return,
      yardLine: 40,
      down: 4,
      distance: 8,
      gainLoss: -12,
      returnYards: 12,
      spotEncoding: "recv:35|end:-32",
      odk: ODK.Offense,
    });

    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.playType, PlayType.PuntReceive);
    assert.equal(next.yardLine, -32);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
  });

  test("4th-down punt touchback → next odk D and Punt Rec @ Own 20", () => {
    const punt = basePlay({
      playNumber: 5,
      playType: PlayType.Punt,
      result: Result.Touchback,
      yardLine: 5,
      down: 4,
      distance: 2,
      gainLoss: 0,
      odk: ODK.Offense,
    });

    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.playType, PlayType.PuntReceive);
    assert.equal(next.yardLine, -20);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
  });

  test("4th-down punt downed: field spot 5 → opponent offense @ spot 95", () => {
    const punt = basePlay({
      playNumber: 5,
      playType: PlayType.Punt,
      result: Result.Downed,
      yardLine: -45,
      down: 4,
      distance: 5,
      gainLoss: 5,
      spotEncoding: "end:-5",
      odk: ODK.Offense,
    });

    const fieldSpot = hudlToFieldPosition(-5);
    assert.equal(fieldSpot, 5);
    assert.equal(FIELD_OPP_GOAL - fieldSpot, 95);

    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.playType, PlayType.PuntReceive);
    assert.equal(next.yardLine, 5);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
  });

  test("4th-down punt downed: field spot 65 → opponent offense @ spot 35", () => {
    const punt = basePlay({
      playNumber: 5,
      playType: PlayType.Punt,
      result: Result.Downed,
      yardLine: -28,
      down: 4,
      distance: 2,
      gainLoss: -35,
      spotEncoding: "end:35",
      odk: ODK.Offense,
    });

    const fieldSpot = hudlToFieldPosition(35);
    assert.equal(fieldSpot, 65);
    assert.equal(FIELD_OPP_GOAL - fieldSpot, 35);

    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.yardLine, -35);
  });

  test("4th-down punt return ending in opponent territory keeps recv end as-is", () => {
    const punt = basePlay({
      playNumber: 5,
      playType: PlayType.Punt,
      result: Result.Return,
      yardLine: -40,
      down: 4,
      distance: 10,
      gainLoss: 10,
      returnYards: 10,
      spotEncoding: "recv:-5|end:25",
      odk: ODK.Offense,
    });

    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.playType, PlayType.PuntReceive);
    assert.equal(next.yardLine, 25);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
  });

  test("punt receive return uses spotEncoding end spot", () => {
    const puntRec = basePlay({
      playType: PlayType.PuntReceive,
      result: Result.Return,
      yardLine: 35,
      down: 4,
      distance: 8,
      gainLoss: 12,
      spotEncoding: "recv:15|end:-32",
    });

    assert.equal(yardLineAfterPlay(puntRec), -32);
  });

  test("punt receive touchback places next snap at Own 20", () => {
    const puntRec = basePlay({
      playType: PlayType.PuntReceive,
      result: Result.Touchback,
      yardLine: 40,
      down: 4,
      distance: 10,
      gainLoss: 0,
    });

    assert.equal(yardLineAfterPlay(puntRec), -20);
  });

  test("Punt Rec touchback → next odk D 1st & 10 @ Opp 20", () => {
    const puntRec = basePlay({
      playType: PlayType.PuntReceive,
      result: Result.Touchback,
      odk: ODK.Defense,
      yardLine: -35,
      down: 1,
      distance: 10,
      gainLoss: 0,
    });

    const next = nextDraftAfterPlay(puntRec, 7, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, 20);
    assert.equal(next.playType, "");
  });
});

describe("incomplete / tipped pass", () => {
  test("incomplete keeps spot, gainLoss=0, down advances", () => {
    const incomplete = basePlay({
      playType: PlayType.Pass,
      result: Result.Incomplete,
      yardLine: -25,
      down: 2,
      distance: 7,
      gainLoss: -12,
    });

    const saved = normalizePlayOnSave(incomplete);
    assert.equal(saved.gainLoss, 0);
    assert.deepEqual(advanceSituation(saved), {
      down: 3,
      distance: 7,
      yardLine: -25,
    });
  });

  test("tipped pass behaves like incomplete", () => {
    const tipped = basePlay({
      playType: PlayType.Pass,
      result: Result.TippedPass,
      yardLine: 15,
      down: 1,
      distance: 10,
      gainLoss: 8,
    });

    const saved = normalizePlayOnSave(tipped);
    assert.equal(saved.gainLoss, 0);
    assert.deepEqual(advanceSituation(saved), {
      down: 2,
      distance: 10,
      yardLine: 15,
    });
  });
});

describe("Package H — live ball", () => {
  test("INT return → COP @ return end, flips odk", () => {
    const intPlay = basePlay({
      playType: PlayType.Pass,
      result: Result.Interception,
      yardLine: -25,
      down: 2,
      distance: 7,
      spotEncoding: "catch:15|end:-32",
      returnYards: 47,
      gainLoss: -7,
      odk: ODK.Offense,
    });

    assert.equal(yardLineAfterPlay(intPlay), -32);
    assert.deepEqual(advanceSituation(intPlay), {
      down: 1,
      distance: 10,
      yardLine: 32,
    });

    const next = nextDraftAfterPlay(intPlay, 5, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, 32);
  });

  test("fumble lost (defense) → turnover @ return end", () => {
    const fumble = basePlay({
      playType: PlayType.Run,
      result: Result.Fumble,
      yardLine: -25,
      down: 2,
      distance: 7,
      spotEncoding: "fumble:-22|recover:10|end:-32|by:D",
      gainLoss: -57,
      odk: ODK.Offense,
    });

    assert.equal(yardLineAfterPlay(fumble), -32);
    const next = nextDraftAfterPlay(fumble, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, 32);
    assert.equal(next.down, 1);
  });

  test("fumble offense recovery → same series @ spot", () => {
    const fumble = basePlay({
      playType: PlayType.Run,
      result: Result.Fumble,
      yardLine: -25,
      down: 2,
      distance: 7,
      spotEncoding: "fumble:-22|end:-22|by:O",
      gainLoss: -3,
      odk: ODK.Offense,
    });

    assert.deepEqual(advanceSituation(fumble), {
      down: 3,
      distance: 10,
      yardLine: -22,
    });
    const next = nextDraftAfterPlay(fumble, 6, TEAM);
    assert.equal(next.odk, ODK.Offense);
    assert.equal(next.yardLine, -22);
    assert.equal(next.down, 3);
  });

  test("FG no good in field → opponent @ LOS (flipped)", () => {
    const fg = basePlay({
      playType: PlayType.FieldGoal,
      result: Result.NoGood,
      yardLine: 28,
      down: 4,
      distance: 13,
      spotEncoding: "end:field",
      gainLoss: 0,
      odk: ODK.Offense,
    });

    assert.equal(yardLineAfterPlay(fg), 28);
    const next = nextDraftAfterPlay(fg, 5, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, -28);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
  });

  test("FG no good into end zone → touchback @ Own 20", () => {
    const fg = basePlay({
      playType: PlayType.FieldGoal,
      result: Result.NoGood,
      yardLine: 5,
      down: 4,
      distance: 2,
      spotEncoding: "end:TB",
      gainLoss: 0,
      odk: ODK.Offense,
    });

    assert.equal(yardLineAfterPlay(fg), -20);
    const next = nextDraftAfterPlay(fg, 5, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, -20);
    assert.equal(next.down, 1);
  });

  test("blocked punt → possession @ return end", () => {
    const punt = basePlay({
      playType: PlayType.Punt,
      result: Result.Blocked,
      yardLine: 35,
      down: 4,
      distance: 8,
      spotEncoding: "recover:20|end:-32",
      returnYards: 52,
      gainLoss: -67,
      odk: ODK.Offense,
    });

    assert.equal(yardLineAfterPlay(punt), -32);
    const next = nextDraftAfterPlay(punt, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, 32);
    assert.equal(next.down, 1);
  });

  test("blocked FG → possession @ return end", () => {
    const fg = basePlay({
      playType: PlayType.FieldGoal,
      result: Result.Blocked,
      yardLine: 28,
      down: 4,
      distance: 13,
      spotEncoding: "recover:15|end:-32",
      returnYards: 47,
      gainLoss: -60,
      odk: ODK.Offense,
    });

    assert.equal(yardLineAfterPlay(fg), -32);
    const next = nextDraftAfterPlay(fg, 5, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, 32);
    assert.equal(next.down, 1);
  });

  test("fumble safety → turnover @ own goal", () => {
    const fumble = basePlay({
      playType: PlayType.Run,
      result: Result.Fumble,
      yardLine: -25,
      down: 2,
      distance: 7,
      spotEncoding: "fumble:-22|recover:5|end:SA|by:D",
      gainLoss: -27,
      odk: ODK.Offense,
    });

    assert.equal(yardLineAfterPlay(fumble), 0);
    const next = nextDraftAfterPlay(fumble, 6, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.yardLine, 0);
  });

  test("holding penalty replays same down from spot of foul", () => {
    const penalty = basePlay({
      playType: PlayType.Run,
      result: Result.Penalty,
      yardLine: -40,
      down: 2,
      distance: 10,
      spotEncoding: "foul:-42",
      gainLoss: 0,
      odk: ODK.Offense,
    });

    assert.deepEqual(advanceSituation(penalty), {
      down: 2,
      distance: 18,
      yardLine: -32,
    });
  });
});

describe("failed 4th down", () => {
  test("short run on 4th auto COP and flips possession", () => {
    const run = basePlay({
      playType: PlayType.Run,
      result: Result.Rush,
      yardLine: 28,
      down: 4,
      distance: 13,
      gainLoss: 0,
    });

    const saved = normalizePlayOnSave(run);
    assert.equal(saved.result, Result.Cop);
    assert.equal(isFailedFourthDown(run), true);

    const next = nextDraftAfterPlay(run, 5, TEAM);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, -28);
  });

  test("incomplete on 4th auto COP at same spot", () => {
    const pass = basePlay({
      playType: PlayType.Pass,
      result: Result.Incomplete,
      yardLine: 28,
      down: 4,
      distance: 13,
      gainLoss: 0,
    });

    const saved = normalizePlayOnSave(pass);
    assert.equal(saved.result, Result.Cop);
    assert.equal(saved.gainLoss, 0);

    const next = nextDraftAfterPlay(pass, 5, TEAM);
    assert.equal(next.yardLine, -28);
  });
});
