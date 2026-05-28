/** Sidebar banner copy for catch-up / quarter-break review modes. */
export type CatchUpHint =
  | "generic"
  | "halftime-kickoff"
  | "quarter-review-q1"
  | "quarter-review-q2"
  | "quarter-review-q3"
  | "quarter-review-q4";

export function isQuarterBreakHint(hint: CatchUpHint | null): boolean {
  return hint !== null && hint !== "generic";
}

export function catchUpHintMessage(hint: CatchUpHint | null): string | null {
  if (!hint) return null;
  switch (hint) {
    case "generic":
      return "Catch-up mode — insert missed snap; clip alignment fixed on export.";
    case "halftime-kickoff":
      return "Halftime catch-up — review 1H in sidebar, then tag 2H kickoff @ Own 40.";
    case "quarter-review-q1":
      return "End of Q1 — review Q1 plays; fill missing tacklers, PBU, etc. in sidebar.";
    case "quarter-review-q2":
      return "Halftime — review 1H plays; fill missing stats before 2H kickoff.";
    case "quarter-review-q3":
      return "End of Q3 — review Q3 plays; fill missing tacklers, PBU, etc. in sidebar.";
    case "quarter-review-q4":
      return "End of Q4 — review Q4 plays before final; edit recent rows in sidebar.";
    default:
      return null;
  }
}
