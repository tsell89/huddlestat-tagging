import type {
  GamePhase,
  GameStatus,
  Hash,
  ODK,
  OtPossession,
  PlayerRef,
  PlaylistData,
} from "@huddlestat/shared";

export type LocalGame = {
  id: string;
  slug: string;
  teamCode: string;
  opponent: string;
  /** Platform Postgres game id after link (optional). */
  cloudGameId: string | null;
  homeScore: number;
  awayScore: number;
  status: GameStatus;
  phase: GamePhase;
  otPossession: OtPossession | null;
  createdAt: number;
  updatedAt: number;
};

export type LocalPlay = PlaylistData & {
  id: string;
  localGameId: string;
  synced: boolean;
  /** Reserved for future per-play platform id; publish uses full snapshots. */
  cloudPlayId: string | null;
  taggedAt: number;
};

export type OutboxStatus = "pending" | "syncing" | "synced" | "failed";

/** Legacy FIFO outbox (unused); kept for schema compatibility. */
export type OutboxMutationType = "publish.snapshot";

export type OutboxItem = {
  id: string;
  localGameId: string | null;
  mutationType: OutboxMutationType;
  payload: Record<string, unknown>;
  createdAt: number;
  status: OutboxStatus;
  attempts: number;
  lastError: string | null;
  syncedAt: number | null;
};

export type PlayRow = {
  id: string;
  local_game_id: string;
  play_number: number;
  quarter: number;
  odk: ODK;
  yard_line: number;
  down: number;
  distance: number;
  hash: Hash;
  gain_loss: number;
  passer_json: string;
  receiver_json: string;
  rusher_json: string;
  result: string;
  team: string;
  tackler1_json: string;
  tackler2_json: string;
  recovered_by_json: string;
  return_yards: number | null;
  returner_json: string;
  play_type: string;
  kicker_json: string;
  kick_yards: number | null;
  intercepted_by_json: string;
  spot_encoding: string | null;
  synced: number;
  cloud_play_id: string | null;
  tagged_at: number;
};

function parsePlayerRef(json: string): PlayerRef {
  return JSON.parse(json) as PlayerRef;
}

export function rowToLocalPlay(row: PlayRow): LocalPlay {
  return {
    id: row.id,
    localGameId: row.local_game_id,
    playNumber: row.play_number,
    quarter: row.quarter,
    odk: row.odk,
    yardLine: row.yard_line,
    down: row.down,
    distance: row.distance,
    hash: row.hash,
    gainLoss: row.gain_loss,
    passer: parsePlayerRef(row.passer_json),
    receiver: parsePlayerRef(row.receiver_json),
    rusher: parsePlayerRef(row.rusher_json),
    result: row.result as LocalPlay["result"],
    team: row.team,
    tackler1: parsePlayerRef(row.tackler1_json),
    tackler2: parsePlayerRef(row.tackler2_json),
    recoveredBy: parsePlayerRef(row.recovered_by_json),
    returnYards: row.return_yards ?? undefined,
    returner: parsePlayerRef(row.returner_json),
    playType: row.play_type as LocalPlay["playType"],
    kicker: parsePlayerRef(row.kicker_json),
    kickYards: row.kick_yards ?? undefined,
    interceptedBy: parsePlayerRef(row.intercepted_by_json),
    spotEncoding: row.spot_encoding ?? undefined,
    synced: row.synced === 1,
    cloudPlayId: row.cloud_play_id,
    taggedAt: row.tagged_at,
  };
}

export function playToRow(play: LocalPlay): Omit<PlayRow, "synced" | "cloud_play_id"> & {
  synced: number;
  cloud_play_id: string | null;
} {
  return {
    id: play.id,
    local_game_id: play.localGameId,
    play_number: play.playNumber,
    quarter: play.quarter,
    odk: play.odk,
    yard_line: play.yardLine,
    down: play.down,
    distance: play.distance,
    hash: play.hash,
    gain_loss: play.gainLoss,
    passer_json: JSON.stringify(play.passer),
    receiver_json: JSON.stringify(play.receiver),
    rusher_json: JSON.stringify(play.rusher),
    result: play.result,
    team: play.team,
    tackler1_json: JSON.stringify(play.tackler1),
    tackler2_json: JSON.stringify(play.tackler2),
    recovered_by_json: JSON.stringify(play.recoveredBy),
    return_yards: play.returnYards ?? null,
    returner_json: JSON.stringify(play.returner),
    play_type: play.playType,
    kicker_json: JSON.stringify(play.kicker),
    kick_yards: play.kickYards ?? null,
    intercepted_by_json: JSON.stringify(play.interceptedBy),
    spot_encoding: play.spotEncoding ?? null,
    synced: play.synced ? 1 : 0,
    cloud_play_id: play.cloudPlayId,
    tagged_at: play.taggedAt,
  };
}
