// ============================================================
// Shared TypeScript types for Poliplanner
// ============================================================
// These types describe the shape of data flowing through the app:
// from the database, through server functions, to React components.

// ----- Schedule -----

/** Lesson modes, matching the original app */
export type LessonMode = "presenza" | "asincrona";

export const LESSON_MODE_LABELS: Record<LessonMode, string> = {
  presenza: "In presenza",
  asincrona: "Registrazione / asincrona",
};

/**
 * One row in the `schedule` table.
 * weekday is 0–6 (0 = Monday … 6 = Sunday), stored as INTEGER in SQLite.
 * dates are ISO strings "YYYY-MM-DD".
 */
export interface ScheduleRow {
  id: number;
  weekday: number;
  subject: string;
  course_code: string | null;
  start_date: string;
  end_date: string;
  mode: LessonMode;
}

/**
 * What the ScheduleEditor sends to the server action.
 * id is omitted on new rows (the DB auto-assigns it).
 */
export type ScheduleRowInput = Omit<ScheduleRow, "id"> & { id?: number };

// ----- Lesson occurrences -----

/**
 * One row in the `lesson_occurrence` table.
 * Each occurrence is one concrete lesson on one calendar date.
 */
export interface LessonOccurrence {
  id: number;
  schedule_id: number;
  subject: string;
  course_code: string | null;
  weekday: number;
  lesson_date: string;
  mode: LessonMode;
  mode_override: LessonMode | null;
  done: boolean;
}

// ----- Dashboard payload -----

/**
 * A lesson that appears in the "to-do" list:
 * lessons on or before today that are not yet marked done.
 */
export interface TodoItem {
  id: number;
  subject: string;
  weekday: number;
  lesson_date: string;
  mode: LessonMode;
  status: "late" | "today";
}

/** Per-subject progress shown in the subject progress grid. */
export interface SubjectProgress {
  subject: string;
  total: number;
  done: number;
  pending: number;
  progress_percent: number;
}

/** The full payload returned by getDashboard(). */
export interface DashboardPayload {
  today: string;
  today_weekday: string;
  today_count: number;
  total_count: number;
  done_count: number;
  pending_count: number;
  progress_percent: number;
  todo_items: TodoItem[];
  subject_progress: SubjectProgress[];
  exam_total_count: number;
  exam_passed_count: number;
  exam_average: number | null;
}
