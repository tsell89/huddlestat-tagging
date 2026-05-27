/** Position groups for roster sort and early-game jersey grid fallback (Gate 3). */
export const POSITION_GROUPS = {
  passer: ["QB"],
  rusher: ["RB", "FB", "QB"],
  receiver: ["WR", "TE", "RB"],
  tackler1: ["LB", "DE", "DT", "S", "CB", "OLB", "MLB"],
  tackler2: ["LB", "DE", "DT", "S", "CB", "OLB", "MLB"],
  kicker: ["K"],
  returner: ["WR", "RB", "CB", "S"],
  interceptedBy: ["CB", "S", "LB"],
  recoveredBy: ["DL", "LB", "DE", "DT"],
} as const;

export type PositionGroupSlot = keyof typeof POSITION_GROUPS;
