/**
 * Read model della pagina Piano di Studi.
 *
 * La pagina faceva sei letture indipendenti che si sovrapponevano: lo scenario attivo veniva
 * risolto due volte e la riga del ciclo veniva riletta a ogni passaggio. Qui la lettura è una
 * sola, coordinata: si legge l'elenco dei cicli una volta e da quello si ricavano lo scenario
 * attivo, quello richiesto e la base della revisione, leggendo le righe solo per i cicli che
 * servono davvero.
 *
 * Non è un ORM e non è una API REST: è una funzione che compone le query già esistenti in
 * `lib/piano.ts` e `lib/esami.ts`, come fanno gli altri Server Component.
 */

import { today } from "./dates";
import {
  buildDefaultScenario,
  getActiveCycleId,
  getPlanEntries,
  getPreviousCompiledEntries,
  listPlanCycles,
  type PlanCycle,
  type PlanScenario,
  type PreviousCompiledEntry,
} from "./piano";
import { getExams } from "./esami";
import { AVAILABLE_ACADEMIC_YEARS } from "./polimi/catalog";
import { compareAcademicYears, incrementAcademicYear, planningAcademicYear } from "./polimi/academicYear";
import type { CareerExamsMap } from "./polimi/career";
import type { Track } from "./polimi/constraints";
import type { CourseYear } from "./polimi/catalog/types";

/**
 * L'azione di passaggio d'anno, calcolata lato server perché dipende dallo storico.
 * Deve essere visibile nel flusso principale, non sepolta nella gestione degli scenari.
 */
export type NextYearAction =
  /** Esiste già un piano per l'anno da pianificare: basta aprirlo. */
  | { kind: "open_existing"; academicYear: string; cycleId: number; reason: string }
  /** Il piano attivo è compilato su PoliMi: il successivo si costruisce da quello. */
  | { kind: "continue_from_compiled"; academicYear: string; cycleId: number; reason: string }
  /** Non c'è nulla per l'anno da pianificare: si crea una bozza nuova. */
  | { kind: "create_draft"; academicYear: string; studentYear: CourseYear; track: Track; reason: string };

export type PianoPageModel = {
  scenario: PlanScenario;
  activeCycleId: number | null;
  /** true quando lo scenario mostrato è quello attivo. */
  isActive: boolean;
  cycles: PlanCycle[];
  exams: CareerExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  baseRevisionScenario: PlanScenario | null;
  /** Anno accademico che ha senso pianificare oggi. */
  planningAcademicYear: string;
  nextYearAction: NextYearAction | null;
  /** Data di riferimento passata al dominio: nessuna funzione pura legge "adesso" da sola. */
  asOf: string;
};

function scenarioFrom(cycles: PlanCycle[], cycleId: number | null): PlanScenario | null {
  if (cycleId === null) return null;
  const cycle = cycles.find((candidate) => candidate.id === cycleId);
  if (!cycle) return null;
  return { cycle, entries: getPlanEntries(cycleId) };
}

/**
 * Scenario da mostrare quando non c'è nessuna preferenza: l'attivo, altrimenti il più
 * promettente fra quelli modificabili, altrimenti una proposta non salvata.
 */
function pickDefaultCycle(cycles: PlanCycle[], activeCycleId: number | null): PlanCycle | null {
  const active = cycles.find((cycle) => cycle.id === activeCycleId && !cycle.archivedAt);
  if (active) return active;
  const rank = (cycle: PlanCycle): number =>
    cycle.status === "draft" ? 0 : cycle.status === "ready" ? 1 : 2;
  return [...cycles]
    .filter((cycle) => !cycle.archivedAt)
    .sort((a, b) => rank(a) - rank(b) || (b.id ?? 0) - (a.id ?? 0))[0] ?? null;
}

export function computeNextYearAction(
  cycles: PlanCycle[],
  shown: PlanScenario,
  target: string
): NextYearAction | null {
  // Il piano mostrato copre già l'anno da pianificare: nessun passaggio d'anno da proporre.
  if (compareAcademicYears(shown.cycle.academicYear, target) >= 0) return null;
  if (!AVAILABLE_ACADEMIC_YEARS.includes(target)) return null;

  const existing = cycles.find((cycle) => cycle.academicYear === target && !cycle.archivedAt);
  if (existing?.id) {
    return {
      kind: "open_existing",
      academicYear: target,
      cycleId: existing.id,
      reason: `Il piano che stai guardando è dell'AA ${shown.cycle.academicYear}, ma per l'AA ${target} esiste già uno scenario.`,
    };
  }

  // Duplichiamo solo quando lo storico visualizzato è precisamente l'anno precedente al
  // target. Da uno storico più vecchio si crea/apre il target, evitando sia un'etichetta
  // fuorviante sia tentativi di duplicare un anno intermedio già esistente.
  if (
    shown.cycle.status === "polimi_compiled"
    && shown.cycle.id
    && incrementAcademicYear(shown.cycle.academicYear) === target
  ) {
    return {
      kind: "continue_from_compiled",
      academicYear: target,
      cycleId: shown.cycle.id,
      reason: `Il piano AA ${shown.cycle.academicYear} è già stato compilato su PoliMi: il piano dell'anno successivo si costruisce da carriera e storico.`,
    };
  }

  return {
    kind: "create_draft",
    academicYear: target,
    studentYear: Math.min(3, shown.cycle.studentYear + 1) as CourseYear,
    track: shown.cycle.track,
    reason: `Il piano attivo appartiene all'AA ${shown.cycle.academicYear}. Per l'AA ${target} non c'è ancora nessun piano.`,
  };
}

/**
 * Tutto quello che serve alla pagina Piano, in una lettura sola.
 * `requestedCycleId` viene dalla query string ed è già stato validato dal chiamante.
 */
export function getPianoPageModel(requestedCycleId?: number | null): PianoPageModel {
  const cycles = listPlanCycles();
  const activeCycleId = getActiveCycleId();

  const requested = requestedCycleId ? scenarioFrom(cycles, requestedCycleId) : null;
  const fallbackCycle = pickDefaultCycle(cycles, activeCycleId);
  const scenario = requested
    ?? (fallbackCycle?.id ? scenarioFrom(cycles, fallbackCycle.id) : null)
    ?? buildDefaultScenario();

  const asOf = today();
  const target = planningAcademicYear(asOf);

  return {
    scenario,
    activeCycleId,
    isActive: scenario.cycle.id !== null && scenario.cycle.id === activeCycleId,
    cycles,
    exams: getExams(),
    previousCompiledEntries: getPreviousCompiledEntries(scenario.cycle.id),
    baseRevisionScenario: scenario.cycle.revisionOfCycleId
      ? scenarioFrom(cycles, scenario.cycle.revisionOfCycleId)
      : null,
    planningAcademicYear: target,
    nextYearAction: computeNextYearAction(cycles, scenario, target),
    asOf,
  };
}
