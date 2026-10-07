import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { playlistDataSchema } from "@huddlestat/shared";
import { createLiveBoxPublisher, liveBoxRequest, readLiveBoxConfig, type LiveBoxConfig } from "./liveBox.js";
import { confirmSnap, openingGame, type BrowserGame } from "./session.js";

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

  test("createLiveBoxPublisher skips publish when plays are empty by default, but publishes with allowEmpty", async () => {
    let fetchCount = 0;
    const publisher = createLiveBoxPublisher({
      getGame: () => openingGame("Northrop"),
      getConfig: () => ({
        slug: "dwenger-2026-10-09",
        teamCode: "SHS",
        publishPath: "/v1/tagger/publish",
      }),
      fetchFn: (async () => {
        fetchCount++;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as unknown as typeof fetch,
    });

    await publisher.publish();
    assert.equal(fetchCount, 0, "Should not publish empty plays by default");

    await publisher.publish({ allowEmpty: true });
    assert.equal(fetchCount, 1, "Publishes empty plays when allowEmpty: true");
  });

  test("createLiveBoxPublisher sequences concurrent publishes and sends latest state", async () => {
    const config: LiveBoxConfig = {
      slug: "dwenger-2026-10-09",
      teamCode: "SHS",
      publishPath: "/v1/tagger/publish",
    };

    const ready = confirmSnap(openingGame("Northrop"), "Snider is kicking off.");
    const game1 = confirmSnap(
      ready,
      "Snider 88 KO. #0 catch Own 20, OOB Own 38, +18.",
    );
    const game2 = confirmSnap(
      game1,
      "1st & 10 Northrop 38. Run 4 to Northrop 42, +4.",
    );

    let currentGame: BrowserGame = game1;
    let inFlight = 0;
    let maxInFlight = 0;
    const bodies: unknown[] = [];

    let resolveFirstFetch: () => void;
    const firstFetchBlocked = new Promise<void>((resolve) => {
      resolveFirstFetch = resolve;
    });

    let fetchCount = 0;
    const publisher = createLiveBoxPublisher({
      getGame: () => currentGame,
      getConfig: () => config,
      fetchFn: (async (_url: string, init?: RequestInit) => {
        fetchCount++;
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        bodies.push(JSON.parse(init?.body as string));

        if (fetchCount === 1) {
          await firstFetchBlocked;
        }

        inFlight--;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }) as unknown as typeof fetch,
    });

    // Start first publish (will block on firstFetchBlocked)
    const p1 = publisher.publish();
    assert.equal(publisher.isPublishing(), true);

    // While first is in flight, advance game state and trigger second publish
    currentGame = game2;
    const p2 = publisher.publish();

    // Max in-flight should remain 1 because second is queued
    assert.equal(maxInFlight, 1);

    // Unblock first fetch
    resolveFirstFetch!();
    await Promise.all([p1, p2]);

    assert.equal(maxInFlight, 1, "At most one fetch in flight at a time");
    assert.equal(bodies.length, 2, "Second publish fired after first completed");
    assert.equal((bodies[0] as { plays: unknown[] }).plays.length, 1);
    assert.equal((bodies[1] as { plays: unknown[] }).plays.length, 2);
    assert.equal(publisher.isPublishing(), false);
  });
});
