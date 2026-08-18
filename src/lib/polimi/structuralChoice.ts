/**
 * Insegnamenti obbligatori a **scelta condizionata**.
 *
 * Il Regolamento del corso 531 usa una formulazione precisa: «Il corso di LOGICA E ALGEBRA è
 * obbligatorio per chi sceglie l'indirizzo I3I - Informatica. Se non scelto al secondo anno deve
 * essere scelto al terzo anno (TABREC)». La condizione è **"non scelto"**, cioè un fatto sul
 * piano degli studi, non sull'esito dell'esame.
 *
 * Confondere i due piani produce errori concreti, ed è il motivo per cui questo modulo esiste:
 *
 * - "non verbalizzato" / "non superato" / "non acquisito" descrivono l'**esito** di un esame;
 * - "non scelto" descrive l'**assenza dell'insegnamento dal piano** di quell'anno.
 *
 * Da qui i due casi che non vanno mai mescolati:
 *
 * 1. l'insegnamento era nel piano del secondo anno e l'esame non è verbalizzato →
 *    è un **reinserimento** della frequenza storica: resta nel blocco in cui era stato scelto,
 *    non diventa una scelta della tabella dei recuperi e non consuma una seconda volta i CFU
 *    del gruppo a scelta del terzo anno;
 * 2. l'insegnamento non è mai stato scelto al secondo anno →
 *    va scelto ora nella **tabella dei recuperi**, è una nuova frequenza e i suoi CFU
 *    concorrono al gruppo a scelta del terzo anno.
 *
 * Modulo puro: nessun accesso al database, nessuna data implicita.
 */

import { collectAcquiredFrequencies, hasEarlierPlanHistory, type AnnualPlanInputs } from "./frequency";
import { courseCfu, courseGroup, courseName, findOffering, offeringSemester } from "./catalog";
import type { CourseYear, PlanRule } from "./catalog/types";
import { buildCareerView } from "./career";
import type { ExamStatus } from "./constraints";

/**
 * Stato di un insegnamento obbligatorio a scelta condizionata, per l'anno che si sta pianificando.
 * Gli identificatori nominano la **decisione** da prendere, non l'esito di un esame.
 */
export type StructuralChoiceState =
  /** Verbalizzato oppure dichiarato non richiesto: la carriera lo ha chiuso, non serve nulla. */
  | "closed"
  /** Scelto in un anno precedente ed esame ancora aperto: va reinserita la frequenza storica. */
  | "reinsert_past_frequency"
  /** Mai scelto: va scelto adesso nella tabella dei recuperi e conta nel gruppo a scelta. */
  | "choose_in_recovery_table"
  /** L'obbligo diventa esigibile a un anno di corso successivo a quello pianificato. */
  | "not_due_yet";

export type StructuralChoice = {
  ruleId: string;
  courseCode: string;
  name: string;
  cfu: number;
  state: StructuralChoiceState;
  /** Anno di corso entro cui la scelta va fatta, come dichiarato dalla regola. */
  dueByYear: CourseYear;
  /** Esito dell'esame in carriera: informazione separata dallo stato della scelta. */
  examStatus: ExamStatus;
  /** Gruppo in cui il blocco storico collocava l'insegnamento, se è un reinserimento. */
  pastGroup: string | null;
  /** Tabella di recupero in cui l'insegnamento va scelto al variare dell'anno, se applicabile. */
  recoveryGroup: string | null;
  /** Anno e semestre dell'offerta con cui va inserito nel piano di quest'anno. */
  targetYear: CourseYear | null;
  targetSemester: 1 | 2 | null;
  /**
   * true solo per `choose_in_recovery_table`: i CFU concorrono al gruppo a scelta del terzo anno.
   * Un reinserimento resta nel blocco di origine e non li consuma di nuovo.
   */
  countsTowardChoiceGroup: boolean;
  /**
   * true quando lo stato è dedotto in assenza di prove: nessun piano compilato in archivio per
   * gli anni precedenti e nessun esito d'esame registrato. Va dichiarato all'utente, non nascosto.
   */
  inferredFromMissingHistory: boolean;
};

function recoveryRules(inputs: AnnualPlanInputs): Extract<PlanRule, { kind: "recovery_required" }>[] {
  return inputs.catalog.rules.filter(
    (rule): rule is Extract<PlanRule, { kind: "recovery_required" }> =>
      rule.kind === "recovery_required" && (!rule.tracks || rule.tracks.includes(inputs.track))
  );
}

/**
 * Classifica ogni insegnamento obbligatorio a scelta condizionata del percorso.
 * I codici arrivano dalle regole del catalogo: qui non è scritto nessun codice insegnamento.
 */
export function classifyStructuralChoices(inputs: AnnualPlanInputs): StructuralChoice[] {
  const { catalog, track, studentYear, asOf } = inputs;
  const career = buildCareerView(catalog, inputs.exams);
  const frequencies = collectAcquiredFrequencies(inputs);

  // Se l'archivio non contiene nessun piano di un anno accademico precedente, l'app non può
  // sapere cosa fu scelto: lo stato resta una deduzione, e va detto.
  const hasHistory = hasEarlierPlanHistory(inputs);

  const choices: StructuralChoice[] = [];

  for (const rule of recoveryRules(inputs)) {
    for (const code of rule.codes) {
      const frequency = frequencies.get(code);
      const examStatus = career.statusOf(code);
      const recoveryOffering = findOffering(catalog, code, track, rule.dueByYear);
      const recoveryGroup = recoveryOffering
        ? recoveryOffering.group
        : courseGroup(catalog, code, track, rule.dueByYear);

      const state: StructuralChoiceState = rule.dueByYear > studentYear
        ? "not_due_yet"
        : career.isSettled(code, asOf)
          ? "closed"
          : frequency
            ? "reinsert_past_frequency"
            : "choose_in_recovery_table";

      const isReinsertion = state === "reinsert_past_frequency";
      const targetYear = isReinsertion
        ? frequency!.courseYear
        : state === "choose_in_recovery_table"
          ? rule.dueByYear
          : null;
      const targetSemester = isReinsertion
        ? frequency!.semester
        : state === "choose_in_recovery_table"
          ? offeringSemester(catalog, code, track, rule.dueByYear)
          : null;

      choices.push({
        ruleId: rule.id,
        courseCode: code,
        name: courseName(catalog, code),
        cfu: courseCfu(catalog, code),
        state,
        dueByYear: rule.dueByYear,
        examStatus,
        pastGroup: isReinsertion
          ? courseGroup(catalog, code, track, frequency!.courseYear, frequency!.semester)
          : null,
        recoveryGroup,
        targetYear,
        targetSemester,
        countsTowardChoiceGroup: state === "choose_in_recovery_table",
        inferredFromMissingHistory:
          state === "choose_in_recovery_table" && !hasHistory && examStatus === "planned",
      });
    }
  }

  return choices.sort((a, b) => a.name.localeCompare(b.name, "it"));
}

/** Codici che quest'anno vanno scelti nella tabella dei recuperi come nuova frequenza. */
export function codesToChooseInRecoveryTable(choices: StructuralChoice[]): string[] {
  return choices.filter((choice) => choice.state === "choose_in_recovery_table").map((choice) => choice.courseCode);
}

/** Codici che quest'anno vanno reinseriti perché la frequenza è già stata acquisita. */
export function codesToReinsert(choices: StructuralChoice[]): string[] {
  return choices.filter((choice) => choice.state === "reinsert_past_frequency").map((choice) => choice.courseCode);
}
