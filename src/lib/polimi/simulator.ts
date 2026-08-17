/**
 * Simulatore di scenari, non distruttivo.
 *
 * Uno scenario è un insieme di ipotesi sulla carriera ("se passo Logica prima della compilazione",
 * "se passo API a gennaio", "se non passo API"). Il simulatore ricalcola reinserimenti, nuove
 * frequenze e vincoli **senza toccare la carriera reale**: la conferma è un'azione separata.
 *
 * Modulo puro: nessun accesso al database e nessuna data implicita.
 */

import { addCalendarDays } from "@/lib/dates";
import { buildAnnualPlanProposal, computeRequiredReinsertions, type RequiredReinsertion } from "./annualPlan";
import {
  courseCfu,
  courseName,
  courseOfferings,
  findCourse,
  offeringSemester,
  offeringYear,
  resolveCatalog,
} from "./catalog";
import { buildCareerView, type CareerExam, type CareerExamsMap } from "./career";
import { originForAddedCourse, planReferenceDate, type PlanEntry, type PlanScenario } from "./planModel";
import {
  validatePlanScenario,
  type PlanValidationContext,
  type PlanValidationSummary,
  type ValidationIssue,
} from "./validation";

/** Quando si ipotizza che l'esame sia stato chiuso, rispetto alla presentazione del piano. */
export type AssumptionTiming = "before_submission" | "january_recovery";

export type SimulationAssumption = {
  courseCode: string;
  outcome: "registered" | "not_passed";
  timing: AssumptionTiming;
};

export type SimulationScenario = {
  id: string;
  label: string;
  description: string;
  assumptions: SimulationAssumption[];
  /**
   * Insegnamenti aggiunti in ipotesi al piano, per esempio per completare il gruppo a scelta.
   * Nella finestra di modifica semestrale il validatore accetta solo il secondo semestre:
   * simulare un'aggiunta del primo semestre serve proprio a mostrare che non è consentita.
   */
  additions?: string[];
  /** Insegnamenti rimossi in ipotesi dal piano. */
  removals?: string[];
};

export type SimulationOutcome = {
  scenario: SimulationScenario;
  /** true quando l'ipotesi precede la presentazione: la proposta di piano viene ricostruita. */
  rebuildsPlan: boolean;
  entries: PlanEntry[];
  summary: PlanValidationSummary;
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  reinsertions: RequiredReinsertion[];
  newFrequencyCodes: string[];
};

export const BASELINE_SCENARIO: SimulationScenario = {
  id: "baseline",
  label: "Situazione attuale",
  description: "Carriera e piano come sono registrati adesso, senza ipotesi.",
  assumptions: [],
};

function applyAssumptions(
  exams: CareerExamsMap,
  assumptions: SimulationAssumption[],
  referenceDate: string
): CareerExamsMap {
  const next: CareerExamsMap = { ...exams };
  for (const assumption of assumptions) {
    const current: CareerExam = next[assumption.courseCode] ?? { status: "planned", grade: null, passedAt: null, registeredAt: null };
    if (assumption.outcome === "not_passed") {
      next[assumption.courseCode] = { ...current, status: "not_passed", passedAt: null, registeredAt: null, grade: null };
      continue;
    }
    const date = assumption.timing === "before_submission"
      ? addCalendarDays(referenceDate, -1)
      : addCalendarDays(referenceDate, 1);
    next[assumption.courseCode] = { ...current, status: "passed_registered", passedAt: date, registeredAt: date };
  }
  return next;
}

/**
 * Aggiunte e rimozioni ipotizzate. Non filtra per semestre di proposito: se l'utente simula
 * un'aggiunta non consentita nella finestra semestrale, il validatore deve poterlo dire.
 */
