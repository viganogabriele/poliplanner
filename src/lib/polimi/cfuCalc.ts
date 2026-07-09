import { COURSES, getCourse } from "./courses";
import type { Course } from "./courses";
import type { Piano } from "@/lib/piano";

export function getAllPlanoCourses(piano: Piano): Course[] {
  const codes = new Set<string>();
  ([1, 2, 3] as const).forEach((y) => {
    piano[y].courses.forEach((c) => codes.add(c));
    piano[y].soprannumero.forEach((c) => codes.add(c));
  });
  return Array.from(codes).map(getCourse).filter(Boolean) as Course[];
}

export function sumCFU(courses: Course[]): number {
  return courses.reduce((acc, c) => acc + (c?.cfu ?? 0), 0);
}

export function sumCFUByCategory(courses: Course[]): Record<string, number> {
  const totals: Record<string, number> = { A: 0, B: 0, C: 0, V: 0, T: 0 };
  courses.forEach((c) => {
    if (!c) return;
    c.type.forEach((t) => {
      if (t in totals) totals[t] += c.cfu;
    });
  });
  return totals;
}

export function cfuPerYear(piano: Piano): Record<number, number> {
  const result: Record<number, number> = {};
  ([1, 2, 3] as const).forEach((y) => {
    const courses = piano[y].courses.map(getCourse).filter((c): c is Course => !!c && !c.isLinkedExam);
    result[y] = sumCFU(courses);
  });
  return result;
}

export function totalCFU(piano: Piano): number {
  return Object.values(cfuPerYear(piano)).reduce((a, b) => a + b, 0);
}

export function allPlanoCodes(piano: Piano): string[] {
  const codes = new Set<string>();
  ([1, 2, 3] as const).forEach((y) => {
    piano[y].courses.forEach((c) => codes.add(c));
  });
  return Array.from(codes);
}

export function isCourseInPiano(piano: Piano, code: string): boolean {
  return allPlanoCodes(piano).includes(code);
}
