import type { GamePhase } from "@huddlestat/shared";

export type PhaseAdvanceAction = {
  label: string;
  nextPhase: GamePhase;
};

/** Single quarter/phase label for the tagging header (no duplicate Q1 · Q1). */
export function headerPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case "Q1":
    case "Q2":
    case "Q3":
    case "Q4":
      return phase;
    case "HALFTIME":
      return "Halftime";
    case "OT":
      return "OT";
    case "FINAL":
      return "Final";
  }
}

/** Next phase button in the header — linear flow; OT only when Q4 ends tied. */
export function phaseAdvanceAction(
  phase: GamePhase,
  homeScore: number,
  awayScore: number,
): PhaseAdvanceAction | null {
  if (phase === "FINAL") return null;

  const tied = homeScore === awayScore;

  switch (phase) {
    case "Q1":
      return { label: "Go to 2nd quarter", nextPhase: "Q2" };
    case "Q2":
      return { label: "Go to halftime", nextPhase: "HALFTIME" };
    case "HALFTIME":
      return { label: "Start 2nd half", nextPhase: "Q3" };
    case "Q3":
      return { label: "Go to 4th quarter", nextPhase: "Q4" };
    case "Q4":
      if (tied) {
        return { label: "Start overtime", nextPhase: "OT" };
      }
      return { label: "End game", nextPhase: "FINAL" };
    case "OT":
      return { label: "End game", nextPhase: "FINAL" };
    default:
      return null;
  }
}
