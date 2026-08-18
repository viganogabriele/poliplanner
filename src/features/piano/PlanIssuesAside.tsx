"use client";

import { CheckCircle } from "lucide-react";
import type { PlanValidationResult, ValidationIssue } from "@/lib/polimi/validation";
import { ProvenanceChip, SEVERITY_BORDERS, SEVERITY_ICONS } from "./ProvenanceChip";

/**
 * Pannello laterale. Mostra soltanto tre cose, in quest'ordine:
 *
 * 1. gli errori bloccanti del piano corrente;
 * 2. gli avvisi su cui si può agire adesso;
 * 3. al massimo tre consigli prioritari.
 *
 * Tutto il resto — obblighi degli anni successivi, proiezioni verso i 180 CFU, note sui dati del
 * Regolamento, spiegazioni di contesto — vive nella sezione "Tutte le regole" e nell'anteprima
 * degli anni successivi. Il criterio è `scope`, calcolato dal validatore: qui non si indovina.
 */

const MAX_ADVICE = 3;

export type PlanIssueBuckets = {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  advice: ValidationIssue[];
  /** Quante segnalazioni restano fuori, da consultare nel dettaglio completo. */
  hiddenCount: number;
};

/** Divide le segnalazioni secondo lo scopo dichiarato dal validatore. */
export function bucketIssues(validation: PlanValidationResult): PlanIssueBuckets {
  const current = validation.issues.filter((issue) => issue.scope === "current_plan");
  const errors = current.filter((issue) => issue.type === "error");
  const warnings = current.filter((issue) => issue.type === "warning");
  const allAdvice = current.filter((issue) => issue.type === "advice");
  const advice = allAdvice.slice(0, MAX_ADVICE);
  const hiddenCount = validation.issues.length - errors.length - warnings.length - advice.length;
  return { errors, warnings, advice, hiddenCount };
}

type Props = {
  validation: PlanValidationResult;
  onOpenDetails: () => void;
};

export default function PlanIssuesAside({ validation, onOpenDetails }: Props) {
  const { errors, warnings, advice, hiddenCount } = bucketIssues(validation);
  const clean = errors.length === 0 && warnings.length === 0;

  return (
    <div className="space-y-3">
      {clean && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/5 py-6 text-center text-sm">
          <CheckCircle className="size-7 text-success" />
          <span className="font-semibold text-success">Piano in regola per quest&apos;anno</span>
          <span className="px-4 text-xs text-muted">
            Nessun problema sul piano {validation.summary.academicYear}. Verificalo comunque sui Servizi Online.
          </span>
        </div>
      )}

      <IssueGroup
        title={errors.length === 1 ? "1 problema da risolvere" : `${errors.length} problemi da risolvere`}
        tone="text-danger"
        issues={errors}
      />
      <IssueGroup
        title={warnings.length === 1 ? "1 avviso da controllare" : `${warnings.length} avvisi da controllare`}
        tone="text-warning"
        issues={warnings}
      />
      <IssueGroup
        title={advice.length === 1 ? "1 consiglio" : `${advice.length} consigli prioritari`}
        tone="text-accent"
        issues={advice}
      />

      <button
        type="button"
        onClick={onOpenDetails}
        className="w-full rounded-xl border border-border bg-surface/40 px-3 py-2 text-left text-xs text-secondary transition hover:border-border-strong hover:text-primary"
      >
        Vedi tutti i dettagli della verifica
        {hiddenCount > 0 && <span className="text-muted"> · altre {hiddenCount} voci</span>}
      </button>
    </div>
  );
}

function IssueGroup({ title, tone, issues }: { title: string; tone: string; issues: ValidationIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <section className="space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>{title}</p>
      {issues.map((issue) => (
        <div key={issue.id} className={`rounded-xl border p-3 text-xs leading-snug ${SEVERITY_BORDERS[issue.type]}`}>
          <div className="flex gap-2">
            {SEVERITY_ICONS[issue.type]}
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="font-semibold text-primary">{issue.category}</p>
                <ProvenanceChip provenance={issue.provenance} />
              </div>
              <p className="text-secondary">{issue.message}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
