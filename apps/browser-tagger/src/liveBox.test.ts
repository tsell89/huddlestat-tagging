import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { playlistDataSchema } from "@huddlestat/shared";
import { liveBoxRequest, readLiveBoxConfig } from "./liveBox.js";
import { confirmSnap, openingGame } from "./session.js";

describe("live box publish", () => {
  test("readLiveBoxConfig returns null when document or node is absent", () => {
    assert.equal(readLiveBoxConfig(), null);
    const mockEmptyDoc = {
      getElementById: () => null,
    } as unknown as Document;
    assert.equal(readLiveBoxConfig(mockEmptyDoc), null);
  });

  test("readLiveBoxConfig parses valid JSON and rejects invalid", () => {
    const mockValidDoc = {
      getElementById: (id: string) =>
        id === "live-box"
          ? {
              textContent: JSON.stringify({
                slug: "dwenger-2026-10-09",
                teamCode: "SHS",
                publishPath: "/v1/tagger/publish",
              }),
            }
          : null,
    } as unknown as Document;
    assert.deepEqual(readLiveBoxConfig(mockValidDoc), {
      slug: "dwenger-2026-10-09",
      teamCode: "SHS",
      publishPath: "/v1/tagger/publish",
    });

    const mockInvalidDoc = {
      getElementById: (id: string) =>
        id === "live-box" ? { textContent: "{ bad json" } : null,
    } as unknown as Document;
    assert.equal(readLiveBoxConfig(mockInvalidDoc), null);
  });

  test("a confirmed kickoff is the playlist the Dwenger box stores", () => {
    const ready = confirmSnap(openingGame("Northrop"), "Snider is kicking off.");
    const game = confirmSnap(
      ready,
      "Snider 88 KO. #0 catch Own 20, OOB Own 38, +18.",
    );
    const body = liveBoxRequest(game, {
      slug: "dwenger-2026-10-09",
      teamCode: "SHS",
      publishPath: "/v1/tagger/publish",
    });
    assert.equal(body.slug, "dwenger-2026-10-09");
    assert.equal(body.teamCode, "SHS");
    assert.equal(body.opponent, "Northrop");
    assert.equal(body.status, "live");
    assert.equal(body.snapshotKind, "live");
    assert.equal(body.phase, "Q1");
    assert.equal(body.plays.length, 1);
    assert.equal(body.homeScore, 0);
    assert.equal(body.awayScore, 0);
    assert.equal(playlistDataSchema.safeParse(body.plays[0]).success, true);
  });
});
