// ============================================================
// Database connection singleton
// ============================================================
// This module opens ONE better-sqlite3 connection for the entire
// Next.js server process and reuses it. Opening a new connection
// per request would be slow and wasteful.
//
// Why better-sqlite3 (synchronous) and not an async driver?
// Because Next.js Server Components and Server Actions run in a
// Node.js context where synchronous I/O is fine — there is no
// event loop to block like in a raw HTTP server. Synchronous code
// is also simpler to read and debug.

import path from "path";
import BetterSqlite3 from "better-sqlite3";
import { ensureSchema } from "./schema";

// Resolve DB path relative to the project root (process.cwd()).
// During `next dev` and `next start` this is the repo root.
// db/lesson_tracker.db is .gitignore'd but the db/ directory is tracked.
const DB_PATH = path.join(process.cwd(), "db", "lesson_tracker.db");

// Module-level singleton: created once, reused across all requests.
// In Next.js dev mode, hot-reload can re-evaluate modules, so we
// cache on the global object to survive HMR restarts.
declare global {
  // eslint-disable-next-line no-var
  var __db: BetterSqlite3.Database | undefined;
}

function openDb(): BetterSqlite3.Database {
  const db = new BetterSqlite3(DB_PATH);
  // WAL mode allows readers and one writer to coexist, faster on SSDs.
  db.pragma("journal_mode = WAL");
  // NORMAL synchronous: safe for local use, faster than FULL.
  db.pragma("synchronous = NORMAL");
  // Ensure tables exist on every startup (idempotent).
  ensureSchema(db);
  return db;
}

export function getDb(): BetterSqlite3.Database {
  if (!global.__db) {
    global.__db = openDb();
  }
  return global.__db;
}
