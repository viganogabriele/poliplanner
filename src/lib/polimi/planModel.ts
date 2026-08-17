/**
 * Forma del piano annuale, indipendente dalla persistenza.
 *
 * Un `PlanScenario` è **un anno accademico**: reinserimenti (frequenze già acquisite e non
 * verbalizzate) più nuove frequenze. Non è la laurea intera: i 180 CFU si leggono dalla carriera
 * unita alla proiezione, non da questa struttura.
 */

import { activityCategory, courseCfu } from "./catalog";
import type { Catalog, CourseYear } from "./catalog/types";
import type { ApprovalStatus, EntryOrigin, EntryPosition, PlanStatus, PlanValidationMode, Track } from "./constraints";
import { REINSERTION_ORIGINS } from "./constraints";

export type PlanEntryKind = "catalog" | "external";

export type PlanCycle = {
  id: number | null;
  academicYear: string;
  studentYear: CourseYear;
  track: Track;
  validationMode: PlanValidationMode;
  status: PlanStatus;
  archivedAt: string | null;
  approvalStatus: ApprovalStatus | null;
  revisionOfCycleId: number | null;
  compiledOnPolimiAt: string | null;
  createdAt: string;
  updatedAt: string;
  isVirtual?: boolean;
};

export type PlanEntry = {
  id: number | null;
  cycleId: number | null;
  courseCode: string;
  courseYear: CourseYear;
  semester: 1 | 2;
  entryKind: PlanEntryKind;
  externalName: string | null;
  externalCfu: number | null;
  position: EntryPosition;
  origin: EntryOrigin;
  isNewFrequency: boolean;
  feeCounted: boolean;
  createdAt: string;
};

export type PlanScenario = { cycle: PlanCycle; entries: PlanEntry[] };

export type PlanDraftEntry = {
  courseCode: string;
  courseYear: CourseYear;
  semester?: 1 | 2;
  entryKind?: PlanEntryKind;
  externalName?: string | null;
  externalCfu?: number | null;
  position: EntryPosition;
  origin: EntryOrigin;
  /** Accettati per compatibilità ma ricalcolati dal server. */
  isNewFrequency?: boolean;
  feeCounted?: boolean;
};

export type PlanDraftPayload = {
  cycleId: number | null;
  academicYear: string;
  studentYear: CourseYear;
  track: Track;
  validationMode: PlanValidationMode;
  status?: PlanStatus;
  entries: PlanDraftEntry[];
};

export type PreviousCompiledEntry = { cycle: PlanCycle; entry: PlanEntry };

export function entryCfu(catalog: Catalog, entry: PlanEntry): number {
  return entry.entryKind === "external" ? entry.externalCfu ?? 0 : courseCfu(catalog, entry.courseCode);
}

export function isReinsertion(entry: PlanEntry): boolean {
  return REINSERTION_ORIGINS.includes(entry.origin);
}

export function toDraftEntry(entry: PlanEntry): PlanDraftEntry {
  return {
    courseCode: entry.courseCode,
    courseYear: entry.courseYear,
    semester: entry.semester,
    entryKind: entry.entryKind,
    externalName: entry.externalName,
    externalCfu: entry.externalCfu,
    position: entry.position,
    origin: entry.origin,
  };
}

/** Data di riferimento del piano: quando è stato (o sta per essere) presentato su PoliMi. */
export function planReferenceDate(cycle: PlanCycle): string {
  return (cycle.compiledOnPolimiAt ?? cycle.createdAt ?? "").slice(0, 10) || "9999-12-31";
}

/** Origine da assegnare a un corso aggiunto a mano: una scelta libera resta distinguibile. */
export function originForAddedCourse(catalog: Catalog, code: string, track: Track): EntryOrigin {
  return activityCategory(catalog, code, track) === "D" ? "free_choice" : "new_frequency";
}
