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
     FROM lesson_occurrence
     WHERE subject = ?`
  ).get(subjectName) as { total: number; done: number };

  if (counts.total === 0) return null;

  const backlogRows = db.prepare(
    `SELECT id, lesson_date, weekday, mode, done FROM lesson_occurrence
     WHERE subject = ? AND done = 0 AND lesson_date <= ?
     ORDER BY lesson_date ASC`
  ).all(subjectName, todayStr) as OccRow[];

  const toWatchRows = db.prepare(
    `SELECT id, lesson_date, weekday, mode, done FROM lesson_occurrence
     WHERE subject = ? AND done = 0 AND mode = 'asincrona' AND lesson_date > ?
     ORDER BY lesson_date ASC LIMIT 30`
  ).all(subjectName, todayStr) as OccRow[];

  const backlog = backlogRows.map((row) => ({ ...row, done: Boolean(row.done) }));
  const toWatch = toWatchRows.map((row) => ({ ...row, done: Boolean(row.done) }));
  const base = counts.done + backlog.length;
  const relatedCourse = findRelatedCourse(subjectName);
  const exams = relatedCourse ? getExams() : undefined;

  return {
    subjectName,
    backlog,
    toWatch,
    doneCount: counts.done,
    totalCount: counts.total,
    progressPercent: base === 0 ? 100 : Math.round((counts.done / base) * 100),
    relatedCourse: relatedCourse
      ? { code: relatedCourse.code, name: relatedCourse.name, cfu: relatedCourse.cfu }
      : undefined,
    examRecord: relatedCourse && exams ? exams[relatedCourse.code] : undefined,
  };
}
