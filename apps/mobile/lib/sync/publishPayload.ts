import type { LocalPlay } from "../db/types";

/**
 * Playlist row for cloud publish. Dual-writes deprecated `completion` alias
 * (same value as spotEncoding) until all consumers migrate (ADR-0001).
 */
export function playToPublishPayload(play: LocalPlay) {
  const {
    id: _id,
    localGameId: _localGameId,
    synced: _synced,
    cloudPlayId: _cloudPlayId,
    taggedAt: _taggedAt,
    ...playlistData
  } = play;

  if (playlistData.spotEncoding === undefined) {
    return playlistData;
  }

  return {
    ...playlistData,
    completion: playlistData.spotEncoding,
  };
}
