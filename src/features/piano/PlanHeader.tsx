"use client";

import { CheckCircle2, ChevronRight, CircleAlert, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import InfoButton from "@/components/ui/InfoButton";
import { TRACKS, type PlanStatus, type PlanValidationMode } from "@/lib/polimi/constraints";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import type { NextYearAction } from "@/lib/pianoPage";
import { cn } from "@/lib/ui";

/**
 * Testata compatta. Risponde nell'ordine alle prime due domande della pagina: qual è il piano
 * attivo e per quale anno accademico, e cosa risulta già chiuso in carriera.
 *
 * Lo stato del piano guarda solo i problemi di quest'anno: gli obblighi degli anni successivi
 * stanno nell'anteprima e non colorano di giallo un piano che va benissimo.
 */

export const STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Bozza",
  ready: "Pronto da compilare",
  polimi_compiled: "Compilato su PoliMi",
};

export const MODE_LABEL: Record<PlanValidationMode, string> = {
  annual_submission: "Compilazione annuale",
  second_semester_revision: "Modifica del 2° semestre",
};

const STATUS_TONE: Record<PlanValidationResult["summary"]["status"], { label: string; variant: "success" | "warning" | "danger"; icon: React.ReactNode }> = {
  valid: { label: "Nessun problema per quest'anno", variant: "success", icon: <CheckCircle2 className="size-4" /> },
  warning: { label: "Da controllare prima di compilare", variant: "warning", icon: <CircleAlert className="size-4" /> },
  invalid: { label: "Da sistemare prima di compilare", variant: "danger", icon: <CircleAlert className="size-4" /> },
};

type Props = {
  validation: PlanValidationResult;
  planStatus: PlanStatus;
  validationMode: PlanValidationMode;
  isActive: boolean;
  dataStatusReason: string | null;
  nextYearAction: NextYearAction | null;
  onNextYear: () => void;
  pending: boolean;
};

export default function PlanHeader({
  validation,
  planStatus,
  validationMode,
  isActive,
  dataStatusReason,
  nextYearAction,
  onNextYear,
  pending,
}: Props) {
  const { summary } = validation;
  const tone = STATUS_TONE[summary.status];

  return (
    <header className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-lg font-semibold text-primary">
          Piano di Studi <span className="font-mono">{summary.academicYear}</span>
        </h1>
        <span className="text-sm text-secondary">
          anno {summary.studentYear} · {TRACKS[summary.track].label}
        </span>
        <Badge variant={planStatus === "polimi_compiled" ? "success" : planStatus === "ready" ? "active" : "neutral"}>
          {STATUS_LABEL[planStatus]}
        </Badge>
        {isActive
          ? <Badge variant="active" dot>Piano attivo</Badge>
          : <Badge variant="neutral">In consultazione</Badge>}
        {validationMode === "second_semester_revision" && (
          <Badge variant="active">{MODE_LABEL[validationMode]}</Badge>
        )}
        <Badge variant={tone.variant} className="gap-1.5 font-semibold">
          {tone.icon}
          {tone.label}
        </Badge>
        {summary.dataStatus === "to_verify" && <Badge variant="warning">Dati da riconfermare</Badge>}
      </div>

      {nextYearAction && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <FileCheck2 className="size-4 text-accent" />
              {nextYearAction.kind === "open_existing"
                ? `Apri il piano ${nextYearAction.academicYear}`
                : `Crea il piano ${nextYearAction.academicYear}`}
            </p>
            <p className="mt-0.5 text-xs text-muted">{nextYearAction.reason}</p>
          </div>
          <Button variant="primary" onClick={onNextYear} disabled={pending} className="shrink-0">
            {nextYearAction.kind === "open_existing" ? "Apri" : "Passa all'anno successivo"}
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {dataStatusReason && (
        <p className="rounded-xl border border-warning/30 bg-warning/5 px-3 py-2 text-xs leading-relaxed text-warning">
          {dataStatusReason}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="Chiuso in carriera" value={summary.registeredCareerCfu} hint="CFU verbalizzati" tone="success" />
        <Metric label="Da reinserire" value={summary.reinsertedCfu} hint="Frequenze già acquisite" tone="warning" />
        <Metric label="Nuove frequenze" value={summary.newFrequencyCfu} hint="Scelte per quest'anno" tone="accent" />
        <Metric
          label="Per contribuzione"
          value={summary.contributionCfu}
          hint="Solo nuove frequenze"
          info={summary.contributionRule}
        />
      </div>
    </header>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  info,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "success" | "warning" | "accent";
  info?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 px-3 py-2">
      <div className="flex items-start justify-between gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        {info && <InfoButton title={label}><p>{info}</p></InfoButton>}
      </div>
      <p className={cn(
        "font-mono text-lg font-semibold",
        tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "accent" ? "text-accent" : "text-primary"
      )}>
        {value}
      </p>
      <p className="text-[10px] text-muted">{hint}</p>
    </div>
  );
}
