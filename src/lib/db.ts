import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { ensureSchema } from "./schema";

/** Percorso relativo di default: risolto a runtime rispetto alla directory di lavoro. */
const DEFAULT_DB_RELATIVE_PATH = "db/lesson_tracker.db";

/**
 * Percorso del file SQLite.
 *
 * Due accorgimenti, entrambi per il tracciamento delle dipendenze del build:
 *
 * - `path.resolve` su un percorso relativo usa già la directory di lavoro corrente, quindi non
 *   serve nominare `process.cwd()`;
 * - il percorso resta comunque dinamico (dipende da una variabile d'ambiente), e di fronte a un
 *   percorso dinamico Turbopack marcherebbe l'intero progetto come dipendenza del server
 *   ("Encountered unexpected file in NFT list"). Il commento `turbopackIgnore` dice al tracer
 *   che questo percorso è un dato di runtime, non un file da includere nel bundle.
 */
export function getDatabasePath(): string {
  const configured = process.env.POLIPLANNER_DB_PATH?.trim();
  return path.resolve(/* turbopackIgnore: true */ configured || DEFAULT_DB_RELATIVE_PATH);
}

declare global {
  var __db: BetterSqlite3.Database | undefined;
  var __dbPath: string | undefined;
}

function openDb(dbPath: string): BetterSqlite3.Database {
  fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(dbPath), { recursive: true });
  const db = new BetterSqlite3(/* turbopackIgnore: true */ dbPath);
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
