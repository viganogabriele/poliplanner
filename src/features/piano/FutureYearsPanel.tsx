"use client";

import { groupLabel, type Catalog } from "@/lib/polimi/catalog";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import { ProvenanceChip } from "./ProvenanceChip";

/**
 * "Anteprima anni successivi": le regole che diventeranno esigibili più avanti.
 *
 * Sta qui, chiusa di default, esattamente perché non deve sembrare un problema del piano corrente.
 * Il validatore marca queste voci con `scope: "future_years"` e severità "consiglio": la
 * distinzione è nel dominio, non nel colore scelto dalla UI.
 */

type Props = {
  catalog: Catalog;
  validation: PlanValidationResult;
};

export default function FutureYearsPanel({ catalog, validation }: Props) {
  const future = validation.issues.filter((issue) => issue.scope === "future_years");
  const upcomingChoices = validation.structuralChoices.filter((choice) => choice.state === "not_due_yet");

  if (future.length === 0 && upcomingChoices.length === 0) {
    return (
      <p className="text-xs text-muted">
        Non ci sono vincoli di anni successivi da mostrare per il percorso {validation.summary.track}.
      </p>
    );
  }

  const byYear = new Map<number, typeof future>();
  for (const issue of future) {
    const year = issue.dueByYear ?? 0;
    byYear.set(year, [...(byYear.get(year) ?? []), issue]);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted">
        Queste regole non riguardano il piano {validation.summary.academicYear}: le trovi qui per poter
        pianificare in anticipo. Diventeranno vincoli quando arriverai all&apos;anno indicato.
      </p>

      {upcomingChoices.length > 0 && (
        <div className="rounded-control border border-border bg-surface-muted/40 p-3">
          <p className="text-xs font-semibold text-secondary">Scelte che conviene fare prima</p>
          <ul className="mt-2 space-y-2">
            {upcomingChoices.map((choice) => (
              <li key={choice.courseCode} className="text-xs leading-relaxed text-secondary">
                <span className="font-medium text-primary">{choice.name}</span> ({choice.cfu} CFU) è obbligatorio per il
                percorso {validation.summary.track}. Se lo scegli entro l&apos;anno {choice.dueByYear - 1} resta nel suo
                blocco; se arrivi all&apos;anno {choice.dueByYear} senza averlo scelto, dovrai prenderlo in{" "}
                {groupLabel(catalog, choice.recoveryGroup) ?? "tabella di recupero"} e occuperà parte dei CFU del gruppo
                a scelta.
              </li>
            ))}
          </ul>
        </div>
      )}

      {[...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, issues]) => (
        <div key={year}>
          <p className="text-xs font-semibold text-secondary">
            {year > 0 ? `Dall'anno ${year}` : "Senza anno specifico"}
          </p>
          <ul className="mt-2 space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="rounded-control border border-border bg-surface-muted/40 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-semibold text-primary">{issue.category}</p>
                  <ProvenanceChip provenance={issue.provenance} />
                </div>
                {issue.message && <p className="mt-1 leading-relaxed text-secondary">{issue.message}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
