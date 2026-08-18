/**
 * Test del dominio Poliplanner: piano annuale, reinserimenti, modifica semestrale e simulatore.
 * Eseguire con `pnpm test:polimi`.
 */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { closeDb, getDb } from "../lib/db";
import { addCalendarDays, formatItalianDate, isISODate, today } from "../lib/dates";
import {
  buildAnnualScenario,
  buildDefaultScenario,
  createAnnualDraft,
  createSecondSemesterRevision,
  getCurrentPlanScenario,
  getPlanScenario,
  getPreviousCompiledEntries,
  savePlanDraft,
  updateCycleStatus,
  type PlanDraftPayload,
  type PlanEntry,
  type PlanScenario,
  type PreviousCompiledEntry,
} from "../lib/piano";
import { getExams, setExamStatus, upsertCareerExam } from "../lib/esami";
import { applySimulationOutcome } from "../lib/pianoApply";
import { buildAnnualPlanProposal, computeRequiredReinsertions } from "../lib/polimi/annualPlan";
import { CATALOG_2025_2026 } from "../lib/polimi/catalog/aa2025-2026";
import { CATALOG_2026_2027 } from "../lib/polimi/catalog/aa2026-2027";
import { courseCfu, courseGroupsForTrack, findCourse, getCatalog, groupLabel, resolveCatalog } from "../lib/polimi/catalog";
import { describeAdditionEffect, describeAddableCourses } from "../lib/polimi/courseAdvice";
import { planningAcademicYear } from "../lib/polimi/academicYear";
import { computeNextYearAction } from "../lib/pianoPage";
import { estimateFinalGrade, parseGrade } from "../lib/polimi/gradeCalc";
import { toDraftEntry } from "../lib/polimi/planModel";
import { simulate, suggestSimulations } from "../lib/polimi/simulator";
import { validatePlanScenario, type PlanValidationContext, type PlanValidationResult } from "../lib/polimi/validation";
import { saveSchedule, validateScheduleRows } from "../lib/schedule";
import { resetDatabase } from "../lib/schema";
import { seedDatabase } from "../lib/seed";
import { resolveSubjectCourse, subjectMatchesCourse } from "../lib/subjects";

const root = mkdtempSync(path.join(tmpdir(), "poliplanner-v3-"));
process.env.POLIPLANNER_DB_PATH = path.join(root, "db", "test.db");

const CATALOG = CATALOG_2025_2026;
const AA_2025 = "2025/2026";
const AA_2026 = "2026/2027";

function payload(scenario: PlanScenario): PlanDraftPayload {
  return {
    cycleId: scenario.cycle.id,
    academicYear: scenario.cycle.academicYear,
    studentYear: scenario.cycle.studentYear,
    track: scenario.cycle.track,
    validationMode: scenario.cycle.validationMode,
    entries: scenario.entries.map(toDraftEntry),
  };
}

function reset(): void {
  resetDatabase(getDb());
}

function errorsOf(result: PlanValidationResult): string[] {
  return result.issues.filter((issue) => issue.type === "error").map((issue) => issue.id);
}

function cfu(codes: string[]): number {
  return codes.reduce((total, code) => total + courseCfu(CATALOG, code), 0);
}

function codesOf(entries: PlanEntry[]): string[] {
  return entries.map((entry) => entry.courseCode).sort();
}

/** Segnalazioni che la UI mostra come problemi del piano di quest'anno. */
function currentPlanProblems(result: PlanValidationResult): string[] {
  return result.issues
    .filter((issue) => issue.scope === "current_plan" && (issue.type === "error" || issue.type === "warning"))
    .map((issue) => issue.id);
}

function choiceOf(result: PlanValidationResult, code: string) {
  const choice = result.structuralChoices.find((item) => item.courseCode === code);
  assert.ok(choice, `Deve esistere lo stato della scelta obbligata per ${code}`);
  return choice;
}

