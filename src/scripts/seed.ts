// ============================================================
// Script: pnpm db:seed
// ============================================================
// Wipes the database and inserts realistic example data.
// Run: pnpm db:seed
//
// This is a standalone Node script (not part of Next.js).
// It uses tsx to run TypeScript directly without compiling.
// It imports the same db/schema/seed modules the app uses,
// ensuring consistency.

import path from "path";
import BetterSqlite3 from "better-sqlite3";
import { resetDatabase } from "../lib/schema";
import { seedDatabase } from "../lib/seed";

const DB_PATH = path.join(process.cwd(), "db", "lesson_tracker.db");

console.log(`Seeding database at: ${DB_PATH}`);

const db = new BetterSqlite3(DB_PATH);
db.pragma("journal_mode = WAL");

console.log("Dropping and recreating tables…");
resetDatabase(db);

console.log("Inserting seed data…");
seedDatabase(db);

// Quick summary
const scheduleCount = (db.prepare("SELECT COUNT(*) AS c FROM schedule").get() as { c: number }).c;
const occCount = (db.prepare("SELECT COUNT(*) AS c FROM lesson_occurrence").get() as { c: number }).c;
const doneCount = (db.prepare("SELECT COUNT(*) AS c FROM lesson_occurrence WHERE done = 1").get() as { c: number }).c;

console.log(`Done:`);
console.log(`  Schedule rows: ${scheduleCount}`);
console.log(`  Lesson occurrences: ${occCount}`);
console.log(`  Done: ${doneCount} / ${occCount}`);

db.close();
