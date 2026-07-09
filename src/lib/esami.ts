import { getDb } from "./db";
import type { ExamStatus } from "./polimi/constraints";

export type ExamEntry = { course_code: string; status: ExamStatus; grade: string | null };
export type ExamsMap = Record<string, { status: ExamStatus; grade: string | null }>;

export function getExams(): ExamsMap {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM exams").all() as ExamEntry[];
  return Object.fromEntries(rows.map((r) => [r.course_code, { status: r.status, grade: r.grade }]));
}

export function setExamStatus(code: string, status: ExamStatus): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO exams (course_code, status, grade) VALUES (?, ?, NULL)
    ON CONFLICT(course_code) DO UPDATE SET status = excluded.status, grade = CASE WHEN excluded.status != 'passed' THEN NULL ELSE grade END
  `).run(code, status);
}

export function setExamGrade(code: string, grade: string | null): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO exams (course_code, status, grade) VALUES (?, 'passed', ?)
    ON CONFLICT(course_code) DO UPDATE SET grade = excluded.grade
  `).run(code, grade);
}

export function syncExamsWithPlan(courseCodes: string[]): void {
  const db = getDb();
  const existing = getExams();
  const insert = db.prepare("INSERT OR IGNORE INTO exams (course_code, status, grade) VALUES (?, 'planned', NULL)");
  const sync = db.transaction(() => {
    courseCodes.forEach((code) => { if (!existing[code]) insert.run(code); });
  });
  sync();
}
