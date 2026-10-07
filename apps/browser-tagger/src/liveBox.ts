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

export type LiveBoxPublisher = {
  publish: (options?: { allowEmpty?: boolean }) => Promise<void>;
  isPublishing: () => boolean;
};

export function createLiveBoxPublisher(options: {
  getGame: () => BrowserGame;
  getConfig?: () => LiveBoxConfig | null;
  onError?: (message: string) => void;
  fetchFn?: typeof fetch;
}): LiveBoxPublisher {
  const getConfig = options.getConfig ?? (() => readLiveBoxConfig());
  const fetchFn = options.fetchFn ?? (typeof fetch !== "undefined" ? fetch : undefined);
  let isPublishing = false;
  let hasPending = false;
  let pendingAllowEmpty = false;

  async function publish(publishOptions?: { allowEmpty?: boolean }) {
    const allowEmpty = publishOptions?.allowEmpty ?? false;
    const config = getConfig();
    const game = options.getGame();
    if (!config || (!allowEmpty && game.plays.length === 0) || !fetchFn) return;

    if (isPublishing) {
      hasPending = true;
      if (allowEmpty) pendingAllowEmpty = true;
      return;
    }

    isPublishing = true;
    let currentAllowEmpty = allowEmpty;
    try {
      do {
        hasPending = false;
        const allowThisRound = currentAllowEmpty || pendingAllowEmpty;
        pendingAllowEmpty = false;
        currentAllowEmpty = false;

        const currentConfig = getConfig();
        const currentGame = options.getGame();
        if (!currentConfig || (!allowThisRound && currentGame.plays.length === 0)) break;

        const payload = liveBoxRequest(currentGame, currentConfig);
        try {
          const response = await fetchFn(currentConfig.publishPath, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const data = (await response.json().catch(() => null)) as { message?: string } | null;
            options.onError?.(data?.message || "The live box did not update.");
          }
        } catch {
          options.onError?.("The live box did not update.");
        }
      } while (hasPending);
    } finally {
      isPublishing = false;
      pendingAllowEmpty = false;
    }
  }

  return {
    publish,
    isPublishing: () => isPublishing,
  };
}
