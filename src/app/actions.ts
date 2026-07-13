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
import { toggleLesson, resetCompletions, setLessonMode } from "@/lib/dashboard";
import { resetDatabase } from "@/lib/schema";
import { seedDatabase } from "@/lib/seed";
import { getDb } from "@/lib/db";
import {
  duplicatePlanForNextAcademicYear,
  getPlanScenario,
  getPreviousCompiledEntries,
  savePlanDraft,
  setTrack,
  updateCycleStatus,
} from "@/lib/piano";
import { markExamRegistered, setExamStatus, setExamGrade, syncExamsWithPlan } from "@/lib/esami";
import { getExams } from "@/lib/esami";
import { getApprovalStatus, validatePlanScenario } from "@/lib/polimi/validation";
import type { LessonMode, ScheduleRowInput } from "@/lib/types";
import type { Piano, PlanDraftPayload } from "@/lib/piano";
import type { ExamStatus, PlanValidationMode, Track } from "@/lib/polimi/constraints";

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
    const allCodes = ([1, 2, 3] as const).flatMap((y) => [...piano[y].courses, ...piano[y].soprannumero]);
    syncExamsWithPlan(allCodes);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Save the always-open planner draft. Drafts are saved even when validation has errors. */
export async function savePlanDraftAction(payload: PlanDraftPayload): Promise<{ ok: boolean; scenario?: ReturnType<typeof savePlanDraft>; error?: string }> {
  try {
    const scenario = savePlanDraft(payload);
    syncExamsWithPlan(scenario.entries.map((entry) => entry.courseCode));
    revalidatePath("/", "layout");
    return { ok: true, scenario };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function validatePlanScenarioAction(cycleId: number): Promise<{ ok: boolean; error?: string; issues?: ReturnType<typeof validatePlanScenario>["issues"]; summary?: ReturnType<typeof validatePlanScenario>["summary"] }> {
  try {
    const scenario = getPlanScenario(cycleId);
    if (!scenario) return { ok: false, error: "Piano non trovato." };
    const result = validatePlanScenario(scenario, {
      exams: getExams(),
      previousCompiledEntries: getPreviousCompiledEntries(scenario.cycle.id),
      baseRevisionScenario: scenario.cycle.revisionOfCycleId ? getPlanScenario(scenario.cycle.revisionOfCycleId) : null,
    });
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function markPlanReadyAction(cycleId: number): Promise<{ ok: boolean; scenario?: ReturnType<typeof updateCycleStatus>; error?: string }> {
  try {
    const scenario = getPlanScenario(cycleId);
    if (!scenario) return { ok: false, error: "Piano non trovato." };
    const result = validatePlanScenario(scenario, {
      exams: getExams(),
      previousCompiledEntries: getPreviousCompiledEntries(scenario.cycle.id),
      baseRevisionScenario: scenario.cycle.revisionOfCycleId ? getPlanScenario(scenario.cycle.revisionOfCycleId) : null,
    });
    const errors = result.issues.filter((issue) => issue.type === "error");
    if (errors.length > 0) return { ok: false, error: `Scenario non pronto: ${errors.length} errori bloccanti.` };
    const updated = updateCycleStatus(cycleId, "ready", result.summary.approvalStatus);
    revalidatePath("/", "layout");
    return { ok: true, scenario: updated };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function markPlanCompiledOnPolimiAction(cycleId: number): Promise<{ ok: boolean; scenario?: ReturnType<typeof updateCycleStatus>; error?: string }> {
  try {
    const scenario = getPlanScenario(cycleId);
    if (!scenario) return { ok: false, error: "Piano non trovato." };
    const result = validatePlanScenario(scenario, {
      exams: getExams(),
      previousCompiledEntries: getPreviousCompiledEntries(scenario.cycle.id),
      baseRevisionScenario: scenario.cycle.revisionOfCycleId ? getPlanScenario(scenario.cycle.revisionOfCycleId) : null,
    });
    const errors = result.issues.filter((issue) => issue.type === "error");
    if (errors.length > 0) return { ok: false, error: `Non posso marcarlo compilato: ${errors.length} errori bloccanti.` };
    const updated = updateCycleStatus(cycleId, "polimi_compiled", getApprovalStatus(scenario.entries));
    revalidatePath("/", "layout");
    return { ok: true, scenario: updated };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function duplicatePlanForNextAcademicYearAction(cycleId: number): Promise<{ ok: boolean; scenario?: ReturnType<typeof duplicatePlanForNextAcademicYear>; error?: string }> {
  try {
    const scenario = duplicatePlanForNextAcademicYear(cycleId);
    syncExamsWithPlan(scenario.entries.map((entry) => entry.courseCode));
    revalidatePath("/", "layout");
    return { ok: true, scenario };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function setPlanValidationModeAction(cycleId: number, mode: PlanValidationMode): Promise<{ ok: boolean; error?: string }> {
  try {
    const scenario = getPlanScenario(cycleId);
    if (!scenario) return { ok: false, error: "Piano non trovato." };
    savePlanDraft({
      cycleId,
      academicYear: scenario.cycle.academicYear,
      studentYear: scenario.cycle.studentYear,
      track: scenario.cycle.track,
      validationMode: mode,
      status: scenario.cycle.status === "polimi_compiled" ? "draft" : scenario.cycle.status,
      entries: scenario.entries.map((entry) => ({
        courseCode: entry.courseCode,
        courseYear: entry.courseYear,
        position: entry.position,
        origin: entry.origin,
        isNewFrequency: entry.isNewFrequency,
        feeCounted: entry.feeCounted,
      })),
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Set the status of a single exam. */
export async function setExamStatusAction(code: string, status: ExamStatus, dates?: { passedAt?: string | null; registeredAt?: string | null }): Promise<{ ok: boolean; error?: string }> {
  try {
    setExamStatus(code, status, dates);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Set the grade of a single exam (must already be passed). */
export async function setExamGradeAction(code: string, grade: string | null): Promise<{ ok: boolean; error?: string }> {
  try {
    setExamGrade(code, grade);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function markExamRegisteredAction(code: string, registeredAt: string | null = null): Promise<{ ok: boolean; error?: string }> {
  try {
    markExamRegistered(code, registeredAt);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/** Set the mode (presenza/asincrona) of a single lesson occurrence. */
export async function setLessonModeAction(id: number, mode: LessonMode): Promise<void> {
  setLessonMode(id, mode);
  revalidatePath("/", "layout");
}
