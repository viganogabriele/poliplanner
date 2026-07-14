"use server";

import { revalidatePath } from "next/cache";
import { saveSchedule, validateScheduleRows } from "@/lib/schedule";
import { resetCompletions, setLessonMode, toggleLesson } from "@/lib/dashboard";
import { resetDatabase } from "@/lib/schema";
import { seedDatabase } from "@/lib/seed";
import { getDb } from "@/lib/db";
import {
  archivePlanCycle,
  createAnnualDraft,
  createSecondSemesterRevision,
  duplicatePlanForNextAcademicYear,
  getPlanScenario,
  getPreviousCompiledEntries,
  restorePlanCycle,
  savePlanDraft,
  setActivePlanCycle,
  updateCycleStatus,
  type PlanDraftPayload,
} from "@/lib/piano";
import { getExams, markExamRegistered, setExamGrade, setExamStatus, syncExamsWithPlan } from "@/lib/esami";
import { getApprovalStatus, validatePlanScenario } from "@/lib/polimi/validation";
import type { ExamStatus, Track } from "@/lib/polimi/constraints";
import type { LessonMode } from "@/lib/types";

export type ActionResult<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

function refresh(): void {
  revalidatePath("/", "layout");
}

function validId(value: unknown): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificatore non valido.");
  return id;
}

function failure(error: unknown, action: string): { ok: false; error: string } {
  console.error(`[${action}]`, error);
  return { ok: false, error: error instanceof Error ? error.message : "Errore interno inatteso." };
}

function validationFor(cycleId: number) {
  const scenario = getPlanScenario(cycleId);
  if (!scenario) throw new Error("Piano non trovato.");
  return {
    scenario,
    result: validatePlanScenario(scenario, {
      exams: getExams(),
      previousCompiledEntries: getPreviousCompiledEntries(scenario.cycle.id),
      baseRevisionScenario: scenario.cycle.revisionOfCycleId ? getPlanScenario(scenario.cycle.revisionOfCycleId) : null,
    }),
  };
}

export async function saveScheduleAction(rows: unknown): Promise<ActionResult> {
  try {
    saveSchedule(validateScheduleRows(rows));
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "saveSchedule");
  }
}

export async function toggleLessonAction(rawId: unknown, done: unknown): Promise<ActionResult> {
  try {
    if (typeof done !== "boolean") throw new Error("Stato completamento non valido.");
    toggleLesson(validId(rawId), done);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "toggleLesson");
  }
}

export async function setLessonModeAction(rawId: unknown, mode: unknown): Promise<ActionResult> {
  try {
    if (mode !== "presenza" && mode !== "asincrona") throw new Error("Modalità lezione non valida.");
    setLessonMode(validId(rawId), mode as LessonMode);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "setLessonMode");
  }
}

export async function resetCompletionsAction(): Promise<ActionResult> {
  try {
    resetCompletions();
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "resetCompletions");
  }
}

export async function resetDatabaseAction(): Promise<ActionResult> {
  try {
    resetDatabase(getDb());
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "resetDatabase");
  }
}

export async function seedDatabaseAction(): Promise<ActionResult> {
  try {
    const db = getDb();
    resetDatabase(db);
    seedDatabase(db);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "seedDatabase");
  }
}

export async function savePlanDraftAction(payload: PlanDraftPayload): Promise<ActionResult<ReturnType<typeof savePlanDraft>>> {
  try {
    const scenario = savePlanDraft(payload);
    syncExamsWithPlan(scenario.entries.map((entry) => entry.courseCode));
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "savePlanDraft");
  }
}

export async function validatePlanScenarioAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof validatePlanScenario>>> {
  try {
    return { ok: true, data: validationFor(validId(rawCycleId)).result };
  } catch (error) {
    return failure(error, "validatePlanScenario");
  }
}

