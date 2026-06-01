import type { GamePhase, PlaylistData } from "@huddlestat/shared";
import { formatSituationLine } from "@/lib/tagging/formatSituation";

function phaseBadgeLabel(phase: GamePhase): string {
  switch (phase) {
    case "HALFTIME":
      return "Halftime";
    case "FINAL":
      return "Final";
    default:
      return phase;
  }
}

/** TaggingHeader-style line for QA logs. */
export function formatQaHeaderLine(
  draft: PlaylistData,
  phase: GamePhase,
): string {
  return `PLAY #${draft.playNumber} · Q${draft.quarter} · ${phaseBadgeLabel(phase)} · ${formatSituationLine(draft)}`;
}

/** Sidebar one-liner for a saved play. */
export function formatQaSidebarLine(play: PlaylistData): string {
  const gain =
    play.gainLoss !== 0
      ? ` (${play.gainLoss > 0 ? "+" : ""}${play.gainLoss})`
      : "";
  return `${play.playType} · ${play.result}${gain}`;
}

/** Compact tag summary for log search. */
export function formatQaTagSummary(play: PlaylistData): string {
  return formatQaSidebarLine(play);
}
