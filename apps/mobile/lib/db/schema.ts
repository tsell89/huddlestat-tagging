export const SCHEMA_VERSION = 1;

export const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    team_code TEXT NOT NULL,
    opponent TEXT NOT NULL,
    convex_game_id TEXT,
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
    completion TEXT,
    synced INTEGER NOT NULL DEFAULT 0,
    convex_play_id TEXT,
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
