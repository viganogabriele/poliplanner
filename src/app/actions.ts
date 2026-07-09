"use server";
// Server Actions — the "write" side of the app
//
// These are async functions that run on the SERVER but can be called
// directly from Client Components. When a client component imports and
// calls saveScheduleAction(), Next.js automatically handles the
// network request — you don't write fetch() calls.
//
// After each mutation we call revalidatePath("/", "layout") which tells
// Next.js to re-render all routes under the root layout with fresh DB data.
//
// "use server" at the top of this file marks every exported function
// as a server action. You can also put "use server" inside a single
// function body if you want mixed files.

import { revalidatePath } from "next/cache";
import { saveSchedule, validateScheduleRows } from "@/lib/schedule";
import { toggleLesson, resetCompletions } from "@/lib/dashboard";
import { resetDatabase } from "@/lib/schema";
import { seedDatabase } from "@/lib/seed";
import { getDb } from "@/lib/db";
import { saveStudyPlan, setTrack } from "@/lib/piano";
import { setExamStatus, setExamGrade, syncExamsWithPlan } from "@/lib/esami";
import type { ScheduleRowInput } from "@/lib/types";
import type { Piano } from "@/lib/piano";
import type { Track, ExamStatus } from "@/lib/polimi/constraints";

/** Save a new schedule (full replace) and regenerate lesson occurrences. */
export async function saveScheduleAction(rows: unknown[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const validated = validateScheduleRows(rows);
    saveSchedule(validated as ScheduleRowInput[]);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    console.error("saveScheduleAction error:", err);
    return { ok: false, error: String(err) };
  }
}

/** Toggle a single lesson as done/not-done. */
export async function toggleLessonAction(id: number, done: boolean): Promise<void> {
  toggleLesson(id, done);
  revalidatePath("/", "layout");
}

/** Reset all lesson completions to not-done. */
export async function resetCompletionsAction(): Promise<void> {
  resetCompletions();
  revalidatePath("/", "layout");
}

/** Drop and recreate all tables, leaving the database empty. */
export async function resetDatabaseAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    resetDatabase(getDb());
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Reset the database and load demo seed data. */
export async function seedDatabaseAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    resetDatabase(getDb());
    seedDatabase(getDb());
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Save the full study plan and selected track. */
export async function savePianoAction(piano: Piano, track: Track): Promise<{ ok: boolean; error?: string }> {
  try {
    setTrack(track);
    saveStudyPlan(piano);
    const allCodes = ([1, 2, 3] as const).flatMap((y) => [...piano[y].courses, ...piano[y].soprannumero]);
    syncExamsWithPlan(allCodes);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Set the status of a single exam. */
export async function setExamStatusAction(code: string, status: ExamStatus): Promise<void> {
  setExamStatus(code, status);
  revalidatePath("/", "layout");
}

/** Set the grade of a single exam (must already be passed). */
export async function setExamGradeAction(code: string, grade: string | null): Promise<void> {
  setExamGrade(code, grade);
  revalidatePath("/", "layout");
}
