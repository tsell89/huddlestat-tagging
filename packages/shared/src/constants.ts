/** Offense / Defense / Kicking — our team's perspective */
export const ODK = {
  Offense: "O",
  Defense: "D",
  Kicking: "K",
} as const;

export type ODK = (typeof ODK)[keyof typeof ODK];

/** Hash mark alignment */
export const Hash = {
  Left: "L",
  Middle: "M",
  Right: "R",
} as const;

export type Hash = (typeof Hash)[keyof typeof Hash];

/** Hudl PlaylistData PLAY TYPE values */
export const PlayType = {
  Run: "Run",
  Pass: "Pass",
  Kickoff: "KO",
  KickoffReceive: "KO Rec",
  Punt: "Punt",
  PuntReceive: "Punt Rec",
  FieldGoal: "FG",
  ExtraPoint: "Extra Pt.",
  ExtraPointBlock: "Extra Pt. Block",
  TwoPoint: "2 Pt.",
  TwoPointBlock: "2 Pt. Block",
} as const;

export type PlayType = (typeof PlayType)[keyof typeof PlayType];

/** Hudl PlaylistData RESULT values (+ COP for game-state transitions) */
export const Result = {
  Rush: "Rush",
  Complete: "Complete",
  Incomplete: "Incomplete",
  Penalty: "Penalty",
  Good: "Good",
  NoGood: "No Good",
  Touchback: "Touchback",
  Return: "Return",
  RushTd: "Rush, TD",
  CompleteTd: "Complete, TD",
  Downed: "Downed",
  Sack: "Sack",
  Fumble: "Fumble",
  Interception: "Interception",
  Safety: "Safety",
  Blocked: "Blocked",
  Timeout: "Timeout",
  TippedPass: "Tipped Pass",
  /** Punt fair catch — same chain as Downed (ball dead at catch spot). */
  FairCatch: "Fair Catch",
  /** Change of possession — failed 4th down conversion (not punt) */
  Cop: "COP",
} as const;

export type Result = (typeof Result)[keyof typeof Result];

export type YardLine = number;

export type PlayerRef = { jersey: string; name: string };

export const emptyPlayerRef: PlayerRef = { jersey: "", name: "" };
