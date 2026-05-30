import * as SQLite from "expo-sqlite";
import { MIGRATIONS, MIGRATIONS_V2, MIGRATIONS_V3, SCHEMA_VERSION } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error("Database not initialized — call initDatabase() first");
  }
  return db;
}

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const database = await SQLite.openDatabaseAsync("huddlestat.db");
    await database.execAsync("PRAGMA journal_mode = WAL;");
    await database.withTransactionAsync(async () => {
      for (const sql of MIGRATIONS) {
        await database.execAsync(sql);
      }
      await migrateSchema(database);
    });
    db = database;
    return database;
  })();

  return initPromise;
}

type TableInfoRow = { name: string };

async function tableHasColumn(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
): Promise<boolean> {
  const cols = await database.getAllAsync<TableInfoRow>(
    `PRAGMA table_info(${table})`,
  );
  return cols.some((c) => c.name === column);
}

async function migrateSchema(
  database: SQLite.SQLiteDatabase,
): Promise<void> {
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM meta WHERE key = 'schema_version'`,
  );
  let version = row ? Number(row.value) : 1;

  if (version < 2) {
    if (!(await tableHasColumn(database, "plays", "quarter"))) {
      await database.execAsync(MIGRATIONS_V2[0]!);
    }
    if (!(await tableHasColumn(database, "games", "phase"))) {
      await database.execAsync(MIGRATIONS_V2[1]!);
    }
    if (!(await tableHasColumn(database, "games", "ot_possession"))) {
      await database.execAsync(MIGRATIONS_V2[2]!);
    }
    version = 2;
  }

  if (version < 3) {
    if (!(await tableHasColumn(database, "plays", "spot_encoding"))) {
      await database.execAsync(MIGRATIONS_V3[0]!);
    }
    await database.execAsync(MIGRATIONS_V3[1]!);
    version = 3;
  }

  await database.runAsync(
    `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
    ["schema_version", String(SCHEMA_VERSION)],
  );
}
