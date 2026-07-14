import type BetterSqlite3 from "better-sqlite3";
import { addCalendarDays, dateRange, dateToWeekday, parseISODate, today } from "./dates";
import type { LessonMode } from "./types";

const SUBJECTS: { weekday: number; subject: string; course_code: string | null; mode: LessonMode }[] = [
  { weekday: 0, subject: "Analisi Matematica II", course_code: "085923", mode: "presenza" },
  { weekday: 1, subject: "Algoritmi e principi dell'informatica", course_code: "085900", mode: "presenza" },
  { weekday: 2, subject: "Basi di dati", course_code: "056889", mode: "asincrona" },
  { weekday: 3, subject: "Reti di calcolatori e Internet", course_code: "088804", mode: "asincrona" },
  { weekday: 4, subject: "Ingegneria del software", course_code: "085901", mode: "presenza" },
  { weekday: 2, subject: "Analisi Matematica II", course_code: "085923", mode: "asincrona" },
];

/** Populate a relative demo semester. The reference is injectable for deterministic tests. */
export function seedDatabase(db: BetterSqlite3.Database, reference: Date | string = new Date()): void {
  const referenceDate = typeof reference === "string" ? reference : today(reference);
  const start_date = addCalendarDays(referenceDate, -42);
  const end_date = addCalendarDays(referenceDate, 84);
  const insertSchedule = db.prepare(`
    INSERT INTO schedule (weekday, subject, course_code, start_date, end_date, mode)
    VALUES (@weekday, @subject, @course_code, @start_date, @end_date, @mode)
  `);
  const insertOccurrence = db.prepare(`
    INSERT INTO lesson_occurrence (schedule_id, lesson_date, done)
    VALUES (?, ?, ?)
  `);
  let counter = 0;

  db.transaction(() => {
    for (const subject of SUBJECTS) {
      const result = insertSchedule.run({ ...subject, start_date, end_date });
      const scheduleId = Number(result.lastInsertRowid);
      for (const date of dateRange(start_date, end_date)) {
        if (dateToWeekday(parseISODate(date)) !== subject.weekday) continue;
        counter += 1;
        const done = date < referenceDate && counter % 10 !== 0 && counter % 10 !== 4;
        insertOccurrence.run(scheduleId, date, done ? 1 : 0);
      }
    }
  })();
}
