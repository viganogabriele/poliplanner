// ============================================================
// Database schema: CREATE TABLE statements and reset helper
// ============================================================
// This module is imported by db.ts to ensure tables exist on first
// connection. It is also used by the seed script to wipe and recreate.

import type Database from "better-sqlite3";

/**
 * Create all tables and indexes if they don't already exist.
 * Safe to call multiple times — IF NOT EXISTS prevents errors.
 */
export function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      weekday    INTEGER NOT NULL,          -- 0=Mon … 6=Sun
      subject    TEXT    NOT NULL,
      start_date TEXT    NOT NULL,          -- "YYYY-MM-DD"
      end_date   TEXT    NOT NULL,          -- "YYYY-MM-DD"
      mode       TEXT    NOT NULL DEFAULT 'asincrona'
    );

    CREATE TABLE IF NOT EXISTS lesson_occurrence (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      subject     TEXT    NOT NULL,
      weekday     INTEGER NOT NULL,
      lesson_date TEXT    NOT NULL,         -- "YYYY-MM-DD"
      mode        TEXT    NOT NULL,
      done        INTEGER NOT NULL DEFAULT 0,
      UNIQUE(subject, lesson_date)
    );

    CREATE INDEX IF NOT EXISTS idx_occurrence_lesson_date
      ON lesson_occurrence(lesson_date);

    CREATE INDEX IF NOT EXISTS idx_occurrence_done_date
      ON lesson_occurrence(done, lesson_date);

    CREATE INDEX IF NOT EXISTS idx_schedule_weekday
      ON schedule(weekday);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS study_plan (
      course_code    TEXT    PRIMARY KEY,
      year           INTEGER NOT NULL,
      is_soprannumero INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exams (
      course_code TEXT PRIMARY KEY,
      status      TEXT NOT NULL DEFAULT 'planned',
      grade       TEXT
    );
  `);
}

/**
 * Drop and recreate all tables.
 * Used by the seed script to start from a clean state.
 */
export function resetDatabase(db: Database.Database): void {
  db.exec(`
    DROP TABLE IF EXISTS lesson_occurrence;
    DROP TABLE IF EXISTS schedule;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS study_plan;
    DROP TABLE IF EXISTS exams;
  `);
  ensureSchema(db);
}
