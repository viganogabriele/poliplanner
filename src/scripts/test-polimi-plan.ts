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
import { addCalendarDays, isISODate, today } from "../lib/dates";
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
import { buildAnnualPlanProposal, computeRequiredReinsertions } from "../lib/polimi/annualPlan";
import { CATALOG_2025_2026 } from "../lib/polimi/catalog/aa2025-2026";
import { courseCfu, findCourse, getCatalog, resolveCatalog } from "../lib/polimi/catalog";
import { estimateFinalGrade, parseGrade } from "../lib/polimi/gradeCalc";
import { toDraftEntry } from "../lib/polimi/planModel";
import { simulate, suggestSimulations } from "../lib/polimi/simulator";
import { validatePlanScenario, type PlanValidationContext, type PlanValidationResult } from "../lib/polimi/validation";
import { saveSchedule, validateScheduleRows } from "../lib/schedule";
import { resetDatabase } from "../lib/schema";

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

try {
  // =========================================================================
  // 0. Fondamenta: date civili e catalogo versionato
  // =========================================================================
  assert.equal(isISODate("2026-02-28"), true);
  assert.equal(isISODate("2026-02-29"), false);
  assert.equal(isISODate("2026-2-28"), false);
  assert.equal(isISODate(today()), true);
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");

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
    assert.ok(
      keptResult.issues.some((issue) => issue.id === "recovered_085903"),
      "Va spiegato che Logica è stata verbalizzata dopo la presentazione"
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
  // 9. Regressioni su calendario, voti e migrazione legacy
  // =========================================================================
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
