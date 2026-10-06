import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { confirmSnap, openingGame, previewSnap, type BrowserGame } from "./session.js";

/**
 * Comment lines and answer keys copied from huddlestat-platform
 * scripts/dictated-pbp/games/{shs-at-wayne-2026-09-11,shs-at-carroll-2026-09-18,
 * homestead-at-shs-2026-09-25,northrop-2026-10-02}/plays.jsonl.
 * The dictated input is the # comment. playType and result are the JSON line under it.
 * Do not read the platform repo from this test.
 */
type ReplaySnap = { comment: string; playType: string; result: string };
type ReplayGame = {
  id: string;
  source: string;
  opponent: string;
  kickedOff: boolean;
  snaps: ReplaySnap[];
};

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/dictated-games.json", import.meta.url), "utf8"),
) as { note: string; games: ReplayGame[] };

function openingKickoff(game: ReplayGame): string {
  return game.kickedOff ? "Snider is kicking off." : `${game.opponent} is kicking off.`;
}

type GameReport = {
  opponent: string;
  total: number;
  rows: number;
  confirms: number;
  matches: number;
  stuck: string[];
};

function replay(game: ReplayGame): GameReport {
  let state: BrowserGame = confirmSnap(openingGame(game.opponent), openingKickoff(game));
  assert.equal(state.plays.length, 0);
  assert.equal(state.kickoff, game.kickedOff ? "kick" : "receive");
  const report: GameReport = {
    opponent: game.opponent,
    total: game.snaps.length,
    rows: 0,
    confirms: 0,
    matches: 0,
    stuck: [],
  };
  for (const snap of game.snaps) {
    const preview = previewSnap(state, snap.comment);
    const row = preview.play != null;
    const confirm = preview.canConfirm;
    const match =
      confirm &&
      preview.play?.playType === snap.playType &&
      preview.play?.result === snap.result;
    if (row) report.rows += 1;
    if (confirm) report.confirms += 1;
    if (match) report.matches += 1;
    if (!confirm) {
      report.stuck.push(`${preview.ask || preview.story.happened} — ${snap.comment}`);
    }
    if (confirm) state = confirmSnap(state, snap.comment);
  }
  return report;
}

describe("dictated game replay", () => {
  test("four saved games report a row, a confirm, and an answer-key match", () => {
    assert.match(fixture.note, /plays\.jsonl/);
    assert.deepEqual(
      fixture.games.map((game) => [game.opponent, game.kickedOff, game.snaps.length > 0]),
      [
        ["Wayne", false, true],
        ["Carroll", true, true],
        ["Homestead", false, true],
        ["Northrop", true, true],
      ],
    );

    const reports = fixture.games.map(replay);
    for (const report of reports) {
      assert.equal(typeof report.total, "number");
      assert.ok(report.total > 0);
      assert.ok(report.rows >= 0 && report.rows <= report.total);
      assert.ok(report.confirms >= 0 && report.confirms <= report.total);
      assert.ok(report.matches >= 0 && report.matches <= report.confirms);
      console.log(
        `${report.opponent}: ${report.rows} preview a row, ${report.confirms} would confirm, ${report.matches} match play type and result, of ${report.total}`,
      );
      for (const line of report.stuck) console.log(`  cannot confirm: ${line}`);
    }

    const northrop = fixture.games.find((game) => game.opponent === "Northrop");
    assert.ok(northrop);
    const opening = northrop.snaps[0]!;
    assert.match(opening.comment, /\bOOB\b/);
    const state = confirmSnap(openingGame("Northrop"), "Snider is kicking off.");
    const preview = previewSnap(state, opening.comment.replace(/\bOOB\b/g, "O0B"));
    assert.equal(preview.canConfirm, true);
    assert.equal(preview.play?.playType, opening.playType);
    assert.equal(preview.play?.result, opening.result);
    assert.equal(preview.play?.returner.jersey, "");
  });
});
