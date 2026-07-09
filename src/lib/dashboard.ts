// ============================================================
// Dashboard data queries
// ============================================================
// This module computes the full dashboard payload from the database.
// All logic runs server-side; the page component just calls getDashboard()
// and passes the result as props to child components.

import { getDb } from "./db";
import { WEEKDAY_LABELS, today, toISODate } from "./dates";
import type {
  DashboardPayload,
  SubjectProgress,
  TodoItem,
} from "./types";

interface OccurrenceRow {
  id: number;
  subject: string;
  weekday: number;
  lesson_date: string;
  mode: string;
  done: number; // SQLite returns 0/1 integers
}

interface SubjectRow {
  subject: string;
  total_all: number;
  done_count: number;
  backlog_count: number; // done=0 AND lesson_date <= today
}

/** Build the full dashboard payload. Called from the page Server Component. */
export function getDashboard(): DashboardPayload {
  const db = getDb();
  const todayStr = today();
  const now = new Date();

  // --- Todo items (lessons on or before today that are not done) ---
  const todoRows = db
    .prepare(
      `SELECT id, subject, weekday, lesson_date, mode, done
       FROM lesson_occurrence
       WHERE lesson_date <= ? AND done = 0
       ORDER BY lesson_date ASC, subject ASC`
    )
    .all(todayStr) as OccurrenceRow[];

  const todo_items: TodoItem[] = todoRows.map((row) => ({
    id: row.id,
    subject: row.subject,
    weekday: row.weekday,
    lesson_date: row.lesson_date,
    mode: row.mode as TodoItem["mode"],
    status: row.lesson_date < todayStr ? "late" : "today",
  }));

  // --- How many lessons are scheduled for exactly today (regardless of done) ---
  const today_count = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM lesson_occurrence WHERE lesson_date = ?`
      )
      .get(todayStr) as { c: number }
  ).c;

  // --- Overall done count ---
  const done_count = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM lesson_occurrence WHERE done = 1`)
      .get() as { c: number }
  ).c;

  // --- Overall progress: done / (done + backlog) ---
  const pending_count = todo_items.length;
  const progress_base = done_count + pending_count;
  const progress_percent =
    progress_base === 0 ? 100 : Math.round((done_count / progress_base) * 100);

  // --- Total count used in the stat tile ---
  const total_count = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM lesson_occurrence`)
      .get() as { c: number }
  ).c;

  // --- Per-subject progress ---
  const subjectRows = db
    .prepare(
      `SELECT
         subject,
         COUNT(*) AS total_all,
         COALESCE(SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END), 0) AS done_count,
         COALESCE(SUM(CASE WHEN lesson_date <= ? AND done = 0 THEN 1 ELSE 0 END), 0) AS backlog_count
       FROM lesson_occurrence
       GROUP BY subject
       ORDER BY subject`
    )
    .all(todayStr) as SubjectRow[];

  const subject_progress: SubjectProgress[] = subjectRows.map((row) => {
    // Same rule as overall: base = done + backlog (lessons on/before today)
    const base = row.done_count + row.backlog_count;
    return {
      subject: row.subject,
      total: row.total_all,
      done: row.done_count,
      pending: row.backlog_count,
      progress_percent:
        base === 0 ? 100 : Math.round((row.done_count / base) * 100),
    };
  });

  return {
    today: todayStr,
    today_weekday: WEEKDAY_LABELS[now.getDay() === 0 ? 6 : now.getDay() - 1],
    today_count,
    total_count,
    done_count,
    pending_count,
    progress_percent,
    todo_items,
    subject_progress,
  };
}

/** Mark a single lesson occurrence as done or not-done. */
export function toggleLesson(id: number, done: boolean): void {
  const db = getDb();
  db.prepare("UPDATE lesson_occurrence SET done = ? WHERE id = ?").run(
    done ? 1 : 0,
    id
  );
}

/** Reset all lesson occurrences to not-done. */
export function resetCompletions(): void {
  const db = getDb();
  db.prepare("UPDATE lesson_occurrence SET done = 0").run();
}

/** Today's ISO date string and formatted time, for the "Oggi" panel. */
export function getNowTime(): string {
  return toISODate(new Date());
}
