export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Lunedì",
  1: "Martedì",
  2: "Mercoledì",
  3: "Giovedì",
  4: "Venerdì",
  5: "Sabato",
  6: "Domenica",
};

export const WORKWEEK = [0, 1, 2, 3, 4, 5, 6] as const;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export function isISODate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function parseISODate(value: string): Date {
  if (!isISODate(value)) throw new Error(`Data non valida: ${value}`);
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Calendar-only ISO conversion. UTC avoids process-timezone dependent arithmetic. */
export function toISODate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateToWeekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

export function daysBetween(start: string, end: string): number {
  return Math.round((parseISODate(end).getTime() - parseISODate(start).getTime()) / 86_400_000);
}

export function* dateRange(start: string, end: string): Generator<string> {
  const first = parseISODate(start);
  const last = parseISODate(end);
  if (last < first) throw new Error("La data finale precede quella iniziale.");
  for (let cursor = first.getTime(); cursor <= last.getTime(); cursor += 86_400_000) {
    yield toISODate(new Date(cursor));
  }
}

/** Today's civil date in Italy, independent of the server/container timezone. */
export function today(reference = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reference);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addCalendarDays(date: string, days: number): string {
  const parsed = parseISODate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return toISODate(parsed);
}

type ItalianDateStyle = "short" | "long" | "weekday";

const ITALIAN_DATE_FORMATTERS: Record<ItalianDateStyle, Intl.DateTimeFormat> = {
  short: new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
  long: new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
  weekday: new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
};

/** Formats a civil ISO date without shifting it through the server or browser timezone. */
export function formatItalianDate(value: string, style: ItalianDateStyle = "short"): string {
  if (!isISODate(value)) return value;
  return ITALIAN_DATE_FORMATTERS[style].format(parseISODate(value));
}

const ITALIAN_DAY_MONTH = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Intervallo di date. Composto a mano invece che con `formatRange`: quello inserisce
 * separatori che cambiano fra la versione di ICU di Node e quella del browser, e la
 * differenza faceva fallire l'hydration della vista settimanale.
 *
 * L'anno compare una volta sola quando inizio e fine cadono nello stesso anno.
 */
export function formatItalianDateRange(start: string, end: string): string {
  if (!isISODate(start) || !isISODate(end)) return `${start} - ${end}`;
  const from = parseISODate(start);
  const to = parseISODate(end);
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  const left = sameYear ? ITALIAN_DAY_MONTH.format(from) : ITALIAN_DATE_FORMATTERS.short.format(from);
  return `${left} – ${ITALIAN_DATE_FORMATTERS.short.format(to)}`;
}
