import { getCourse } from "./courses";
import { GRADE_LAUDE } from "./constraints";
import type { ExamsMap } from "@/lib/esami";
import type { PlanEntry } from "@/lib/piano";

export function parseGrade(grade: string): number | null {
  if (grade === GRADE_LAUDE || grade === "30L") return 31;
  const n = Number(grade);
  return isNaN(n) ? null : n;
}

export function displayGrade(numericGrade: number): string {
  if (numericGrade === 31) return "30L";
  return String(numericGrade);
}

export function weightedAverage(exams: ExamsMap, entries: PlanEntry[]): { average: number | null; passedCFU: number } {
  let weightedSum = 0;
  let gradedCFU = 0;
  let passedCFU = 0;

  entries.forEach((entry) => {
    if (entry.position !== "effective") return;
    const exam = exams[entry.courseCode];
    if (exam?.status !== "passed_registered") return;
    const course = getCourse(entry.courseCode);
    if (!course) return;
    if (course.isLinkedExam) return;

    passedCFU += course.cfu;

    if (course.type.includes("T") || course.type.includes("V")) return;
    if (!exam.grade) return;

    const numGrade = parseGrade(exam.grade);
    if (numGrade === null) return;

    weightedSum += numGrade * course.cfu;
    gradedCFU += course.cfu;
  });

  return {
    average: gradedCFU > 0 ? Math.round((weightedSum / gradedCFU) * 100) / 100 : null,
    passedCFU,
  };
}

export function estimateFinalGrade(average: number | null): number | null {
  if (!average) return null;
  return Math.round((average * 110) / 30);
}