try {
  // =========================================================================
  // 0. Fondamenta: date civili e catalogo versionato
  // =========================================================================
  assert.equal(isISODate("2026-02-28"), true);
  assert.equal(isISODate("2026-02-29"), false);
  assert.equal(isISODate("2026-2-28"), false);
  assert.equal(isISODate(today()), true);
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");
  assert.equal(formatItalianDate("2026-08-18", "long"), "18 agosto 2026");

  assert.equal(getCatalog(AA_2025).dataStatus, "verified_from_manifesto");
  assert.equal(getCatalog(AA_2026).dataStatus, "to_verify", "Il Manifesto 2026/27 non è confermato: i dati vanno marcati da verificare");
  assert.notEqual(
    getCatalog(AA_2026).dataNotes[0],
    getCatalog(AA_2025).dataNotes[0],
    "L'AA da verificare espone una nota propria, non quella dell'anno precedente"
  );
  const unknownYear = resolveCatalog("2030/2031");
  assert.equal(unknownYear.isFallback, true, "Un AA senza catalogo non deve essere inventato");
  assert.equal(findCourse(CATALOG, "058082"), undefined);
  assert.equal(findCourse(CATALOG, "FINALE"), undefined);

  // Il progetto di Algoritmi è associato ad Algoritmi solo nel blocco B3 del secondo anno:
  // la tabella TABREC del terzo anno non lo riporta e non va inventata un'offerta.
  assert.deepEqual(
    findCourse(CATALOG, "052509")?.offerings?.map((offering) => offering.group),
    ["B3"],
    "Il modulo di progetto non ha un'offerta TABREC inventata"
  );
  assert.equal(findCourse(CATALOG, "085923")?.semester, 2, "Prova Finale (Ingegneria del Software) è al 2° semestre come nel Manifesto");
  assert.equal(findCourse(CATALOG, "054441")?.semester, 1, "Prova Finale (Progetto di Reti Logiche) è al 1° semestre come nel Manifesto");

  // Ogni regola dichiara la propria provenienza.
  for (const rule of CATALOG.rules) {
    assert.ok(
      ["manifesto", "operational_to_verify", "user_simulation"].includes(rule.provenance),
      `La regola ${rule.id} deve dichiarare la provenienza`
    );
    assert.ok(rule.source.length > 0, `La regola ${rule.id} deve citare la fonte`);
  }

  // =========================================================================
  // 0b. Il catalogo 2026/27 cita la bozza ufficiale, non la dichiara inesistente
  // =========================================================================
  {
    const catalog = CATALOG_2026_2027;
    assert.equal(catalog.dataStatus, "to_verify", "Una bozza informativa resta un dato da riconfermare");

    const draft = catalog.sources.find((source) => source.kind === "regolamento_draft");
    assert.ok(draft, "Il catalogo deve citare la bozza ufficiale del Regolamento");
    assert.ok(
      draft.url?.includes("RegolamentoPublic.do") && draft.url.includes("aa=2026") && draft.url.includes("k_corso_la=531"),
      "La fonte deve riportare l'URL del Regolamento pubblico del corso 531 per l'AA 2026"
    );
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(draft.retrievedOn ?? ""), "La fonte deve riportare la data di consultazione");

    // La vecchia nota diceva che il Manifesto "non è disponibile": era falso, il documento esiste.
    const claims = [catalog.dataStatusReason, ...catalog.dataNotes].join(" ").toLowerCase();
    for (const falsehood of ["non disponibile", "non è ancora stato verificato", "inesistente", "non esiste"]) {
      assert.ok(!claims.includes(falsehood), `Il catalogo non deve dichiarare "${falsehood}": la bozza è pubblicata`);
    }
    assert.ok(claims.includes("bozza informativa"), "Va detto che la fonte è una bozza informativa ufficiale");
    assert.ok(
      catalog.dataStatusReason.includes("Senato Accademico"),
      "Va detto perché il dato è provvisorio: può cambiare fino all'approvazione del Senato Accademico"
    );

    // Struttura trascritta dalla bozza, non ereditata dall'anno precedente.
    assert.notDeepEqual(
      catalog.freeChoiceGroups,
      CATALOG_2025_2026.freeChoiceGroups,
      "Il 2026/27 ha una struttura di tabelle propria: il tirocinio non è più un gruppo a sé"
    );
    assert.deepEqual(
      courseGroupsForTrack(catalog, "086369", "I3I"),
      ["TABINF"],
      "Nella bozza 2026/27 il tirocinio sta nella tabella di informatica per I3I"
    );
    assert.deepEqual(
      courseGroupsForTrack(catalog, "086369", "I3C"),
      ["TABGEN"],
      "Nella bozza 2026/27 il tirocinio sta nella tabella di area generale per I3C"
    );
    assert.ok(
      courseGroupsForTrack(catalog, "088804", "I3C").includes("TABGEN"),
      "La bozza 2026/27 allarga la tabella di area generale a Meccanica"
    );
    assert.equal(findCourse(catalog, "088850"), undefined, "Il codice inventato di Fisica Tecnica per I3C non esiste più");
    assert.equal(findCourse(catalog, "088805")?.cfu, 5, "Fisica Tecnica del terzo anno è quella della bozza, 5 CFU");

    // La regola sulle scelte obbligate cita la formulazione letterale del Regolamento.
    const recovery = catalog.rules.find((rule) => rule.id === "i3i_recovery");
    assert.ok(recovery, "La regola delle scelte obbligate I3I deve esistere");
    assert.equal(recovery.provenance, "manifesto");
    assert.ok(
      recovery.source.includes("Se non scelto al secondo anno deve essere scelto al terzo anno (TABREC)"),
      "La fonte deve citare la frase del Regolamento, che parla di scelta e non di esito d'esame"
    );

    // Nessuna sigla nuda nelle etichette dei gruppi: la UI le mostra così come sono.
    for (const [code, group] of Object.entries(catalog.electiveGroups)) {
      assert.notEqual(group.label, code, `Il gruppo ${code} deve avere un'etichetta leggibile, non la sigla`);
      assert.ok(group.description.length > 0, `Il gruppo ${code} deve avere una descrizione`);
    }

    // Ogni vincolo annuale dichiara la propria provenienza: l'intervallo 30-80 CFU non è
    // nel Regolamento del corso e non va spacciato per tale.
    for (const [key, declared] of Object.entries(catalog.annual.sources)) {
      assert.ok(
        ["manifesto", "operational_to_verify", "user_simulation"].includes(declared.provenance),
        `Il vincolo annuale ${key} deve dichiarare la provenienza`
      );
      assert.ok(declared.source.length > 0, `Il vincolo annuale ${key} deve citare la fonte`);
    }
    assert.equal(
      catalog.annual.sources.cfuRange.provenance,
      "operational_to_verify",
      "L'intervallo di CFU per anno viene dalle norme di presentazione, non dal Regolamento del corso"
    );
    assert.equal(
      catalog.annual.sources.supernumerary.provenance,
      "manifesto",
      "Il limite di 32 CFU in soprannumero è attestato dal Regolamento"
    );

    for (const rule of catalog.rules) {
      assert.ok(
        ["manifesto", "operational_to_verify", "user_simulation"].includes(rule.provenance),
        `La regola ${rule.id} deve dichiarare la provenienza`
      );
      assert.ok(rule.source.length > 0, `La regola ${rule.id} deve citare la fonte`);
    }
  }

  // L'anno accademico da pianificare guarda avanti da luglio: è quando apre la presentazione.
  assert.equal(planningAcademicYear("2026-08-18"), "2026/2027");
  assert.equal(planningAcademicYear("2026-06-30"), "2025/2026");
  assert.equal(planningAcademicYear("2026-09-01"), "2026/2027");

  // =========================================================================
  // 1. Il piano è annuale: non trascina i tre anni di corso
  // =========================================================================
  const firstYear = buildDefaultScenario("I3I", 1, AA_2025);
  assert.deepEqual(
    [...new Set(firstYear.entries.map((entry) => entry.courseYear))],
    [1],
    "Il piano del primo anno contiene solo attività del primo anno"
  );
  const firstYearResult = validatePlanScenario(firstYear, { exams: {}, previousCompiledEntries: [] });
  assert.equal(firstYearResult.summary.newFrequencyCfu, 60);
  assert.equal(firstYearResult.summary.reinsertedCfu, 0);
  assert.equal(firstYearResult.summary.registeredCareerCfu, 0);
  assert.deepEqual(errorsOf(firstYearResult), [], "Il piano consigliato del primo anno non ha errori bloccanti");
  assert.ok(
    firstYearResult.issues.some((issue) => issue.id === "rule_i3i_year3_fixed" && issue.type === "advice"),
    "I vincoli del terzo anno sono consigli, non errori, per uno studente del primo anno"
  );

  // --- Criterio di accettazione: un piano del primo anno non mostra "Attenzione" per il terzo ---
  assert.equal(
    firstYearResult.summary.status,
    "valid",
    "Il piano consigliato del primo anno non è in stato di attenzione: gli obblighi del terzo anno non sono suoi"
  );
  assert.deepEqual(
    currentPlanProblems(firstYearResult),
    [],
    "Nessun problema del piano corrente per un primo anno regolare"
  );
  for (const issue of firstYearResult.issues) {
    if (issue.dueNow) continue;
    assert.ok(
      issue.type === "advice" || issue.type === "info",
      `La regola non ancora esigibile ${issue.id} non può essere un errore o un avviso`
    );
    assert.equal(issue.scope, "future_years", `${issue.id} va nell'anteprima degli anni successivi`);
  }
  // In particolare il gruppo da 15 CFU del terzo anno, che prima compariva come avviso.
  const firstYearChoice = firstYearResult.issues.find((issue) => issue.id === "rule_i3i_choice_15");
  assert.ok(firstYearChoice, "Il gruppo da 15 CFU resta consultabile");
  assert.equal(firstYearChoice.type, "advice", "Per un primo anno il gruppo da 15 CFU non è un avviso");
  assert.equal(firstYearChoice.scope, "future_years");
  assert.equal(firstYearChoice.dueByYear, 3);
  assert.ok(
    firstYearChoice.message.includes("All'anno 3"),
    "Il messaggio parla al futuro, non denuncia un ammanco"
  );
  // E le scelte obbligate del terzo anno sono ancora "non dovute" al primo.
  assert.equal(choiceOf(firstYearResult, "085903").state, "not_due_yet");
  assert.equal(choiceOf(firstYearResult, "086067").state, "not_due_yet");
  assert.ok(
    firstYearResult.issues.every((issue) => !(issue.type === "error" && issue.id.startsWith("projection_"))),
    "I 180 CFU di laurea non bloccano un piano annuale"
  );

  const thirdYearFresh = buildDefaultScenario("I3I", 3, AA_2025);
  assert.ok(
    thirdYearFresh.entries.every((entry) => entry.courseYear === 3),
    "Il piano del terzo anno non ripropone primo e secondo anno"
  );

  // =========================================================================
  // 2. Caso reale: carriera verbalizzata da 63 CFU + piano precedente non superato
  // =========================================================================
  const CAREER_REGISTERED: [string, number][] = [
    ["082740", 10], // Analisi Matematica 1
    ["082746", 10], // Fondamenti di Informatica
    ["082747", 8],  // Geometria e Algebra Lineare
    ["054303", 10], // Fondamenti di Comunicazioni e Internet
    ["082748", 10], // Elettrotecnica
    ["085779", 10], // Architettura dei Calcolatori e Sistemi Operativi
    ["085900", 5],  // Chimica Generale
  ];
  assert.equal(cfu(CAREER_REGISTERED.map(([code]) => code)), 63, "La carriera di riferimento vale 63 CFU");
  for (const [code, expected] of CAREER_REGISTERED) {
    assert.equal(courseCfu(CATALOG, code), expected, `CFU di ${code} secondo il catalogo`);
  }

  /** Piano AA 2025/26 del secondo anno, realmente compilato: definisce le frequenze acquisite. */
  const PREVIOUS_PLAN_CODES = [
    "051124", // Fisica, reinserita dal primo anno
    "052425", // Analisi Matematica 2
    "085779", // Architettura dei Calcolatori e Sistemi Operativi (superata)
    "085903", // Logica e Algebra, blocco B1
    "085900", // Chimica Generale, TABA del blocco B1 (superata)
    "085905", // Fondamenti di Automatica
    "054304", // Informazione e Stima
    "086067", // Algoritmi e Principi dell'Informatica, blocco B3
    "052509", // progetto di Algoritmi, modulo del blocco B3 (superato)
  ];

  const REGISTRATION_DATE = "2026-02-10";
  const PLAN_SUBMISSION = "2026-07-20";

  function seedRealCase(options: { apiRegistered: boolean; logicaRegisteredAt?: string | null }): void {
    reset();
    for (const [code] of CAREER_REGISTERED) {
      upsertCareerExam({ code, status: "passed_registered", grade: "25", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
    }
    // progetto API: superato e verbalizzato.
    upsertCareerExam({ code: "052509", status: "passed_registered", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
    // Il resto del piano precedente risulta non superato.
    for (const code of ["051124", "052425", "085905", "054304"]) {
      setExamStatus(code, "not_passed");
    }
    setExamStatus("086067", "not_passed");
    setExamStatus("085903", "not_passed");
    if (options.apiRegistered) {
      upsertCareerExam({ code: "086067", status: "passed_registered", grade: "24", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
    }
    if (options.logicaRegisteredAt) {
      upsertCareerExam({
        code: "085903", status: "passed_registered", grade: "28",
        passedAt: options.logicaRegisteredAt, registeredAt: options.logicaRegisteredAt,
      });
    }

    const previous = savePlanDraft({
      cycleId: null, academicYear: AA_2025, studentYear: 2, track: "I3I", validationMode: "annual_submission",
      entries: PREVIOUS_PLAN_CODES.map((code) => ({
        courseCode: code,
        courseYear: code === "051124" ? 1 : 2,
        position: "effective" as const,
        origin: code === "051124" ? ("recovery_reinserted" as const) : ("new_frequency" as const),
      })),
    });
    const ready = updateCycleStatus(previous.cycle.id as number, "ready", "auto_approved_after_deadline");
    updateCycleStatus(ready.cycle.id as number, "polimi_compiled", "auto_approved_after_deadline");
  }

  function annualInputs(overrides: { apiRegistered: boolean; logicaRegisteredAt?: string | null }) {
    seedRealCase(overrides);
    const previousCompiledEntries = getPreviousCompiledEntries(null);
    return {
      exams: getExams(),
      previousCompiledEntries,
      inputs: {
        catalog: CATALOG,
        track: "I3I" as const,
        studentYear: 3 as const,
        academicYear: AA_2026,
        exams: getExams(),
        previousCompiledEntries,
        asOf: PLAN_SUBMISSION,
      },
    };
  }

  // --- 2a. API non verbalizzato: deve risultare reinserimento --------------
  {
    const { inputs } = annualInputs({ apiRegistered: false });
    const required = computeRequiredReinsertions(inputs);
    const codes = required.map((item) => item.courseCode).sort();
    assert.deepEqual(
      codes,
      ["051124", "052425", "054304", "085903", "085905", "086067"].sort(),
      "Con API non verbalizzato il reinserimento è dovuto, insieme agli altri non superati"
    );
    assert.equal(cfu(codes), 57, "I reinserimenti valgono 57 CFU");
    assert.ok(!codes.includes("085779"), "Un esame verbalizzato non è un reinserimento");
    assert.ok(!codes.includes("085900"), "Chimica Generale verbalizzata non è un reinserimento");
    assert.ok(!codes.includes("052509"), "Il progetto di Algoritmi verbalizzato non è un reinserimento");
  }

  // --- 2b. API verbalizzato: non deve risultare reinserito -----------------
  {
    const { inputs } = annualInputs({ apiRegistered: true });
    const required = computeRequiredReinsertions(inputs);
    const codes = required.map((item) => item.courseCode);
    assert.ok(!codes.includes("086067"), "Con API verbalizzato non ci deve essere alcun reinserimento di API");
    assert.equal(cfu(codes), 47, "Senza API i reinserimenti scendono a 47 CFU");
  }

  // --- 2c. Logica verbalizzata prima del piano annuale ---------------------
  {
    const { inputs } = annualInputs({ apiRegistered: false, logicaRegisteredAt: addCalendarDays(PLAN_SUBMISSION, -30) });
    const codes = computeRequiredReinsertions(inputs).map((item) => item.courseCode);
    assert.ok(!codes.includes("085903"), "Logica verbalizzata prima della compilazione non va reinserita");
  }

  // --- 2d. Logica verbalizzata dopo il piano annuale -----------------------
  {
    const { inputs } = annualInputs({ apiRegistered: false, logicaRegisteredAt: addCalendarDays(PLAN_SUBMISSION, 40) });
    const required = computeRequiredReinsertions(inputs);
    const logica = required.find((item) => item.courseCode === "085903");
    assert.ok(logica, "Alla data di presentazione Logica non era ancora verbalizzata: il reinserimento era dovuto");
    assert.equal(logica.registeredAfterSubmission, true, "Va segnalato che la verbalizzazione è arrivata dopo la presentazione");
  }

  // =========================================================================
  // 3. Proposta annuale 2026/27 e riepilogo separato
  // =========================================================================
  const { exams: realExams, previousCompiledEntries: realPrevious } = annualInputs({ apiRegistered: false });
  const annual2026 = createAnnualDraft(AA_2026, 3, "I3I");
  const annualContext: PlanValidationContext = {
    exams: realExams,
    previousCompiledEntries: realPrevious,
    asOf: PLAN_SUBMISSION,
  };
  const annualResult = validatePlanScenario(annual2026, annualContext);

  assert.equal(annualResult.summary.registeredCareerCfu, 64, "63 CFU di carriera più il progetto da 1 CFU");
  assert.equal(annualResult.summary.reinsertedCfu, 57, "CFU da reinserire separati dagli altri");
  assert.equal(annualResult.summary.newFrequencyCfu, 59, "Nuove frequenze del terzo anno");
  assert.equal(annualResult.summary.contributionCfu, 59, "La contribuzione conta solo le nuove frequenze");
  assert.notEqual(
    annualResult.summary.contributionCfu,
    annualResult.summary.totalPlanCfu,
    "Il piano vale più dei CFU per contribuzione: i reinserimenti non contribuiscono"
  );
  assert.deepEqual(errorsOf(annualResult), [], "La proposta 2026/27 non ha errori bloccanti");
  assert.equal(annualResult.summary.academicYear, AA_2026);
  assert.ok(
    annualResult.issues.some((issue) => issue.id === "catalog_to_verify" && issue.provenance === "operational_to_verify"),
    "Un catalogo non confermato va dichiarato come dato da verificare"
  );
  assert.ok(
    annualResult.issues.some((issue) => issue.id === "reinsertion_range_unknown" && issue.provenance === "operational_to_verify"),
    "Se i reinserimenti occupino lo spazio delle nuove frequenze è una regola operativa da verificare"
  );

  // Sezioni della schermata: reinserimenti, nuove frequenze, già superati.
  assert.equal(annualResult.sections.reinsertions.length, 6);
  assert.ok(annualResult.sections.reinsertions.every((entry) => !entry.isNewFrequency && !entry.feeCounted));
  assert.ok(annualResult.sections.newFrequencies.every((entry) => entry.isNewFrequency && entry.feeCounted));
  assert.equal(annualResult.sections.alreadyPassed.length, 8, "Sette esami di carriera più il progetto verbalizzato");
  assert.ok(
    annualResult.sections.alreadyPassed.every((row) => row.status === "passed_registered"),
    "La sezione di sola lettura mostra solo ciò che è verbalizzato"
  );
  assert.equal(annualResult.missingReinsertions.length, 0, "La proposta include già tutti i reinserimenti dovuti");

  // Nessun esame verbalizzato viene richiesto dal validatore.
  const registeredCodes = [...CAREER_REGISTERED.map(([code]) => code), "052509"];
  for (const code of registeredCodes) {
    assert.ok(
      !annualResult.issues.some((issue) => issue.type === "error" && issue.message.includes(code)),
      `Il validatore non deve richiedere ${code}: è già verbalizzato`
    );
    assert.ok(
      !annualResult.ruleFindings.some((finding) => finding.missing.includes(code)),
      `Nessuna regola può considerare mancante ${code}: è già verbalizzato`
    );
    assert.ok(
      !annualResult.sections.newFrequencies.some((entry) => entry.courseCode === code),
      `${code} è verbalizzato e non può essere una nuova frequenza`
    );
  }

  // Un reinserimento riguarda solo attività la cui frequenza è precedente.
  for (const entry of annualResult.sections.reinsertions) {
    assert.ok(
      realPrevious.some((previous) => previous.entry.courseCode === entry.courseCode && previous.cycle.academicYear < AA_2026),
      `${entry.courseCode} è reinserito solo perché frequentato in un piano precedente`
    );
  }

  // I recuperi TABREC del gruppo a scelta: qui Logica e API erano già scelti al secondo anno,
  // quindi restano nei blocchi B1/B3 e non consumano i 15 CFU del terzo anno.
  const choiceFinding = annualResult.ruleFindings.find((finding) => finding.ruleId === "i3i_choice_15");
  assert.ok(choiceFinding?.satisfied, "Il gruppo da 15 CFU è completo con le tre scelte facoltative");
  assert.ok(
    !choiceFinding.reserved.includes("085903") && !choiceFinding.reserved.includes("086067"),
    "Logica e API scelte al secondo anno non contano una seconda volta nei 15 CFU"
  );

  // =========================================================================
  // 4. Logica e API come veri recuperi TABREC: contribuiscono ai 15 CFU
  // =========================================================================
  {
    reset();
    // Studente che al secondo anno ha scelto Elettromagnetismo e Campi e il bundle Segnali:
    // Logica e API non sono mai stati inseriti, quindi al terzo anno sono recuperi TABREC.
    const CAMPI_CAREER = [
      "082740", "082746", "082747", "051124", "082748", "054303",
      "052425", "085779", "085905", "093506", "099319", "099322", "054440",
    ];
    for (const code of CAMPI_CAREER) {
      upsertCareerExam({ code, status: "passed_registered", grade: "26", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
    }
    const proposal = buildAnnualPlanProposal({
      catalog: CATALOG,
      track: "I3I",
      studentYear: 3,
      academicYear: AA_2026,
      exams: getExams(),
      previousCompiledEntries: [],
      asOf: PLAN_SUBMISSION,
    }, new Date().toISOString());

    const codes = codesOf(proposal);
    assert.ok(codes.includes("085903"), "Logica non acquisita al secondo anno è obbligatoria al terzo");
    assert.ok(codes.includes("086067"), "API non acquisito al secondo anno è obbligatorio al terzo");
    assert.ok(
      !codes.includes("056889") && !codes.includes("088804") && !codes.includes("085901"),
      "I recuperi TABREC saturano i 15 CFU: le scelte facoltative vengono tolte, non sommate"
    );
    assert.ok(!codes.includes("052509"), "Il modulo di progetto non viene aggiunto a un recupero in tabella");

    const recovery = proposal.find((entry) => entry.courseCode === "086067");
    assert.equal(recovery?.courseYear, 3, "Il recupero usa l'offerta di terzo anno, non quella di secondo");
    assert.equal(recovery?.isNewFrequency, true, "Un recupero mai frequentato è una nuova frequenza");

    const scenario: PlanScenario = {
      cycle: { ...buildAnnualScenario({ track: "I3I", studentYear: 3, academicYear: AA_2026 }).cycle },
      entries: proposal,
    };
    const result = validatePlanScenario(scenario, { exams: getExams(), previousCompiledEntries: [], asOf: PLAN_SUBMISSION });
    const finding = result.ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
    assert.ok(finding?.satisfied, "Logica (5 CFU) e API (10 CFU) recuperati completano i 15 CFU del gruppo");
    assert.ok(finding.reserved.includes("085903") && finding.reserved.includes("086067"));
    assert.deepEqual(errorsOf(result), [], "Il piano con recuperi TABREC è valido");

    // Il modulo di progetto associato a un recupero è una verifica, non un obbligo inventato.
    const linked = result.issues.find((issue) => issue.id === "rule_final_exam_modules");
    assert.ok(linked, "Va segnalato il dubbio sul modulo di progetto del corso recuperato");
    assert.equal(linked.type, "warning", "Non è un errore bloccante: il Manifesto non lo attesta in TABREC");
    assert.equal(linked.provenance, "operational_to_verify");
    assert.ok(linked.message.includes("052509") || linked.message.includes("Progetto"), "Il messaggio indica quale modulo verificare");
  }

  // =========================================================================
  // 4b. Gli stati delle scelte obbligate, modellati e testati uno per uno
  //
  // Il Regolamento condiziona l'obbligo alla **scelta** ("se non scelto al secondo anno"), non
  // all'esito dell'esame. Qui si verifica che i due casi restino distinti e producano decisioni
  // opposte sul gruppo da 15 CFU, e che Logica e Algoritmi seguano storie indipendenti.
  // =========================================================================
  {
    /** Piano del secondo anno realmente compilato, con i codici indicati. */
    function compilePreviousYear(codes: string[]): void {
      const previous = savePlanDraft({
        cycleId: null, academicYear: AA_2025, studentYear: 2, track: "I3I", validationMode: "annual_submission",
        entries: codes.map((code) => ({
          courseCode: code,
          courseYear: 2 as const,
          position: "effective" as const,
          origin: "new_frequency" as const,
        })),
      });
      const ready = updateCycleStatus(previous.cycle.id as number, "ready", "auto_approved_after_deadline");
      updateCycleStatus(ready.cycle.id as number, "polimi_compiled", "auto_approved_after_deadline");
    }

    function thirdYearFor(options: { chosenAtSecondYear: string[]; registered: string[]; notPassed: string[] }) {
      reset();
      for (const code of options.registered) {
        upsertCareerExam({ code, status: "passed_registered", grade: "26", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
      }
      for (const code of options.notPassed) setExamStatus(code, "not_passed");
      compilePreviousYear(options.chosenAtSecondYear);

      const previousCompiledEntries = getPreviousCompiledEntries(null);
      const exams = getExams();
      const inputs = {
        catalog: CATALOG, track: "I3I" as const, studentYear: 3 as const, academicYear: AA_2026,
        exams, previousCompiledEntries, asOf: PLAN_SUBMISSION,
      };
      const proposal = buildAnnualPlanProposal(inputs, new Date().toISOString());
      const scenario: PlanScenario = {
        cycle: buildAnnualScenario({ track: "I3I", studentYear: 3, academicYear: AA_2026 }).cycle,
        entries: proposal,
      };
      const context: PlanValidationContext = { exams, previousCompiledEntries, asOf: PLAN_SUBMISSION };
      return { inputs, proposal, scenario, context, result: validatePlanScenario(scenario, context) };
    }

    // Il biennio "regolare" tolto Logica e Algoritmi, usato come base dei casi.
    const SECOND_YEAR_CORE = ["052425", "085779", "085905", "099319"];
    const FIRST_YEAR = ["082740", "082746", "082747", "051124", "082748", "054303"];

    // --- Caso A: Logica SCELTA al secondo anno, esame non verbalizzato ------
    // Deve restare un reinserimento e non consumare i 15 CFU del terzo anno.
    {
      const chosen = [...SECOND_YEAR_CORE, "085903", "085900"];
      const { result, proposal } = thirdYearFor({
        chosenAtSecondYear: chosen,
        registered: [...FIRST_YEAR, ...SECOND_YEAR_CORE, "085900"],
        notPassed: ["085903"],
      });

      const logica = choiceOf(result, "085903");
      assert.equal(logica.state, "reinsert_past_frequency", "Logica scelta al secondo anno e non verbalizzata è un reinserimento");
      assert.equal(logica.countsTowardChoiceGroup, false, "Un reinserimento non consuma i CFU del gruppo a scelta");
      assert.equal(logica.pastGroup, "B1", "Il reinserimento resta nel blocco in cui era stato scelto");
      assert.equal(logica.examStatus, "not_passed", "Lo stato d'esame resta un'informazione separata dallo stato della scelta");

      const entry = proposal.find((item) => item.courseCode === "085903");
      assert.ok(entry, "Logica va reinserita nel piano del terzo anno");
      assert.equal(entry.courseYear, 2, "Il reinserimento usa l'offerta dell'anno in cui era stata scelta");
      assert.equal(entry.isNewFrequency, false, "Un reinserimento non è una nuova frequenza");
      assert.equal(entry.feeCounted, false, "Un reinserimento è già stato pagato");

      const choiceFinding = result.ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
      assert.ok(choiceFinding, "Il gruppo da 15 CFU va valutato");
      assert.ok(
        !choiceFinding.reserved.includes("085903"),
        "Logica reinserita non deve comparire fra i CFU contati nel gruppo a scelta"
      );

      // Il controllo decisivo: i 15 CFU vanno composti interamente altrove.
      const countedCfu = choiceFinding.reserved.reduce((total, code) => total + courseCfu(CATALOG, code), 0);
      assert.equal(countedCfu, 15, "Il gruppo si compone di 15 CFU di altre scelte, senza contare Logica");
      assert.ok(choiceFinding.satisfied, "Con 15 CFU di scelte il gruppo è completo");
      assert.ok(
        !currentPlanProblems(result).includes("rule_i3i_choice_15"),
        "Il gruppo a scelta completo non genera problemi"
      );
    }

    // --- Caso B: Logica MAI SCELTA al secondo anno -------------------------
    // Deve diventare una scelta della tabella dei recuperi e concorrere ai 15 CFU.
    {
      const chosen = [...SECOND_YEAR_CORE, "093506"]; // ha scelto Elettromagnetismo e Campi
      const { result, proposal } = thirdYearFor({
        chosenAtSecondYear: chosen,
        registered: [...FIRST_YEAR, ...SECOND_YEAR_CORE, "093506"],
        notPassed: [],
      });

      const logica = choiceOf(result, "085903");
      assert.equal(logica.state, "choose_in_recovery_table", "Logica mai scelta va scelta ora nella tabella dei recuperi");
      assert.equal(logica.countsTowardChoiceGroup, true, "Una scelta nella tabella dei recuperi concorre ai 15 CFU");
      assert.equal(logica.recoveryGroup, "TABREC");
      assert.equal(logica.pastGroup, null, "Non c'è nessun blocco storico da cui reinserirla");
      assert.equal(logica.inferredFromMissingHistory, false, "Lo storico esiste: non è una deduzione");

      const entry = proposal.find((item) => item.courseCode === "085903");
      assert.ok(entry, "Logica non scelta prima entra nel piano del terzo anno");
      assert.equal(entry.courseYear, 3, "Usa l'offerta del terzo anno, quella della tabella dei recuperi");
      assert.equal(entry.isNewFrequency, true, "Una scelta mai fatta prima è una nuova frequenza");

      const choiceFinding = result.ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
      assert.ok(choiceFinding, "Il gruppo da 15 CFU va valutato");
      assert.ok(choiceFinding.reserved.includes("085903"), "Logica scelta in tabella di recupero conta nei 15 CFU");
      assert.ok(choiceFinding.reserved.includes("086067"), "Anche Algoritmi, mai scelto, conta nei 15 CFU");
      assert.equal(
        choiceFinding.reserved.reduce((total, code) => total + courseCfu(CATALOG, code), 0),
        15,
        "Logica (5) e Algoritmi (10) saturano da soli il gruppo da 15 CFU"
      );
      assert.ok(choiceFinding.satisfied);
    }

    // --- Caso C: Logica e Algoritmi con casistiche indipendenti ------------
    // Logica scelta e non superata, Algoritmi mai scelto: due stati diversi nello stesso piano.
    {
      const chosen = [...SECOND_YEAR_CORE, "085903", "085900", "099322", "054440"];
      const { result, proposal } = thirdYearFor({
        chosenAtSecondYear: chosen,
        registered: [...FIRST_YEAR, ...SECOND_YEAR_CORE, "085900", "099322", "054440"],
        notPassed: ["085903"],
      });

      const logica = choiceOf(result, "085903");
      const api = choiceOf(result, "086067");
      assert.equal(logica.state, "reinsert_past_frequency", "Logica era stata scelta: reinserimento");
      assert.equal(api.state, "choose_in_recovery_table", "Algoritmi non era stato scelto: scelta in tabella di recupero");
      assert.notEqual(logica.state, api.state, "I due insegnamenti seguono storie indipendenti");
      assert.equal(logica.countsTowardChoiceGroup, false);
      assert.equal(api.countsTowardChoiceGroup, true);

      const logicaEntry = proposal.find((item) => item.courseCode === "085903");
      const apiEntry = proposal.find((item) => item.courseCode === "086067");
      assert.equal(logicaEntry?.courseYear, 2, "Il reinserimento tiene l'anno di offerta originale");
      assert.equal(logicaEntry?.isNewFrequency, false);
      assert.equal(apiEntry?.courseYear, 3, "La scelta in tabella di recupero usa l'offerta del terzo anno");
      assert.equal(apiEntry?.isNewFrequency, true);

      const choiceFinding = result.ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
      assert.ok(choiceFinding, "Il gruppo da 15 CFU va valutato");
      assert.ok(choiceFinding.reserved.includes("086067"), "Solo Algoritmi entra nel conteggio dei 15 CFU");
      assert.ok(!choiceFinding.reserved.includes("085903"), "Logica reinserita resta fuori dal conteggio");
      const countedCfu = choiceFinding.reserved.reduce((total, code) => total + courseCfu(CATALOG, code), 0);
      assert.equal(countedCfu, 15, "Algoritmi (10) più 5 CFU di scelta libera completano il gruppo");

      // Il progetto di Algoritmi non viene inventato per una scelta in tabella di recupero.
      assert.ok(!codesOf(proposal).includes("052509"), "Il modulo di progetto non segue la scelta in tabella di recupero");
      const linked = result.issues.find((issue) => issue.id === "rule_final_exam_modules");
      assert.equal(linked?.type, "warning", "Il modulo di progetto è una verifica, non un obbligo inventato");
      assert.equal(linked.provenance, "operational_to_verify");
    }

    // --- Caso C-bis: nessun blocco progettuale scelto al secondo anno -------
    // Il Regolamento offre due strade per lo stesso obbligo: il blocco del secondo anno oppure la
    // tabella di recupero al terzo. Chi prende la seconda ha adempiuto, e la tabella del terzo anno
    // elenca l'insegnamento senza il modulo di progetto da 1 CFU: pretenderlo sarebbe inventato.
    {
      const chosen = [...SECOND_YEAR_CORE, "085903", "085900"]; // nessuna scelta del blocco progettuale
      const { result, proposal } = thirdYearFor({
        chosenAtSecondYear: chosen,
        registered: [...FIRST_YEAR, ...SECOND_YEAR_CORE, "085900"],
        notPassed: ["085903"],
      });

      assert.equal(choiceOf(result, "086067").state, "choose_in_recovery_table");
      assert.ok(codesOf(proposal).includes("086067"), "Algoritmi entra nel piano dalla tabella di recupero");
      assert.ok(!codesOf(proposal).includes("052509"), "Il modulo di progetto non viene aggiunto");

      const b3 = result.ruleFindings.find((item) => item.ruleId === "it1_year2_b3");
      assert.ok(b3, "Il blocco progettuale del secondo anno va comunque valutato");
      assert.ok(b3.satisfied, "Sceglierlo nella tabella di recupero assolve il blocco del secondo anno");
      assert.equal(b3.severityHint, "advice", "Un obbligo assolto per via alternativa non è un errore");
      assert.equal(b3.provenance, "operational_to_verify", "Come si completino i CFU residui del blocco non è documentato");
      assert.ok(
        b3.detail.includes("tabella di recupero"),
        "Va spiegato perché il blocco risulta assolto"
      );
      assert.ok(
        b3.detail.includes("Prova Finale (Progetto di Algoritmi e Strutture Dati)"),
        "Va nominato il modulo che le tabelle del terzo anno non elencano"
      );

      assert.ok(
        !currentPlanProblems(result).includes("rule_it1_year2_b3"),
        "Il blocco assolto non deve comparire fra i problemi del piano corrente"
      );
      assert.deepEqual(
        currentPlanProblems(result).filter((id) => id !== "rule_final_exam_modules"),
        [],
        "Nessun altro problema bloccante in questo scenario"
      );
    }

    // --- Caso D: verbalizzato prima della presentazione --------------------
    {
      reset();
      for (const code of [...FIRST_YEAR, ...SECOND_YEAR_CORE, "085900", "085903", "086067", "052509"]) {
        upsertCareerExam({ code, status: "passed_registered", grade: "27", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
      }
      compilePreviousYear([...SECOND_YEAR_CORE, "085903", "085900", "086067", "052509"]);
      const exams = getExams();
      const previousCompiledEntries = getPreviousCompiledEntries(null);
      const scenario = buildAnnualScenario({
        track: "I3I", studentYear: 3, academicYear: AA_2026, exams, previousCompiledEntries, asOf: PLAN_SUBMISSION,
      });
      const result = validatePlanScenario(scenario, { exams, previousCompiledEntries, asOf: PLAN_SUBMISSION });

      assert.equal(choiceOf(result, "085903").state, "closed", "Verbalizzato prima della presentazione: nulla da fare");
      assert.equal(choiceOf(result, "086067").state, "closed");
      assert.ok(
        !codesOf(scenario.entries).includes("085903"),
        "Un esame verbalizzato non viene riproposto, né come reinserimento né come nuova scelta"
      );
      const choiceFinding = result.ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
      assert.ok(
        !choiceFinding?.reserved.includes("085903"),
        "Logica verbalizzata in un contesto ambiguo non viene attribuita d'ufficio al gruppo da 15 CFU"
      );
    }

    // --- Caso E: nessuno storico in archivio: lo stato è dedotto e va dichiarato ---
    {
      reset();
      for (const code of FIRST_YEAR) {
        upsertCareerExam({ code, status: "passed_registered", grade: "24", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
      }
      const exams = getExams();
      const scenario = buildAnnualScenario({
        track: "I3I", studentYear: 3, academicYear: AA_2026, exams, previousCompiledEntries: [], asOf: PLAN_SUBMISSION,
      });
      const result = validatePlanScenario(scenario, { exams, previousCompiledEntries: [], asOf: PLAN_SUBMISSION });

      const logica = choiceOf(result, "085903");
      assert.equal(logica.state, "choose_in_recovery_table");
      assert.equal(logica.inferredFromMissingHistory, true, "Senza storico, \"non scelto\" è una deduzione");
      const issue = result.issues.find((item) => item.id === "rule_i3i_recovery");
      assert.equal(issue?.type, "warning", "Una deduzione non è un errore bloccante");
      assert.equal(issue.provenance, "operational_to_verify", "Va dichiarata come cosa da verificare");
      assert.ok(issue.message.includes("deduzione"), "Il messaggio dice all'utente che si tratta di una deduzione");
    }

    // --- Caso F: il conteggio del gruppo guarda il contesto, non il codice ---
    // Lo stesso codice può stare in due tabelle: conta solo quella in cui è stato scelto.
    {
      const groups = courseGroupsForTrack(CATALOG, "085903", "I3I");
      assert.deepEqual(groups.sort(), ["B1", "TABREC"], "Logica appare in due gruppi diversi per I3I");
      assert.ok(
        groupLabel(CATALOG, "TABREC")!.includes("recuperi"),
        "La UI riceve un'etichetta leggibile, non la sigla nuda"
      );
    }
  }

  // =========================================================================
  // 5. Il gruppo da 15 CFU non deve essere completato nella finestra annuale
  // =========================================================================
  {
    // Uno studente del terzo anno che ha già Logica e API alle spalle riempie il gruppo con
    // scelte facoltative: togliendone una il gruppo resta a 10 CFU su 15.
    const { exams, previousCompiledEntries } = annualInputs({ apiRegistered: false });
    const base = createAnnualDraft(AA_2026, 3, "I3I");
    const context: PlanValidationContext = { exams, previousCompiledEntries, asOf: PLAN_SUBMISSION };
    assert.ok(codesOf(base.entries).includes("085901"), "La proposta include le tre scelte facoltative");

    const short: PlanScenario = { ...base, entries: base.entries.filter((entry) => entry.courseCode !== "085901") };
    const result = validatePlanScenario(short, context);
    const finding = result.ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
    assert.ok(finding && !finding.satisfied, "Il gruppo risulta incompleto");
    assert.equal(finding.severityHint, "warning", "Un ammanco colmabile al secondo semestre non è bloccante");
    assert.equal(finding.provenance, "operational_to_verify", "Quando completare il gruppo è una regola operativa");
    assert.deepEqual(errorsOf(result), [], "Un gruppo a scelta incompleto non blocca la presentazione annuale");
    const issue = result.issues.find((item) => item.id === "rule_i3i_choice_15");
    assert.ok(issue?.message.includes("secondo semestre"), "Il messaggio spiega che si può completare nella finestra semestrale");

    // Superare i CFU esatti del gruppo resta un errore attestato dal Manifesto.
    const tooMany: PlanScenario = {
      ...base,
      entries: [...base.entries, {
        ...base.entries[0], id: null,
        courseCode: "085879", courseYear: 3, semester: 2, origin: "free_choice", isNewFrequency: true, feeCounted: true,
      }],
    };
    assert.ok(errorsOf(validatePlanScenario(tooMany, context)).includes("rule_i3i_choice_15"), "20 CFU in un gruppo da 15 sono un errore");

    // Un ammanco che nessun insegnamento del secondo semestre può colmare resta bloccante.
    const odd: PlanScenario = {
      ...short,
      entries: [...short.entries, {
        ...short.entries[0], id: null,
        courseCode: "EXT-2", courseYear: 3, semester: 2, entryKind: "external",
        externalName: "Attività esterna da 2 CFU", externalCfu: 2,
        origin: "free_choice", isNewFrequency: true, feeCounted: true,
      }],
    };
    const oddFinding = validatePlanScenario(odd, context).ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
    assert.equal(oddFinding?.severityHint, "blocking", "3 CFU mancanti non sono componibili con le tabelle: va risolto adesso");

    // Il simulatore propone di completare il gruppo con insegnamenti del secondo semestre.
    const suggestions = suggestSimulations(short, context);
    const completion = suggestions.find((suggestion) => suggestion.id.startsWith("complete_i3i_choice_15_"));
    assert.ok(completion, "Deve esistere uno scenario per completare il gruppo a scelta");
    assert.equal(completion.additions?.length, 1);
    const completionCode = completion.additions?.[0] as string;
    assert.equal(findCourse(CATALOG, completionCode)?.semester, 2, "Il completamento proposto è del secondo semestre");
    const completed = simulate(short, context, completion);
    assert.ok(
      completed.entries.some((entry) => entry.courseCode === completionCode),
      "Lo scenario aggiunge l'insegnamento ipotizzato"
    );
    assert.ok(
      completed.issues.every((item) => item.id !== "rule_i3i_choice_15"),
      "Con il completamento il gruppo non genera più segnalazioni"
    );
    assert.deepEqual(
      codesOf(getPlanScenario(base.cycle.id as number)?.entries ?? []),
      codesOf(base.entries),
      "La simulazione di completamento non salva nulla"
    );
  }

  // =========================================================================
  // 5b. Le spiegazioni mostrate prima di aggiungere un insegnamento
  // =========================================================================
  {
    const { exams, previousCompiledEntries } = annualInputs({ apiRegistered: false });
    const base = createAnnualDraft(AA_2026, 3, "I3I");
    const context: PlanValidationContext = { exams, previousCompiledEntries, asOf: PLAN_SUBMISSION };
    const result = validatePlanScenario(base, context);

    const described = describeAddableCourses({
      catalog: getCatalog(AA_2026),
      track: "I3I",
      studentYear: 3,
      inPlan: new Set(),
      registered: new Set(),
      reinsertionCodes: new Set(result.requiredReinsertions.map((item) => item.courseCode)),
      structuralChoices: result.structuralChoices,
    });

    assert.ok(described.length > 0, "Il catalogo deve produrre insegnamenti descritti");

    // Ogni descrizione risponde alle domande richieste prima dell'aggiunta.
    for (const course of described) {
      const labels = course.facts.map((fact) => fact.label);
      for (const required of ["Semestre", "CFU", "Gruppo o regola", "Conta nel gruppo a scelta"]) {
        assert.ok(labels.includes(required), `La scheda di ${course.code} deve dire "${required}"`);
      }
      assert.ok(course.summary.length > 0, `${course.code} deve avere un riassunto leggibile`);
      if (course.group) {
        assert.ok(
          !/^TAB[A-Z]*$/.test(course.group) && course.group.length > 8,
          `Il gruppo di ${course.code} va mostrato con un nome leggibile, non con la sola sigla: "${course.group}"`
        );
      }
    }

    // Un insegnamento della tabella di informatica conta nel gruppo da 15 CFU; uno obbligatorio no.
    const web = described.find((course) => course.code === "085879");
    assert.ok(web, "Tecnologie Informatiche per il Web deve essere proponibile al terzo anno I3I");
    assert.equal(web.countsTowardChoiceGroup, true);
    assert.equal(web.bucket, "choice_group");
    assert.equal(web.semester, 2);
    assert.ok(
      web.facts.some((fact) => fact.label === "Conta nel gruppo a scelta" && fact.value.startsWith("Sì")),
      "Va detto esplicitamente che occupa parte dei CFU a scelta"
    );

    // Il numero chiuso è una limitazione dichiarata, non una nota nascosta nella descrizione.
    const databases = described.find((course) => course.code === "063579");
    assert.ok(databases, "Databases deve essere proponibile");
    assert.ok(
      databases.limitations.some((limitation) => limitation.includes("numero chiuso")),
      "Il numero chiuso va dichiarato fra le limitazioni"
    );

    // Un corso progettuale dichiara il modulo collegato che verrà aggiunto insieme.
    const reti = describeAddableCourses({
      catalog: getCatalog(AA_2026),
      track: "I3I",
      studentYear: 3,
      inPlan: new Set(),
      registered: new Set(),
      reinsertionCodes: new Set(),
      structuralChoices: result.structuralChoices,
    }).find((course) => course.code === "085877");
    assert.ok(reti?.linkedModule, "Reti Logiche deve dichiarare il progetto collegato");
    assert.equal(reti.linkedModule.code, "054441");
    assert.ok(
      reti.facts.some((fact) => fact.label === "Progetto collegato"),
      "Il progetto collegato compare fra i fatti mostrati prima dell'aggiunta"
    );

    // Feedback dopo l'aggiunta: dice cosa è cambiato, in una riga.
    const shorter: PlanScenario = { ...base, entries: base.entries.filter((entry) => entry.courseCode !== "085901") };
    const before = validatePlanScenario(shorter, context);
    const after = validatePlanScenario(base, context);
    const feedback = describeAdditionEffect(getCatalog(AA_2026), "085901", before, after);
    assert.ok(feedback.headline.includes("Automazione Industriale"), "Il feedback nomina l'insegnamento aggiunto");
    assert.ok(feedback.headline.includes("+5 CFU"), "Il feedback quantifica l'effetto sulle nuove frequenze");
    assert.ok(
      feedback.details.some((detail) => detail.includes("Hai coperto")),
      "Il feedback dice quale regola si è chiusa"
    );

    // Aggiungere un corso fuori dalle tabelle a scelta non tocca il gruppo da 15 CFU.
    const withSupernumerary: PlanScenario = {
      ...base,
      entries: [...base.entries, {
        ...base.entries[0], id: null, courseCode: "088877", courseYear: 3, semester: 1,
        origin: "free_choice", isNewFrequency: true, feeCounted: true, position: "supernumerary",
      }],
    };
    const supernumeraryFeedback = describeAdditionEffect(
      getCatalog(AA_2026), "088877", after, validatePlanScenario(withSupernumerary, context)
    );
    assert.ok(
      supernumeraryFeedback.details.some((detail) => detail.includes("non modifica i CFU del gruppo a scelta")),
      "Va detto quando l'aggiunta non tocca il gruppo a scelta"
    );
  }

  // =========================================================================
  // 6. Modifica del secondo semestre
  // =========================================================================
  {
    const { exams, previousCompiledEntries } = annualInputs({ apiRegistered: false });
    const draft = createAnnualDraft(AA_2026, 3, "I3I");
    const ready = updateCycleStatus(draft.cycle.id as number, "ready", "auto_approved_after_deadline");
    const compiled = updateCycleStatus(ready.cycle.id as number, "polimi_compiled", "auto_approved_after_deadline");
    assert.throws(() => savePlanDraft(payload(compiled)), /storico/, "Un piano compilato è storico e immutabile");

    const revision = createSecondSemesterRevision(compiled.cycle.id as number);
    assert.equal(revision.cycle.validationMode, "second_semester_revision");
    assert.equal(revision.cycle.revisionOfCycleId, compiled.cycle.id);
    assert.deepEqual(codesOf(revision.entries), codesOf(compiled.entries), "La revisione parte dalle stesse righe");

    const revisionContext: PlanValidationContext = {
      exams,
      previousCompiledEntries,
      baseRevisionScenario: compiled,
      asOf: PLAN_SUBMISSION,
    };
    assert.deepEqual(errorsOf(validatePlanScenario(revision, revisionContext)), [], "Una revisione non modificata è valida");

    const editable = (entries: PlanEntry[]): PlanScenario => ({ ...revision, entries });
    const template = revision.entries[0];

    // Aggiunta consentita: insegnamento del secondo semestre.
    const addSecond = editable([...revision.entries, {
      ...template, id: null, courseCode: "085879", courseYear: 3, semester: 2,
      origin: "free_choice", isNewFrequency: true, feeCounted: true, position: "supernumerary",
    }]);
    assert.ok(
      !errorsOf(validatePlanScenario(addSecond, revisionContext)).includes("revision_add_085879"),
      "Nella modifica semestrale si possono aggiungere insegnamenti del secondo semestre"
    );

    // Aggiunta vietata: insegnamento del primo semestre.
    const addFirst = editable([...revision.entries, {
      ...template, id: null, courseCode: "088877", courseYear: 3, semester: 1,
      origin: "free_choice", isNewFrequency: true, feeCounted: true, position: "supernumerary",
    }]);
    assert.ok(
      errorsOf(validatePlanScenario(addFirst, revisionContext)).includes("revision_add_088877"),
      "Nella modifica semestrale non si possono aggiungere insegnamenti del primo semestre"
    );

    // Rimozione consentita: secondo semestre.
    const removeSecond = editable(revision.entries.filter((entry) => entry.courseCode !== "085923"));
    assert.equal(findCourse(CATALOG, "085923")?.semester, 2);
    assert.ok(
      !errorsOf(validatePlanScenario(removeSecond, revisionContext)).some((id) => id.startsWith("revision_remove_")),
      "Nella modifica semestrale si possono rimuovere insegnamenti del secondo semestre"
    );

    // Rimozione vietata: primo semestre.
    const removeFirst = editable(revision.entries.filter((entry) => entry.courseCode !== "085903"));
    assert.ok(
      errorsOf(validatePlanScenario(removeFirst, revisionContext)).includes("revision_remove_085903"),
      "Nella modifica semestrale non si possono rimuovere insegnamenti del primo semestre"
    );

    // Il percorso non è modificabile in revisione.
    const switchedTrack: PlanScenario = { ...revision, cycle: { ...revision.cycle, track: "I3C" } };
    assert.ok(
      errorsOf(validatePlanScenario(switchedTrack, revisionContext)).includes("revision_track"),
      "In modifica semestrale il PSPA non si cambia"
    );
    assert.throws(
      () => savePlanDraft({ ...payload(revision), track: "I3C" }),
      /percorso non può essere cambiato/,
      "Anche il server rifiuta il cambio di percorso in revisione"
    );

    // Logica verbalizzata DOPO la presentazione non sblocca il primo semestre.
    upsertCareerExam({
      code: "085903", status: "passed_registered", grade: "30",
      passedAt: addCalendarDays(PLAN_SUBMISSION, 40), registeredAt: addCalendarDays(PLAN_SUBMISSION, 40),
    });
    const afterLogica: PlanValidationContext = { ...revisionContext, exams: getExams() };
    const stillBlocked = errorsOf(validatePlanScenario(removeFirst, afterLogica));
    assert.ok(
      stillBlocked.includes("revision_remove_085903"),
      "Aver verbalizzato Logica dopo la presentazione non permette di togliere un corso del primo semestre"
    );
    const keptResult = validatePlanScenario(revision, afterLogica);
    assert.deepEqual(errorsOf(keptResult), [], "Il piano con Logica ancora dentro resta valido");
    const recovered = keptResult.issues.find((issue) => issue.id === "recovered_085903");
    assert.ok(recovered, "Va spiegato che Logica è stata verbalizzata dopo la presentazione");
    assert.equal(recovered.type, "info", "Una verbalizzazione tardiva chiude la carriera: non è un problema del piano");
    assert.equal(recovered.scope, "current_plan", "Riguarda comunque il piano di quest'anno");
    assert.ok(
      recovered.message.includes("non conta più per la contribuzione"),
      "Va detto l'effetto concreto: l'insegnamento esce dal conteggio per le tasse"
    );
    assert.ok(
      recovered.message.includes("secondo semestre"),
      "Va detto come si comporta nella revisione semestrale"
    );
    // Alla data di presentazione la verbalizzazione non era ancora arrivata: lo stato della
    // scelta resta quello di allora, ed è giusto così. Il piano presentato non si riscrive a
    // posteriori; è la revisione semestrale a doverci convivere.
    assert.equal(
      choiceOf(keptResult, "085903").state,
      "reinsert_past_frequency",
      "Valutato alla data di presentazione, il reinserimento era dovuto"
    );
    // Valutando la stessa carriera a una data successiva, l'attività risulta chiusa.
    const laterView = validatePlanScenario(revision, {
      ...afterLogica,
      asOf: addCalendarDays(PLAN_SUBMISSION, 60),
    });
    assert.equal(
      choiceOf(laterView, "085903").state,
      "closed",
      "Dopo la verbalizzazione, e valutando a una data successiva, la scelta obbligata è chiusa"
    );
    assert.ok(
      !laterView.requiredReinsertions.some((item) => item.courseCode === "085903"),
      "A quella data non è più un reinserimento dovuto"
    );
    assert.equal(
      keptResult.summary.registeredCareerCfu,
      69,
      "La verbalizzazione aggiorna i CFU di carriera nel riepilogo"
    );

    // Un esame superato ma non verbalizzato non è autocertificabile nella modifica.
    setExamStatus("054304", "passed_unregistered");
    const unregisteredResult = validatePlanScenario(revision, { ...revisionContext, exams: getExams() });
    const selfCert = unregisteredResult.issues.find((issue) => issue.id === "revision_selfcert_054304");
    assert.ok(selfCert, "Va segnalato che il superamento non verbalizzato non si autocertifica");
    assert.equal(selfCert.type, "warning");
    assert.ok(
      computeRequiredReinsertions({
        catalog: CATALOG, track: "I3I", studentYear: 3, academicYear: AA_2026,
        exams: getExams(), previousCompiledEntries, asOf: PLAN_SUBMISSION,
      }).some((item) => item.courseCode === "054304" && item.reason === "passed_unregistered"),
      "Un superamento non verbalizzato resta un'attività aperta da reinserire"
    );

    // Il gruppo a scelta può essere completato anche in questa finestra.
    const shortRevision = editable(revision.entries.filter((entry) => entry.courseCode !== "085901"));
    const shortResult = validatePlanScenario(shortRevision, { ...revisionContext, exams: getExams() });
    const shortFinding = shortResult.ruleFindings.find((item) => item.ruleId === "i3i_choice_15");
    assert.ok(shortFinding && !shortFinding.satisfied);
    assert.equal(shortFinding.severityHint, "warning", "Anche in revisione l'ammanco colmabile al 2° semestre non blocca");
    assert.ok(
      shortResult.issues.find((item) => item.id === "rule_i3i_choice_15")?.message.includes("ultima"),
      "In revisione va detto che è l'ultima finestra utile"
    );
  }

  // =========================================================================
  // 7. Simulatore non distruttivo
  // =========================================================================
  {
    const { exams, previousCompiledEntries } = annualInputs({ apiRegistered: false });
    const scenario = createAnnualDraft(AA_2026, 3, "I3I");
    const context: PlanValidationContext = { exams, previousCompiledEntries, asOf: PLAN_SUBMISSION };
    const before = getExams();

    const suggestions = suggestSimulations(scenario, context);
    const passBefore = suggestions.find((item) => item.id === "pass_before_086067");
    const passRecovery = suggestions.find((item) => item.id === "pass_recovery_086067");
    const fail = suggestions.find((item) => item.id === "fail_086067");
    assert.ok(passBefore && passRecovery && fail, "Gli scenari richiesti su API devono esistere");

    const baseline = simulate(scenario, context, { id: "baseline", label: "Attuale", description: "", assumptions: [] });
    const withPass = simulate(scenario, context, passBefore);
    const withRecovery = simulate(scenario, context, passRecovery);
    const withFail = simulate(scenario, context, fail);

    assert.equal(baseline.reinsertions.length, 6);
    assert.equal(withPass.reinsertions.length, 5, "Passando API prima della compilazione resta un reinserimento in meno");
    assert.ok(
      !withPass.reinsertions.some((item) => item.courseCode === "086067"),
      "API superato prima della compilazione non è più un reinserimento"
    );
    assert.ok(withPass.summary.reinsertedCfu < baseline.summary.reinsertedCfu, "I CFU da reinserire calano");
    assert.ok(withPass.summary.registeredCareerCfu > baseline.summary.registeredCareerCfu, "I CFU verbalizzati salgono");
    assert.equal(withPass.rebuildsPlan, true, "Un'ipotesi precedente alla presentazione ricostruisce la proposta");

    assert.ok(
      withRecovery.reinsertions.some((item) => item.courseCode === "086067" && item.registeredAfterSubmission),
      "Passando API a gennaio l'insegnamento resta nel piano ma è già chiuso"
    );
    assert.equal(withRecovery.rebuildsPlan, false, "Un'ipotesi successiva alla presentazione non riscrive il piano");
    assert.equal(
      withRecovery.summary.contributionCfu,
      baseline.summary.contributionCfu,
      "Un recupero verbalizzato dopo non cambia i CFU di nuova frequenza"
    );

    assert.ok(withFail.reinsertions.some((item) => item.courseCode === "086067"), "Se non passo API resta un reinserimento");

    assert.deepEqual(getExams(), before, "Il simulatore non tocca la carriera reale");
    assert.deepEqual(
      codesOf(getPlanScenario(scenario.cycle.id as number)?.entries ?? []),
      codesOf(scenario.entries),
      "Il simulatore non tocca il piano salvato"
    );
  }

  // =========================================================================
  // 8. Persistenza, storico e stato attivo
  // =========================================================================
  {
    reset();
    const saved = savePlanDraft(payload(buildDefaultScenario("I3I", 1, AA_2025)));
    assert.ok(saved.cycle.id);
    assert.ok(saved.entries.every((entry) => entry.isNewFrequency && entry.feeCounted));
    const ready = updateCycleStatus(saved.cycle.id as number, "ready", "auto_approved_after_deadline");
    const compiled = updateCycleStatus(ready.cycle.id as number, "polimi_compiled", "auto_approved_after_deadline");
    assert.equal(compiled.cycle.status, "polimi_compiled");

    const previous = getPreviousCompiledEntries(null);
    assert.equal(previous.length, 6, "Lo storico conserva le righe del piano compilato");

    // Con la carriera vuota tutte le frequenze del primo anno vanno reinserite l'anno dopo.
    const required = computeRequiredReinsertions({
      catalog: CATALOG, track: "I3I", studentYear: 2, academicYear: AA_2026,
      exams: {}, previousCompiledEntries: previous, asOf: today(),
    });
    assert.equal(required.length, 6, "Sei corsi frequentati e non verbalizzati");
    assert.ok(required.every((item) => item.sourceAcademicYear === AA_2025));

    // Verbalizzandoli, i reinserimenti scompaiono senza toccare il piano storico.
    for (const [code] of CAREER_REGISTERED.slice(0, 3)) {
      upsertCareerExam({ code, status: "passed_registered", passedAt: REGISTRATION_DATE, registeredAt: REGISTRATION_DATE });
    }
    const afterRegistrations = computeRequiredReinsertions({
      catalog: CATALOG, track: "I3I", studentYear: 2, academicYear: AA_2026,
      exams: getExams(), previousCompiledEntries: getPreviousCompiledEntries(null), asOf: today(),
    });
    assert.equal(afterRegistrations.length, 3, "Verbalizzare riduce i reinserimenti");
    assert.equal(
      getPlanScenario(compiled.cycle.id as number)?.entries.length, 6,
      "Lo storico del piano annuale non viene riscritto"
    );

    const revision = createSecondSemesterRevision(compiled.cycle.id as number);
    assert.throws(() => updateCycleStatus(revision.cycle.id as number, "polimi_compiled"), /Transizione/);
    assert.equal(getCurrentPlanScenario().cycle.id, revision.cycle.id, "Lo scenario attivo è esplicito");
  }

  // =========================================================================
  // 8b. Applicazione di uno scenario: una sola transazione
  // =========================================================================
  {
    const { exams, previousCompiledEntries } = annualInputs({ apiRegistered: false });
    const draft = createAnnualDraft(AA_2026, 3, "I3I");
    const context: PlanValidationContext = { exams, previousCompiledEntries, asOf: PLAN_SUBMISSION };
    const suggestions = suggestSimulations(draft, context);
    const passBefore = suggestions.find((item) => item.id === "pass_before_086067");
    assert.ok(passBefore, "Lo scenario su API deve esistere");

    const before = getExams();
    assert.notEqual(before["086067"]?.status, "passed_registered");

    const applied = applySimulationOutcome({
      outcomes: passBefore.assumptions.map((assumption) => ({
        code: assumption.courseCode,
        status: assumption.outcome === "registered" ? ("passed_registered" as const) : ("not_passed" as const),
      })),
      draft: { ...payload(draft), entries: draft.entries.map(toDraftEntry) },
    });

    assert.equal(applied.exams["086067"].status, "passed_registered", "L'esito ipotizzato viene scritto in carriera");
    assert.ok(applied.scenario.cycle.id, "La bozza viene salvata nella stessa operazione");
    assert.deepEqual(
      codesOf(getPlanScenario(applied.scenario.cycle.id as number)?.entries ?? []),
      codesOf(applied.scenario.entries),
      "Il piano restituito è quello effettivamente persistito"
    );
    // Il risultato torna già letto: al client non serve un giro aggiuntivo per rileggere lo stato.
    assert.deepEqual(applied.exams, getExams(), "Gli esami restituiti sono quelli in archivio");
    const plannedCode = applied.scenario.entries.find((entry) => !before[entry.courseCode])?.courseCode;
    assert.ok(plannedCode, "La bozza contiene anche corsi diversi dall'esito simulato");
    assert.equal(applied.exams[plannedCode].status, "planned", "La risposta include gli esami planned creati dalla sincronizzazione");

    const cyclesBeforeFailures = getDb().prepare("SELECT COUNT(*) AS count FROM study_plan_cycles").get() as { count: number };
    const examsBeforeFailures = getExams();
    assert.throws(
      () => applySimulationOutcome({ outcomes: [{ code: "085901", status: "passed_registered" }], draft: null as never }),
      /bozza.*obbligatoria/i,
      "Senza bozza il simulatore deve fermarsi prima di scrivere gli esiti"
    );
    assert.deepEqual(getExams(), examsBeforeFailures, "Una bozza assente non modifica la carriera");
    assert.equal(
      (getDb().prepare("SELECT COUNT(*) AS count FROM study_plan_cycles").get() as { count: number }).count,
      cyclesBeforeFailures.count,
      "Una bozza assente non modifica il piano"
    );

    // Se la bozza è invalida, nulla viene scritto: né carriera né piano.
    const carriera = getExams();
    assert.throws(
      () => applySimulationOutcome({
        outcomes: [{ code: "085901", status: "passed_registered" }],
        draft: { ...payload(draft), entries: [{ courseCode: "CODICE-INESISTENTE", courseYear: 3, position: "effective", origin: "new_frequency" }] },
      }),
      /sconosciuto/,
      "Una bozza con un codice inesistente deve fallire"
    );
    assert.deepEqual(
      getExams(),
      carriera,
      "Se il salvataggio del piano fallisce, gli esiti di carriera non restano scritti a metà"
    );

    // Un errore dopo il primo upsert deve far tornare indietro anche quello già eseguito.
    assert.throws(
      () => applySimulationOutcome({
        outcomes: [
          { code: "085901", status: "passed_registered" },
          { code: "085902", status: "status-impossibile" as never },
        ],
        draft: payload(draft),
      }),
      /Stato esame non valido/,
      "Un errore intermedio deve propagarsi"
    );
    assert.deepEqual(getExams(), carriera, "Un errore intermedio non lascia cambiamenti alla carriera");
  }

  // =========================================================================
  // 8c. Passaggio d'anno: azione coerente con il target, anche dallo storico
  // =========================================================================
  {
    const scenario = buildDefaultScenario("I3I", 2, AA_2025);
    const compiled: PlanScenario = {
      ...scenario,
      cycle: { ...scenario.cycle, id: 41, academicYear: AA_2025, status: "polimi_compiled", isVirtual: false },
    };
    const currentTarget = AA_2026;
    const immediate = computeNextYearAction([compiled.cycle], compiled, currentTarget);
    assert.deepEqual(immediate && { kind: immediate.kind, academicYear: immediate.academicYear }, {
      kind: "continue_from_compiled", academicYear: currentTarget,
    }, "Da uno scenario attivo compilato l'etichetta coincide con l'anno che verrà creato");

    const existing = { ...compiled.cycle, id: 42, academicYear: currentTarget, status: "draft" as const, archivedAt: null };
    const oldHistory: PlanScenario = { ...compiled, cycle: { ...compiled.cycle, academicYear: "2024/2025", studentYear: 1 } };
    const openExisting = computeNextYearAction([oldHistory.cycle, existing], oldHistory, currentTarget);
    assert.deepEqual(openExisting && { kind: openExisting.kind, cycleId: "cycleId" in openExisting ? openExisting.cycleId : null }, {
      kind: "open_existing", cycleId: 42,
    }, "Consultare uno storico vecchio apre il target esistente invece di duplicare un anno intermedio");

    const skippedYears = computeNextYearAction([oldHistory.cycle], oldHistory, currentTarget);
    assert.deepEqual(skippedYears && { kind: skippedYears.kind, academicYear: skippedYears.academicYear }, {
      kind: "create_draft", academicYear: currentTarget,
    }, "Dopo un salto di più anni si crea il target, non l'anno successivo allo storico");
  }

  // =========================================================================
  // 9. Regressioni su calendario, voti e migrazione legacy
  // =========================================================================
  reset();
  seedDatabase(getDb(), "2026-08-18");
  const seededAlgorithm = getDb().prepare("SELECT subject, course_code FROM schedule WHERE subject LIKE 'Algoritmi%' LIMIT 1")
    .get() as { subject: string; course_code: string };
  assert.equal(seededAlgorithm.course_code, "086067", "I dati di esempio collegano Algoritmi al codice di Algoritmi");
  assert.equal(subjectMatchesCourse(seededAlgorithm.subject, "Algoritmi e Principi dell'Informatica"), true);
  assert.equal(subjectMatchesCourse(seededAlgorithm.subject, "Chimica Generale"), false, "Un codice incoerente non deve mostrare un esame collegato");
  assert.equal(resolveSubjectCourse(CATALOG, seededAlgorithm.subject, "085900"), undefined, "Il dettaglio materia rifiuta il codice di Chimica per Algoritmi");
  assert.equal(resolveSubjectCourse(CATALOG, seededAlgorithm.subject, "086067")?.code, "086067", "Il dettaglio materia accetta il codice corretto di Algoritmi");

  reset();
  {
    const start = "2026-09-01";
    const end = "2026-09-30";
    saveSchedule(validateScheduleRows([
      { weekday: 0, subject: "Algoritmi", course_code: "086067", start_date: start, end_date: end, mode: "presenza" },
      { weekday: 0, subject: "Algoritmi", course_code: "086067", start_date: start, end_date: end, mode: "asincrona" },
    ]));
    const db = getDb();
    const firstOccurrence = db.prepare("SELECT id, schedule_id, lesson_date FROM lesson_occurrence ORDER BY id LIMIT 1")
      .get() as { id: number; schedule_id: number; lesson_date: string };
    db.prepare("UPDATE lesson_occurrence SET done = 1 WHERE id = ?").run(firstOccurrence.id);
    const rows = db.prepare("SELECT * FROM schedule ORDER BY id").all() as {
      id: number; weekday: number; subject: string; course_code: string; start_date: string; end_date: string; mode: "presenza" | "asincrona";
    }[];
    saveSchedule(validateScheduleRows(rows.map((row, index) => ({ ...row, subject: index === 0 ? "Algoritmi e principi" : row.subject }))));
    const preserved = db.prepare("SELECT done FROM lesson_occurrence WHERE schedule_id = ? AND lesson_date = ?")
      .get(firstOccurrence.schedule_id, firstOccurrence.lesson_date) as { done: number };
    assert.equal(preserved.done, 1, "Rinominare una regola preserva il completamento corrispondente");
    assert.throws(() => validateScheduleRows([{ weekday: 0, subject: "x", start_date: "2026-02-31", end_date: end, mode: "presenza" }]), /date reali/);
  }

  assert.equal(parseGrade("30L"), 30);
  assert.equal(estimateFinalGrade(31), 110);

  closeDb();
  const legacyPath = path.join(root, "legacy.db");
  const legacy = new BetterSqlite3(legacyPath);
  legacy.exec("CREATE TABLE schedule (id INTEGER PRIMARY KEY, subject TEXT)");
  legacy.prepare("INSERT INTO schedule(subject) VALUES ('legacy')").run();
  legacy.close();
  process.env.POLIPLANNER_DB_PATH = legacyPath;
  assert.equal(getDb().pragma("user_version", { simple: true }), 2);
  assert.ok(
    readdirSync(root).some((name) => name.startsWith("legacy.pre-v2-") && name.endsWith(".db")),
    "L'upgrade di un database legacy scrive un backup coerente"
  );
  closeDb();

  console.log("Poliplanner: test del piano annuale superati.");
} finally {
  closeDb();
  delete process.env.POLIPLANNER_DB_PATH;
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}

// Silenzia il warning su import non usati mantenendo il tipo esportato controllato.
export type { PreviousCompiledEntry };
