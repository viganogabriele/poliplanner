// ============================================================
// Seed data
// ============================================================
// Inserts a realistic university schedule and lesson occurrences
// so the dashboard looks populated right after `pnpm db:seed`.
//
// Range: 2026-06-01 → 2026-09-30 (summer semester + exam session).
// Today is 2026-07-09, so we get: many past lessons (some done,
// some left as backlog), today's lessons, and many future ones.

import BetterSqlite3 from "better-sqlite3";
import { dateRange, dateToWeekday, parseISODate } from "./dates";
import type { LessonMode } from "./types";

interface SeedScheduleRow {
  weekday: number;
  subject: string;
  start_date: string;
  end_date: string;
  mode: LessonMode;
}

// A realistic university schedule for a CS student
const SEED_SCHEDULE: SeedScheduleRow[] = [
  {
    weekday: 0, // Lunedì
    subject: "Analisi Matematica II",
    start_date: "2026-06-01",
    end_date: "2026-09-30",
    mode: "presenza",
  },
  {
    weekday: 1, // Martedì
    subject: "Algoritmi e Principi dell'Informatica",
    start_date: "2026-06-01",
    end_date: "2026-09-30",
    mode: "presenza",
  },
  {
    weekday: 2, // Mercoledì
    subject: "Basi di Dati",
    start_date: "2026-06-01",
    end_date: "2026-09-30",
    mode: "asincrona",
  },
  {
    weekday: 3, // Giovedì
    subject: "Reti di Calcolatori",
    start_date: "2026-06-01",
    end_date: "2026-09-30",
    mode: "asincrona",
  },
  {
    weekday: 4, // Venerdì
    subject: "Ingegneria del Software",
    start_date: "2026-06-01",
    end_date: "2026-09-30",
    mode: "presenza",
  },
  // A second session for one subject on a different day (realistic)
  {
    weekday: 2, // Mercoledì (second slot)
    subject: "Analisi Matematica II",
    start_date: "2026-06-01",
    end_date: "2026-09-30",
    mode: "asincrona",
  },
];

/**
 * Populate the DB with seed schedule + generate occurrences
 * with a realistic completion pattern (~70% done for past lessons).
 */
export function seedDatabase(db: BetterSqlite3.Database): void {
  const today = "2026-07-09";

  // Insert schedule rows
  const insertSchedule = db.prepare(
    `INSERT INTO schedule (weekday, subject, start_date, end_date, mode)
     VALUES (@weekday, @subject, @start_date, @end_date, @mode)`
  );

  const insertOcc = db.prepare(
    `INSERT OR IGNORE INTO lesson_occurrence (subject, weekday, lesson_date, mode, done)
     VALUES (@subject, @weekday, @lesson_date, @mode, @done)`
  );

  // Pseudo-random-ish but deterministic: mark ~70% of past lessons as done
  let counter = 0;
  const isDone = (subject: string, date: string) => {
    if (date >= today) return false;
    // Deterministic: use position in sequence
    counter++;
    return counter % 10 !== 0 && counter % 10 !== 4; // 8/10 = 80% done, feels realistic
  };

  db.transaction(() => {
    for (const row of SEED_SCHEDULE) {
      insertSchedule.run(row);

      for (const dateStr of dateRange(row.start_date, row.end_date)) {
        const d = parseISODate(dateStr);
        if (dateToWeekday(d) !== row.weekday) continue;

        insertOcc.run({
          subject: row.subject,
          weekday: row.weekday,
          lesson_date: dateStr,
          mode: row.mode,
          done: isDone(row.subject, dateStr) ? 1 : 0,
        });
      }
    }
  })();
}
