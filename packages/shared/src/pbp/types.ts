import type { PlaylistData } from "../index.js";

export type PbpRules = "HS" | "NCAA" | "NFL";

export type PbpGameMeta = {
  gameId: string;
  rules: PbpRules;
  source: "hudl" | "cfbd" | "nflverse" | "hand";
  teamOffense: string;
  teamDefense: string;
  periods: number;
  overtime?: boolean;
  redacted?: boolean;
  description?: string;
  /** Play numbers where chain replay is skipped (timeout, kneel, new drive, etc.) */
  skipReplayAfter?: number[];
  halftimeAfterPlay?: number;
};

export type PbpScenarioMeta = PbpGameMeta & {
  scenarioId: string;
};

export type PbpScenarioFile = {
  meta: PbpScenarioMeta;
  plays: PlaylistData[];
};

export type ReplayMismatch = {
  afterPlayNumber: number;
  field: string;
  expected: unknown;
  actual: unknown;
  savedPlayType?: string;
  savedResult?: string;
};

export type PbpExpectation = {
  afterPlayNumber: number;
  trustFeed?: boolean;
  review?: boolean;
  skipReplay?: boolean;
  down?: number;
  distance?: number;
  yardLine?: number;
};
