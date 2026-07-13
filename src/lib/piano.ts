import { getDb } from "./db";
import { getExams } from "./esami";
import { COURSES, getCourse } from "./polimi/courses";
import { planEntriesToPiano, toDraftEntry } from "./polimi/planTransforms";
import {
  ACADEMIC_YEAR,
  DEFAULT_TRACK,
  type ApprovalStatus,
  type EntryOrigin,
  type EntryPosition,
  type PlanStatus,
  type PlanValidationMode,
  type Track,
} from "./polimi/constraints";

export type PianoYear = { courses: string[]; soprannumero: string[] };
export type Piano = { 1: PianoYear; 2: PianoYear; 3: PianoYear };

export type PlanCycle = {
  id: number | null;
  academicYear: string;
  studentYear: 1 | 2 | 3;
  track: Track;
  validationMode: PlanValidationMode;
  status: PlanStatus;
  approvalStatus: ApprovalStatus | null;
  revisionOfCycleId: number | null;
  compiledOnPolimiAt: string | null;
  createdAt: string;
  updatedAt: string;
  isVirtual?: boolean;
};

export type PlanEntry = {
  id: number | null;
  cycleId: number | null;
  courseCode: string;
  courseYear: 1 | 2 | 3;
  position: EntryPosition;
  origin: EntryOrigin;
  isNewFrequency: boolean;
  feeCounted: boolean;
  createdAt: string;
};

export type PlanScenario = {
  cycle: PlanCycle;
  entries: PlanEntry[];
};

export type PlanDraftPayload = {
  cycleId: number | null;
  academicYear: string;
  studentYear: 1 | 2 | 3;
  track: Track;
  validationMode: PlanValidationMode;
  status?: PlanStatus;
  entries: Omit<PlanEntry, "id" | "cycleId" | "createdAt">[];
};

export type RequiredReinsertion = {
  courseCode: string;
  sourceCycleId: number;
  sourceAcademicYear: string;
};

type CycleRow = {
  id: number;
  academic_year: string;
  student_year: number;
  track: Track;
  validation_mode: PlanValidationMode;
  status: PlanStatus;
  approval_status: ApprovalStatus | null;
  revision_of_cycle_id: number | null;
  compiled_on_polimi_at: string | null;
  created_at: string;
  updated_at: string;
};

type EntryRow = {
  id: number;
  cycle_id: number;
  course_code: string;
  course_year: number;
  position: EntryPosition;
  origin: EntryOrigin;
  is_new_frequency: number;
  fee_counted: number;
  created_at: string;
};

const EMPTY_PIANO: Piano = {
  1: { courses: [], soprannumero: [] },
  2: { courses: [], soprannumero: [] },
  3: { courses: [], soprannumero: [] },
};

const nowIso = () => new Date().toISOString();

