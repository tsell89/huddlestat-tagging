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
import { decodePenalty } from "./penalty.js";
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
    assert.equal(parsed.result, Result.Incomplete);
    assert.equal(parsed.passerJersey, "7");
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

  test("O0B is out of bounds on the Northrop opening kick return", () => {
    const note = "Snider 88 KO. #0 catch Own 20 (THEM blank), OOB Own 38, +18.";
    const chain = openingDictatedChain();
    const oob = parseWithRules(note, chain);
    for (const token of ["O0B", "0OB", "00B", "o0b"]) {
      const parsed = parseWithRules(note.replace("OOB", token), chain);
      assert.equal(parsed.confidence, "high", token);
      assert.equal(parsed.playType, oob.playType, token);
      assert.equal(parsed.result, oob.result, token);
      assert.equal(parsed.spotEncoding, "catch:20|end:38", token);
      assert.equal(parsed.returnYards, 18, token);
      assert.equal(parsed.gainLoss, 18, token);
      assert.equal(parsed.kickerJersey, "88", token);
      assert.equal(parsed.returnerJersey, undefined, token);
    }
  });

  test("game note: Snider kickoff return is a snap", () => {
    const parsed = parseWithRules(
      "Snider 88 KO. #0 catch Own 20 (THEM blank), OOB Own 38, +18.",
      openingDictatedChain(),
    );
    assert.equal(parsed.confidence, "high");
    assert.equal(parsed.playType, PlayType.Kickoff);
    assert.equal(parsed.result, Result.Return);
    assert.equal(parsed.kickerJersey, "88");
    assert.equal(parsed.returnYards, 18);
    assert.equal(parsed.gainLoss, 18);
    assert.equal(parsed.spotEncoding, "catch:20|end:38");
    assert.equal(parserOmitsSituation(parsed), true);
    const { play, next } = previewParsedPlay([], parsed);
    assert.equal(play.down, 0);
    assert.equal(play.distance, 0);
    assert.equal(play.yardLine, -40);
    assert.equal(play.odk, ODK.Kicking);
    assert.equal(play.spotEncoding, "catch:20|end:38");
    assert.equal(next.odk, ODK.Defense);
    assert.equal(next.down, 1);
    assert.equal(next.distance, 10);
    assert.equal(next.yardLine, 38);
  });

  test("game note: opponent run credits the Snider tackle only", () => {
    const parsed = parseWithRules(
      "1st & 10 Northrop 38. Run 4 THEM blank to Snider 44, +9. Tackle 24 US.",
      givenChain({}),
    );
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.result, Result.Rush);
    assert.equal(parsed.gainLoss, 9);
    assert.equal(parsed.rusherJersey, undefined);
    assert.equal(parsed.tackler1Jersey, "24");
    assert.equal(parserOmitsSituation(parsed), true);
  });

  test("game note: our completion and a sack with a loss", () => {
    const complete = parseWithRules(
      "1st & 10 Opp 35. Complete 17→12 to Opp 24, +10. Tackle 6 THEM blank.",
      givenChain({ odk: ODK.Offense }),
    );
    assert.equal(complete.playType, PlayType.Pass);
    assert.equal(complete.result, Result.Complete);
    assert.equal(complete.gainLoss, 10);
    assert.equal(complete.passerJersey, "17");
    assert.equal(complete.receiverJersey, "12");
    assert.equal(complete.tackler1Jersey, undefined);

    const sack = parseWithRules(
      "3rd & 7 Own 39. Sack of 17 by 25 THEM blank, Own 33, −6.",
      givenChain({ odk: ODK.Offense }),
    );
    assert.equal(sack.result, Result.Sack);
    assert.equal(sack.gainLoss, -6);
    assert.equal(sack.passerJersey, "17");
    assert.equal(sack.tackler1Jersey, undefined);
    assert.equal(sack.confidence, "high");
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

  test("sack without yards is low confidence", () => {
    const parsed = parseWithRules("12 sacked", givenChain({ odk: ODK.Offense }));
    assert.equal(parsed.result, Result.Sack);
    assert.equal(parsed.gainLoss, undefined);
    assert.equal(parsed.confidence, "low");
    assert.match(parsed.warnings.join(" "), /loss yards/i);
  });

  test("sack for a loss of 7 is high confidence", () => {
    const parsed = parseWithRules("12 sacked for a loss of 7", givenChain({ odk: ODK.Offense }));
    assert.equal(parsed.result, Result.Sack);
    assert.equal(parsed.gainLoss, -7);
    assert.equal(parsed.confidence, "high");
  });

  test("downed and fair-catch punts keep the dead-ball spot", () => {
    const downed = parseWithRules(
      "Punt 88, downed Opp 45.",
      givenChain({ odk: ODK.Offense, down: 4, distance: 8, yardLine: -21 }),
    );
    assert.equal(downed.result, Result.Downed);
    assert.equal(downed.spotEncoding, "end:45");

    const fair = parseWithRules(
      "Punt 88, fair catch 18 THEM blank at Homestead 13.",
      givenChain({ odk: ODK.Offense, down: 4, distance: 1, yardLine: 50 }),
    );
    assert.equal(fair.result, Result.FairCatch);
    assert.equal(fair.spotEncoding, "end:13");
  });

  test("an opponent punter does not flip Own to their side", () => {
    const parsed = parseWithRules(
      "Wayne 6 punts, downed Own 12.",
      givenChain({ odk: ODK.Defense, down: 4, distance: 12, yardLine: 32 }),
    );
    assert.equal(parsed.kickerJersey, "6");
    assert.equal(parsed.playType, PlayType.PuntReceive);
    assert.equal(parsed.odk, ODK.Offense);
    assert.equal(parsed.result, Result.Downed);
    assert.equal(parsed.spotEncoding, "end:-12");
  });

  test("a two-point run is not a scrimmage rush", () => {
    const blocked = parseWithRules(
      "Wayne 2-pt run 6 THEM blank, good. 2 Pt. Block.",
      givenChain({ odk: ODK.Defense, down: 1, distance: 2, yardLine: 3 }),
    );
    assert.equal(blocked.playType, PlayType.TwoPointBlock);
    assert.equal(blocked.result, Result.Good);
    assert.equal(blocked.rusherJersey, undefined);
    assert.equal(blocked.confidence, "high");

    const ours = parseWithRules(
      "2-pt run 6, good.",
      givenChain({ odk: ODK.Offense, down: 1, distance: 2, yardLine: 3 }),
    );
    assert.equal(ours.playType, PlayType.TwoPoint);
    assert.equal(ours.result, Result.Good);
    assert.equal(ours.rusherJersey, "6");
  });

  test("interception return yards use the field, not the raw numbers", () => {
    const parsed = parseWithRules(
      "Pass 7 intercepted by 24, catch Opp 40, return Snider 20.",
      givenChain({ odk: ODK.Offense, down: 2, distance: 7, yardLine: 40 }),
    );
    assert.equal(parsed.result, Result.Interception);
    assert.equal(parsed.spotEncoding, "catch:40|end:-20");
    assert.equal(parsed.returnYards, 40);
  });

  test("a bare punt stays unconfirmed until the end spot is named", () => {
    const parsed = parseWithRules(
      "punt",
      givenChain({ odk: ODK.Offense, down: 4, distance: 8, yardLine: -35 }),
    );
    assert.equal(parsed.playType, PlayType.Punt);
    assert.equal(parsed.result, Result.Downed);
    assert.equal(parsed.confidence, "low");
    assert.equal(parsed.spotEncoding, undefined);
    assert.match(parsed.warnings.join(" "), /end spot/i);
  });

  test("a kickoff return without an end spot cannot confirm", () => {
    const parsed = parseWithRules("Snider 88 KO +18", openingDictatedChain());
    assert.equal(parsed.playType, PlayType.Kickoff);
    assert.equal(parsed.result, Result.Return);
    assert.equal(parsed.confidence, "low");
    assert.equal(parsed.spotEncoding, undefined);
    assert.match(parsed.warnings.join(" "), /end spot/i);
  });

  test("a punt that only names the end spot chains to that spot", () => {
    const parsed = parseWithRules(
      "Punt 88 to Opp 35.",
      givenChain({ odk: ODK.Offense, down: 4, distance: 10, yardLine: -40 }),
    );
    assert.equal(parsed.result, Result.Return);
    assert.equal(parsed.spotEncoding, "recv:35|end:35");
    const { next } = previewParsedPlay([], {
      ...parsed,
      down: 4,
      distance: 10,
      yardLine: -40,
      odk: ODK.Offense,
    });
    assert.equal(next.yardLine, 35);
  });

  test("downed and fair catch without a spot cannot confirm", () => {
    const downed = parseWithRules(
      "Punt 88 downed",
      givenChain({ odk: ODK.Offense, down: 4, distance: 5, yardLine: -30 }),
    );
    assert.equal(downed.result, Result.Downed);
    assert.equal(downed.confidence, "low");
    assert.equal(downed.spotEncoding, undefined);

    const fair = parseWithRules(
      "Punt 88 fair catch",
      givenChain({ odk: ODK.Offense, down: 4, distance: 5, yardLine: -30 }),
    );
    assert.equal(fair.result, Result.FairCatch);
    assert.equal(fair.confidence, "low");
    assert.equal(fair.spotEncoding, undefined);
  });

  test("a kickoff that names only the end spot counts return yards from the catch", () => {
    const parsed = parseWithRules("Snider 88 KO. OOB Own 38.", openingDictatedChain());
    assert.equal(parsed.playType, PlayType.Kickoff);
    assert.equal(parsed.result, Result.Return);
    assert.equal(parsed.spotEncoding, "catch:20|end:38");
    assert.equal(parsed.returnYards, 18);
    assert.equal(parsed.gainLoss, 18);
    assert.equal(parsed.confidence, "high");
  });

  test("a bare run word is not a zero-yard rush", () => {
    for (const note of ["run play", "run the clock"]) {
      const parsed = parseWithRules(note, givenChain({}));
      assert.equal(parsed.playType, undefined);
      assert.equal(parsed.result, undefined);
      assert.equal(parsed.confidence, "low");
    }
    const rushed = parseWithRules("Run 4, +9", givenChain({}));
    assert.equal(rushed.playType, PlayType.Run);
    assert.equal(rushed.result, Result.Rush);
    assert.equal(rushed.rusherJersey, "4");
    assert.equal(rushed.gainLoss, 9);
    assert.equal(rushed.confidence, "high");
  });

  test("an interception without an end spot cannot confirm", () => {
    const parsed = parseWithRules(
      "Pass 7 intercepted by 24",
      givenChain({ odk: ODK.Offense, down: 2, distance: 7, yardLine: 40 }),
    );
    assert.equal(parsed.result, Result.Interception);
    assert.equal(parsed.confidence, "low");
    assert.equal(parsed.spotEncoding, undefined);
  });
});

