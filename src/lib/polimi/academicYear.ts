/**
 * Aritmetica dell'anno accademico, in forma pura.
 *
 * Un anno accademico si scrive `YYYY/YYYY` con anni consecutivi e comincia a settembre.
 * Le funzioni non leggono la data corrente: la ricevono, così restano testabili.
 */

const PATTERN = /^(\d{4})\/(\d{4})$/;

/** Primo mese (1-12) del nuovo anno accademico. */
export const ACADEMIC_YEAR_START_MONTH = 9;

/**
 * Mese da cui la pianificazione guarda già all'anno accademico successivo. La presentazione
 * ordinaria del piano apre in estate, quindi da luglio l'anno "da pianificare" è quello che inizia.
 */
export const PLANNING_LOOKAHEAD_MONTH = 7;

export function isAcademicYear(value: string): boolean {
  const match = PATTERN.exec(value);
  return Boolean(match) && Number(match![2]) === Number(match![1]) + 1;
}

export function assertAcademicYear(value: string): void {
  if (!isAcademicYear(value)) throw new Error("Anno accademico non valido: usa YYYY/YYYY con anni consecutivi.");
}

/** Anno di inizio: per "2026/2027" è 2026. */
export function academicYearStart(academicYear: string): number {
  const match = PATTERN.exec(academicYear);
  if (!match) throw new Error("Anno accademico non valido.");
  return Number(match[1]);
}

export function formatAcademicYear(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

export function incrementAcademicYear(academicYear: string): string {
  return formatAcademicYear(academicYearStart(academicYear) + 1);
}

/** Confronto cronologico: negativo se `a` precede `b`. */
export function compareAcademicYears(a: string, b: string): number {
  return academicYearStart(a) - academicYearStart(b);
}

/**
 * Anno accademico che ha senso pianificare a una data data. Da luglio in poi si guarda
 * all'anno che sta per iniziare, perché è quello per cui si presenta il piano.
 */
export function planningAcademicYear(today: string): string {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return formatAcademicYear(month >= PLANNING_LOOKAHEAD_MONTH ? year : year - 1);
}
