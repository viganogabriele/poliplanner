import { getDb } from "./db";
import { getExams } from "./esami";
import { getCourse, getCourseOffering } from "./polimi/courses";
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
export type PlanEntryKind = "catalog" | "external";

export type PlanCycle = {
  id: number | null;
  academicYear: string;
  studentYear: 1 | 2 | 3;
  track: Track;
  validationMode: PlanValidationMode;
  status: PlanStatus;
  archivedAt: string | null;
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
  semester: 1 | 2;
  entryKind: PlanEntryKind;
  externalName: string | null;
  externalCfu: number | null;
  position: EntryPosition;
  origin: EntryOrigin;
  isNewFrequency: boolean;
  feeCounted: boolean;
  createdAt: string;
};

export type PlanScenario = { cycle: PlanCycle; entries: PlanEntry[] };

export type PlanDraftEntry = {
  courseCode: string;
  courseYear: 1 | 2 | 3;
  semester?: 1 | 2;
  entryKind?: PlanEntryKind;
  externalName?: string | null;
  externalCfu?: number | null;
  position: EntryPosition;
  origin: EntryOrigin;
  // Accepted for backwards-compatible clients but deliberately ignored by the server.
  isNewFrequency?: boolean;
  feeCounted?: boolean;
};

export type PlanDraftPayload = {
  cycleId: number | null;
  academicYear: string;
  studentYear: 1 | 2 | 3;
  track: Track;
  validationMode: PlanValidationMode;
  status?: PlanStatus;
  entries: PlanDraftEntry[];
};

export type RequiredReinsertion = { courseCode: string; sourceCycleId: number; sourceAcademicYear: string };

type CycleRow = {
  id: number;
  academic_year: string;
  student_year: number;
  track: Track;
  validation_mode: PlanValidationMode;
  status: PlanStatus;
  archived_at: string | null;
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
  semester: number;
  entry_kind: PlanEntryKind;
  external_name: string | null;
  external_cfu: number | null;
  position: EntryPosition;
  origin: EntryOrigin;
  is_new_frequency: number;
  fee_counted: number;
  created_at: string;
};

export const EMPTY_PIANO: Piano = {
  1: { courses: [], soprannumero: [] },
  2: { courses: [], soprannumero: [] },
  3: { courses: [], soprannumero: [] },
};

const nowIso = () => new Date().toISOString();
const ACTIVE_CYCLE_KEY = "active_plan_cycle_id";
const ACADEMIC_YEAR_PATTERN = /^(\d{4})\/(\d{4})$/;

const mapCycle = (row: CycleRow): PlanCycle => ({
  id: row.id,
  academicYear: row.academic_year,
  studentYear: row.student_year as 1 | 2 | 3,
  track: row.track,
  validationMode: row.validation_mode,
  status: row.status,
  archivedAt: row.archived_at,
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
  semester: row.semester as 1 | 2,
  entryKind: row.entry_kind,
  externalName: row.external_name,
  externalCfu: row.external_cfu,
  position: row.position,
  origin: row.origin,
  isNewFrequency: Boolean(row.is_new_frequency),
  feeCounted: Boolean(row.fee_counted),
  createdAt: row.created_at,
});

function assertAcademicYear(value: string): void {
  const match = ACADEMIC_YEAR_PATTERN.exec(value);
  if (!match || Number(match[2]) !== Number(match[1]) + 1) throw new Error("Anno accademico non valido: usa YYYY/YYYY con anni consecutivi.");
}

function setActiveCycleId(cycleId: number): void {
  getDb().prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(ACTIVE_CYCLE_KEY, String(cycleId));
}

function makeEntry(code: string, courseYear: 1 | 2 | 3, track: Track): PlanEntry {
  const course = getCourse(code);
  if (!course) throw new Error(`Corso di default sconosciuto: ${code}.`);
  const offering = getCourseOffering(code, track, courseYear);
  const semester = offering?.semester ?? (course.semester === "A" ? 1 : course.semester);
  return {
    id: null,
    cycleId: null,
    courseCode: code,
    courseYear,
    semester,
    entryKind: "catalog",
    externalName: null,
    externalCfu: null,
    position: "effective",
    origin: "recommended",
    isNewFrequency: true,
    feeCounted: true,
    createdAt: nowIso(),
  };
}

