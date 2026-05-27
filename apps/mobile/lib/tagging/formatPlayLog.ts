import {
  displayYardLine,
  formatDownDistance,
  type PlayerRef,
} from "@huddlestat/shared";
import type { LocalPlay } from "@/lib/db/types";

export function formatPlayPlayers(play: LocalPlay): string {
  const parts: string[] = [];
  const add = (label: string, p: PlayerRef) => {
    if (p.jersey) parts.push(`${label} #${p.jersey}`);
  };
  add("K", play.kicker);
  add("Ret", play.returner);
  add("Rush", play.rusher);
  add("Pass", play.passer);
  if (play.receiver.jersey) parts.push(`→ #${play.receiver.jersey}`);
  add("T1", play.tackler1);
  add("T2", play.tackler2);
  if (play.returnYards !== undefined && play.returnYards !== 0) {
    parts.push(`ret ${play.returnYards > 0 ? "+" : ""}${play.returnYards}`);
  }
  return parts.join(" · ") || "—";
}

export function formatPlaySituation(play: LocalPlay): string {
  return `${formatDownDistance(play.down, play.distance)} @ ${displayYardLine(play.yardLine)} (${play.hash})`;
}
