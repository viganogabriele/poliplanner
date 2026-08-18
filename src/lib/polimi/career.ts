/**
 * Modello della carriera: cosa lo studente ha davvero in libretto.
 *
 * Regole fondamentali di questo modulo:
 * - "frequenza acquisita" e "esame superato" sono cose diverse e non vanno mescolate;
 * - è considerato superato solo ciò che risulta **verbalizzato**;
 * - `passed_unregistered` è un superamento dichiarato ma non ancora registrato in carriera:
 *   non chiude l'attività e non può essere autocertificato in una modifica di piano.
 *
 * Modulo puro: nessun accesso al database.
 */

import { findCourse, isFinalExamModule } from "./catalog";
import type { Catalog, CourseYear } from "./catalog/types";
import type { ExamStatus, Track } from "./constraints";

export type CareerExam = {
  status: ExamStatus;
  grade: string | null;
  passedAt: string | null;
  registeredAt: string | null;
};

export type CareerExamsMap = Record<string, CareerExam>;

export type CareerRow = {
  courseCode: string;
  name: string;
  cfu: number;
  courseYear: CourseYear;
  semester: 1 | 2;
  status: ExamStatus;
  grade: string | null;
  passedAt: string | null;
  registeredAt: string | null;
  isFinalExamModule: boolean;
  inCatalog: boolean;
};

export type CareerView = {
  exams: CareerExamsMap;
  /** Verbalizzati: gli unici davvero superati. */
  registered: Set<string>;
  /** Superati ma non verbalizzati: attività ancora aperta. */
  passedUnregistered: Set<string>;
  notPassed: Set<string>;
  notRequired: Set<string>;
  /** Attività chiuse: verbalizzate oppure dichiarate non richieste. */
  settled: Set<string>;
  registeredAtByCode: Map<string, string | null>;
  statusOf: (code: string) => ExamStatus;
  isRegistered: (code: string, asOf?: string | null) => boolean;
  isSettled: (code: string, asOf?: string | null) => boolean;
};

export function buildCareerView(catalog: Catalog, exams: CareerExamsMap): CareerView {
  const settledStatuses = new Set<ExamStatus>(catalog.annual.settledExamStatuses);
  const registered = new Set<string>();
  const passedUnregistered = new Set<string>();
  const notPassed = new Set<string>();
  const notRequired = new Set<string>();
  const settled = new Set<string>();
  const registeredAtByCode = new Map<string, string | null>();

  for (const [code, exam] of Object.entries(exams)) {
    if (exam.status === "passed_registered") {
      registered.add(code);
      registeredAtByCode.set(code, exam.registeredAt);
    }
    if (exam.status === "passed_unregistered") passedUnregistered.add(code);
    if (exam.status === "not_passed") notPassed.add(code);
    if (exam.status === "not_required") notRequired.add(code);
    if (settledStatuses.has(exam.status)) settled.add(code);
  }

  /**
   * Verbalizzato entro una data di riferimento. Se la data di verbalizzazione è
   * ignota consideriamo l'esame come già verbalizzato: è l'ipotesi meno rischiosa,
   * perché evita di pretendere un reinserimento per un esame chiuso.
   */
  const registeredAsOf = (code: string, asOf?: string | null): boolean => {
    if (!registered.has(code)) return false;
    if (!asOf) return true;
    const at = registeredAtByCode.get(code);
    return !at || at <= asOf;
  };

  return {
    exams,
    registered,
    passedUnregistered,
    notPassed,
    notRequired,
    settled,
    registeredAtByCode,
    statusOf: (code) => exams[code]?.status ?? "planned",
    isRegistered: registeredAsOf,
    isSettled: (code, asOf) => registeredAsOf(code, asOf) || notRequired.has(code),
  };
}

export function careerRows(catalog: Catalog, exams: CareerExamsMap, track: Track): CareerRow[] {
  return Object.entries(exams)
    .map(([code, exam]) => {
      const course = findCourse(catalog, code);
      const offering = course?.offerings?.find((candidate) => candidate.tracks.includes(track)) ?? course?.offerings?.[0];
      return {
        courseCode: code,
        name: course?.name ?? code,
        cfu: course?.cfu ?? 0,
        courseYear: (offering?.year ?? course?.year ?? 1) as CourseYear,
        semester: (offering?.semester ?? (course?.semester === "A" ? 1 : course?.semester) ?? 1) as 1 | 2,
        status: exam.status,
        grade: exam.grade,
        passedAt: exam.passedAt,
        registeredAt: exam.registeredAt,
        isFinalExamModule: isFinalExamModule(catalog, code),
        inCatalog: Boolean(course),
      };
    })
    .sort((a, b) => a.courseYear - b.courseYear || a.semester - b.semester || a.name.localeCompare(b.name, "it"));
}
