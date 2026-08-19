// TodayPanel — Server Component (con un sottocomponente client)
//
// Il pannello "Oggi": quante lezioni sono previste e qual è la prossima da
// recuperare. Un Server Component può renderizzare componenti client; non può
// usare hook al proprio interno.

import Link from "next/link";
import { ArrowRight, CalendarCheck2, CalendarPlus } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
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
          <CardDescription>Cosa richiede attenzione adesso</CardDescription>
        </div>
      </CardHeader>

      {!hasCalendar ? (
        <EmptyState
          icon={<CalendarPlus className="size-5" aria-hidden="true" />}
          title="Calendario non configurato"
          description="Aggiungi le ricorrenze settimanali per vedere qui la prossima attività."
          action={
            <Link href="/calendar" className={buttonClass({ variant: "primary", size: "sm", className: "w-full sm:w-auto" })}>
              Configura calendario
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent/10 text-accent">
              <CalendarCheck2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-semibold leading-tight tabular-nums text-primary">{today_count}</p>
              <p className="text-xs text-muted">
                {today_count === 1 ? "lezione prevista oggi" : "lezioni previste oggi"}
              </p>
            </div>
          </div>

          {next ? (
            <div className="rounded-control border border-border bg-surface-muted/50 p-3">
              <p className="text-xs text-muted">Prossima da recuperare</p>
              <p className="mt-0.5 text-sm font-semibold text-primary">{next.subject}</p>
              <Link
                href="/lessons"
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-accent transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Apri le lezioni <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="rounded-control border border-success/25 bg-success/5 px-3 py-2.5 text-sm text-secondary">
              Nessuna lezione arretrata o prevista per oggi.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
