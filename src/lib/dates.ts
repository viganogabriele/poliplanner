// ============================================================
// Date utilities and weekday constants
// ============================================================
// By storing weekday as an integer (0 = Monday … 6 = Sunday) in
// the database, we keep storage format-agnostic and put the Italian
// labels here, in code, where they belong.

/** Italian weekday labels indexed by our convention: 0 = Monday. */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Lunedì",
  1: "Martedì",
  2: "Mercoledì",
  3: "Giovedì",
  4: "Venerdì",
  5: "Sabato",
  6: "Domenica",
};

/**
 * Weekdays shown in the schedule editor and weekly grid.
 * We include only Mon–Fri in the UI grid (same as original app),
 * but the full schedule can technically include Sat/Sun.
 */
export const WORKWEEK = [0, 1, 2, 3, 4] as const;

/**
 * Convert a JS Date to our weekday integer (0 = Monday).
 * JS Date.getDay() returns 0 = Sunday; we remap to Monday-first.
 */
export function dateToWeekday(d: Date): number {
  return (d.getDay() + 6) % 7; // Sun(0)->6, Mon(1)->0, Tue(2)->1, …
}

/**
 * Return an ISO date string "YYYY-MM-DD" for a given Date,
 * always in local time (not UTC), matching how SQLite stores dates.
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse an ISO date string and return a plain Date at midnight local time.
 * "YYYY-MM-DD" → new Date(year, month-1, day)
 */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Iterate every calendar date (inclusive) between start and end.
 * Yields ISO date strings.
 */
export function* dateRange(
  startStr: string,
  endStr: string
): Generator<string> {
  const start = parseISODate(startStr);
  const end = parseISODate(endStr);
  const cur = new Date(start);
  while (cur <= end) {
    yield toISODate(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

/** Today's ISO date string, in local time. */
export function today(): string {
  return toISODate(new Date());
}
