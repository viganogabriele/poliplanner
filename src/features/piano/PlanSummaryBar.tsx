"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import InfoButton from "@/components/ui/InfoButton";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/ui";
import { ProvenanceChip } from "./ValidationPanel";
import type { PlanValidationResult } from "@/lib/polimi/validation";

const STATUS: Record<PlanValidationResult["summary"]["status"], { label: string; variant: "success" | "warning" | "danger"; icon: React.ReactNode }> = {
  valid: { label: "Piano valido", variant: "success", icon: <CheckCircle2 className="size-4" /> },
  warning: { label: "Attenzione", variant: "warning", icon: <AlertTriangle className="size-4" /> },
  invalid: { label: "Piano non valido", variant: "danger", icon: <XCircle className="size-4" /> },
};

type Props = {
  validation: PlanValidationResult;
  /** Mostrato solo se il conteggio per contribuzione è applicabile all'anno. */
  showContribution?: boolean;
};

export default function PlanSummaryBar({ validation, showContribution = true }: Props) {
  const { summary } = validation;
  const status = STATUS[summary.status];
  const blocking = validation.issues.filter((item) => item.type === "error");
  const warnings = validation.issues.filter((item) => item.type === "warning");
  const problems = [...blocking, ...warnings];

  return (
    <div className="sticky top-0 z-20 -mx-4 mb-1 space-y-3 border-b border-border bg-background-soft/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant} className="gap-1.5 font-semibold">
            {status.icon}
            {status.label}
          </Badge>
          <span className="text-xs text-muted">
            AA {summary.academicYear} · anno {summary.studentYear} · percorso {summary.track}
          </span>
          {summary.dataStatus === "to_verify" && (
            <Badge variant="warning">Dati da verificare</Badge>
          )}
        </div>
        <InfoButton title="Come si leggono questi numeri">
          <p><strong>CFU verbalizzati</strong>: quello che risulta davvero in carriera.</p>
          <p><strong>Da reinserire</strong>: esami già frequentati e non verbalizzati, che il piano deve riportare.</p>
          <p><strong>Nuove frequenze</strong>: i corsi che segui per la prima volta quest&apos;anno.</p>
          <p><strong>Per contribuzione</strong>: {summary.contributionRule}</p>
        </InfoButton>
      </div>

      <div className={cn("grid gap-2", showContribution ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-3")}>
        <Metric label="CFU verbalizzati" value={summary.registeredCareerCfu} hint="Carriera reale" />
        <Metric label="CFU da reinserire" value={summary.reinsertedCfu} hint="Già frequentati" />
        <Metric label="CFU nuove frequenze" value={summary.newFrequencyCfu} hint="Scelte per quest'anno" accent />
        {showContribution && (
          <Metric label="CFU per contribuzione" value={summary.contributionCfu} hint="Solo nuove frequenze" />
        )}
      </div>

      {problems.length > 0 && (
        <ul className="space-y-1">
          {problems.slice(0, 4).map((item) => (
            <li key={item.id} className="flex flex-wrap items-start gap-2 text-xs leading-snug">
              {item.type === "error"
                ? <XCircle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />}
              <ProvenanceChip provenance={item.provenance} />
              <span className="text-secondary"><strong className="text-primary">{item.category}:</strong> {item.message}</span>
            </li>
          ))}
          {problems.length > 4 && (
            <li className="text-xs text-muted">…e altri {problems.length - 4}. Apri il pannello di verifica per l&apos;elenco completo.</li>
          )}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value, hint, accent }: { label: string; value: number; hint: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("font-mono text-lg font-semibold", accent ? "text-accent" : "text-primary")}>{value}</p>
      <p className="text-[10px] text-muted">{hint}</p>
    </div>
  );
}
