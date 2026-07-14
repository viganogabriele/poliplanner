// WeeklyGrid — Server Component
//
// Shows a 5-column (Mon–Fri) overview of scheduled subjects.
// Each column lists the subjects that occur on that weekday
// along with their date range and mode.
//
// Data comes from the schedule rows passed in by the page.
// No interactivity needed → Server Component.

import { WEEKDAY_LABELS, WORKWEEK } from "@/lib/dates";
import { LESSON_MODE_LABELS, type ScheduleRow } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

interface WeeklyGridProps {
  rows: ScheduleRow[];
}

export default function WeeklyGrid({ rows }: WeeklyGridProps) {
  // Group rows by weekday integer
  const byWeekday = new Map<number, ScheduleRow[]>();
  for (const wd of WORKWEEK) byWeekday.set(wd, []);
  for (const row of rows) {
    const list = byWeekday.get(row.weekday);
    if (list) list.push(row);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
      {WORKWEEK.map((wd) => {
        const dayRows = byWeekday.get(wd) ?? [];
        return (
          <div
            key={wd}
            className="flex min-h-44 flex-col gap-2 rounded-card border border-border bg-surface-muted/60 p-3 shadow-inset"
          >
            <div className="text-xs font-semibold uppercase text-muted">
              {WEEKDAY_LABELS[wd]}
            </div>
            {dayRows.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-xs text-disabled">
                Nessuna lezione
              </div>
            ) : (
              dayRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-border bg-background-soft px-3 py-2 text-xs transition hover:border-border-strong hover:bg-surface-hover"
                >
                  <div className="font-medium leading-snug text-primary">
                    {row.subject}
                  </div>
                  {row.course_code && <div className="mt-1 font-mono text-muted">{row.course_code}</div>}
                  <div className="mt-1 text-muted">
                    {row.start_date} → {row.end_date}
                  </div>
                  <Badge
                    variant={row.mode === "presenza" ? "active" : "warning"}
                    className="mt-2 px-2 py-0.5 text-[11px]"
                  >
                    {LESSON_MODE_LABELS[row.mode]}
                  </Badge>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
