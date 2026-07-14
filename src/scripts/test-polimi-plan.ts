import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { closeDb, getDb } from "../lib/db";
import { addCalendarDays, isISODate, today } from "../lib/dates";
import {
  buildDefaultScenario,
  createSecondSemesterRevision,
  getCurrentPlanScenario,
  getPlanScenario,
  getPreviousCompiledEntries,
  savePlanDraft,
  updateCycleStatus,
  type PlanDraftPayload,
  type PlanScenario,
} from "../lib/piano";
import { getCourse } from "../lib/polimi/courses";
import { estimateFinalGrade, parseGrade } from "../lib/polimi/gradeCalc";
import { getRequiredReinsertions, validatePlanScenario } from "../lib/polimi/validation";
import { saveSchedule, validateScheduleRows } from "../lib/schedule";
import { resetDatabase } from "../lib/schema";

const root = mkdtempSync(path.join(tmpdir(), "poliplanner-v2-"));
const dbPath = path.join(root, "db", "test.db");
process.env.POLIPLANNER_DB_PATH = dbPath;

function payload(scenario: PlanScenario): PlanDraftPayload {
  return {
    cycleId: scenario.cycle.id,
    academicYear: scenario.cycle.academicYear,
    studentYear: scenario.cycle.studentYear,
    track: scenario.cycle.track,
    validationMode: scenario.cycle.validationMode,
    entries: scenario.entries.map((entry) => ({
      courseCode: entry.courseCode,
      courseYear: entry.courseYear,
      semester: entry.semester,
      entryKind: entry.entryKind,
      externalName: entry.externalName,
      externalCfu: entry.externalCfu,
      position: entry.position,
      origin: entry.origin,
    })),
  };
}

function errors(scenario: PlanScenario) {
  return validatePlanScenario(scenario, { exams: {}, previousCompiledEntries: [] }).issues.filter((issue) => issue.type === "error");
}

function reset(): void {
  resetDatabase(getDb());
}

