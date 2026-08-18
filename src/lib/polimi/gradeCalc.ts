import { DEFAULT_ACADEMIC_YEAR, findCourse, getCatalog } from "./catalog";
import { GRADE_LAUDE } from "./constraints";
import type { CareerExamsMap } from "./career";

export function parseGrade(grade: string): number | null {
  if (grade === GRADE_LAUDE || grade === "30L") return 30;
  const value = Number(grade);
  return Number.isNaN(value) ? null : value;
}

/**
 * Media pesata e CFU acquisiti sull'**intera carriera**: contano solo gli esami verbalizzati,
 * perché un superamento non verbalizzato non esiste per PoliMi.
 */
export function careerAverage(
  exams: CareerExamsMap,
  academicYear: string = DEFAULT_ACADEMIC_YEAR
): { average: number | null; registeredCfu: number; registeredCount: number } {
  const catalog = getCatalog(academicYear);
  let weightedSum = 0;
  let gradedCfu = 0;
  let registeredCfu = 0;
  let registeredCount = 0;

  for (const [code, exam] of Object.entries(exams)) {
    if (exam.status !== "passed_registered") continue;
    const course = findCourse(catalog, code);
    if (!course) continue;
    registeredCfu += course.cfu;
    registeredCount += 1;
    if (course.type.includes("T") || course.type.includes("V")) continue;
    const grade = exam.grade ? parseGrade(exam.grade) : null;
    if (grade === null) continue;
    weightedSum += grade * course.cfu;
    gradedCfu += course.cfu;
  }

  return {
    average: gradedCfu > 0 ? Math.round((weightedSum / gradedCfu) * 100) / 100 : null,
    registeredCfu,
    registeredCount,
  };
}

export function estimateFinalGrade(average: number | null): number | null {
  if (!average) return null;
  return Math.min(110, Math.round((average * 110) / 30));
}
