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

    CREATE TABLE IF NOT EXISTS study_plan_cycles (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year         TEXT    NOT NULL,
      student_year          INTEGER NOT NULL CHECK (student_year IN (1, 2, 3)),
      track                 TEXT    NOT NULL CHECK (track IN ('I3I', 'I3C')),
      validation_mode       TEXT    NOT NULL CHECK (validation_mode IN ('annual_submission', 'second_semester_revision')),
      status                TEXT    NOT NULL CHECK (status IN ('draft', 'ready', 'polimi_compiled', 'archived')),
      approval_status       TEXT    CHECK (approval_status IN ('auto_approved_after_deadline', 'needs_commission_review')),
      revision_of_cycle_id  INTEGER,
      compiled_on_polimi_at TEXT,
      created_at            TEXT    NOT NULL,
      updated_at            TEXT    NOT NULL,
      FOREIGN KEY (revision_of_cycle_id) REFERENCES study_plan_cycles(id)
    );

    CREATE INDEX IF NOT EXISTS idx_plan_cycles_status
      ON study_plan_cycles(status);

    CREATE TABLE IF NOT EXISTS study_plan_entries (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id         INTEGER NOT NULL,
      course_code      TEXT    NOT NULL,
      course_year      INTEGER NOT NULL CHECK (course_year IN (1, 2, 3)),
      position         TEXT    NOT NULL CHECK (position IN ('effective', 'supernumerary')),
      origin           TEXT    NOT NULL CHECK (origin IN ('recommended', 'carried_over', 'new_frequency', 'recovery_reinserted', 'free_choice')),
      is_new_frequency INTEGER NOT NULL DEFAULT 1,
      fee_counted      INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT    NOT NULL,
      UNIQUE(cycle_id, course_code),
      FOREIGN KEY (cycle_id) REFERENCES study_plan_cycles(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_plan_entries_cycle
      ON study_plan_entries(cycle_id);

    CREATE TABLE IF NOT EXISTS exams (
      course_code TEXT PRIMARY KEY,
      status      TEXT NOT NULL DEFAULT 'planned',
      grade       TEXT,
      passed_at   TEXT,
      registered_at TEXT,
      updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  migrateExamSchema(db);
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
    DROP TABLE IF EXISTS study_plan_entries;
    DROP TABLE IF EXISTS study_plan_cycles;
    DROP TABLE IF EXISTS study_plan;
    DROP TABLE IF EXISTS exams;
  `);
  ensureSchema(db);
}

function migrateExamSchema(db: Database.Database): void {
  const columns = db.prepare("PRAGMA table_info(exams)").all() as { name: string }[];
  const names = new Set(columns.map((column) => column.name));

  if (!names.has("passed_at")) {
    db.exec("ALTER TABLE exams ADD COLUMN passed_at TEXT");
  }
  if (!names.has("registered_at")) {
    db.exec("ALTER TABLE exams ADD COLUMN registered_at TEXT");
  }
  if (!names.has("updated_at")) {
    db.exec("ALTER TABLE exams ADD COLUMN updated_at TEXT");
  }

  db.exec(`
    UPDATE exams SET status = 'passed_registered', registered_at = COALESCE(registered_at, CURRENT_TIMESTAMP)
      WHERE status = 'passed';
    UPDATE exams SET status = 'no_class'
      WHERE status = 'noclass';
    UPDATE exams SET status = 'not_required'
      WHERE status = 'notrequired';
    UPDATE exams SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP);
  `);
}
