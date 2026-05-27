import { PlayType, Result, type PlaylistData, type PlayerRef } from "@huddlestat/shared";
import type { LocalPlay } from "../db/types";
import { POSITION_GROUPS, type PositionGroupSlot } from "./positionGroups";
import { isPlayerSlotVisibleOnPlay } from "./visiblePlayerSlots";

export type JerseyGridTier = "hero" | "frequent" | "standard" | "small";

export type JerseyGridEntry = {
  jersey: string;
  count: number;
  tier: JerseyGridTier;
};

const TIER_RANK: Record<JerseyGridTier, number> = {
  hero: 4,
  frequent: 3,
  standard: 2,
  small: 1,
};

type TierThresholds = {
  hero: number;
  frequent: number;
  standard: number;
  small: number;
};

const RUSHER_RECEIVER_THRESHOLDS: TierThresholds = {
  hero: 25,
  frequent: 10,
  standard: 5,
  small: 1,
};

const TACKLER_THRESHOLDS: TierThresholds = {
  hero: 6,
  frequent: 3,
  standard: 2,
  small: 1,
};

const DEFAULT_THRESHOLDS: TierThresholds = {
  hero: 8,
  frequent: 4,
  standard: 2,
  small: 1,
};

/** Two-deep demo jerseys per position until roster sync (Gate 3). */
const TWO_DEEP_BY_POSITION: Record<string, readonly [string, string]> = {
  QB: ["7", "12"],
  RB: ["2", "22"],
  FB: ["34", "44"],
  WR: ["1", "11"],
  TE: ["83", "84"],
  LB: ["45", "55"],
  DE: ["91", "92"],
  DT: ["72", "73"],
  S: ["21", "24"],
  CB: ["3", "23"],
  OLB: ["50", "51"],
  MLB: ["54", "56"],
  K: ["33", "30"],
  DL: ["90", "94"],
};

function jerseyFrom(ref: PlayerRef): string | null {
  const jersey = ref.jersey?.trim();
  return jersey ? jersey : null;
}

function thresholdsForSlot(slot: PositionGroupSlot): TierThresholds {
  switch (slot) {
    case "rusher":
    case "receiver":
      return RUSHER_RECEIVER_THRESHOLDS;
    case "tackler1":
    case "tackler2":
      return TACKLER_THRESHOLDS;
    default:
      return DEFAULT_THRESHOLDS;
  }
}

function tierForCount(count: number, thresholds: TierThresholds): JerseyGridTier {
  if (count >= thresholds.hero) return "hero";
  if (count >= thresholds.frequent) return "frequent";
  if (count >= thresholds.standard) return "standard";
  return "small";
}

function buildFallbackJerseys(slot: PositionGroupSlot): string[] {
  const jerseys: string[] = [];
  const seen = new Set<string>();
  for (const position of POSITION_GROUPS[slot]) {
    const pair = TWO_DEEP_BY_POSITION[position] ?? ["88", "89"];
    for (const jersey of pair) {
      if (!seen.has(jersey)) {
        seen.add(jersey);
        jerseys.push(jersey);
      }
    }
  }
  return jerseys;
}

function addCount(counts: Map<string, number>, jersey: string | null, weight = 1): void {
  if (!jersey || weight <= 0) return;
  counts.set(jersey, (counts.get(jersey) ?? 0) + weight);
}

function countJerseyUsage(plays: LocalPlay[], slot: PositionGroupSlot): Map<string, number> {
  const counts = new Map<string, number>();

  for (const play of plays) {
    if (!isPlayerSlotVisibleOnPlay(play, slot)) continue;

    switch (slot) {
      case "passer":
        addCount(counts, jerseyFrom(play.passer));
        break;
      case "rusher":
        addCount(counts, jerseyFrom(play.rusher));
        break;
      case "receiver":
        addCount(counts, jerseyFrom(play.receiver));
        break;
      case "tackler1":
        if (play.playType === PlayType.Pass && play.result === Result.TippedPass) {
          addCount(counts, jerseyFrom(play.tackler1), 0.5);
        } else {
          addCount(counts, jerseyFrom(play.tackler1));
        }
        break;
      case "tackler2":
        addCount(counts, jerseyFrom(play.tackler2));
        break;
      case "kicker":
        addCount(counts, jerseyFrom(play.kicker));
        break;
      case "returner":
        addCount(counts, jerseyFrom(play.returner));
        break;
      case "interceptedBy":
        addCount(counts, jerseyFrom(play.interceptedBy));
        break;
      case "recoveredBy":
        addCount(counts, jerseyFrom(play.recoveredBy));
        break;
    }
  }

  return counts;
}

function capTacklerHero(entries: JerseyGridEntry[]): JerseyGridEntry[] {
  const heroes = entries.filter((entry) => entry.tier === "hero");
  if (heroes.length <= 1) return entries;

  const topHero = [...heroes].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.jersey.localeCompare(b.jersey, undefined, { numeric: true });
  })[0];

  return entries.map((entry) =>
    entry.tier === "hero" && entry.jersey !== topHero.jersey
      ? { ...entry, tier: "frequent" as const }
      : entry,
  );
}

function sortEntries(entries: JerseyGridEntry[]): JerseyGridEntry[] {
  return [...entries].sort((a, b) => {
    const tierDiff = TIER_RANK[b.tier] - TIER_RANK[a.tier];
    if (tierDiff !== 0) return tierDiff;
    if (b.count !== a.count) return b.count - a.count;
    return a.jersey.localeCompare(b.jersey, undefined, { numeric: true });
  });
}

export function buildJerseyGridRankings(
  plays: LocalPlay[],
  slot: PositionGroupSlot,
): JerseyGridEntry[] {
  const counts = countJerseyUsage(plays, slot);
  const totalUsage = [...counts.values()].reduce((sum, count) => sum + count, 0);

  if (totalUsage === 0) {
    return buildFallbackJerseys(slot).map((jersey) => ({
      jersey,
      count: 0,
      tier: "standard" as const,
    }));
  }

  const thresholds = thresholdsForSlot(slot);
  const fallback = buildFallbackJerseys(slot);
  const jerseys = new Set([...counts.keys(), ...fallback]);

  let entries: JerseyGridEntry[] = [...jerseys].map((jersey) => {
    const count = counts.get(jersey) ?? 0;
    return {
      jersey,
      count,
      tier: count > 0 ? tierForCount(count, thresholds) : "small",
    };
  });

  if (slot === "tackler1" || slot === "tackler2") {
    entries = capTacklerHero(entries);
  }

  return sortEntries(entries);
}

export function getGamePasserLeader(plays: LocalPlay[]): string | null {
  const counts = countJerseyUsage(plays, "passer");
  if (counts.size === 0) return null;

  let leader: string | null = null;
  let maxCount = -1;
  for (const [jersey, count] of counts) {
    if (
      count > maxCount ||
      (count === maxCount &&
        (leader === null ||
          jersey.localeCompare(leader, undefined, { numeric: true }) < 0))
    ) {
      leader = jersey;
      maxCount = count;
    }
  }
  return leader;
}

/** Pre-fill passer on new PassPad snaps with the game leader QB. */
export function applyPasserLeaderDefault(
  draft: PlaylistData,
  plays: LocalPlay[],
): PlaylistData {
  if (draft.playType !== PlayType.Pass) return draft;
  if (draft.passer.jersey.trim()) return draft;

  const leader = getGamePasserLeader(plays);
  if (!leader) return draft;

  return {
    ...draft,
    passer: { ...draft.passer, jersey: leader, name: draft.passer.name || "" },
  };
}
