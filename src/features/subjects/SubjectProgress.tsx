// SubjectProgress — Server Component
//
// Griglia di avanzamento per materia: barra, conteggi e link al dettaglio.
// Riceve dati già calcolati da getDashboard(): nessuna query, nessuno stato.

import Link from "next/link";
import type { SubjectProgress as SubjectProgressData } from "@/lib/types";
import { ArrowRight, BookOpen } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

interface SubjectProgressProps {
  subjects: SubjectProgressData[];
}

export default function SubjectProgress({ subjects }: SubjectProgressProps) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="size-5" aria-hidden="true" />}
        title="Nessuna materia trovata"
        description="Le materie nascono dalle ricorrenze del calendario: aggiungine una per vedere qui il riepilogo."
        action={
          <Link href="/calendar" className={buttonClass({ variant: "primary", size: "sm", className: "w-full sm:w-auto" })}>
            Configura calendario
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map((s) => (
        <li key={s.subject}>
          <Link
            href={`/materie/${encodeURIComponent(s.subject)}`}
            aria-label={`Apri ${s.subject}`}
            className="group flex h-full flex-col rounded-card border border-border bg-surface-muted/50 p-4 transition hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <span className="min-w-0 text-sm font-semibold leading-snug text-primary">{s.subject}</span>
              <ArrowRight
                className="mt-0.5 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent"
                aria-hidden="true"
              />
            </div>

            <div className="mt-auto">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs text-muted">
                  <span className="font-semibold tabular-nums text-success">{s.done}</span> seguite ·{" "}
                  <span className="font-semibold tabular-nums text-danger">{s.pending}</span> arretrate
                </span>
                <span className="text-sm font-semibold tabular-nums text-primary">{s.progress_percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-background-soft">
                <div className="progress-fill h-full rounded-full" style={{ width: `${s.progress_percent}%` }} />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
