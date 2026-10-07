import { deriveScoreFromPlays, type GamePhase } from "@huddlestat/shared";
import type { BrowserGame } from "./session.js";

export type LiveBoxConfig = {
  slug: string;
  teamCode: string;
  publishPath: string;
};

export type LiveBoxRequest = {
  slug: string;
  teamCode: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "final";
  phase: GamePhase;
  snapshotKind: "live" | "final";
  plays: BrowserGame["plays"];
};

export function readLiveBoxConfig(doc?: Document): LiveBoxConfig | null {
  const target = doc ?? (typeof document !== "undefined" ? document : null);
  if (!target) return null;
  const node = target.getElementById("live-box");
  if (!node?.textContent?.trim()) return null;
  try {
    const parsed = JSON.parse(node.textContent) as Partial<LiveBoxConfig>;
    if (!parsed.slug?.trim() || !parsed.teamCode?.trim() || !parsed.publishPath?.trim()) {
      return null;
    }
    return {
      slug: parsed.slug.trim(),
      teamCode: parsed.teamCode.trim(),
      publishPath: parsed.publishPath.trim(),
    };
  } catch {
    return null;
  }
}

export function liveBoxRequest(game: BrowserGame, config: LiveBoxConfig): LiveBoxRequest {
  const score = deriveScoreFromPlays(game.plays);
  const last = game.plays[game.plays.length - 1];
  const finished = game.phase === "final";
  let phase: GamePhase = "Q1";
  if (finished) phase = "FINAL";
  else if (game.phase === "ot" || (last && last.quarter >= 5)) phase = "OT";
  else if (last) phase = `Q${last.quarter}` as GamePhase;
  return {
    slug: config.slug,
    teamCode: config.teamCode,
    opponent: game.opponent.trim() || "Opponent",
    homeScore: score.us,
    awayScore: score.them,
    status: finished ? "final" : "live",
    phase,
    snapshotKind: finished ? "final" : "live",
    plays: game.plays,
  };
}
