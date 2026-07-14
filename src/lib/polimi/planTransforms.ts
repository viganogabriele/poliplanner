import { getCourse } from "./courses";
import { activityCategoryForCourse } from "./cfuCalc";
import type { EntryOrigin } from "./constraints";
import type { Piano, PlanEntry } from "@/lib/piano";

export function planEntriesToPiano(entries: PlanEntry[]): Piano {
  const result: Piano = {
    1: { courses: [], soprannumero: [] },
    2: { courses: [], soprannumero: [] },
    3: { courses: [], soprannumero: [] },
  };
  entries.forEach((entry) => {
    const bucket = entry.position === "supernumerary" ? result[entry.courseYear].soprannumero : result[entry.courseYear].courses;
    if (!bucket.includes(entry.courseCode)) bucket.push(entry.courseCode);
  });
  return result;
}

export function toDraftEntry(entry: PlanEntry): Omit<PlanEntry, "id" | "cycleId" | "createdAt"> {
  return {
    courseCode: entry.courseCode,
    courseYear: entry.courseYear,
    semester: entry.semester,
    entryKind: entry.entryKind,
    externalName: entry.externalName,
    externalCfu: entry.externalCfu,
    position: entry.position,
    origin: entry.origin,
    isNewFrequency: entry.isNewFrequency,
    feeCounted: entry.feeCounted,
  };
}

export function originForAddedCourse(code: string): EntryOrigin {
  const course = getCourse(code);
  if (!course) return "new_frequency";
  return activityCategoryForCourse(course) === "D" ? "free_choice" : "new_frequency";
}
