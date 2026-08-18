/**
 * Frequenze già acquisite: la base fattuale su cui poggiano reinserimenti e scelte obbligate.
 *
 * "Frequenza acquisita" significa che l'insegnamento **era nel piano** di un anno accademico
 * precedente, oppure che la carriera lo implica (esame tentato e non superato, oppure superato ma
 * non ancora verbalizzato). È un fatto sulla *scelta* dello studente, distinto dall'*esito*
 * dell'esame: tenerli separati è ciò che permette di distinguere un reinserimento da una scelta
 * mai effettuata.
 *
 * Modulo puro: nessun accesso al database.
 */

import { findCourse, offeringSemester, offeringYear } from "./catalog";
import type { Catalog, CourseYear } from "./catalog/types";
import type { CareerExamsMap } from "./career";
import type { EntryPosition, ExamStatus, Track } from "./constraints";
import type { PreviousCompiledEntry } from "./planModel";

export type FrequencySource = "previous_plan" | "exam_status";

export type AcquiredFrequency = {
  courseCode: string;
  courseYear: CourseYear;
  semester: 1 | 2;
  position: EntryPosition;
  sourceAcademicYear: string | null;
  sourceCycleId: number | null;
  source: FrequencySource;
};

export type AnnualPlanInputs = {
  catalog: Catalog;
  track: Track;
  studentYear: CourseYear;
  academicYear: string;
  exams: CareerExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  /** Data a cui valutare "già verbalizzato": normalmente la presentazione del piano. */
  asOf?: string | null;
};

/**
 * Frequenze già acquisite: piani di anni accademici precedenti realmente compilati su PoliMi,
 * più gli esami la cui carriera implica una frequenza (tentato e non superato, oppure superato
 * ma non verbalizzato) anche senza uno storico di piani nell'app.
 */
export function collectAcquiredFrequencies(inputs: AnnualPlanInputs): Map<string, AcquiredFrequency> {
  const { catalog, track, academicYear, exams, previousCompiledEntries } = inputs;
  const frequencies = new Map<string, AcquiredFrequency>();

  for (const { cycle, entry } of previousCompiledEntries) {
    if (cycle.academicYear >= academicYear) continue;
    if (entry.entryKind !== "catalog") continue;
    if (frequencies.has(entry.courseCode)) continue;
    frequencies.set(entry.courseCode, {
      courseCode: entry.courseCode,
      courseYear: entry.courseYear,
      semester: entry.semester,
      position: entry.position,
      sourceAcademicYear: cycle.academicYear,
      sourceCycleId: cycle.id,
      source: "previous_plan",
    });
  }

  const implying = new Set<ExamStatus>(catalog.annual.frequencyImplyingExamStatuses);
  for (const [code, exam] of Object.entries(exams)) {
    if (frequencies.has(code) || !implying.has(exam.status)) continue;
    if (!findCourse(catalog, code)) continue;
    frequencies.set(code, {
      courseCode: code,
      courseYear: offeringYear(catalog, code, track),
      semester: offeringSemester(catalog, code, track),
      position: "effective",
      sourceAcademicYear: null,
      sourceCycleId: null,
      source: "exam_status",
    });
  }

  return frequencies;
}

/**
 * L'app ha davvero in archivio un piano di un anno accademico precedente?
 * Se non ce l'ha, "non scelto" non è un fatto osservato ma una deduzione, e va dichiarata.
 */
export function hasEarlierPlanHistory(inputs: AnnualPlanInputs): boolean {
  return inputs.previousCompiledEntries.some((previous) => previous.cycle.academicYear < inputs.academicYear);
}
