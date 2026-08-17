/**
 * Costruzione e misura del **piano annuale**.
 *
 * Ordine imposto dal Regolamento (§2.2.1): prima i reinserimenti degli esami già frequentati e non
 * verbalizzati, poi le nuove frequenze dell'anno. Solo le nuove frequenze contano per la
 * contribuzione (§2.2.3): un reinserimento non consuma automaticamente lo spazio delle nuove
 * frequenze, perché il Manifesto non lo afferma esplicitamente.
 *
 * Modulo puro: nessun accesso al database.
 */

import {
  courseCfu,
  courseGroup,
  courseGroupsForTrack,
  courseName,
  findCourse,
  findOffering,
  offeringSemester,
  offeringYear,
} from "./catalog";
import type { Catalog, CourseYear, PlanRule } from "./catalog/types";
import { buildCareerView, type CareerExamsMap, type CareerView } from "./career";
import type { EntryPosition, ExamStatus, Track } from "./constraints";
import { activityCategory } from "./catalog";
import {
  entryCfu,
  isReinsertion,
  type PlanEntry,
  type PlanScenario,
  type PreviousCompiledEntry,
} from "./planModel";

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

export type ReinsertionReason = "previous_plan_not_registered" | "exam_not_passed" | "passed_unregistered";

export type RequiredReinsertion = AcquiredFrequency & {
  name: string;
  cfu: number;
  examStatus: ExamStatus;
  reason: ReinsertionReason;
  /** Verbalizzato dopo la data di riferimento del piano: resta nel piano ma non è più dovuto. */
  registeredAfterSubmission: boolean;
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

// ---------------------------------------------------------------------------
// Frequenze acquisite
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Reinserimenti
// ---------------------------------------------------------------------------

/**
 * Esami che il piano annuale deve reinserire: frequenza già acquisita e attività non ancora
 * chiusa alla data di riferimento. Gli esami verbalizzati non compaiono mai qui.
 */
export function computeRequiredReinsertions(inputs: AnnualPlanInputs): RequiredReinsertion[] {
  const { catalog, exams, asOf } = inputs;
  const career = buildCareerView(catalog, exams);
  const frequencies = collectAcquiredFrequencies(inputs);
  const required: RequiredReinsertion[] = [];

  for (const frequency of frequencies.values()) {
    if (career.isSettled(frequency.courseCode, asOf)) continue;
    const status = career.statusOf(frequency.courseCode);
    required.push({
      ...frequency,
      name: courseName(catalog, frequency.courseCode),
      cfu: courseCfu(catalog, frequency.courseCode),
      examStatus: status,
      reason: reinsertionReason(status, frequency.source),
      registeredAfterSubmission: career.registered.has(frequency.courseCode) && !career.isRegistered(frequency.courseCode, asOf),
    });
  }

  return required.sort((a, b) => a.courseYear - b.courseYear || a.semester - b.semester || a.name.localeCompare(b.name, "it"));
}

function reinsertionReason(status: ExamStatus, source: FrequencySource): ReinsertionReason {
  if (status === "passed_unregistered") return "passed_unregistered";
  if (status === "not_passed") return "exam_not_passed";
  return source === "exam_status" ? "exam_not_passed" : "previous_plan_not_registered";
}

// ---------------------------------------------------------------------------
// Proposta di piano annuale
// ---------------------------------------------------------------------------

function makeEntry(
  catalog: Catalog,
  code: string,
  track: Track,
  options: {
    courseYear?: CourseYear;
    semester?: 1 | 2;
    position?: EntryPosition;
    reinserted: boolean;
    createdAt: string;
    /** Anno di corso preferito: un recupero al terzo anno usa l'offerta di terzo anno. */
    preferredYear?: CourseYear;
  }
): PlanEntry {
  const courseYear = options.courseYear ?? offeringYear(catalog, code, track, options.preferredYear);
  const semester = options.semester ?? offeringSemester(catalog, code, track, courseYear);
  const isFreeChoice = activityCategory(catalog, code, track, courseYear, semester) === "D";
  return {
    id: null,
    cycleId: null,
    courseCode: code,
    courseYear,
    semester,
    entryKind: "catalog",
    externalName: null,
    externalCfu: null,
    position: options.position ?? "effective",
    origin: options.reinserted ? "recovery_reinserted" : isFreeChoice ? "free_choice" : "new_frequency",
    isNewFrequency: !options.reinserted,
    feeCounted: !options.reinserted,
    createdAt: options.createdAt,
  };
}

function ruleApplies(rule: PlanRule, track: Track, studentYear: CourseYear): boolean {
  if (!("dueByYear" in rule)) return true;
  if (rule.tracks && !rule.tracks.includes(track)) return false;
  return rule.dueByYear <= studentYear;
}

/**
 * Proposta di partenza per un anno accademico: reinserimenti obbligatori, recuperi strutturali
 * ancora mancanti e nuove frequenze dell'anno, escludendo tutto ciò che è già verbalizzato.
 */
export function buildAnnualPlanProposal(inputs: AnnualPlanInputs, createdAt: string): PlanEntry[] {
  const { catalog, track, studentYear, exams, asOf } = inputs;
  const career = buildCareerView(catalog, exams);
  const reinsertions = computeRequiredReinsertions(inputs);

  const entries: PlanEntry[] = reinsertions.map((reinsertion) => makeEntry(catalog, reinsertion.courseCode, track, {
    courseYear: reinsertion.courseYear,
    semester: reinsertion.semester,
    position: reinsertion.position,
    reinserted: true,
    createdAt,
  }));
  const selected = new Set(entries.map((entry) => entry.courseCode));

  const choiceRule = catalog.rules.find(
    (rule): rule is Extract<PlanRule, { kind: "choice_cfu" }> => rule.kind === "choice_cfu" && ruleApplies(rule, track, studentYear)
  );
  const isChoiceCode = (code: string): boolean =>
    Boolean(choiceRule) && courseGroupsForTrack(catalog, code, track).some((group) => choiceRule!.groups.includes(group));

  /**
   * Un reinserimento consuma il gruppo a scelta solo se **già** lo consumava nel piano da cui
   * viene: Logica scelta nel blocco B1 del secondo anno e non superata resta un B1 reinserito,
   * mentre Logica recuperata in TABREC al terzo anno pesa sui 15 CFU.
   */
  const reinsertedChoiceCfu = entries.reduce((total, entry) => {
    const group = courseGroup(catalog, entry.courseCode, track, entry.courseYear, entry.semester);
    if (!choiceRule || group === null || !choiceRule.groups.includes(group)) return total;
    return total + courseCfu(catalog, entry.courseCode);
  }, 0);

  // Recuperi strutturali non ancora coperti: entrano nel gruppo di scelta come da §7.3/§8.2.
  const missingRecoveries: string[] = [];
  for (const rule of catalog.rules) {
    if (rule.kind !== "recovery_required" || !ruleApplies(rule, track, studentYear)) continue;
    for (const code of rule.codes) {
      if (selected.has(code) || career.isSettled(code, asOf) || missingRecoveries.includes(code)) continue;
      missingRecoveries.push(code);
    }
  }

  const defaults = catalog.defaultNewFrequencies[track][studentYear] ?? [];
  const newFrequencies = [
    ...missingRecoveries,
    ...defaults.filter((code) => !selected.has(code) && !career.isSettled(code, asOf) && !missingRecoveries.includes(code)),
  ];

  // Il gruppo a scelta ha un totale esatto: se reinserimenti e recuperi lo saturano,
  // si toglie l'ultima scelta facoltativa invece di superare il limite.
  if (choiceRule) {
    let budget = choiceRule.requiredCfu - reinsertedChoiceCfu;
    const keep: string[] = [];
    for (const code of newFrequencies) {
      if (!isChoiceCode(code)) {
        keep.push(code);
        continue;
      }
      const cfu = courseCfu(catalog, code);
      const isRecovery = missingRecoveries.includes(code);
      if (!isRecovery && cfu > budget) continue;
      budget -= cfu;
      keep.push(code);
    }
    newFrequencies.length = 0;
    newFrequencies.push(...keep);
  }

  for (const code of newFrequencies) {
    if (selected.has(code)) continue;
    selected.add(code);
    entries.push(makeEntry(catalog, code, track, { reinserted: false, createdAt, preferredYear: studentYear }));
  }

  // Moduli di prova finale collegati: seguono il corso padre solo nei contesti in cui il
  // Manifesto attesta l'associazione. Per un recupero in tabella l'obbligo non è documentato,
  // quindi la proposta non lo aggiunge: il validatore emette una verifica.
  for (const rule of catalog.rules) {
    if (rule.kind !== "linked_modules") continue;
    for (const pair of rule.pairs) {
      if (!selected.has(pair.parent) || selected.has(pair.module)) continue;
      if (career.isSettled(pair.module, asOf)) continue;
      if (!findOffering(catalog, pair.module, track)) continue;
      const parentEntry = entries.find((entry) => entry.courseCode === pair.parent);
      const parentGroup = parentEntry
        ? courseGroup(catalog, pair.parent, track, parentEntry.courseYear, parentEntry.semester)
        : null;
      const attested = pair.attestedGroups === null
        || (parentGroup !== null && pair.attestedGroups.includes(parentGroup));
      if (!attested) continue;
      selected.add(pair.module);
      entries.push(makeEntry(catalog, pair.module, track, {
        courseYear: parentEntry?.courseYear,
        reinserted: Boolean(parentEntry && isReinsertion(parentEntry)),
        createdAt,
      }));
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Riepilogo
// ---------------------------------------------------------------------------

export type AnnualPlanTotals = {
  /** CFU verbalizzati in carriera, indipendenti dal piano. */
  registeredCareerCfu: number;
  /** CFU delle attività reinserite: frequenza già acquisita, già pagate. */
  reinsertedCfu: number;
  /** CFU di nuova frequenza: l'unica metrica che alimenta la contribuzione. */
  newFrequencyCfu: number;
  /** CFU per contribuzione secondo la regola configurata per l'anno. */
  contributionCfu: number;
  supernumeraryCfu: number;
  effectiveCfu: number;
  totalPlanCfu: number;
  /** Proiezione: verbalizzati + attività del piano non ancora verbalizzate. */
  projectedCfu: number;
};

export function computeAnnualTotals(
  catalog: Catalog,
  scenario: PlanScenario,
  career: CareerView
): AnnualPlanTotals {
  let reinsertedCfu = 0;
  let newFrequencyCfu = 0;
  let supernumeraryCfu = 0;
  let effectiveCfu = 0;
  let totalPlanCfu = 0;
  let projectedPlanCfu = 0;

  for (const entry of scenario.entries) {
    const cfu = entryCfu(catalog, entry);
    totalPlanCfu += cfu;
    if (entry.position === "supernumerary") supernumeraryCfu += cfu;
    else effectiveCfu += cfu;
    if (isReinsertion(entry)) reinsertedCfu += cfu;
    else newFrequencyCfu += cfu;
    if (entry.position === "effective" && !career.registered.has(entry.courseCode)) projectedPlanCfu += cfu;
  }

  const registeredCareerCfu = [...career.registered].reduce((total, code) => total + courseCfu(catalog, code), 0);

  return {
    registeredCareerCfu,
    reinsertedCfu,
    newFrequencyCfu,
    contributionCfu: newFrequencyCfu,
    supernumeraryCfu,
    effectiveCfu,
    totalPlanCfu,
    projectedCfu: registeredCareerCfu + projectedPlanCfu,
  };
}
