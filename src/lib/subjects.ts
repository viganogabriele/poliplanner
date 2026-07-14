import { getDb } from "./db";
import { today } from "./dates";
import { COURSES } from "./polimi/courses";
import { getExams } from "./esami";
import type { ExamRecord } from "./esami";
import type { LessonMode } from "./types";

export interface SubjectData {
  subjectName: string;
  backlog: SubjectLesson[];
  toWatch: SubjectLesson[];
  doneCount: number;
  totalCount: number;
  progressPercent: number;
  relatedCourse?: { code: string; name: string; cfu: number };
  examRecord?: ExamRecord;
}

export interface SubjectLesson {
  id: number;
  lesson_date: string;
  weekday: number;
  mode: LessonMode;
  done: boolean;
}

interface OccRow {
  id: number;
  lesson_date: string;
  weekday: number;
  mode: LessonMode;
  done: number;
}

/** Canonical form used only to associate a free-text calendar subject with the course catalogue. */
export function normalizeSubjectName(value: string): string {
  return value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\bi\b/g, "1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findRelatedCourse(subjectName: string) {
  const normalizedSubject = normalizeSubjectName(subjectName);
  if (!normalizedSubject) return undefined;

  return COURSES.find((course) => {
    if (course.isLinkedExam) return false;
    const normalizedCourse = normalizeSubjectName(course.name);
    return normalizedCourse === normalizedSubject
      || normalizedCourse.startsWith(`${normalizedSubject} `)
      || normalizedSubject.startsWith(`${normalizedCourse} `);
  });
}

export function getSubjectData(subjectName: string): SubjectData | null {
  const db = getDb();
  const todayStr = today();
  const counts = db.prepare(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END), 0) AS done
     FROM lesson_occurrence o
     JOIN schedule s ON s.id = o.schedule_id
     WHERE s.subject = ?`
  ).get(subjectName) as { total: number; done: number };

  if (counts.total === 0) return null;

  const backlogRows = db.prepare(
    `SELECT o.id, o.lesson_date, s.weekday, COALESCE(o.mode_override, s.mode) AS mode, o.done
     FROM lesson_occurrence o JOIN schedule s ON s.id = o.schedule_id
     WHERE s.subject = ? AND o.done = 0 AND o.lesson_date <= ?
     ORDER BY o.lesson_date ASC, o.id ASC`
  ).all(subjectName, todayStr) as OccRow[];

  const toWatchRows = db.prepare(
    `SELECT o.id, o.lesson_date, s.weekday, COALESCE(o.mode_override, s.mode) AS mode, o.done
     FROM lesson_occurrence o JOIN schedule s ON s.id = o.schedule_id
     WHERE s.subject = ? AND o.done = 0 AND COALESCE(o.mode_override, s.mode) = 'asincrona' AND o.lesson_date > ?
     ORDER BY o.lesson_date ASC, o.id ASC LIMIT 30`
  ).all(subjectName, todayStr) as OccRow[];

  const backlog = backlogRows.map((row) => ({ ...row, done: Boolean(row.done) }));
  const toWatch = toWatchRows.map((row) => ({ ...row, done: Boolean(row.done) }));
  const base = counts.done + backlog.length;
  const explicitCode = db.prepare(`
    SELECT course_code FROM schedule
    WHERE subject = ? AND course_code IS NOT NULL
    ORDER BY id LIMIT 1
  `).get(subjectName) as { course_code: string } | undefined;
  const relatedCourse = explicitCode
    ? COURSES.find((course) => course.code === explicitCode.course_code)
    : findRelatedCourse(subjectName);
  const exams = relatedCourse ? getExams() : undefined;

  return {
    subjectName,
    backlog,
    toWatch,
    doneCount: counts.done,
    totalCount: counts.total,
    progressPercent: base === 0 ? 0 : Math.round((counts.done / base) * 100),
    relatedCourse: relatedCourse
      ? { code: relatedCourse.code, name: relatedCourse.name, cfu: relatedCourse.cfu }
      : undefined,
    examRecord: relatedCourse && exams ? exams[relatedCourse.code] : undefined,
  };
}