try {
  // Strict civil date semantics, independent from the process timezone.
  assert.equal(isISODate("2026-02-28"), true);
  assert.equal(isISODate("2026-02-29"), false);
  assert.equal(isISODate("2026-2-28"), false);
  assert.equal(isISODate("2026-02-31"), false);
  assert.equal(isISODate(today()), true);
  assert.equal(addCalendarDays("2026-12-31", 1), "2027-01-01");

  // Both official defaults are complete, not merely syntactically accepted.
  for (const track of ["I3I", "I3C"] as const) {
    const scenario = buildDefaultScenario(track, 3);
    const result = validatePlanScenario(scenario, { exams: {}, previousCompiledEntries: [] });
    assert.equal(result.summary.totalEffectiveCfu, 180, `${track} must total 180 CFU`);
    assert.equal(result.summary.annualFeeCfu, 59, `${track} must count only current-year frequency`);
    assert.deepEqual(result.issues.filter((issue) => issue.type === "error"), [], `${track} default must be valid`);
  }
  assert.equal(getCourse("058082"), undefined);
  assert.equal(getCourse("094782"), undefined);
  assert.equal(getCourse("FINALE"), undefined);

  reset();
  const saved = savePlanDraft(payload(buildDefaultScenario("I3I", 1)));
  assert.ok(saved.cycle.id);
  assert.equal(errors(saved).length, 0);
  const ready = updateCycleStatus(saved.cycle.id as number, "ready", "auto_approved_after_deadline");
  const compiled = updateCycleStatus(ready.cycle.id as number, "polimi_compiled", "auto_approved_after_deadline");
  assert.equal(compiled.cycle.status, "polimi_compiled");
  assert.throws(() => savePlanDraft(payload(compiled)), /storico/);

  // Future activities and V modules cannot become false arretrati.
  const previous = getPreviousCompiledEntries(null);
  const required = getRequiredReinsertions(previous, {});
  assert.equal(required.length, 6, "Only the six due first-year courses are reinsertable after year 1");
  assert.equal(required.some((entry) => entry.courseCode === "052425"), false);
  assert.equal(required.some((entry) => entry.courseCode === "052509"), false);

  // Revision must have a real compiled base and preserve the link.
  const revision = createSecondSemesterRevision(compiled.cycle.id as number);
  assert.equal(revision.cycle.revisionOfCycleId, compiled.cycle.id);
  assert.equal(revision.cycle.validationMode, "second_semester_revision");
  assert.throws(() => updateCycleStatus(revision.cycle.id as number, "polimi_compiled"), /Transizione/);

  // Active scenario is explicit, not inferred by merging all unarchived cycles.
  assert.equal(getCurrentPlanScenario().cycle.id, revision.cycle.id);
  assert.equal(getPlanScenario(compiled.cycle.id as number)?.cycle.status, "polimi_compiled");

  reset();
  const start = "2026-09-01";
  const end = "2026-09-30";
  const validated = validateScheduleRows([
    { weekday: 0, subject: "Algoritmi", course_code: "086067", start_date: start, end_date: end, mode: "presenza" },
    { weekday: 0, subject: "Algoritmi", course_code: "086067", start_date: start, end_date: end, mode: "asincrona" },
  ]);
  saveSchedule(validated);
  const db = getDb();
  const firstOccurrence = db.prepare("SELECT id, schedule_id, lesson_date FROM lesson_occurrence ORDER BY id LIMIT 1").get() as { id: number; schedule_id: number; lesson_date: string };
  db.prepare("UPDATE lesson_occurrence SET done = 1 WHERE id = ?").run(firstOccurrence.id);
  const rows = db.prepare("SELECT * FROM schedule ORDER BY id").all() as { id: number; weekday: number; subject: string; course_code: string; start_date: string; end_date: string; mode: "presenza" | "asincrona" }[];
  saveSchedule(validateScheduleRows(rows.map((row, index) => ({ ...row, subject: index === 0 ? "Algoritmi e principi" : row.subject }))));
  const preserved = db.prepare("SELECT done FROM lesson_occurrence WHERE schedule_id = ? AND lesson_date = ?").get(firstOccurrence.schedule_id, firstOccurrence.lesson_date) as { done: number };
  assert.equal(preserved.done, 1, "Renaming a schedule rule preserves its matching completion");
  assert.ok((db.prepare("SELECT COUNT(*) AS count FROM lesson_occurrence WHERE lesson_date = ?").get(firstOccurrence.lesson_date) as { count: number }).count >= 2, "Two same-subject sessions on a date remain distinct");
  assert.throws(() => validateScheduleRows([{ weekday: 0, subject: "x", start_date: "2026-02-31", end_date: end, mode: "presenza" }]), /date reali/);

  assert.equal(parseGrade("30L"), 30);
  assert.equal(estimateFinalGrade(31), 110);

  // Legacy databases are backed up before the destructive v2 reset.
  closeDb();
  const legacyPath = path.join(root, "legacy.db");
  const legacy = new BetterSqlite3(legacyPath);
  legacy.exec("CREATE TABLE schedule (id INTEGER PRIMARY KEY, subject TEXT)");
  legacy.prepare("INSERT INTO schedule(subject) VALUES ('legacy')").run();
  legacy.close();
  process.env.POLIPLANNER_DB_PATH = legacyPath;
  const upgraded = getDb();
  assert.equal(upgraded.pragma("user_version", { simple: true }), 2);
  assert.ok(readdirSync(root).some((name) => name.startsWith("legacy.pre-v2-") && name.endsWith(".db")), "Legacy upgrade writes a coherent backup");
  closeDb();

  console.log("Poliplanner v2 tests passed.");
} finally {
  closeDb();
  delete process.env.POLIPLANNER_DB_PATH;
  if (existsSync(root)) rmSync(root, { recursive: true, force: true });
}
