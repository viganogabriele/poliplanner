import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExamsMap } from "../lib/esami";
import type { PlanDraftPayload, PlanEntry, PlanScenario } from "../lib/piano";

const repoRoot = process.cwd();
const testRoot = mkdtempSync(path.join(tmpdir(), "lesson-tracker-polimi-"));
mkdirSync(path.join(testRoot, "db"));
process.chdir(testRoot);

const hasErrors = (issues: { type: string }[]) => issues.some((issue) => issue.type === "error");

function makePayload(scenario: PlanScenario): PlanDraftPayload {
  return {
    cycleId: scenario.cycle.id,
    academicYear: scenario.cycle.academicYear,
    studentYear: scenario.cycle.studentYear,
    track: scenario.cycle.track,
    validationMode: scenario.cycle.validationMode,
    status: scenario.cycle.status,
    entries: scenario.entries.map((entry) => ({
      courseCode: entry.courseCode,
      courseYear: entry.courseYear,
      position: entry.position,
      origin: entry.origin,
      isNewFrequency: entry.isNewFrequency,
      feeCounted: entry.feeCounted,
    })),
  };
}

function cloneScenario(scenario: PlanScenario): PlanScenario {
  return {
    cycle: { ...scenario.cycle },
    entries: scenario.entries.map((entry) => ({ ...entry })),
  };
}

function testExam(status: ExamsMap[string]["status"], grade: string | null = null): ExamsMap[string] {
  return {
    status,
    grade,
    passedAt: status.startsWith("passed_") ? "2026-02-01" : null,
    registeredAt: status === "passed_registered" ? "2026-02-02" : null,
    updatedAt: "2026-02-02T00:00:00.000Z",
  };
}

