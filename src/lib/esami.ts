import { getDb } from "./db";
import { GRADE_LAUDE, GRADE_MAX, GRADE_MIN, type ExamStatus } from "./polimi/constraints";

export type ExamEntry = {
  course_code: string;
  status: ExamStatus;
  grade: string | null;
  passed_at: string | null;
  registered_at: string | null;
  updated_at: string;
};

export type ExamRecord = {
  status: ExamStatus;
  grade: string | null;
  passedAt: string | null;
  registeredAt: string | null;
  updatedAt: string;
};

export type ExamsMap = Record<string, ExamRecord>;

const nowIso = () => new Date().toISOString();

export function getExams(): ExamsMap {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM exams").all() as ExamEntry[];
  return Object.fromEntries(rows.map((r) => [r.course_code, normalizeExamRow(r)]));
}

export function setExamStatus(code: string, status: ExamStatus, dates?: { passedAt?: string | null; registeredAt?: string | null }): void {
  const db = getDb();
  const now = nowIso();
  const passedAt = dates?.passedAt ?? (status.startsWith("passed_") ? now.slice(0, 10) : null);
  const registeredAt = dates?.registeredAt ?? (status === "passed_registered" ? now.slice(0, 10) : null);
  db.prepare(`
    INSERT INTO exams (course_code, status, grade, passed_at, registered_at, updated_at)
    VALUES (?, ?, NULL, ?, ?, ?)
    ON CONFLICT(course_code) DO UPDATE SET
      status = excluded.status,
      grade = CASE WHEN excluded.status IN ('passed_unregistered', 'passed_registered') THEN grade ELSE NULL END,
      passed_at = excluded.passed_at,
      registered_at = excluded.registered_at,
      updated_at = excluded.updated_at
  `).run(code, status, passedAt, registeredAt, now);

  if (status === "passed_registered") {
    scaleRecoveredEntriesForRegisteredExam(code);
  }
}

export function setExamGrade(code: string, grade: string | null): void {
  if (grade && !isValidGrade(grade)) {
    throw new Error("Voto non valido. Usa un valore tra 18 e 30 oppure 30L.");
  }
  const db = getDb();
  db.prepare(`
    INSERT INTO exams (course_code, status, grade, passed_at, registered_at, updated_at)
    VALUES (?, 'passed_unregistered', ?, CURRENT_DATE, NULL, ?)
    ON CONFLICT(course_code) DO UPDATE SET
      status = CASE WHEN status IN ('passed_unregistered', 'passed_registered') THEN status ELSE 'passed_unregistered' END,
      grade = excluded.grade,
      passed_at = COALESCE(passed_at, CURRENT_DATE),
      updated_at = excluded.updated_at
  `).run(code, grade, nowIso());
}

export function markExamRegistered(code: string, registeredAt: string | null = null): void {
  const db = getDb();
  const date = registeredAt ?? new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO exams (course_code, status, grade, passed_at, registered_at, updated_at)
    VALUES (?, 'passed_registered', NULL, ?, ?, ?)
    ON CONFLICT(course_code) DO UPDATE SET
      status = 'passed_registered',
      passed_at = COALESCE(passed_at, excluded.passed_at),
      registered_at = excluded.registered_at,
      updated_at = excluded.updated_at
  `).run(code, date, date, nowIso());
  scaleRecoveredEntriesForRegisteredExam(code);
}

export function syncExamsWithPlan(courseCodes: string[]): void {
  const db = getDb();
  const existing = getExams();
  const insert = db.prepare("INSERT OR IGNORE INTO exams (course_code, status, grade, passed_at, registered_at, updated_at) VALUES (?, 'planned', NULL, NULL, NULL, ?)");
  const sync = db.transaction(() => {
    courseCodes.forEach((code) => { if (!existing[code]) insert.run(code, nowIso()); });
  });
  sync();
}

export function scaleRecoveredEntriesForRegisteredExam(courseCode: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE study_plan_entries
    SET is_new_frequency = 0, fee_counted = 0
    WHERE course_code = ?
      AND origin IN ('carried_over', 'recovery_reinserted')
  `).run(courseCode);
}

function normalizeExamRow(row: ExamEntry): ExamRecord {
  return {
    status: normalizeStatus(row.status),
    grade: row.grade,
    passedAt: row.passed_at,
    registeredAt: row.registered_at,
    updatedAt: row.updated_at,
  };
}

function normalizeStatus(status: string): ExamStatus {
  if (status === "passed") return "passed_registered";
  if (status === "noclass") return "no_class";
  if (status === "notrequired") return "not_required";
  if (["planned", "not_passed", "passed_unregistered", "passed_registered", "not_required", "no_class"].includes(status)) {
    return status as ExamStatus;
  }
  return "planned";
}

function isValidGrade(grade: string): boolean {
  if (grade === GRADE_LAUDE) return true;
  const value = Number(grade);
  return Number.isInteger(value) && value >= GRADE_MIN && value <= GRADE_MAX;
}
