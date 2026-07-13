// ============================================================
// Dashboard data queries
// ============================================================
// This module computes the full dashboard payload from the database.
// All logic runs server-side; the page component just calls getDashboard()
// and passes the result as props to child components.

import { getDb } from "./db";
import { WEEKDAY_LABELS, today, toISODate } from "./dates";
import { getExams } from "./esami";
import { weightedAverage } from "./polimi/gradeCalc";
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

  // --- Exam stats ---
  const examsMap = getExams();
  const db2 = getDb();
  // Get all effective entries from the active/ready/draft scenario
  const planEntryRows = db2.prepare(`
    SELECT spe.course_code
    FROM study_plan_entries spe
    JOIN study_plan_cycles spc ON spe.cycle_id = spc.id
    WHERE spe.position = 'effective' AND spc.status != 'archived'
    ORDER BY spc.id DESC
  `).all() as { course_code: string }[];
  // Deduplicate by course_code (latest cycle wins)
  const seenCodes = new Set<string>();
  const effectiveCodes: string[] = [];
  for (const row of planEntryRows) {
    if (!seenCodes.has(row.course_code)) {
      seenCodes.add(row.course_code);
      effectiveCodes.push(row.course_code);
    }
  }
  const exam_total_count = effectiveCodes.length;
  const exam_passed_count = effectiveCodes.filter(code =>
    examsMap[code]?.status === 'passed_registered'
  ).length;
  // Weighted average: read from weightedAverage using exams and a minimal entries array
  // Build minimal PlanEntry-like objects for weightedAverage
  const minimalEntries = effectiveCodes.map(code => ({
    courseCode: code, position: 'effective' as const, feeCounted: true, origin: 'recommended' as const,
    courseYear: 1 as const, isNewFrequency: true, id: null, cycleId: null, createdAt: ''
  }));
  const { average: exam_average } = weightedAverage(examsMap, minimalEntries);

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
    exam_total_count,
    exam_passed_count,
    exam_average,
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

/** Update the mode of a single lesson occurrence. */
export function setLessonMode(id: number, mode: import("./types").LessonMode): void {
  if (mode !== "presenza" && mode !== "asincrona") {
    throw new Error("Modalità lezione non valida.");
  }
  const db = getDb();
  db.prepare("UPDATE lesson_occurrence SET mode = ? WHERE id = ?").run(mode, id);
}
