import type { PlaylistData } from "./index.js";

/**
 * Detect 23-col partial Hudl export shape from `parsePartialPlaylistCsv()`:
 * every play quarter=1, no kickYards, no spotEncoding.
 * Full Hudl 32-col or iPad export includes at least one of those signals.
 *
 * Platform `official_saturday` commits must reject this shape (see platform `hudlCanonical.ts`).
 */
export function looksLikePartial23ColPlaylist(plays: PlaylistData[]): boolean {
  if (plays.length < 10) return false;

  const allQuarterOne = plays.every((play) => play.quarter === 1);
  if (!allQuarterOne) return false;

  const hasKickYards = plays.some((play) => play.kickYards !== undefined);
  const hasSpotEncoding = plays.some((play) => Boolean(play.spotEncoding?.trim()));

  return !hasKickYards && !hasSpotEncoding;
}
