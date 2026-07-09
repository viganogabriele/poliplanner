// ============================================================
// Schedule business logic
// ============================================================
// This is the heart of the data model:
//   1. Read the schedule from the DB.
//   2. Validate and save new schedule rows.
//   3. Regenerate lesson_occurrence from the schedule.
//
// Regeneration is the most interesting piece: it keeps a "materialized"
// table of concrete lesson dates derived from recurrence rules. When you
// edit the schedule and save, we diff desired vs existing occurrences so
// that any lessons you've already marked done are PRESERVED.

import { getDb } from "./db";
import { dateRange, dateToWeekday, parseISODate } from "./dates";
import type { LessonMode, ScheduleRow, ScheduleRowInput } from "./types";

const VALID_MODES: Set<string> = new Set(["presenza", "asincrona"]);

// ----- Read ----------------------------------------------------------------

/** Return all schedule rows ordered by weekday then subject. */
export function getSchedule(): ScheduleRow[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, weekday, subject, start_date, end_date, mode
       FROM schedule
       ORDER BY weekday, subject`
    )
    .all() as ScheduleRow[];
}

// ----- Validate ------------------------------------------------------------

/**
 * Validate and normalise an array of raw schedule row inputs from the client.
 * Invalid rows are silently dropped (same behaviour as original Flask app).
 * Returns only the rows that passed validation.
 */
export function validateScheduleRows(
  rows: unknown[]
): ScheduleRowInput[] {
  const clean: ScheduleRowInput[] = [];

  for (const raw of rows) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;

    const weekday = Number(r.weekday);
    const subject = String(r.subject ?? "").trim();
    const start_date = String(r.start_date ?? "").trim();
    const end_date = String(r.end_date ?? "").trim();
    const mode = String(r.mode ?? "asincrona").trim();

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (!subject) continue;
    if (!VALID_MODES.has(mode)) continue;

    // Validate date strings
    let startDate: Date, endDate: Date;
    try {
      startDate = parseISODate(start_date);
      endDate = parseISODate(end_date);
      // parseISODate must produce a valid Date
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;
    } catch {
      continue;
    }

    if (endDate < startDate) continue;

    clean.push({ weekday, subject, start_date, end_date, mode: mode as LessonMode });
  }

  return clean;
}

// ----- Save ----------------------------------------------------------------

/**
 * Replace the entire schedule with the provided rows, then regenerate
 * lesson occurrences. Returns the number of rows saved.
 *
 * This is a "full replace" strategy (same as the original app):
 * DELETE everything, INSERT new rows, then regenerate occurrences.
 * The regeneration step preserves `done` state for unchanged lesson dates.
 */
export function saveSchedule(rows: ScheduleRowInput[]): number {
  const db = getDb();

  const insertRow = db.prepare(
    `INSERT INTO schedule (weekday, subject, start_date, end_date, mode)
     VALUES (@weekday, @subject, @start_date, @end_date, @mode)`
  );

  // Wrap in a transaction so delete+insert is atomic.
  const tx = db.transaction((validated: ScheduleRowInput[]) => {
    db.prepare("DELETE FROM schedule").run();
    for (const row of validated) insertRow.run(row);
  });

  tx(rows);
  regenerateOccurrences();
  return rows.length;
}

// ----- Regenerate ----------------------------------------------------------

/**
 * Rebuild lesson_occurrence to match the current schedule.
 *
 * Algorithm (explained):
 *  1. Load all schedule rows and compute every (subject, lesson_date) pair
 *     that SHOULD exist, given each row's weekday and date range.
 *  2. Load all existing (subject, lesson_date) pairs from lesson_occurrence.
 *  3. Diff: new pairs → INSERT; pairs in both → UPDATE weekday/mode (keep done);
 *     removed pairs → DELETE.
 *
 * The UNIQUE(subject, lesson_date) constraint on the table means we can
 * use INSERT OR IGNORE for new rows and UPDATE for existing ones safely.
 */
export function regenerateOccurrences(): void {
  const db = getDb();

  // Step 1: Compute desired set
  const scheduleRows = db
    .prepare("SELECT weekday, subject, start_date, end_date, mode FROM schedule")
    .all() as Omit<ScheduleRow, "id">[];

  // Map of "subject|lesson_date" → {weekday, mode}
  const desired = new Map<string, { weekday: number; mode: LessonMode }>();

  for (const row of scheduleRows) {
    for (const dateStr of dateRange(row.start_date, row.end_date)) {
      const d = parseISODate(dateStr);
      if (dateToWeekday(d) === row.weekday) {
        const key = `${row.subject}|${dateStr}`;
        desired.set(key, { weekday: row.weekday, mode: row.mode as LessonMode });
      }
    }
  }

  // Step 2: Load existing
  const existingRows = db
    .prepare("SELECT id, subject, lesson_date FROM lesson_occurrence")
    .all() as { id: number; subject: string; lesson_date: string }[];

  const existing = new Map<string, number>(); // key → id
  for (const row of existingRows) {
    existing.set(`${row.subject}|${row.lesson_date}`, row.id);
  }

  // Step 3: Diff and apply
  const insertOcc = db.prepare(
    `INSERT INTO lesson_occurrence (subject, weekday, lesson_date, mode, done)
     VALUES (@subject, @weekday, @lesson_date, @mode, 0)`
  );
  const updateOcc = db.prepare(
    `UPDATE lesson_occurrence SET weekday = @weekday, mode = @mode WHERE id = @id`
  );
  const deleteOcc = db.prepare(
    `DELETE FROM lesson_occurrence WHERE id = @id`
  );

  const tx = db.transaction(() => {
    for (const [key, { weekday, mode }] of desired) {
      const [subject, lesson_date] = key.split("|");
      if (!existing.has(key)) {
        // New lesson date → insert
        insertOcc.run({ subject, weekday, lesson_date, mode });
      } else {
        // Existing lesson date → update metadata, preserve done
        updateOcc.run({ weekday, mode, id: existing.get(key) });
      }
    }

    for (const [key, id] of existing) {
      if (!desired.has(key)) {
        // This date is no longer in the schedule → delete
        deleteOcc.run({ id });
      }
    }
  });

  tx();
}