export async function markPlanReadyAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof updateCycleStatus>>> {
  try {
    const cycleId = validId(rawCycleId);
    const { result } = validationFor(cycleId);
    const errors = result.issues.filter((item) => item.type === "error");
    if (errors.length) throw new Error(`Scenario non pronto: ${errors.length} errori bloccanti.`);
    const scenario = updateCycleStatus(cycleId, "ready", result.summary.approvalStatus);
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "markPlanReady");
  }
}

export async function markPlanCompiledOnPolimiAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof updateCycleStatus>>> {
  try {
    const cycleId = validId(rawCycleId);
    const { scenario, result } = validationFor(cycleId);
    if (scenario.cycle.status !== "ready") throw new Error("Prima marca lo scenario come pronto.");
    const errors = result.issues.filter((item) => item.type === "error");
    if (errors.length) throw new Error(`Non compilabile: ${errors.length} errori bloccanti.`);
    const updated = updateCycleStatus(cycleId, "polimi_compiled", getApprovalStatus(scenario.entries));
    refresh();
    return { ok: true, data: updated };
  } catch (error) {
    return failure(error, "markPlanCompiled");
  }
}

export async function createAnnualDraftAction(academicYear: unknown, studentYear: unknown, track: unknown): Promise<ActionResult<ReturnType<typeof createAnnualDraft>>> {
  try {
    if (typeof academicYear !== "string") throw new Error("Anno accademico non valido.");
    const year = Number(studentYear);
    if (year !== 1 && year !== 2 && year !== 3) throw new Error("Anno studente non valido.");
    if (track !== "I3I" && track !== "I3C") throw new Error("Percorso non valido.");
    const scenario = createAnnualDraft(academicYear, year, track as Track);
    syncExamsWithPlan(scenario.entries.map((entry) => entry.courseCode));
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "createAnnualDraft");
  }
}

export async function duplicatePlanForNextAcademicYearAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof duplicatePlanForNextAcademicYear>>> {
  try {
    const scenario = duplicatePlanForNextAcademicYear(validId(rawCycleId));
    syncExamsWithPlan(scenario.entries.map((entry) => entry.courseCode));
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "duplicatePlan");
  }
}

export async function createSecondSemesterRevisionAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof createSecondSemesterRevision>>> {
  try {
    const scenario = createSecondSemesterRevision(validId(rawCycleId));
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "createRevision");
  }
}

export async function setActivePlanCycleAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof setActivePlanCycle>>> {
  try {
    const scenario = setActivePlanCycle(validId(rawCycleId));
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "setActivePlanCycle");
  }
}

export async function archivePlanCycleAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof archivePlanCycle>>> {
  try {
    const scenario = archivePlanCycle(validId(rawCycleId));
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "archivePlanCycle");
  }
}

export async function restorePlanCycleAction(rawCycleId: unknown): Promise<ActionResult<ReturnType<typeof restorePlanCycle>>> {
  try {
    const scenario = restorePlanCycle(validId(rawCycleId));
    refresh();
    return { ok: true, data: scenario };
  } catch (error) {
    return failure(error, "restorePlanCycle");
  }
}

export async function setExamStatusAction(code: unknown, status: unknown, dates?: { passedAt?: string | null; registeredAt?: string | null }): Promise<ActionResult> {
  try {
    if (typeof code !== "string" || typeof status !== "string") throw new Error("Dati esame non validi.");
    setExamStatus(code, status as ExamStatus, dates);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "setExamStatus");
  }
}

export async function setExamGradeAction(code: unknown, grade: unknown): Promise<ActionResult> {
  try {
    if (typeof code !== "string" || (grade !== null && typeof grade !== "string")) throw new Error("Voto non valido.");
    setExamGrade(code, grade as string | null);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "setExamGrade");
  }
}

export async function markExamRegisteredAction(code: unknown, registeredAt: unknown = null): Promise<ActionResult> {
  try {
    if (typeof code !== "string" || (registeredAt !== null && typeof registeredAt !== "string")) throw new Error("Dati di verbalizzazione non validi.");
    markExamRegistered(code, registeredAt as string | null);
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error, "markExamRegistered");
  }
}
