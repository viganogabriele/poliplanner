// TodayPanel — Server Component (with a Client sub-component)
//
// The "Oggi" stat panel: date, weekday, lesson count today, live clock.
// The live clock (LiveClock) is a Client Component embedded inside
// this Server Component — that's perfectly fine in App Router.
// Server Components CAN render Client Components; they just can't use
// hooks themselves.

import Link from "next/link";
import { ArrowRight, CalendarCheck2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import type { TodoItem } from "@/lib/types";

interface TodayPanelProps {
  today_count: number;
  todoItems: TodoItem[];
  hasCalendar: boolean;
}

export default function TodayPanel({
  today_count,
  todoItems,
  hasCalendar,
}: TodayPanelProps) {
  const next = todoItems[0];
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Oggi</CardTitle>
          <CardDescription>Le attività che richiedono attenzione adesso</CardDescription>
        </div>
      </CardHeader>
      {!hasCalendar ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 p-5 text-center">
          <p className="text-sm font-semibold text-primary">Calendario non configurato</p>
          <p className="mt-1 text-xs text-muted">Aggiungi le ricorrenze per vedere qui la prossima attività.</p>
          <Link href="/calendar" className={buttonClass({ variant: "primary", size: "sm", className: "mt-4 w-full" })}>
            Configura calendario
          </Link>
        </div>
      ) : <div className="space-y-3">
        <div className="rounded-xl border border-border bg-surface-muted/70 p-4 shadow-inset">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
              <CalendarCheck2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold tabular-nums text-primary">{today_count}</p>
              <p className="text-xs text-muted">{today_count === 1 ? "lezione prevista oggi" : "lezioni previste oggi"}</p>
            </div>
          </div>
        </div>
        {next ? (
          <div className="rounded-xl border border-border bg-background-soft/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Prossima da recuperare</p>
            <p className="mt-1 text-sm font-semibold text-primary">{next.subject}</p>
            <Link href="/lessons" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              Apri le lezioni <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-success/25 bg-success/5 p-4 text-sm text-secondary">
            Nessuna lezione arretrata o prevista per oggi.
          </div>
        )}
      </div>}
    </Card>
  );
}
