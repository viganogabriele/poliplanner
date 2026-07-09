import { getDb } from "./db";
import { COURSES } from "./polimi/courses";
import type { Track } from "./polimi/constraints";

export type PianoYear = { courses: string[]; soprannumero: string[] };
export type Piano = { 1: PianoYear; 2: PianoYear; 3: PianoYear };

const EMPTY_PIANO: Piano = {
  1: { courses: [], soprannumero: [] },
  2: { courses: [], soprannumero: [] },
  3: { courses: [], soprannumero: [] },
};

export function getStudyPlan(): Piano {
  const db = getDb();
  const rows = db.prepare("SELECT course_code, year, is_soprannumero FROM study_plan ORDER BY year").all() as {
    course_code: string; year: number; is_soprannumero: number;
  }[];

  const result: Piano = { 1: { courses: [], soprannumero: [] }, 2: { courses: [], soprannumero: [] }, 3: { courses: [], soprannumero: [] } };
  for (const row of rows) {
    const y = row.year as 1 | 2 | 3;
    if (!(y in result)) continue;
    if (row.is_soprannumero) {
      result[y].soprannumero.push(row.course_code);
    } else {
      result[y].courses.push(row.course_code);
    }
  }
  return result;
}

export function saveStudyPlan(piano: Piano): void {
  const db = getDb();
  const save = db.transaction(() => {
    db.prepare("DELETE FROM study_plan").run();
    const insert = db.prepare("INSERT INTO study_plan (course_code, year, is_soprannumero) VALUES (?, ?, ?)");
    ([1, 2, 3] as const).forEach((y) => {
      piano[y].courses.forEach((code) => insert.run(code, y, 0));
      piano[y].soprannumero.forEach((code) => insert.run(code, y, 1));
    });
  });
  save();
}

export function getTrack(): Track {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'track'").get() as { value: string } | undefined;
  return (row?.value as Track) ?? "I3I";
}

export function setTrack(track: Track): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('track', ?)").run(track);
}

export function buildDefaultPiano(track: Track = "I3I"): Piano {
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
    if (!byYear[2].courses.includes("058083")) byYear[2].courses.push("058083");
    if (!byYear[2].courses.includes("099319")) byYear[2].courses.push("099319");
  }

  if (!byYear[3].courses.includes("FINALE")) byYear[3].courses.push("FINALE");
  return byYear;
}

export { EMPTY_PIANO };
