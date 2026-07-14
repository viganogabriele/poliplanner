import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { ensureSchema } from "./schema";

export function getDatabasePath(): string {
  const configured = process.env.POLIPLANNER_DB_PATH?.trim();
  return path.resolve(configured || path.join(/* turbopackIgnore: true */ process.cwd(), "db", "lesson_tracker.db"));
}

declare global {
  var __db: BetterSqlite3.Database | undefined;
  var __dbPath: string | undefined;
}

function openDb(dbPath: string): BetterSqlite3.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new BetterSqlite3(dbPath);
  try {
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    ensureSchema(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function getDb(): BetterSqlite3.Database {
  const dbPath = getDatabasePath();
  if (!global.__db || global.__dbPath !== dbPath) {
    global.__db?.close();
    global.__db = openDb(dbPath);
    global.__dbPath = dbPath;
  }
  return global.__db;
}

/** Test helper: close the singleton so another isolated path can be opened. */
export function closeDb(): void {
  global.__db?.close();
  global.__db = undefined;
  global.__dbPath = undefined;
}
