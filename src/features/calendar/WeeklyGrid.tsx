// WeeklyGrid — Server Component
//
// Panoramica della settimana: una colonna per giorno da lunedì a venerdì, più
// la riga del weekend solo quando ci sono davvero lezioni di sabato o domenica.
//
// I dati arrivano dalle righe di schedule della pagina: nessuna interattività,
// quindi nessun componente client.

import { formatItalianDateRange, WEEKDAY_LABELS, WORKWEEK } from "@/lib/dates";
import { LESSON_MODE_LABELS, type ScheduleRow } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

interface WeeklyGridProps {
  rows: ScheduleRow[];
}

export default function WeeklyGrid({ rows }: WeeklyGridProps) {
  const byWeekday = new Map<number, ScheduleRow[]>();
  for (const wd of WORKWEEK) byWeekday.set(wd, []);
  for (const row of rows) {
    const list = byWeekday.get(row.weekday);
    if (list) list.push(row);
  }

  const renderDay = (wd: number) => {
    const dayRows = byWeekday.get(wd) ?? [];
    return (
      <section key={wd} className="rounded-card border border-border bg-surface-muted/40 p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="section-label">{WEEKDAY_LABELS[wd]}</h3>
          {dayRows.length > 0 && (
            <span className="text-xs tabular-nums text-disabled">{dayRows.length}</span>
          )}
        </div>
        {dayRows.length === 0 ? (
          <p className="py-1 text-xs text-disabled">Nessuna lezione</p>
        ) : (
          <ul className="space-y-2">
            {dayRows.map((row) => (
              <li key={row.id} className="rounded-control border border-border bg-surface px-3 py-2">
                <p className="text-sm font-medium leading-snug text-primary">{row.subject}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatItalianDateRange(row.start_date, row.end_date)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {/* Etichetta breve: la descrizione completa sta nell'info della scheda. */}
                  <Badge size="sm" variant={row.mode === "presenza" ? "active" : "warning"} title={LESSON_MODE_LABELS[row.mode]}>
                    {row.mode === "presenza" ? "In presenza" : "Asincrona"}
                  </Badge>
                  {row.course_code && (
                    <span className="text-[11px] tabular-nums text-disabled">{row.course_code}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  const weekend = WORKWEEK.slice(5);
  const hasWeekendLessons = weekend.some((wd) => (byWeekday.get(wd) ?? []).length > 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {WORKWEEK.slice(0, 5).map(renderDay)}
      </div>
      {hasWeekendLessons && (
        <div className="grid grid-cols-1 items-start gap-3 border-t border-border pt-3 sm:grid-cols-2 xl:ml-auto xl:max-w-[40%]">
          {weekend.map(renderDay)}
        </div>
      )}
    </div>
  );
}