function applyPlanChanges(
  catalog: ReturnType<typeof resolveCatalog>["catalog"],
  scenario: PlanScenario,
  entries: PlanEntry[],
  simulation: SimulationScenario
): PlanEntry[] {
  const removals = new Set(simulation.removals ?? []);
  const next = entries.filter((entry) => !removals.has(entry.courseCode));
  const present = new Set(next.map((entry) => entry.courseCode));

  for (const code of simulation.additions ?? []) {
    if (present.has(code) || !findCourse(catalog, code)) continue;
    const courseYear = offeringYear(catalog, code, scenario.cycle.track, scenario.cycle.studentYear);
    const semester = offeringSemester(catalog, code, scenario.cycle.track, courseYear);
    present.add(code);
    next.push({
      id: null,
      cycleId: scenario.cycle.id,
      courseCode: code,
      courseYear,
      semester,
      entryKind: "catalog",
      externalName: null,
      externalCfu: null,
      position: "effective",
      origin: originForAddedCourse(catalog, code, scenario.cycle.track),
      isNewFrequency: true,
      feeCounted: true,
      createdAt: scenario.cycle.createdAt,
    });
  }
  return next;
}

export function simulate(
  scenario: PlanScenario,
  context: PlanValidationContext,
  simulation: SimulationScenario
): SimulationOutcome {
  const { catalog } = resolveCatalog(scenario.cycle.academicYear);
  const referenceDate = context.asOf ?? planReferenceDate(scenario.cycle);
  const exams = applyAssumptions(context.exams, simulation.assumptions, referenceDate);
  const rebuildsPlan = simulation.assumptions.some((assumption) => assumption.timing === "before_submission")
    && scenario.cycle.validationMode === "annual_submission";

  const inputs = {
    catalog,
    track: scenario.cycle.track,
    studentYear: scenario.cycle.studentYear,
    academicYear: scenario.cycle.academicYear,
    exams,
    previousCompiledEntries: context.previousCompiledEntries,
    asOf: referenceDate,
  };

  const base = rebuildsPlan
    ? buildAnnualPlanProposal(inputs, scenario.cycle.createdAt)
    : scenario.entries;
  const entries = applyPlanChanges(catalog, scenario, base, simulation);

  const simulated: PlanScenario = { ...scenario, entries };
  const result = validatePlanScenario(simulated, { ...context, exams, asOf: referenceDate });
  const career = buildCareerView(catalog, exams);

  return {
    scenario: simulation,
    rebuildsPlan,
    entries,
    summary: result.summary,
    issues: result.issues,
    errorCount: result.issues.filter((item) => item.type === "error").length,
    warningCount: result.issues.filter((item) => item.type === "warning").length,
    reinsertions: computeRequiredReinsertions(inputs),
    newFrequencyCodes: result.sections.newFrequencies
      .filter((entry) => !career.registered.has(entry.courseCode))
      .map((entry) => entry.courseCode),
  };
}

export type SimulationDiff = {
  label: string;
  baselineValue: string;
  scenarioValue: string;
  delta: number | null;
};

export function compareSimulations(baseline: SimulationOutcome, candidate: SimulationOutcome): SimulationDiff[] {
  const metric = (label: string, pick: (outcome: SimulationOutcome) => number, suffix = " CFU"): SimulationDiff => ({
    label,
    baselineValue: `${pick(baseline)}${suffix}`,
    scenarioValue: `${pick(candidate)}${suffix}`,
    delta: pick(candidate) - pick(baseline),
  });

  return [
    metric("CFU verbalizzati", (outcome) => outcome.summary.registeredCareerCfu),
    metric("CFU da reinserire", (outcome) => outcome.summary.reinsertedCfu),
    metric("CFU di nuova frequenza", (outcome) => outcome.summary.newFrequencyCfu),
    metric("CFU per contribuzione", (outcome) => outcome.summary.contributionCfu),
    metric("Esami da reinserire", (outcome) => outcome.reinsertions.length, ""),
    metric("Errori bloccanti", (outcome) => outcome.errorCount, ""),
    metric("Avvisi", (outcome) => outcome.warningCount, ""),
  ];
}

/**
 * Scenari proposti automaticamente a partire dalle attività ancora aperte del piano:
 * ogni reinserimento genera "lo passo prima della compilazione", "lo passo al recupero di
 * gennaio/febbraio" e "non lo passo".
 */
