import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ODK, PlayType, Result } from "./constants.js";
import {
  openingDictatedChain,
  parseWithRules,
  parserOmitsSituation,
  parsedSnapIsConfirmable,
  previewParsedPlay,
  stripChainOwnedSituation,
  type DictatedChain,
} from "./parseDictated.js";

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

  test("gain of 10 from 1st & 10 Opp 20 is a first down at Opp 30", () => {
    const { play: kickoff } = previewParsedPlay(
      [],
      parseWithRules("Kickoff touchback", openingDictatedChain()),
    );
    const parsed = parseWithRules("12 runs for 10", givenChain({}));
    assert.equal(parserOmitsSituation(parsed), true);
    const { play, next } = previewParsedPlay([kickoff], parsed);
    assert.equal(play.down, 1);
    assert.equal(play.distance, 10);
    assert.equal(play.yardLine, 20);
    assert.equal(play.gainLoss, 10);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, 30);
  });

  test("incomplete and sack stay on the chain", () => {
    const parsed = parseWithRules("7 incomplete", givenChain({}));
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Incomplete);
    assert.equal(parsed.passerJersey, "7");
    assert.equal(parsed.gainLoss, 0);

    const sack = parseWithRules("sacked for a loss of 6", givenChain({}));
    assert.equal(sack.result, Result.Sack);
    assert.equal(sack.gainLoss, -6);
  });

  test("threw it away is an incomplete", () => {
    const parsed = parseWithRules("7 threw it away", givenChain({}));
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Incomplete);
    assert.equal(parsed.passerJersey, "7");
    assert.equal(parsedSnapIsConfirmable(parsed), true);
  });

  test("punt downed at own 12 is high confidence", () => {
    const parsed = parseWithRules("punt downed at own 12", givenChain({ down: 4 }));
    assert.equal(parsed.playType, PlayType.Punt);
    assert.equal(parsed.result, Result.Downed);
    assert.equal(parsed.yardLine, -12);
    assert.equal(parsed.confidence, "high");
  });

  test("complete to receiver for yards", () => {
    const parsed = parseWithRules("7 completes to 11 for 8", givenChain({}));
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Complete);
    assert.equal(parsed.passerJersey, "7");
    assert.equal(parsed.receiverJersey, "11");
    assert.equal(parsed.gainLoss, 8);
  });

  test("left hash without a snap is a situation override only", () => {
    const parsed = parseWithRules("left hash", givenChain({}));
    assert.equal(parsed.hash, "L");
    assert.equal(parsed.confidence, "low");
    assert.equal(parsedSnapIsConfirmable(parsed), false);
  });

  test("empty and nonsense are not confirmable", () => {
    assert.equal(parsedSnapIsConfirmable(parseWithRules("", givenChain({}))), false);
    assert.equal(
      parsedSnapIsConfirmable(parseWithRules("the band is too loud", givenChain({}))),
      false,
    );
  });

  test("stripChainOwnedSituation drops down/distance/ODK and keeps hash/spot", () => {
    const stripped = stripChainOwnedSituation({
      quarter: 1,
      playType: PlayType.Run,
      result: Result.Rush,
      gainLoss: 4,
      down: 3,
      distance: 2,
      odk: ODK.Offense,
      hash: "L",
      yardLine: -25,
      confidence: "high",
      warnings: [],
    });
    assert.equal(stripped.down, undefined);
    assert.equal(stripped.distance, undefined);
    assert.equal(stripped.odk, undefined);
    assert.equal(stripped.hash, "L");
    assert.equal(stripped.yardLine, -25);
    assert.equal(stripped.rusherJersey, undefined);
  });
});
