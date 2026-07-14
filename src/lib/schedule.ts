import type Database from "better-sqlite3";
import { getDb } from "./db";
import { dateRange, dateToWeekday, daysBetween, isISODate, parseISODate } from "./dates";
import type { LessonMode, ScheduleRow, ScheduleRowInput } from "./types";

const VALID_MODES = new Set<LessonMode>(["presenza", "asincrona"]);
const MAX_ROWS = 200;
const MAX_RANGE_DAYS = 1_100;

export function getSchedule(): ScheduleRow[] {
  return getDb().prepare(`
    SELECT id, weekday, subject, course_code, start_date, end_date, mode
    FROM schedule
    ORDER BY weekday, subject, id
  `).all() as ScheduleRow[];
}

export function validateScheduleRows(rows: unknown): ScheduleRowInput[] {
  if (!Array.isArray(rows)) throw new Error("Il calendario deve essere un elenco di lezioni.");
  if (rows.length > MAX_ROWS) throw new Error(`Il calendario può contenere al massimo ${MAX_ROWS} regole.`);

  const clean: ScheduleRowInput[] = [];
  const ids = new Set<number>();
  rows.forEach((raw, index) => {
    if (typeof raw !== "object" || raw === null) throw new Error(`Riga ${index + 1}: formato non valido.`);
    const value = raw as Record<string, unknown>;
    const id = value.id === undefined || value.id === null ? undefined : Number(value.id);
    const weekday = Number(value.weekday);
    const subject = typeof value.subject === "string" ? value.subject.trim() : "";
    const rawCode = typeof value.course_code === "string" ? value.course_code.trim().toUpperCase() : "";
    const course_code = rawCode || null;
    const start_date = typeof value.start_date === "string" ? value.start_date : "";
    const end_date = typeof value.end_date === "string" ? value.end_date : "";
    const mode = value.mode;

    if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0 || ids.has(id))) {
      throw new Error(`Riga ${index + 1}: identificatore non valido o duplicato.`);
    }
    if (id !== undefined) ids.add(id);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error(`Riga ${index + 1}: giorno non valido.`);
    if (subject.length < 1 || subject.length > 120) throw new Error(`Riga ${index + 1}: il nome deve contenere da 1 a 120 caratteri.`);
    if (course_code && course_code.length > 32) throw new Error(`Riga ${index + 1}: codice corso troppo lungo.`);
    if (!isISODate(start_date) || !isISODate(end_date)) throw new Error(`Riga ${index + 1}: usa date reali nel formato YYYY-MM-DD.`);
    const span = daysBetween(start_date, end_date);
    if (span < 0) throw new Error(`Riga ${index + 1}: la data finale precede quella iniziale.`);
    if (span > MAX_RANGE_DAYS) throw new Error(`Riga ${index + 1}: l'intervallo non può superare tre anni.`);
    if (typeof mode !== "string" || !VALID_MODES.has(mode as LessonMode)) throw new Error(`Riga ${index + 1}: modalità non valida.`);

    clean.push({ id, weekday, subject, course_code, start_date, end_date, mode: mode as LessonMode });
  });
  return clean;
}

function regenerateOccurrencesInTransaction(db: Database.Database): void {
  const schedules = db.prepare(`
    SELECT id, weekday, start_date, end_date
    FROM schedule
  `).all() as Pick<ScheduleRow, "id" | "weekday" | "start_date" | "end_date">[];

  const insert = db.prepare(`
    INSERT INTO lesson_occurrence (schedule_id, lesson_date, done, mode_override)
    VALUES (?, ?, 0, NULL)
    ON CONFLICT(schedule_id, lesson_date) DO NOTHING
  `);
  const keepDates = new Map<number, Set<string>>();

  for (const schedule of schedules) {
    const dates = new Set<string>();
    for (const date of dateRange(schedule.start_date, schedule.end_date)) {
      if (dateToWeekday(parseISODate(date)) !== schedule.weekday) continue;
      dates.add(date);
      insert.run(schedule.id, date);
    }
    keepDates.set(schedule.id, dates);
  }

  const existing = db.prepare("SELECT id, schedule_id, lesson_date FROM lesson_occurrence").all() as {
    id: number;
    schedule_id: number;
    lesson_date: string;
  }[];
  const remove = db.prepare("DELETE FROM lesson_occurrence WHERE id = ?");
  for (const occurrence of existing) {
    if (!keepDates.get(occurrence.schedule_id)?.has(occurrence.lesson_date)) remove.run(occurrence.id);
  }
}

export function saveSchedule(rows: ScheduleRowInput[]): number {
  const db = getDb();
  const update = db.prepare(`
    UPDATE schedule
    SET weekday = @weekday, subject = @subject, course_code = @course_code,
        start_date = @start_date, end_date = @end_date, mode = @mode
    WHERE id = @id
  `);
  const insert = db.prepare(`
    INSERT INTO schedule (weekday, subject, course_code, start_date, end_date, mode)
    VALUES (@weekday, @subject, @course_code, @start_date, @end_date, @mode)
  `);

  const save = db.transaction(() => {
    const currentIds = new Set((db.prepare("SELECT id FROM schedule").all() as { id: number }[]).map((row) => row.id));
    const retained = new Set<number>();
    for (const row of rows) {
      if (row.id !== undefined) {
        if (!currentIds.has(row.id)) throw new Error(`La regola calendario ${row.id} non esiste più.`);
        update.run(row);
        retained.add(row.id);
      } else {
        const result = insert.run(row);
        retained.add(Number(result.lastInsertRowid));
      }
    }
    const remove = db.prepare("DELETE FROM schedule WHERE id = ?");
    for (const id of currentIds) if (!retained.has(id)) remove.run(id);
    regenerateOccurrencesInTransaction(db);
  });
  save();
  return rows.length;
}

export function regenerateOccurrences(): void {
  const db = getDb();
  db.transaction(() => regenerateOccurrencesInTransaction(db))();
}
