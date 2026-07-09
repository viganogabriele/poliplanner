import { getCourse } from "./courses";
import { GRADE_LAUDE } from "./constraints";
import type { ExamsMap } from "@/lib/esami";
import type { Piano } from "@/lib/piano";

export function parseGrade(grade: string): number | null {
  if (grade === GRADE_LAUDE || grade === "30L") return 31;
  const n = Number(grade);
  return isNaN(n) ? null : n;
}

export function displayGrade(numericGrade: number): string {
  if (numericGrade === 31) return "30L";
  return String(numericGrade);
}

export function weightedAverage(exams: ExamsMap, piano: Piano): { average: number | null; passedCFU: number } {
  let weightedSum = 0;
  let totalCFU = 0;

  Object.entries(exams).forEach(([code, exam]) => {
    if (exam.status !== "passed" || !exam.grade) return;
    const course = getCourse(code);
    if (!course) return;
    if (course.type.includes("T") || course.type.includes("V")) return;
    if (course.isLinkedExam) return;

    const numGrade = parseGrade(exam.grade);
    if (numGrade === null) return;

    weightedSum += numGrade * course.cfu;
    totalCFU += course.cfu;
  });

  return {
    average: totalCFU > 0 ? Math.round((weightedSum / totalCFU) * 100) / 100 : null,
    passedCFU: totalCFU,
  };
}

export function estimateFinalGrade(average: number | null): number | null {
  if (!average) return null;
  return Math.round((average * 110) / 30);
}
