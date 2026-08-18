/**
 * Applicazione di uno scenario del simulatore: esiti di carriera e righe del piano in
 * **una sola transazione**.
 *
 * Prima l'applicazione era una sequenza di chiamate dal client — una Server Action per ogni esito
 * ipotizzato, più il salvataggio della bozza, più un refresh — con altrettante invalidazioni. Se
 * una chiamata intermedia falliva, la carriera restava scritta a metà. Qui la scrittura è atomica e
 * il risultato torna già lette al chiamante, così il client aggiorna lo stato locale senza dover
 * rifare il giro completo.
 */

import { getDb } from "./db";
import { getExams, syncExamsWithPlan, upsertCareerExam } from "./esami";
import { savePlanDraft, validatePlanDraft, type PlanDraftPayload, type PlanScenario } from "./piano";
import type { CareerExamsMap } from "./polimi/career";
import type { ExamStatus } from "./polimi/constraints";

export type CareerOutcome = {
  code: string;
  status: ExamStatus;
  grade?: string | null;
  passedAt?: string | null;
  registeredAt?: string | null;
};

export type AppliedSimulation = { scenario: PlanScenario; exams: CareerExamsMap };

/**
 * Scrive gli esiti ipotizzati e la bozza del piano nella stessa transazione.
 * `better-sqlite3` annida le transazioni con SAVEPOINT, quindi `savePlanDraft` resta riusabile.
 */
export function applySimulationOutcome(input: {
  outcomes: CareerOutcome[];
  draft: PlanDraftPayload;
}): AppliedSimulation {
  // È essenziale che questa fase non scriva: una bozza assente o non salvabile deve fermare
  // l'operazione prima ancora del primo upsert della carriera.
  if (!input.draft) throw new Error("La bozza del piano è obbligatoria per applicare uno scenario.");
  validatePlanDraft(input.draft);

  const db = getDb();
  const run = db.transaction((): PlanScenario => {
    for (const outcome of input.outcomes) {
      upsertCareerExam({
        code: outcome.code,
        status: outcome.status,
        grade: outcome.grade,
        passedAt: outcome.passedAt ?? null,
        registeredAt: outcome.registeredAt ?? null,
      });
    }
    const scenario = savePlanDraft(input.draft);
    // Anche gli esami `planned` fanno parte dello stato atomico e devono essere presenti nella
    // rilettura consegnata al client.
    syncExamsWithPlan(scenario.entries.map((entry) => entry.courseCode));
    return scenario;
  });

  const scenario = run();
  return {
    scenario,
    exams: getExams(),
  };
}
