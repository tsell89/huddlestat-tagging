import type { GamePhase } from "@huddlestat/shared";

export type SnapshotKind = "live" | "halftime" | "final";

/** Milestone when the tagger changes game phase via the phase bar. */
export function snapshotKindForPhaseChange(
  from: GamePhase,
  to: GamePhase,
): SnapshotKind | null {
  if (to === "HALFTIME" && from === "Q2") return "halftime";
  if (to === "Q3" && from === "HALFTIME") return "live";
  if (to === "FINAL") return "final";
  return null;
}

/** Manual Sync now — pick the best label for the current game state. */
export function snapshotKindForManualSync(input: {
  phase: GamePhase;
  status: "pregame" | "live" | "final";
}): SnapshotKind {
  if (input.status === "final" || input.phase === "FINAL") return "final";
  if (input.phase === "HALFTIME") return "halftime";
  return "live";
}
