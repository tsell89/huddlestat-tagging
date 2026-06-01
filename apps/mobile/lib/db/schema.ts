export const SCHEMA_VERSION = 6;

/** Idempotent upgrades from SCHEMA_VERSION 1 → 2. */
export const MIGRATIONS_V2 = [
  `ALTER TABLE plays ADD COLUMN quarter INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE games ADD COLUMN phase TEXT NOT NULL DEFAULT 'Q1'`,
  `ALTER TABLE games ADD COLUMN ot_possession TEXT`,
] as const;

/** Idempotent upgrades from SCHEMA_VERSION 2 → 3 (completion → spot_encoding). */
export const MIGRATIONS_V3 = [
  `ALTER TABLE plays ADD COLUMN spot_encoding TEXT`,
  `UPDATE plays SET spot_encoding = completion WHERE spot_encoding IS NULL AND completion IS NOT NULL`,
] as const;

/** Idempotent upgrades from SCHEMA_VERSION 3 → 4 (drop legacy completion column). */
export const MIGRATIONS_V4 = [
  `ALTER TABLE plays DROP COLUMN completion`,
] as const;

/** Idempotent upgrades from SCHEMA_VERSION 4 → 5 (automatic QA session log). */
export const MIGRATIONS_V5 = [
  `CREATE TABLE IF NOT EXISTS qa_log (
    id TEXT PRIMARY KEY NOT NULL,
    local_game_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    entry_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (local_game_id) REFERENCES games(id)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_qa_log_game ON qa_log(local_game_id, seq);`,
] as const;

/** Rename legacy Convex-era remote id columns (v5 → v6). */
export const MIGRATIONS_V6 = [
  `ALTER TABLE games RENAME COLUMN convex_game_id TO cloud_game_id`,
  `ALTER TABLE plays RENAME COLUMN convex_play_id TO cloud_play_id`,
] as const;

export const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    team_code TEXT NOT NULL,
    opponent TEXT NOT NULL,
    cloud_game_id TEXT,
    home_score INTEGER NOT NULL DEFAULT 0,
    away_score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pregame',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS plays (
    id TEXT PRIMARY KEY NOT NULL,
    local_game_id TEXT NOT NULL,
    play_number INTEGER NOT NULL,
    odk TEXT NOT NULL,
    yard_line INTEGER NOT NULL,
    down INTEGER NOT NULL,
    distance INTEGER NOT NULL,
    hash TEXT NOT NULL,
    gain_loss INTEGER NOT NULL,
    passer_json TEXT NOT NULL,
    receiver_json TEXT NOT NULL,
    rusher_json TEXT NOT NULL,
    result TEXT NOT NULL,
    team TEXT NOT NULL,
    tackler1_json TEXT NOT NULL,
    tackler2_json TEXT NOT NULL,
    recovered_by_json TEXT NOT NULL,
    return_yards INTEGER,
    returner_json TEXT NOT NULL,
    play_type TEXT NOT NULL,
    kicker_json TEXT NOT NULL,
    kick_yards INTEGER,
    intercepted_by_json TEXT NOT NULL,
    spot_encoding TEXT,
    synced INTEGER NOT NULL DEFAULT 0,
    cloud_play_id TEXT,
    tagged_at INTEGER NOT NULL,
    FOREIGN KEY (local_game_id) REFERENCES games(id),
    UNIQUE(local_game_id, play_number)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_plays_game ON plays(local_game_id, play_number);`,
  `CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY NOT NULL,
    local_game_id TEXT,
    mutation_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    synced_at INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(status, created_at);`,
  `CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,
];
