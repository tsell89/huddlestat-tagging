import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PlayType, Result } from "./constants.js";
import { isLegalScrimmageDistance } from "./fieldPosition100.js";
import { formatDownDistance } from "./index.js";
import {
  openingDictatedChain,
  parseWithRules,
  parserOmitsSituation,
  previewParsedPlay,
  type DictatedChain,
} from "./parseDictated.js";
import { checkSituationDistanceToGoal } from "./situationInvariants.js";

function givenChain(partial: Partial<DictatedChain>): DictatedChain {
  return {
    down: 1,
    distance: 10,
    yardLine: 20,
    odk: ODK.Defense,
    hash: "M",
    quarter: 1,
    playNumber: 2,
    playTypeGuess: PlayType.Run,
    ...partial,
  };
}

describe("dictation path — parse then chain", () => {
  test("Play 1 kickoff touchback → D 1st & 10 Opp 20", () => {
    const parsed = parseWithRules("Kickoff touchback, kicker 94", openingDictatedChain());
    assert.equal(parsed.confidence, "high");
    assert.equal(parsed.playType, PlayType.Kickoff);
    assert.equal(parsed.result, Result.Touchback);
    assert.equal(parsed.kickerJersey, "94");
    assert.equal(parserOmitsSituation(parsed), true);

    const { play, next } = previewParsedPlay([], parsed);
    assert.equal(play.playNumber, 1);
    assert.equal(play.odk, ODK.Kicking);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, 20);
    assert.equal(checkSituationDistanceToGoal(next).length, 0);
  });

  test("parser does not invent situation on a rush phrase", () => {
    const parsed = parseWithRules("2 runs for 4, tackled by 11", givenChain({}));
    assert.equal(parsed.rusherJersey, "2");
    assert.equal(parsed.gainLoss, 4);
    assert.equal(parsed.tackler1Jersey, "11");
    assert.equal(parserOmitsSituation(parsed), true);
  });

  test("number words: two runs for four, tackled by eleven", () => {
    const parsed = parseWithRules(
      "to runs for four, tackled by eleven",
      givenChain({}),
    );
    assert.equal(parsed.rusherJersey, "2");
    assert.equal(parsed.gainLoss, 4);
    assert.equal(parsed.tackler1Jersey, "11");
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parserOmitsSituation(parsed), true);
  });

  test("1st & 10 Opp 18, '12 runs for 10' → 1st & Goal Opp 8, then +4 → 2nd & 4 Opp 4", () => {
    const chain18 = givenChain({
      down: 1,
      distance: 10,
      yardLine: 18,
      odk: ODK.Offense,
      playNumber: 5,
    });
    const first = parseWithRules("12 runs for 10", chain18);
    assert.equal(parserOmitsSituation(first), true);
    assert.equal(first.rusherJersey, "12");
    assert.equal(first.gainLoss, 10);

    const onto8 = previewParsedPlay([], {
      ...first,
      down: chain18.down,
      distance: chain18.distance,
      yardLine: chain18.yardLine,
      odk: chain18.odk,
    });
    assert.equal(onto8.next.down, 1);
    assert.equal(onto8.next.distance, 8);
    assert.equal(onto8.next.yardLine, 8);
    assert.equal(
      formatDownDistance(onto8.next.down, onto8.next.distance, onto8.next.yardLine, onto8.next.odk),
      "1st & Goal",
    );
    assert.equal(
      checkSituationDistanceToGoal(onto8.next).length,
      0,
      "1st & 10 at Opp 8 is illegal",
    );

    const second = parseWithRules("12 runs for 4", {
      ...chain18,
      down: onto8.next.down,
      distance: onto8.next.distance,
      yardLine: onto8.next.yardLine,
      playNumber: onto8.next.playNumber,
    });
    assert.equal(parserOmitsSituation(second), true);
    const plus4 = previewParsedPlay([onto8.play], second);
    assert.equal(plus4.next.down, 2);
    assert.equal(plus4.next.distance, 4);
    assert.equal(plus4.next.yardLine, 4);
    assert.equal(isLegalScrimmageDistance(2, 6, 4), false);
    assert.equal(checkSituationDistanceToGoal(plus4.next).length, 0);
  });

  test("incomplete at 1st & Goal Opp 8 stays 2nd & Goal", () => {
    const parsed = parseWithRules("incomplete passer 7", givenChain({
      down: 1,
      distance: 8,
      yardLine: 8,
      odk: ODK.Offense,
    }));
    const { next } = previewParsedPlay([], {
      ...parsed,
      down: 1,
      distance: 8,
      yardLine: 8,
      odk: ODK.Offense,
    });
    assert.equal(next.down, 2);
    assert.equal(next.distance, 8);
    assert.equal(next.yardLine, 8);
  });

  test("2nd & Goal Opp 4 rush TD → Extra Pt, not 1st & 10 at 0", () => {
    const parsed = parseWithRules("12 rush TD for 4", givenChain({
      down: 2,
      distance: 4,
      yardLine: 4,
      odk: ODK.Offense,
    }));
    assert.equal(parsed.result, Result.RushTd);
    const { next } = previewParsedPlay([], {
      ...parsed,
      down: 2,
      distance: 4,
      yardLine: 4,
      odk: ODK.Offense,
    });
    assert.equal(next.playType, PlayType.ExtraPoint);
    assert.notEqual(next.yardLine, 0);
  });

  test("just outside: 1st & 10 Opp 12, rush 2 → 2nd & 8 Opp 10", () => {
    const parsed = parseWithRules("12 runs for 2", givenChain({
      yardLine: 12,
      odk: ODK.Offense,
    }));
    const { next } = previewParsedPlay([], {
      ...parsed,
      down: 1,
      distance: 10,
      yardLine: 12,
      odk: ODK.Offense,
    });
    assert.equal(next.down, 2);
    assert.equal(next.distance, 8);
    assert.equal(next.yardLine, 10);
  });

  test("first down onto the 9: 1st & 10 Opp 19 +10", () => {
    const parsed = parseWithRules("12 runs for 10", givenChain({
      yardLine: 19,
      odk: ODK.Offense,
    }));
    const { next } = previewParsedPlay([], {
      ...parsed,
      down: 1,
      distance: 10,
      yardLine: 19,
      odk: ODK.Offense,
    });
    assert.equal(next.down, 1);
    assert.equal(next.distance, 9);
    assert.equal(next.yardLine, 9);
  });

  test("4th & 13 Opp 28 turnover on downs → D 1st & 10 Own 28", () => {
    const parsed = parseWithRules("Okay, there is a turnover on downs.", givenChain({
      down: 4,
      distance: 13,
      yardLine: 28,
      odk: ODK.Offense,
      playNumber: 9,
    }));
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.gainLoss, 0);
    assert.equal(parserOmitsSituation(parsed), true);
    const { play, next } = previewParsedPlay([], {
      ...parsed,
      down: 4,
      distance: 13,
      yardLine: 28,
      odk: ODK.Offense,
    });
    assert.equal(play.result, Result.Cop);
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, -28);
  });

  test("start over in-memory is empty playlist + KO Play 1", () => {
    const tb = parseWithRules("Kickoff touchback, kicker 94", openingDictatedChain());
    const { play } = previewParsedPlay([], tb);
    assert.equal(play.playNumber, 1);
    const reset = previewParsedPlay([], tb);
    assert.equal(reset.play.playNumber, 1);
    assert.equal(reset.play.down, 0);
    assert.equal(reset.play.yardLine, -40);
    assert.equal(reset.play.playType, PlayType.Kickoff);
  });
});
