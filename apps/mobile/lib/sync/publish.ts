import type { LocalPlay } from "../db/types";
import { listPlaysForGame } from "../db/plays";
import { getLocalGame, markGamePublished, recordPublishError } from "../db/games";
import {
  getSyncApiKey,
  getSyncApiUrl,
  getSyncApiUrlLabel,
} from "./config";
import { withTimeout } from "./timeout";
import type { SnapshotKind } from "./triggers";
import { playToPublishPayload } from "./publishPayload";

export type PublishResult = {
  slug: string;
  snapshotKind: SnapshotKind;
  playCount: number;
  rebuildTriggered: boolean;
};

const PUBLISH_TIMEOUT_MS = 30_000;

export { playToPublishPayload } from "./publishPayload";

export async function publishGameSnapshot(
  localGameId: string,
  snapshotKind: SnapshotKind,
): Promise<PublishResult> {
  const apiUrl = getSyncApiUrl();
  const apiKey = getSyncApiKey();

  if (!apiUrl) {
    throw new Error(
      "Cloud sync is not configured (EXPO_PUBLIC_SYNC_API_URL)",
    );
  }
  if (!apiKey) {
    throw new Error(
      "Cloud sync is not configured (EXPO_PUBLIC_SYNC_API_KEY)",
    );
  }

  const game = await getLocalGame(localGameId);
  if (!game) throw new Error("Local game not found");

  const plays = await listPlaysForGame(localGameId);

  const body = {
    slug: game.slug,
    teamCode: game.teamCode,
    opponent: game.opponent,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    status: game.status,
    phase: game.phase,
    snapshotKind,
    plays: plays.map(playToPublishPayload),
  };

  const response = await withTimeout(
    fetch(`${apiUrl}/v1/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    PUBLISH_TIMEOUT_MS,
    `Publish timed out — on a physical iPad use http://${getSyncApiUrlLabel() ?? "YOUR_MAC_IP"}:3001, not 127.0.0.1`,
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const message =
      text || `Publish failed (${response.status} ${response.statusText})`;
    await recordPublishError(localGameId, message);
    throw new Error(message);
  }

  const result = (await response.json()) as PublishResult;
  await markGamePublished(localGameId);
  return result;
}

export async function publishIfConfigured(
  localGameId: string,
  snapshotKind: SnapshotKind,
): Promise<PublishResult | null> {
  if (!getSyncApiUrl() || !getSyncApiKey()) return null;
  return publishGameSnapshot(localGameId, snapshotKind);
}