export function suggestSimulations(
  scenario: PlanScenario,
  context: PlanValidationContext,
  limit = 15
): SimulationScenario[] {
  const { catalog } = resolveCatalog(scenario.cycle.academicYear);
  const referenceDate = context.asOf ?? planReferenceDate(scenario.cycle);
  const open = computeRequiredReinsertions({
    catalog,
    track: scenario.cycle.track,
    studentYear: scenario.cycle.studentYear,
    academicYear: scenario.cycle.academicYear,
    exams: context.exams,
    previousCompiledEntries: context.previousCompiledEntries,
    asOf: referenceDate,
  });

  // I completamenti del gruppo a scelta vengono per primi: con molti reinserimenti aperti
  // il limite di visualizzazione li nasconderebbe, e sono la decisione più strutturale.
  const suggestions: SimulationScenario[] = [...suggestChoiceGroupCompletions(scenario, context)];
  for (const item of open) {
    const name = courseName(catalog, item.courseCode);
    suggestions.push(
      {
        id: `pass_before_${item.courseCode}`,
        label: `Se passo ${name} prima della compilazione`,
        description: "L'esame risulta verbalizzato quando presenti il piano: esce dai reinserimenti e libera spazio per nuove frequenze.",
        assumptions: [{ courseCode: item.courseCode, outcome: "registered", timing: "before_submission" }],
      },
      {
        id: `pass_recovery_${item.courseCode}`,
        label: `Se passo ${name} a gennaio/febbraio`,
        description: "L'esame viene verbalizzato dopo la presentazione: resta nel piano ma non conta per la contribuzione.",
        assumptions: [{ courseCode: item.courseCode, outcome: "registered", timing: "january_recovery" }],
      },
      {
        id: `fail_${item.courseCode}`,
        label: `Se non passo ${name}`,
        description: "L'esame resta non superato: va reinserito anche nel piano dell'anno successivo.",
        assumptions: [{ courseCode: item.courseCode, outcome: "not_passed", timing: "before_submission" }],
      }
    );
  }

  return suggestions.slice(0, limit);
}

/**
 * Scenari per completare un gruppo a scelta ancora incompleto con insegnamenti del secondo
 * semestre: è ciò che la finestra di modifica semestrale permette di fare, quindi deve essere
 * simulabile senza dover prima "chiudere" il gruppo nella presentazione annuale.
 */
export function suggestChoiceGroupCompletions(
  scenario: PlanScenario,
  context: PlanValidationContext,
  maxPerGroup = 3
): SimulationScenario[] {
  const { catalog } = resolveCatalog(scenario.cycle.academicYear);
  const track = scenario.cycle.track;
  const baseline = validatePlanScenario(scenario, context);
  const suggestions: SimulationScenario[] = [];

  for (const rule of catalog.rules) {
    if (rule.kind !== "choice_cfu") continue;
    if (rule.tracks && !rule.tracks.includes(track)) continue;
    const found = baseline.ruleFindings.find((candidate) => candidate.ruleId === rule.id);
    if (!found || found.satisfied) continue;

    const covered = new Set([
      ...baseline.sections.reinsertions.map((entry) => entry.courseCode),
      ...baseline.sections.newFrequencies.map((entry) => entry.courseCode),
      ...baseline.sections.alreadyPassed.map((row) => row.courseCode),
    ]);
    const countedCfu = found.reserved.reduce((total, code) => total + courseCfu(catalog, code), 0);
    const shortfall = rule.requiredCfu - countedCfu;
    if (shortfall <= 0) continue;

    const options = catalog.courses.filter((course) => {
      if (covered.has(course.code) || course.cfu !== shortfall) return false;
      return courseOfferings(course).some((offering) =>
        offering.tracks.includes(track) && offering.semester === 2 && offering.group !== null && rule.groups.includes(offering.group)
      );
    });

    for (const course of options.slice(0, maxPerGroup)) {
      suggestions.push({
        id: `complete_${rule.id}_${course.code}`,
        label: `Se completo i ${rule.requiredCfu} CFU con ${course.name}`,
        description: `Insegnamento del 2° semestre: puoi aggiungerlo nella presentazione annuale oppure nella finestra di modifica del secondo semestre. Copre i ${shortfall} CFU mancanti.`,
        assumptions: [],
        additions: [course.code],
      });
    }
  }

  return suggestions;
}
