import { getCourse } from "./courses";
import type { Course } from "./courses";
import type { Piano } from "@/lib/piano";
import {
  APPROVED_FREE_CHOICE_GROUPS,
  COURSE_ACTIVITY_OVERRIDES,
  COURSE_AREA_BY_CODE,
} from "./constraints";
import type { ActivityCategory, BaseArea, CharacterizingArea } from "./constraints";

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

export function activityCategoryForCourse(course: Course): ActivityCategory {
  if (COURSE_ACTIVITY_OVERRIDES[course.code]) {
    return COURSE_ACTIVITY_OVERRIDES[course.code];
  }
  if (course.isElective && APPROVED_FREE_CHOICE_GROUPS.includes(course.electiveGroup ?? "")) {
    return "D";
  }
  return course.type[0] ?? "C";
}

export function sumCFUByCategory(courses: Course[]): Record<ActivityCategory, number> {
  const totals: Record<ActivityCategory, number> = { A: 0, B: 0, C: 0, D: 0, V: 0, T: 0 };
  courses.forEach((c) => {
    if (!c) return;
    totals[activityCategoryForCourse(c)] += c.cfu;
  });
  return totals;
}

export function sumCFUByMinisterialArea(courses: Course[]): {
  base: Record<BaseArea, number>;
  characterizing: Record<CharacterizingArea, number>;
} {
  const totals = {
    base: { math_info_stats: 0, physics_chemistry: 0 },
    characterizing: { electronics: 0, computer_engineering: 0, telecommunications: 0 },
  };

  courses.forEach((course) => {
    if (activityCategoryForCourse(course) === "D") return;
    const area = COURSE_AREA_BY_CODE[course.code];
    if (!area) return;
    if (area.kind === "base") {
      totals.base[area.area] += course.cfu;
    } else {
      totals.characterizing[area.area] += course.cfu;
    }
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

export function cfuPerYearIncludingSoprannumero(piano: Piano): Record<number, number> {
  const result: Record<number, number> = {};
  ([1, 2, 3] as const).forEach((y) => {
    const codes = [...piano[y].courses, ...piano[y].soprannumero];
    const courses = codes.map(getCourse).filter((c): c is Course => !!c && !c.isLinkedExam);
    result[y] = sumCFU(courses);
  });
  return result;
}

export function totalSoprannumeroCFU(piano: Piano): number {
  const courses = ([1, 2, 3] as const)
    .flatMap((y) => piano[y].soprannumero)
    .map(getCourse)
    .filter((c): c is Course => !!c && !c.isLinkedExam);
  return sumCFU(courses);
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