const mapCycle = (row: CycleRow): PlanCycle => ({
  id: row.id,
  academicYear: row.academic_year,
  studentYear: row.student_year as 1 | 2 | 3,
  track: row.track,
  validationMode: row.validation_mode,
  status: row.status,
  approvalStatus: row.approval_status,
  revisionOfCycleId: row.revision_of_cycle_id,
  compiledOnPolimiAt: row.compiled_on_polimi_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapEntry = (row: EntryRow): PlanEntry => ({
  id: row.id,
  cycleId: row.cycle_id,
  courseCode: row.course_code,
  courseYear: row.course_year as 1 | 2 | 3,
  position: row.position,
  origin: row.origin,
  isNewFrequency: Boolean(row.is_new_frequency),
  feeCounted: Boolean(row.fee_counted),
  createdAt: row.created_at,
});

function makeEntry(code: string, origin: EntryOrigin = "recommended", position: EntryPosition = "effective"): PlanEntry | null {
  const course = getCourse(code);
  if (!course) return null;
  return {
    id: null,
    cycleId: null,
    courseCode: code,
    courseYear: course.year,
    position,
    origin,
    isNewFrequency: true,
    feeCounted: true,
    createdAt: nowIso(),
  };
}

export function buildDefaultPiano(track: Track = DEFAULT_TRACK): Piano {
  const byYear: Piano = {
    1: { courses: [], soprannumero: [] },
    2: { courses: [], soprannumero: [] },
    3: { courses: [], soprannumero: [] },
  };

  COURSES.forEach((c) => {
    if (c.isCompulsory && !c.isLinkedExam && (c.track === null || c.track === "both" || c.track === track)) {
      byYear[c.year].courses.push(c.code);
      c.linkedExams.forEach((le) => {
        if (!byYear[c.year].courses.includes(le.code)) byYear[c.year].courses.push(le.code);
      });
    }
  });

  if (track === "I3I") {
    ["085903", "086067"].forEach((code) => { if (!byYear[2].courses.includes(code)) byYear[2].courses.push(code); });
    if (!byYear[2].courses.includes("058083")) byYear[2].courses.push("058083");
    if (!byYear[2].courses.includes("099319")) byYear[2].courses.push("099319");
    ["056889", "088804", "085901"].forEach((code) => { if (!byYear[3].courses.includes(code)) byYear[3].courses.push(code); });
    if (!byYear[2].courses.includes("052509")) byYear[2].courses.push("052509");
  }

  if (track === "I3C") {
    if (!byYear[2].courses.includes("099322")) byYear[2].courses.push("099322");
    if (!byYear[2].courses.includes("054440")) byYear[2].courses.push("054440");
    if (!byYear[2].courses.includes("058083")) byYear[2].courses.push("058083");
    if (!byYear[2].courses.includes("099319")) byYear[2].courses.push("099319");
    ["093506", "094782", "085900"].forEach((code) => { if (!byYear[3].courses.includes(code)) byYear[3].courses.push(code); });
  }

  if (!byYear[3].courses.includes("FINALE")) byYear[3].courses.push("FINALE");
  return byYear;
}

export function buildDefaultScenario(track: Track = DEFAULT_TRACK, studentYear: 1 | 2 | 3 = 1): PlanScenario {
  const piano = buildDefaultPiano(track);
  const entries = ([1, 2, 3] as const).flatMap((year) =>
    piano[year].courses
      .map((code) => makeEntry(code, "recommended", "effective"))
      .filter((entry): entry is PlanEntry => Boolean(entry))
  );
  const now = nowIso();
  return {
    cycle: {
      id: null,
      academicYear: ACADEMIC_YEAR,
      studentYear,
      track,
      validationMode: "annual_submission",
      status: "draft",
      approvalStatus: null,
      revisionOfCycleId: null,
      compiledOnPolimiAt: null,
      createdAt: now,
      updatedAt: now,
      isVirtual: true,
    },
    entries,
  };
}

export function getStudyPlan(): Piano {
  return planEntriesToPiano(getCurrentPlanScenario().entries);
}

export function getTrack(): Track {
  return getCurrentPlanScenario().cycle.track;
}

export function setTrack(track: Track): void {
  const scenario = getCurrentPlanScenario();
  savePlanDraft({
    cycleId: scenario.cycle.id,
    academicYear: scenario.cycle.academicYear,
    studentYear: scenario.cycle.studentYear,
    track,
    validationMode: scenario.cycle.validationMode,
    status: "draft",
    entries: scenario.entries.map(toDraftEntry),
  });
}

export function getCurrentPlanScenario(): PlanScenario {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM study_plan_cycles
    WHERE status != 'archived'
    ORDER BY id DESC
    LIMIT 1
  `).get() as CycleRow | undefined;

  if (!row) return buildDefaultScenario();
  return getPlanScenario(row.id) ?? buildDefaultScenario();
}

export function getPlanScenario(cycleId: number): PlanScenario | null {
  const db = getDb();
  const cycle = db.prepare("SELECT * FROM study_plan_cycles WHERE id = ?").get(cycleId) as CycleRow | undefined;
  if (!cycle) return null;
  const entries = db.prepare("SELECT * FROM study_plan_entries WHERE cycle_id = ? ORDER BY course_year, id").all(cycleId) as EntryRow[];
  return { cycle: mapCycle(cycle), entries: entries.map(mapEntry) };
}

export function getBaseRevisionEntries(scenario: PlanScenario): PlanEntry[] {
  if (!scenario.cycle.revisionOfCycleId) return [];
  return getPlanScenario(scenario.cycle.revisionOfCycleId)?.entries ?? [];
}

export function getPreviousCompiledEntries(currentCycleId: number | null): { cycle: PlanCycle; entry: PlanEntry }[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      c.id as cycle_id_ref,
      c.academic_year,
      c.student_year,
      c.track,
      c.validation_mode,
      c.status,
      c.approval_status,
      c.revision_of_cycle_id,
      c.compiled_on_polimi_at,
      c.created_at as cycle_created_at,
      c.updated_at as cycle_updated_at,
      e.*
    FROM study_plan_cycles c
    JOIN study_plan_entries e ON e.cycle_id = c.id
    WHERE c.status = 'polimi_compiled'
      AND (? IS NULL OR c.id != ?)
    ORDER BY c.id, e.id
  `).all(currentCycleId, currentCycleId) as (EntryRow & {
    cycle_id_ref: number;
    academic_year: string;
    student_year: number;
    track: Track;
    validation_mode: PlanValidationMode;
    status: PlanStatus;
    approval_status: ApprovalStatus | null;
    revision_of_cycle_id: number | null;
    compiled_on_polimi_at: string | null;
    cycle_created_at: string;
    cycle_updated_at: string;
  })[];

  return rows.map((row) => ({
    cycle: {
      id: row.cycle_id_ref,
      academicYear: row.academic_year,
      studentYear: row.student_year as 1 | 2 | 3,
      track: row.track,
      validationMode: row.validation_mode,
      status: row.status,
      approvalStatus: row.approval_status,
      revisionOfCycleId: row.revision_of_cycle_id,
      compiledOnPolimiAt: row.compiled_on_polimi_at,
      createdAt: row.cycle_created_at,
      updatedAt: row.cycle_updated_at,
    },
    entry: mapEntry({ ...row, cycle_id: row.cycle_id_ref }),
  }));
}

export function savePlanDraft(payload: PlanDraftPayload): PlanScenario {
  const db = getDb();
  const now = nowIso();
  const save = db.transaction(() => {
    let cycleId = payload.cycleId;
    const status: PlanStatus = payload.status && payload.status !== "polimi_compiled" ? payload.status : "draft";

    if (cycleId) {
      db.prepare(`
        UPDATE study_plan_cycles
        SET academic_year = ?, student_year = ?, track = ?, validation_mode = ?, status = ?, approval_status = NULL, updated_at = ?
        WHERE id = ?
      `).run(payload.academicYear, payload.studentYear, payload.track, payload.validationMode, status, now, cycleId);
      db.prepare("DELETE FROM study_plan_entries WHERE cycle_id = ?").run(cycleId);
    } else {
      const result = db.prepare(`
        INSERT INTO study_plan_cycles (
          academic_year, student_year, track, validation_mode, status, approval_status,
          revision_of_cycle_id, compiled_on_polimi_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)
      `).run(payload.academicYear, payload.studentYear, payload.track, payload.validationMode, status, now, now);
      cycleId = Number(result.lastInsertRowid);
    }

    const insert = db.prepare(`
      INSERT INTO study_plan_entries (
        cycle_id, course_code, course_year, position, origin, is_new_frequency, fee_counted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    payload.entries.forEach((entry) => {
      insert.run(
        cycleId,
        entry.courseCode,
        entry.courseYear,
        entry.position,
        entry.origin,
        entry.isNewFrequency ? 1 : 0,
        entry.feeCounted ? 1 : 0,
        now
      );
    });

    return cycleId;
  });

  const cycleId = save();
  const scenario = getPlanScenario(cycleId);
  if (!scenario) throw new Error("Impossibile rileggere il piano salvato.");
  return scenario;
}

export function updateCycleStatus(cycleId: number, status: PlanStatus, approvalStatus: ApprovalStatus | null = null): PlanScenario {
  const db = getDb();
  const compiledAt = status === "polimi_compiled" ? nowIso() : null;
  db.prepare(`
    UPDATE study_plan_cycles
    SET status = ?, approval_status = ?, compiled_on_polimi_at = COALESCE(?, compiled_on_polimi_at), updated_at = ?
    WHERE id = ?
  `).run(status, approvalStatus, compiledAt, nowIso(), cycleId);
  const scenario = getPlanScenario(cycleId);
  if (!scenario) throw new Error("Piano non trovato.");
  return scenario;
}

export function duplicatePlanForNextAcademicYear(cycleId: number): PlanScenario {
  const scenario = getPlanScenario(cycleId);
  if (!scenario) throw new Error("Piano da duplicare non trovato.");
  const nextAcademicYear = incrementAcademicYear(scenario.cycle.academicYear);
  const nextStudentYear = Math.min(3, scenario.cycle.studentYear + 1) as 1 | 2 | 3;
  const exams = getExams();
  return savePlanDraft({
    cycleId: null,
    academicYear: nextAcademicYear,
    studentYear: nextStudentYear,
    track: scenario.cycle.track,
    validationMode: "annual_submission",
    status: "draft",
    entries: scenario.entries.map((entry) => {
      const course = getCourse(entry.courseCode);
      const registered = exams[entry.courseCode]?.status === "passed_registered";
      const dueInPreviousSubmission = entry.position === "effective"
        && !course?.isLinkedExam
        && entry.courseYear <= scenario.cycle.studentYear;
      const carriedOver = dueInPreviousSubmission && !registered;

      return {
        courseCode: entry.courseCode,
        courseYear: entry.courseYear,
        position: entry.position,
        origin: carriedOver ? "carried_over" : entry.origin === "recommended" ? "recommended" : "new_frequency",
        isNewFrequency: !carriedOver,
        feeCounted: carriedOver || entry.courseYear === nextStudentYear,
      };
    }),
  });
}

function incrementAcademicYear(academicYear: string): string {
  const match = academicYear.match(/^(\d{4})\/(\d{4})$/);
  if (!match) return academicYear;
  return `${Number(match[1]) + 1}/${Number(match[2]) + 1}`;
}

export { EMPTY_PIANO };
