import * as SQLite from "expo-sqlite";
import { MIGRATIONS, SCHEMA_VERSION } from "./schema";

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
      await database.runAsync(
        `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)`,
        ["schema_version", String(SCHEMA_VERSION)],
      );
    });
    db = database;
    return database;
  })();

  return initPromise;
}