const DEFAULT_CODES: Record<Track, Record<1 | 2 | 3, string[]>> = {
  I3I: {
    1: ["082740", "082746", "082747", "051124", "082748", "054303"],
    2: ["052425", "085779", "085905", "085903", "058083", "099319", "086067", "052509"],
    3: ["085746", "052511", "085887", "051289", "085877", "054441", "052510", "085923", "056889", "088804", "085901"],
  },
  I3C: {
    1: ["082740", "082746", "082747", "051124", "082748", "054303"],
    2: ["052425", "085779", "085905", "093506", "099319", "099322", "054440"],
    3: ["085746", "093283", "097459", "097460", "051234", "054442", "051289", "054305", "059431", "085900"],
  },
};

export function buildDefaultPiano(track: Track = DEFAULT_TRACK): Piano {
  return {
    1: { courses: [...DEFAULT_CODES[track][1]], soprannumero: [] },
    2: { courses: [...DEFAULT_CODES[track][2]], soprannumero: [] },
    3: { courses: [...DEFAULT_CODES[track][3]], soprannumero: [] },
  };
}

export function buildDefaultScenario(track: Track = DEFAULT_TRACK, studentYear: 1 | 2 | 3 = 1, academicYear = ACADEMIC_YEAR): PlanScenario {
  const now = nowIso();
  return {
    cycle: {
      id: null,
      academicYear,
      studentYear,
      track,
      validationMode: "annual_submission",
      status: "draft",
      archivedAt: null,
      approvalStatus: null,
      revisionOfCycleId: null,
      compiledOnPolimiAt: null,
      createdAt: now,
      updatedAt: now,
      isVirtual: true,
    },
    entries: ([1, 2, 3] as const).flatMap((year) => DEFAULT_CODES[track][year].map((code) => ({
      ...makeEntry(code, year, track),
      feeCounted: year === studentYear,
    }))),
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
  if (scenario.cycle.id === null) throw new Error("Salva prima lo scenario.");
  savePlanDraft({
    cycleId: scenario.cycle.id,
    academicYear: scenario.cycle.academicYear,
    studentYear: scenario.cycle.studentYear,
    track,
    validationMode: scenario.cycle.validationMode,
    entries: scenario.entries.map(toDraftEntry),
  });
}

export function listPlanCycles(): PlanCycle[] {
  return (getDb().prepare("SELECT * FROM study_plan_cycles ORDER BY academic_year DESC, id DESC").all() as CycleRow[]).map(mapCycle);
}

export function getCurrentPlanScenario(): PlanScenario {
  const db = getDb();
  const active = db.prepare(`
    SELECT c.* FROM study_plan_cycles c
    JOIN settings s ON s.key = ? AND CAST(s.value AS INTEGER) = c.id
    WHERE c.archived_at IS NULL
  `).get(ACTIVE_CYCLE_KEY) as CycleRow | undefined;
  if (active) return getPlanScenario(active.id) ?? buildDefaultScenario();

  const fallback = db.prepare(`
    SELECT * FROM study_plan_cycles
    WHERE archived_at IS NULL
    ORDER BY CASE status WHEN 'draft' THEN 0 WHEN 'ready' THEN 1 ELSE 2 END, id DESC
    LIMIT 1
  `).get() as CycleRow | undefined;
  if (fallback) {
    setActiveCycleId(fallback.id);
    return getPlanScenario(fallback.id) ?? buildDefaultScenario();
  }
  return buildDefaultScenario();
}

export function getPlanScenario(cycleId: number): PlanScenario | null {
  if (!Number.isSafeInteger(cycleId) || cycleId <= 0) return null;
  const db = getDb();
  const cycle = db.prepare("SELECT * FROM study_plan_cycles WHERE id = ?").get(cycleId) as CycleRow | undefined;
  if (!cycle) return null;
  const entries = db.prepare("SELECT * FROM study_plan_entries WHERE cycle_id = ? ORDER BY course_year, semester, id").all(cycleId) as EntryRow[];
  return { cycle: mapCycle(cycle), entries: entries.map(mapEntry) };
}

export function getBaseRevisionEntries(scenario: PlanScenario): PlanEntry[] {
  return scenario.cycle.revisionOfCycleId ? getPlanScenario(scenario.cycle.revisionOfCycleId)?.entries ?? [] : [];
}

export function getPreviousCompiledEntries(currentCycleId: number | null): { cycle: PlanCycle; entry: PlanEntry }[] {
  const rows = getDb().prepare(`
    SELECT c.id AS cycle_id_ref, c.academic_year, c.student_year, c.track,
      c.validation_mode, c.status, c.archived_at, c.approval_status,
      c.revision_of_cycle_id, c.compiled_on_polimi_at,
      c.created_at AS cycle_created_at, c.updated_at AS cycle_updated_at, e.*
    FROM study_plan_cycles c
    JOIN study_plan_entries e ON e.cycle_id = c.id
    WHERE c.status = 'polimi_compiled' AND (? IS NULL OR c.id != ?)
    ORDER BY c.compiled_on_polimi_at DESC, c.id DESC, e.id
  `).all(currentCycleId, currentCycleId) as (EntryRow & {
    cycle_id_ref: number; academic_year: string; student_year: number; track: Track;
    validation_mode: PlanValidationMode; status: PlanStatus; archived_at: string | null;
    approval_status: ApprovalStatus | null; revision_of_cycle_id: number | null;
    compiled_on_polimi_at: string | null; cycle_created_at: string; cycle_updated_at: string;
  })[];
  return rows.map((row) => ({
    cycle: mapCycle({
      id: row.cycle_id_ref, academic_year: row.academic_year, student_year: row.student_year,
      track: row.track, validation_mode: row.validation_mode, status: row.status,
      archived_at: row.archived_at, approval_status: row.approval_status,
      revision_of_cycle_id: row.revision_of_cycle_id, compiled_on_polimi_at: row.compiled_on_polimi_at,
      created_at: row.cycle_created_at, updated_at: row.cycle_updated_at,
    }),
    entry: mapEntry({ ...row, cycle_id: row.cycle_id_ref }),
  }));
}

function normalizeEntry(entry: PlanDraftEntry, payload: PlanDraftPayload): Omit<PlanEntry, "id" | "cycleId" | "createdAt"> {
  const code = entry.courseCode.trim().toUpperCase();
  if (!code || code.length > 32) throw new Error("Codice corso non valido.");
  if (![1, 2, 3].includes(entry.courseYear)) throw new Error(`Anno non valido per ${code}.`);
  if (!(["effective", "supernumerary"] as const).includes(entry.position)) throw new Error(`Posizione non valida per ${code}.`);
  if (!(["recommended", "carried_over", "new_frequency", "recovery_reinserted", "free_choice"] as const).includes(entry.origin)) throw new Error(`Origine non valida per ${code}.`);

  const entryKind = entry.entryKind ?? "catalog";
  const course = getCourse(code);
  let semester = entry.semester;
  let externalName: string | null = null;
  let externalCfu: number | null = null;
  if (entryKind === "catalog") {
    if (!course) throw new Error(`Corso di catalogo sconosciuto: ${code}.`);
    semester ??= course.semester === "A" ? 1 : course.semester;
    if (!getCourseOffering(code, payload.track, entry.courseYear, semester) && !course.isLinkedExam) {
      throw new Error(`L'offerta ${code} non è compatibile con anno, semestre e percorso selezionati.`);
    }
  } else if (entryKind === "external") {
    externalName = entry.externalName?.trim() || null;
    externalCfu = Number(entry.externalCfu);
    if (!externalName || externalName.length > 160) throw new Error(`Nome del corso esterno ${code} non valido.`);
    if (!Number.isInteger(externalCfu) || externalCfu < 1 || externalCfu > 15) throw new Error(`CFU del corso esterno ${code} non validi.`);
    semester ??= 2;
  } else {
    throw new Error(`Tipo voce non valido per ${code}.`);
  }
  if (semester !== 1 && semester !== 2) throw new Error(`Semestre non valido per ${code}.`);

  const alreadyAttended = entry.origin === "carried_over" || entry.origin === "recovery_reinserted";
  const isNewFrequency = !alreadyAttended;
  const feeCounted = isNewFrequency && entry.courseYear === payload.studentYear;
  return {
    courseCode: code,
    courseYear: entry.courseYear,
    semester,
    entryKind,
    externalName,
    externalCfu,
    position: entry.position,
    origin: entry.origin,
    isNewFrequency,
    feeCounted,
  };
}

export function savePlanDraft(payload: PlanDraftPayload): PlanScenario {
  assertAcademicYear(payload.academicYear);
  if (![1, 2, 3].includes(payload.studentYear)) throw new Error("Anno di corso non valido.");
  if (payload.track !== "I3I" && payload.track !== "I3C") throw new Error("Percorso non valido.");
  if (!Array.isArray(payload.entries) || payload.entries.length > 100) throw new Error("Il piano può contenere al massimo 100 attività.");
  const normalized = payload.entries.map((entry) => normalizeEntry(entry, payload));
  if (new Set(normalized.map((entry) => entry.courseCode)).size !== normalized.length) throw new Error("Il piano contiene attività duplicate.");

  const db = getDb();
  const now = nowIso();
  const save = db.transaction(() => {
    let cycleId = payload.cycleId;
    if (cycleId !== null) {
      const current = db.prepare("SELECT * FROM study_plan_cycles WHERE id = ?").get(cycleId) as CycleRow | undefined;
      if (!current) throw new Error("Scenario non trovato.");
      if (current.status === "polimi_compiled") throw new Error("Uno scenario compilato è storico e non può essere modificato.");
      if (current.archived_at) throw new Error("Ripristina lo scenario prima di modificarlo.");
      if (payload.validationMode !== current.validation_mode) throw new Error("La modalità dello scenario non può essere cambiata dopo la creazione.");
      db.prepare(`
        UPDATE study_plan_cycles
        SET academic_year = ?, student_year = ?, track = ?, status = 'draft',
            approval_status = NULL, updated_at = ?
        WHERE id = ?
      `).run(payload.academicYear, payload.studentYear, payload.track, now, cycleId);
      db.prepare("DELETE FROM study_plan_entries WHERE cycle_id = ?").run(cycleId);
    } else {
      const result = db.prepare(`
        INSERT INTO study_plan_cycles (
          academic_year, student_year, track, validation_mode, status, archived_at,
          approval_status, revision_of_cycle_id, compiled_on_polimi_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'draft', NULL, NULL, NULL, NULL, ?, ?)
      `).run(payload.academicYear, payload.studentYear, payload.track, payload.validationMode, now, now);
      cycleId = Number(result.lastInsertRowid);
    }

    const insert = db.prepare(`
      INSERT INTO study_plan_entries (
        cycle_id, course_code, course_year, semester, entry_kind, external_name, external_cfu,
        position, origin, is_new_frequency, fee_counted, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const entry of normalized) {
      insert.run(cycleId, entry.courseCode, entry.courseYear, entry.semester, entry.entryKind,
        entry.externalName, entry.externalCfu, entry.position, entry.origin,
        entry.isNewFrequency ? 1 : 0, entry.feeCounted ? 1 : 0, now);
    }
    setActiveCycleId(cycleId);
    return cycleId;
  });

  try {
    const scenario = getPlanScenario(save());
    if (!scenario) throw new Error("Impossibile rileggere il piano salvato.");
    return scenario;
  } catch (error) {
    if (String(error).includes("one_editable_cycle_per_academic_year")) {
      throw new Error(`Esiste già uno scenario modificabile non archiviato per l'AA ${payload.academicYear}.`);
    }
    throw error;
  }
}

export function createAnnualDraft(academicYear: string, studentYear: 1 | 2 | 3, track: Track): PlanScenario {
  const draft = buildDefaultScenario(track, studentYear, academicYear);
  return savePlanDraft({
    cycleId: null, academicYear, studentYear, track, validationMode: "annual_submission",
    entries: draft.entries.map(toDraftEntry),
  });
}

export function updateCycleStatus(cycleId: number, status: PlanStatus, approvalStatus: ApprovalStatus | null = null): PlanScenario {
  const scenario = getPlanScenario(cycleId);
  if (!scenario) throw new Error("Piano non trovato.");
  if (scenario.cycle.archivedAt) throw new Error("Lo scenario è archiviato.");
  const allowed = (scenario.cycle.status === "draft" && status === "ready")
    || (scenario.cycle.status === "ready" && status === "polimi_compiled");
  if (!allowed) throw new Error(`Transizione non consentita: ${scenario.cycle.status} → ${status}.`);
  const compiledAt = status === "polimi_compiled" ? nowIso() : null;
  getDb().prepare(`
    UPDATE study_plan_cycles SET status = ?, approval_status = ?,
      compiled_on_polimi_at = COALESCE(?, compiled_on_polimi_at), updated_at = ?
    WHERE id = ?
  `).run(status, approvalStatus, compiledAt, nowIso(), cycleId);
  return getPlanScenario(cycleId) as PlanScenario;
}

export function setActivePlanCycle(cycleId: number): PlanScenario {
  const scenario = getPlanScenario(cycleId);
  if (!scenario || scenario.cycle.archivedAt) throw new Error("Scenario attivo non valido.");
  if (scenario.cycle.status === "polimi_compiled") throw new Error("Solo uno scenario modificabile può diventare attivo.");
  setActiveCycleId(cycleId);
  return scenario;
}

export function archivePlanCycle(cycleId: number): PlanScenario {
  const scenario = getPlanScenario(cycleId);
  if (!scenario) throw new Error("Scenario non trovato.");
  if (scenario.cycle.archivedAt) return scenario;
  const db = getDb();
  db.prepare("UPDATE study_plan_cycles SET archived_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), cycleId);
  const active = db.prepare("SELECT value FROM settings WHERE key = ?").get(ACTIVE_CYCLE_KEY) as { value: string } | undefined;
  if (Number(active?.value) === cycleId) db.prepare("DELETE FROM settings WHERE key = ?").run(ACTIVE_CYCLE_KEY);
  return getPlanScenario(cycleId) as PlanScenario;
}

export function restorePlanCycle(cycleId: number): PlanScenario {
  const scenario = getPlanScenario(cycleId);
  if (!scenario) throw new Error("Scenario non trovato.");
  try {
    getDb().prepare("UPDATE study_plan_cycles SET archived_at = NULL, updated_at = ? WHERE id = ?").run(nowIso(), cycleId);
  } catch (error) {
    if (String(error).includes("one_editable_cycle_per_academic_year")) throw new Error("Archivia prima lo scenario modificabile dello stesso anno accademico.");
    throw error;
  }
  return getPlanScenario(cycleId) as PlanScenario;
}

export function duplicatePlanForNextAcademicYear(cycleId: number): PlanScenario {
  const source = getPlanScenario(cycleId);
  if (!source) throw new Error("Piano da duplicare non trovato.");
  if (source.cycle.status !== "polimi_compiled") throw new Error("Puoi duplicare solo uno scenario compilato su PoliMi.");
  const nextAcademicYear = incrementAcademicYear(source.cycle.academicYear);
  const nextStudentYear = Math.min(3, source.cycle.studentYear + 1) as 1 | 2 | 3;
  const exams = getExams();
  return savePlanDraft({
    cycleId: null,
    academicYear: nextAcademicYear,
    studentYear: nextStudentYear,
    track: source.cycle.track,
    validationMode: "annual_submission",
    entries: source.entries.map((entry) => {
      const due = entry.position === "effective" && entry.entryKind === "catalog"
        && !getCourse(entry.courseCode)?.isLinkedExam && entry.courseYear <= source.cycle.studentYear;
      const carried = due && exams[entry.courseCode]?.status !== "passed_registered";
      return {
        ...toDraftEntry(entry),
        origin: carried ? "carried_over" : entry.origin === "recommended" ? "recommended" : "new_frequency",
      };
    }),
  });
}

export function createSecondSemesterRevision(cycleId: number): PlanScenario {
  const source = getPlanScenario(cycleId);
  if (!source) throw new Error("Scenario base non trovato.");
  if (source.cycle.status !== "polimi_compiled") throw new Error("La revisione deve partire da uno scenario compilato su PoliMi.");
  const db = getDb();
  const now = nowIso();
  let revisionId: number;
  try {
    revisionId = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO study_plan_cycles (
          academic_year, student_year, track, validation_mode, status, archived_at,
          approval_status, revision_of_cycle_id, compiled_on_polimi_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'second_semester_revision', 'draft', NULL, NULL, ?, NULL, ?, ?)
      `).run(source.cycle.academicYear, source.cycle.studentYear, source.cycle.track, cycleId, now, now);
      const id = Number(result.lastInsertRowid);
      db.prepare(`
        INSERT INTO study_plan_entries (
          cycle_id, course_code, course_year, semester, entry_kind, external_name, external_cfu,
          position, origin, is_new_frequency, fee_counted, created_at
        ) SELECT ?, course_code, course_year, semester, entry_kind, external_name, external_cfu,
          position, origin, is_new_frequency, fee_counted, ?
        FROM study_plan_entries WHERE cycle_id = ?
      `).run(id, now, cycleId);
      setActiveCycleId(id);
      return id;
    })();
  } catch (error) {
    if (String(error).includes("one_editable_cycle_per_academic_year")) throw new Error("Esiste già uno scenario modificabile per questo anno accademico.");
    throw error;
  }
  return getPlanScenario(revisionId) as PlanScenario;
}

function incrementAcademicYear(academicYear: string): string {
  const match = ACADEMIC_YEAR_PATTERN.exec(academicYear);
  if (!match) throw new Error("Anno accademico non valido.");
  return `${Number(match[1]) + 1}/${Number(match[2]) + 1}`;
}