describe("scrimmage and pre-snap penalties", () => {
  test("pre-snap encroachment 5 yards vs D", () => {
    const parsed = parseWithRules(
      "Pre-snap encroachment defense 5 yards",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.equal(parsed.spotEncoding, "foul:-20|yd:5|vs:D|afd:0");
  });

  test("false start 5 yards vs O", () => {
    const parsed = parseWithRules(
      "False start offense 5 yards",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.equal(parsed.spotEncoding, "foul:-20|yd:5|vs:O|afd:0");
  });

  test("delay of game 5 yards vs O", () => {
    const parsed = parseWithRules(
      "Delay of game offense 5 yards",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.equal(parsed.spotEncoding, "foul:-20|yd:5|vs:O|afd:0");
  });

  test("incomplete pass with defensive pass interference", () => {
    const parsed = parseWithRules(
      "1st & 10 Own 20. Incomplete pass, pass interference defense 15 yards AFD",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.equal(parsed.spotEncoding, "foul:-20|yd:15|vs:D|afd:1");
  });

  test("completed pass wiped by offensive holding", () => {
    const parsed = parseWithRules(
      "2nd & 5 Opp 40. Complete 17 to 12 wiped: offensive holding 10 yards",
      givenChain({ odk: ODK.Offense, down: 2, distance: 5, yardLine: 40 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.deepEqual(decodePenalty(parsed.spotEncoding), {
      foulSpot: 40,
      yards: 10,
      against: "O",
      autoFirstDown: false,
    });
  });

  test("roughing the passer on an incomplete pass", () => {
    const parsed = parseWithRules(
      "Incomplete 17, roughing the passer defense 15 yards AFD",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.equal(parsed.spotEncoding, "foul:-20|yd:15|vs:D|afd:1");
  });

  test("run play with holding on offense", () => {
    const parsed = parseWithRules(
      "1st & 10 Own 20. Run 5, holding offense 10 yards",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.deepEqual(decodePenalty(parsed.spotEncoding), {
      foulSpot: -20,
      yards: 10,
      against: "O",
      autoFirstDown: false,
    });
  });

  test("run play wiped by penalty", () => {
    const parsed = parseWithRules(
      "2nd & 4 Carroll 44. Run to 43 wiped: holding 10 vs O from LOS",
      givenChain({ odk: ODK.Defense, down: 2, distance: 4, yardLine: 44 }),
    );
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.result, Result.Penalty);
    assert.deepEqual(decodePenalty(parsed.spotEncoding), {
      foulSpot: 44,
      yards: 10,
      against: "O",
      autoFirstDown: false,
    });
  });

  test("wiped play with next down mentioned remains penalty", () => {
    const parsed = parseWithRules(
      "Complete 17 to 12 wiped: offensive holding 10 yards. 1st & 20 next.",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.deepEqual(decodePenalty(parsed.spotEncoding), {
      foulSpot: -20,
      yards: 10,
      against: "O",
      autoFirstDown: false,
    });
  });

  test("interception wiped by penalty (wipes synonym) becomes penalty row", () => {
    const parsed = parseWithRules(
      "Pass 7 intercepted by 24, but defensive holding wipes the play 10 yards AFD",
      givenChain({ odk: ODK.Offense, down: 2, distance: 8, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.equal(parsed.spotEncoding, "foul:-20|yd:10|vs:D|afd:1");
  });

  test("run play with defensive facemask", () => {
    const parsed = parseWithRules(
      "Run 6 to Wayne 35. Facemask defense 15 yards AFD",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Run);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.spotEncoding, "foul:-20|yd:15|vs:D|afd:1");
  });

  test("declined penalty (catch stands)", () => {
    const parsed = parseWithRules(
      "3rd & 8 Own 22. Complete 17 to 12 to Own 48, +26. DPI declined — catch stands.",
      givenChain({ odk: ODK.Offense, down: 3, distance: 8, yardLine: -22 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Complete);
    assert.equal(parsed.gainLoss, 26);
  });

  test("waved off penalty (incomplete stands)", () => {
    const parsed = parseWithRules(
      "1st & 10 Snider 47. Incomplete 10. Penalty on the play waved off.",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -47 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Incomplete);
    assert.equal(parsed.gainLoss, 0);
  });

  test("notes mentioning next snap penalties", () => {
    const parsed = parseWithRules(
      "2nd & 7 Wayne 29. Incomplete 19 THEM blank. Defensive holding vs SHS next.",
      givenChain({ odk: ODK.Defense, down: 2, distance: 7, yardLine: 29 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Incomplete);
    assert.equal(parsed.gainLoss, 0);

    const falseStartNext = parseWithRules(
      "Run 4 to Snider 25, +5. False start offense 5 yards next.",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(falseStartNext.playType, PlayType.Run);
    assert.equal(falseStartNext.result, Result.Rush);
    assert.equal(falseStartNext.gainLoss, 5);

    const delayNext = parseWithRules(
      "Complete 17 to 12, +10. Then delay of game vs O.",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(delayNext.playType, PlayType.Pass);
    assert.equal(delayNext.result, Result.Complete);
    assert.equal(delayNext.gainLoss, 10);
  });

  test("offensive pass interference does not award automatic first down", () => {
    const parsed = parseWithRules(
      "1st & 10 Own 20. Incomplete pass, offensive pass interference 15 yards",
      givenChain({ odk: ODK.Offense, down: 1, distance: 10, yardLine: -20 }),
    );
    assert.equal(parsed.playType, PlayType.Pass);
    assert.equal(parsed.result, Result.Penalty);
    assert.equal(parsed.gainLoss, 0);
    assert.deepEqual(decodePenalty(parsed.spotEncoding), {
      foulSpot: -20,
      yards: 15,
      against: "O",
      autoFirstDown: false,
    });
  });
});