async function main(): Promise<void> {
  try {
  const [
    pianoModule,
    validationModule,
    dbModule,
    schemaModule,
    esamiModule,
    coursesModule,
    gradeModule,
  ] = await Promise.all([
    import("../lib/piano"),
    import("../lib/polimi/validation"),
    import("../lib/db"),
    import("../lib/schema"),
    import("../lib/esami"),
    import("../lib/polimi/courses"),
    import("../lib/polimi/gradeCalc"),
  ]);

  const reset = () => schemaModule.resetDatabase(dbModule.getDb());

  reset();
  {
    const invalid = pianoModule.buildDefaultScenario("I3I", 1);
    invalid.entries = [];
    const saved = pianoModule.savePlanDraft(makePayload(invalid));
    const result = validationModule.validatePlanScenario(saved, {
      exams: {},
      previousCompiledEntries: [],
    });
    assert.ok(saved.cycle.id, "Salva bozza deve creare un ciclo anche con errori.");
    assert.ok(hasErrors(result.issues), "La bozza invalida deve restare salvabile ma non pronta.");
  }

  reset();
  {
    const valid = pianoModule.savePlanDraft(makePayload(pianoModule.buildDefaultScenario("I3I", 1)));
    const result = validationModule.validatePlanScenario(valid, {
      exams: {},
      previousCompiledEntries: [],
    });
    assert.equal(hasErrors(result.issues), false, "Il piano consigliato I3I deve poter diventare ready.");
    const ready = pianoModule.updateCycleStatus(valid.cycle.id ?? 0, "ready", result.summary.approvalStatus);
    assert.equal(ready.cycle.status, "ready");
  }

  reset();
  {
    const compiled = pianoModule.savePlanDraft(makePayload(pianoModule.buildDefaultScenario("I3I", 1)));
    pianoModule.updateCycleStatus(compiled.cycle.id ?? 0, "polimi_compiled", "auto_approved_after_deadline");
    const requiredCode = compiled.entries.find((entry) => entry.courseYear === 1)?.courseCode;
    assert.ok(requiredCode, "Serve almeno un esame del primo anno.");

    const wrongOrigin = cloneScenario(pianoModule.buildDefaultScenario("I3I", 1));
    let result = validationModule.validatePlanScenario(wrongOrigin, {
      exams: {},
      previousCompiledEntries: pianoModule.getPreviousCompiledEntries(null),
    });
    assert.ok(
      result.issues.some((issue) => issue.id === `reinsertion_missing_${requiredCode}`),
      "Un arretrato presente ma non classificato come reinserimento deve bloccare il ready."
    );

    const next = cloneScenario(pianoModule.buildDefaultScenario("I3I", 1));
    next.entries = next.entries.filter((entry) => entry.courseCode !== requiredCode);
    result = validationModule.validatePlanScenario(next, {
      exams: {},
      previousCompiledEntries: pianoModule.getPreviousCompiledEntries(null),
    });
    assert.ok(
      result.issues.some((issue) => issue.id === `reinsertion_missing_${requiredCode}`),
      "Marca come pronto deve essere bloccata se manca un reinserimento obbligatorio."
    );
  }

  reset();
  {
    const draft = pianoModule.savePlanDraft(makePayload(pianoModule.buildDefaultScenario("I3I", 1)));
    assert.equal(draft.cycle.status, "draft");
    assert.equal(
      pianoModule.getPreviousCompiledEntries(null).length,
      0,
      "Un ciclo draft non deve alimentare i reinserimenti successivi."
    );
    pianoModule.updateCycleStatus(draft.cycle.id ?? 0, "polimi_compiled", "auto_approved_after_deadline");
    assert.ok(
      pianoModule.getPreviousCompiledEntries(null).length > 0,
      "Un ciclo polimi_compiled deve alimentare i reinserimenti successivi."
    );
  }

  reset();
  {
    const compiled = pianoModule.savePlanDraft(makePayload(pianoModule.buildDefaultScenario("I3I", 1)));
    const registeredCode = compiled.entries.find((entry) => entry.courseYear === 1)?.courseCode;
    assert.ok(registeredCode, "Serve un esame registrato per testare la duplicazione.");
    esamiModule.markExamRegistered(registeredCode, "2026-02-02");
    pianoModule.updateCycleStatus(compiled.cycle.id ?? 0, "polimi_compiled", "auto_approved_after_deadline");
    const duplicate = pianoModule.duplicatePlanForNextAcademicYear(compiled.cycle.id ?? 0);
    const carried = duplicate.entries.find((entry) => {
      const course = coursesModule.getCourse(entry.courseCode);
      return entry.courseYear === 1 && entry.courseCode !== registeredCode && !course?.isLinkedExam;
    });
    const registered = duplicate.entries.find((entry) => entry.courseCode === registeredCode);

    assert.equal(duplicate.cycle.studentYear, 2);
    assert.equal(carried?.origin, "carried_over", "Gli esami non registrati dell'anno precedente devono diventare reinserimenti.");
    assert.equal(carried?.feeCounted, true, "I reinserimenti non registrati contano nei CFU tassa.");
    assert.equal(registered?.feeCounted, false, "Gli esami gia registrati dell'anno precedente non contano nei CFU tassa.");
  }

  reset();
  {
    const recovery = cloneScenario(pianoModule.buildDefaultScenario("I3I", 1));
    const firstYearEntry = recovery.entries.find((entry) => entry.courseYear === 1);
    assert.ok(firstYearEntry, "Serve almeno un esame del primo anno.");
    firstYearEntry.origin = "carried_over";
    firstYearEntry.feeCounted = true;
    firstYearEntry.isNewFrequency = true;
    const saved = pianoModule.savePlanDraft(makePayload(recovery));

    esamiModule.setExamStatus(firstYearEntry.courseCode, "passed_unregistered", { passedAt: "2026-02-01" });
    let reread = pianoModule.getPlanScenario(saved.cycle.id ?? 0);
    let entry = reread?.entries.find((candidate) => candidate.courseCode === firstYearEntry.courseCode);
    assert.equal(entry?.feeCounted, true, "passed_unregistered non deve scalare CFU tassa.");
    let result = validationModule.validatePlanScenario(reread as PlanScenario, {
      exams: esamiModule.getExams(),
      previousCompiledEntries: [],
    });
    assert.equal(result.summary.annualFeeCfu, 60);

    esamiModule.markExamRegistered(firstYearEntry.courseCode, "2026-02-02");
    reread = pianoModule.getPlanScenario(saved.cycle.id ?? 0);
    entry = reread?.entries.find((candidate) => candidate.courseCode === firstYearEntry.courseCode);
    assert.equal(entry?.feeCounted, false, "passed_registered deve scalare CFU tassa sui recuperi.");
    assert.equal(entry?.isNewFrequency, false, "passed_registered deve togliere la nuova frequenza sui recuperi.");
    result = validationModule.validatePlanScenario(reread as PlanScenario, {
      exams: esamiModule.getExams(),
      previousCompiledEntries: [],
    });
    assert.equal(result.summary.annualFeeCfu, 50);
    assert.equal(result.summary.recoveredCfu, 10);
  }

  reset();
  {
    const base = pianoModule.savePlanDraft(makePayload(pianoModule.buildDefaultScenario("I3I", 1)));
    const revision = cloneScenario(base);
    revision.cycle.id = null;
    revision.cycle.validationMode = "second_semester_revision";
    revision.cycle.revisionOfCycleId = base.cycle.id;
    const firstSemesterCode = revision.entries.find((entry) => {
      const course = coursesModule.getCourse(entry.courseCode);
      return course?.semester === 1;
    })?.courseCode;
    assert.ok(firstSemesterCode, "Serve almeno un esame del primo semestre.");
    revision.entries = revision.entries.filter((entry) => entry.courseCode !== firstSemesterCode);
    const saved = pianoModule.savePlanDraft(makePayload(revision));
    const result = validationModule.validatePlanScenario(saved, {
      exams: {},
      previousCompiledEntries: [],
      baseRevisionScenario: base,
    });
    assert.ok(
      result.issues.some((issue) => issue.id === `revision_remove_${firstSemesterCode}`),
      "La revisione deve bloccare modifiche non consentite solo in validazione."
    );
  }

  {
    const base = pianoModule.buildDefaultScenario("I3I", 1);
    const normal = base.entries.find((entry) => entry.courseCode === "082740") as PlanEntry;
    const unregistered = base.entries.find((entry) => entry.courseCode === "082747") as PlanEntry;
    const finalExam = base.entries.find((entry) => entry.courseCode === "FINALE") as PlanEntry;
    const exams: ExamsMap = {
      [normal.courseCode]: testExam("passed_registered", "30"),
      [unregistered.courseCode]: testExam("passed_unregistered", "18"),
      [finalExam.courseCode]: testExam("passed_registered", "30"),
    };
    const result = gradeModule.weightedAverage(exams, [normal, unregistered, finalExam]);
    assert.equal(result.average, 30, "La media deve pesare solo esami registrati con voto.");
    assert.equal(result.passedCFU, 15, "I CFU carriera devono contare i registrati effettivi non linked.");
  }

  console.log("PoliMi plan tests passed.");
  } finally {
    const maybeDb = (globalThis as typeof globalThis & { __db?: { close: () => void } }).__db;
    maybeDb?.close();
    process.chdir(repoRoot);
    rmSync(testRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
