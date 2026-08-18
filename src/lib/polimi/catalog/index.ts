/** Registro dei cataloghi versionati per anno accademico e helper di lettura. */

import { CATALOG_2025_2026 } from "./aa2025-2026";
import { CATALOG_2026_2027 } from "./aa2026-2027";
import type { ActivityCategory, Track } from "../constraints";
import type { Catalog, Course, CourseOffering, CourseYear } from "./types";

export * from "./types";

const CATALOGS: Catalog[] = [CATALOG_2025_2026, CATALOG_2026_2027];

export const CATALOG_BY_ACADEMIC_YEAR: Record<string, Catalog> = Object.fromEntries(
  CATALOGS.map((catalog) => [catalog.academicYear, catalog])
);

export const AVAILABLE_ACADEMIC_YEARS = CATALOGS.map((catalog) => catalog.academicYear);

/** Anno accademico usato quando non ne viene indicato uno: il più recente verificato. */
export const DEFAULT_ACADEMIC_YEAR = CATALOG_2025_2026.academicYear;

export type CatalogResolution = {
  catalog: Catalog;
  requestedAcademicYear: string;
  /** true quando l'AA richiesto non ha un catalogo: si usa il più recente noto. */
  isFallback: boolean;
};

export function resolveCatalog(academicYear: string | undefined | null): CatalogResolution {
  const requestedAcademicYear = academicYear ?? DEFAULT_ACADEMIC_YEAR;
  const exact = CATALOG_BY_ACADEMIC_YEAR[requestedAcademicYear];
  if (exact) return { catalog: exact, requestedAcademicYear, isFallback: false };
  const latest = CATALOGS[CATALOGS.length - 1];
  return { catalog: latest, requestedAcademicYear, isFallback: true };
}

export function getCatalog(academicYear?: string | null): Catalog {
  return resolveCatalog(academicYear).catalog;
}

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

const indexCache = new WeakMap<Catalog, Map<string, Course>>();

function courseIndex(catalog: Catalog): Map<string, Course> {
  const cached = indexCache.get(catalog);
  if (cached) return cached;
  const index = new Map(catalog.courses.map((course) => [course.code, course]));
  indexCache.set(catalog, index);
  return index;
}

export function findCourse(catalog: Catalog, code: string): Course | undefined {
  return courseIndex(catalog).get(code);
}

export function courseCfu(catalog: Catalog, code: string): number {
  return findCourse(catalog, code)?.cfu ?? 0;
}

export function courseName(catalog: Catalog, code: string): string {
  return findCourse(catalog, code)?.name ?? code;
}

export function courseOfferings(course: Course): CourseOffering[] {
  if (course.offerings) return course.offerings;
  return [{
    year: course.year,
    semester: course.semester === "A" ? 1 : course.semester,
    tracks: course.track === null || course.track === "both" ? ["I3I", "I3C"] : [course.track],
    group: course.electiveGroup,
    compulsory: course.isCompulsory,
    category: course.type[0] ?? "C",
    linkedModules: course.linkedExams.map((module) => module.code),
  }];
}

export function findOffering(
  catalog: Catalog,
  code: string,
  track: Track,
  year?: number,
  semester?: number
): CourseOffering | undefined {
  const course = findCourse(catalog, code);
  if (!course) return undefined;
  return courseOfferings(course).find((offering) =>
    offering.tracks.includes(track)
    && (year === undefined || offering.year === year)
    && (semester === undefined || offering.semester === semester)
  );
}

/** Categoria di attività (A/B/C/D/V/T) nel contesto indicato. */
export function activityCategory(
  catalog: Catalog,
  code: string,
  track?: Track,
  year?: number,
  semester?: number
): ActivityCategory {
  const override = catalog.activityCategoryOverrides[code];
  const course = findCourse(catalog, code);
  if (!course) return "D";
  if (track) {
    const offering = findOffering(catalog, code, track, year, semester) ?? findOffering(catalog, code, track);
    if (offering) {
      if (offering.group && catalog.freeChoiceGroups.includes(offering.group)) return "D";
      if (override && offering.category !== "D" && offering.category !== "V") return override;
      return offering.category;
    }
  }
  if (override) return override;
  if (course.isElective && catalog.freeChoiceGroups.includes(course.electiveGroup ?? "")) return "D";
  return course.type[0] ?? "C";
}

/** Gruppo (tabella/blocco) del corso nel contesto indicato. */
export function courseGroup(
  catalog: Catalog,
  code: string,
  track?: Track,
  year?: number,
  semester?: number
): string | null {
  const course = findCourse(catalog, code);
  if (!course) return null;
  if (track) {
    const offering = findOffering(catalog, code, track, year, semester) ?? findOffering(catalog, code, track);
    if (offering) return offering.group;
  }
  return course.electiveGroup;
}

/**
 * Nome leggibile di un gruppo/tabella. La UI non deve mai mostrare una sigla nuda come "TABREC":
 * il catalogo dell'anno dichiara l'etichetta, qui la si legge con un fallback prudente.
 */
export function groupLabel(catalog: Catalog, group: string | null | undefined): string | null {
  if (!group) return null;
  return catalog.electiveGroups[group]?.label ?? group;
}

/** Descrizione del gruppo, quando il catalogo la fornisce. */
export function groupDescription(catalog: Catalog, group: string | null | undefined): string | null {
  if (!group) return null;
  return catalog.electiveGroups[group]?.description ?? null;
}

/** Elenco leggibile di più gruppi, per i messaggi delle regole. */
export function groupLabelList(catalog: Catalog, groups: string[]): string {
  return groups.map((group) => groupLabel(catalog, group) ?? group).join(", ");
}

/** Tutti i gruppi in cui il corso appare per un percorso, indipendentemente da anno e semestre. */
export function courseGroupsForTrack(catalog: Catalog, code: string, track: Track): string[] {
  const course = findCourse(catalog, code);
  if (!course) return [];
  const groups = courseOfferings(course)
    .filter((offering) => offering.tracks.includes(track))
    .map((offering) => offering.group)
    .filter((group): group is string => Boolean(group));
  return [...new Set(groups)];
}

export function isFinalExamModule(catalog: Catalog, code: string): boolean {
  return Boolean(findCourse(catalog, code)?.isLinkedExam);
}

/** Semestre canonico dell'offerta, usato quando si crea una voce di piano. */
export function offeringSemester(catalog: Catalog, code: string, track: Track, year?: number): 1 | 2 {
  const course = findCourse(catalog, code);
  const offering = findOffering(catalog, code, track, year) ?? (course ? courseOfferings(course)[0] : undefined);
  if (offering) return offering.semester;
  if (course) return course.semester === "A" ? 1 : course.semester;
  return 1;
}

/** Anno di corso canonico dell'offerta per un percorso. */
export function offeringYear(catalog: Catalog, code: string, track: Track, preferredYear?: number): CourseYear {
  const course = findCourse(catalog, code);
  if (!course) return 1;
  const offerings = courseOfferings(course).filter((offering) => offering.tracks.includes(track));
  if (preferredYear !== undefined) {
    const match = offerings.find((offering) => offering.year === preferredYear);
    if (match) return match.year;
  }
  return offerings[0]?.year ?? course.year;
}
