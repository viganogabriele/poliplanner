// SubjectProgress — Server Component
//
// Renders the per-subject progress grid.
// For each subject: a progress bar, done/pending/total counts.
//
// This component receives pre-computed data from getDashboard()
// and just renders it — no DB access, no interactivity.

import Link from "next/link";
import type { SubjectProgress as SubjectProgressData } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { ArrowRight } from "lucide-react";

interface SubjectProgressProps {
  subjects: SubjectProgressData[];
}

export default function SubjectProgress({ subjects }: SubjectProgressProps) {
  if (subjects.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/60 p-6 text-center">
        <h3 className="text-base font-semibold text-primary">
          Nessuna materia trovata
        </h3>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Aggiungi un calendario nella sezione Calendario per generare il riepilogo.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => (
        <Link
          key={s.subject}
          href={`/materie/${encodeURIComponent(s.subject)}`}
          aria-label={`Apri ${s.subject}`}
          className="group block rounded-card border border-border bg-surface-muted/70 p-4 shadow-inset transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 text-sm font-semibold leading-snug text-primary">
              {s.subject}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="neutral">{s.total} tot.</Badge>
              <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-3 h-2.5 overflow-hidden rounded-full bg-background-soft">
            <div
              className="h-full rounded-full progress-fill transition-all"
              style={{ width: `${s.progress_percent}%` }}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted">
            <span>
              <span className="font-semibold tabular-nums text-success">{s.done}</span>{" "}
              seguite
            </span>
            <span>
              <span className="font-semibold tabular-nums text-danger">{s.pending}</span>{" "}
              arretrate
            </span>
            <span className="ml-auto font-semibold tabular-nums text-accent">
              {s.progress_percent}%
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
            Apri materia <ArrowRight className="size-3.5" aria-hidden="true" />
          </span>
        </Link>
      ))}
    </div>
  );
}
