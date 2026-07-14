import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

export const SCHEMA_VERSION = 2;

const TABLES = [
  "lesson_occurrence",
  "schedule",
  "study_plan_entries",
  "study_plan_cycles",
  "study_plan",
  "exams",
  "settings",
] as const;

function createSchemaV2(db: Database.Database): void {
  db.exec(`
    CREATE TABLE settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE schedule (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      weekday     INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
      subject     TEXT NOT NULL CHECK (length(trim(subject)) BETWEEN 1 AND 120),
      course_code TEXT CHECK (course_code IS NULL OR length(trim(course_code)) BETWEEN 1 AND 32),
      start_date  TEXT NOT NULL CHECK (length(start_date) = 10),
      end_date    TEXT NOT NULL CHECK (length(end_date) = 10),
      mode        TEXT NOT NULL DEFAULT 'asincrona' CHECK (mode IN ('presenza', 'asincrona')),
      CHECK (end_date >= start_date)
    );

    CREATE TABLE lesson_occurrence (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id   INTEGER NOT NULL,
      lesson_date   TEXT NOT NULL CHECK (length(lesson_date) = 10),
      done          INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
      mode_override TEXT CHECK (mode_override IS NULL OR mode_override IN ('presenza', 'asincrona')),
      UNIQUE(schedule_id, lesson_date),
      FOREIGN KEY (schedule_id) REFERENCES schedule(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_occurrence_lesson_date ON lesson_occurrence(lesson_date);
    CREATE INDEX idx_occurrence_done_date ON lesson_occurrence(done, lesson_date);
    CREATE INDEX idx_schedule_weekday ON schedule(weekday);
    CREATE INDEX idx_schedule_course_code ON schedule(course_code);

    CREATE TABLE study_plan_cycles (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year         TEXT NOT NULL CHECK (academic_year GLOB '[0-9][0-9][0-9][0-9]/[0-9][0-9][0-9][0-9]'),
      student_year          INTEGER NOT NULL CHECK (student_year IN (1, 2, 3)),
      track                 TEXT NOT NULL CHECK (track IN ('I3I', 'I3C')),
      validation_mode       TEXT NOT NULL CHECK (validation_mode IN ('annual_submission', 'second_semester_revision')),
      status                TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'polimi_compiled')),
      archived_at           TEXT,
      approval_status       TEXT CHECK (approval_status IN ('auto_approved_after_deadline', 'needs_commission_review')),
      revision_of_cycle_id  INTEGER,
      compiled_on_polimi_at TEXT,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      FOREIGN KEY (revision_of_cycle_id) REFERENCES study_plan_cycles(id)
    );

    CREATE INDEX idx_plan_cycles_status ON study_plan_cycles(status, archived_at);
    CREATE UNIQUE INDEX one_editable_cycle_per_academic_year
      ON study_plan_cycles(academic_year)
      WHERE archived_at IS NULL AND status IN ('draft', 'ready');

    CREATE TABLE study_plan_entries (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id             INTEGER NOT NULL,
      course_code          TEXT NOT NULL CHECK (length(trim(course_code)) BETWEEN 1 AND 32),
      course_year          INTEGER NOT NULL CHECK (course_year IN (1, 2, 3)),
      semester             INTEGER NOT NULL CHECK (semester IN (1, 2)),
      entry_kind           TEXT NOT NULL DEFAULT 'catalog' CHECK (entry_kind IN ('catalog', 'external')),
      external_name        TEXT,
      external_cfu         INTEGER CHECK (external_cfu IS NULL OR external_cfu BETWEEN 1 AND 15),
      position             TEXT NOT NULL CHECK (position IN ('effective', 'supernumerary')),
      origin               TEXT NOT NULL CHECK (origin IN ('recommended', 'carried_over', 'new_frequency', 'recovery_reinserted', 'free_choice')),
      is_new_frequency     INTEGER NOT NULL DEFAULT 1 CHECK (is_new_frequency IN (0, 1)),
      fee_counted          INTEGER NOT NULL DEFAULT 1 CHECK (fee_counted IN (0, 1)),
      created_at           TEXT NOT NULL,
      UNIQUE(cycle_id, course_code),
      CHECK (
        (entry_kind = 'catalog' AND external_name IS NULL AND external_cfu IS NULL)
        OR
        (entry_kind = 'external' AND length(trim(external_name)) BETWEEN 1 AND 160 AND external_cfu IS NOT NULL)
      ),
      FOREIGN KEY (cycle_id) REFERENCES study_plan_cycles(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_plan_entries_cycle ON study_plan_entries(cycle_id);

    CREATE TABLE exams (
      course_code   TEXT PRIMARY KEY CHECK (length(trim(course_code)) BETWEEN 1 AND 32),
      status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'not_passed', 'passed_unregistered', 'passed_registered', 'no_class', 'not_required')),
      grade         TEXT CHECK (grade IS NULL OR grade IN ('18','19','20','21','22','23','24','25','26','27','28','29','30','30L')),
      passed_at     TEXT,
      registered_at TEXT,
      updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (registered_at IS NULL OR status = 'passed_registered'),
      CHECK (grade IS NULL OR status IN ('passed_unregistered', 'passed_registered'))
    );
  `);
  db.pragma(`user_version = ${SCHEMA_VERSION}`);
}

function dropApplicationTables(db: Database.Database): void {
  for (const table of TABLES) db.exec(`DROP TABLE IF EXISTS ${table}`);
}

function hasLegacyData(db: Database.Database): boolean {
  const row = db.prepare(`
    SELECT 1 AS present
    FROM sqlite_master
    WHERE type = 'table' AND name IN ('schedule', 'study_plan_cycles', 'exams')
    LIMIT 1
  `).get() as { present: 1 } | undefined;
  return Boolean(row);
}

function backupLegacyDatabase(db: Database.Database): string {
  db.pragma("wal_checkpoint(TRUNCATE)");
  const dbPath = db.name;
  const parsed = path.parse(dbPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(parsed.dir, `${parsed.name}.pre-v2-${stamp}${parsed.ext || ".db"}`);
  try {
    db.prepare("VACUUM INTO ?").run(backupPath);
    return backupPath;
  } catch (error) {
    if (fs.existsSync(backupPath)) fs.rmSync(backupPath);
    throw new Error(`Backup pre-v2 non riuscito; il database originale non è stato modificato. ${String(error)}`);
  }
}

/** Initialize or upgrade the database exactly once for a newly opened connection. */
export function ensureSchema(db: Database.Database): void {
  const version = db.pragma("user_version", { simple: true }) as number;
  if (version === SCHEMA_VERSION) return;
  if (version > SCHEMA_VERSION) {
    throw new Error(`Schema database ${version} più recente di quello supportato (${SCHEMA_VERSION}).`);
  }

  const legacy = hasLegacyData(db);
  if (legacy) backupLegacyDatabase(db);

  const migrate = db.transaction(() => {
    dropApplicationTables(db);
    createSchemaV2(db);
  });
  migrate();
}

/** Reset all application data while preserving the versioned v2 schema. */
export function resetDatabase(db: Database.Database): void {
  const reset = db.transaction(() => {
    dropApplicationTables(db);
    createSchemaV2(db);
  });
  reset();
}
