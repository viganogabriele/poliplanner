"use client";

import { CheckCircle2, ChevronRight, CircleAlert, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import InfoButton from "@/components/ui/InfoButton";
import { TRACKS, type PlanStatus, type PlanValidationMode } from "@/lib/polimi/constraints";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import type { NextYearAction } from "@/lib/pianoPage";
import { cn } from "@/lib/ui";
import { PageHeader } from "@/components/ui/PageHeader";

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
  isSaved: boolean;
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
  isSaved,
  dataStatusReason,
  nextYearAction,
  onNextYear,
  pending,
}: Props) {
  const { summary } = validation;
  const tone = STATUS_TONE[summary.status];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Piano di studi"
        eyebrow={`Anno accademico ${summary.academicYear}`}
        subtitle={`Anno ${summary.studentYear} · ${TRACKS[summary.track].label}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={!isSaved ? "warning" : planStatus === "polimi_compiled" ? "success" : planStatus === "ready" ? "active" : "neutral"}>
          {!isSaved ? "Proposta non salvata" : STATUS_LABEL[planStatus]}
        </Badge>
        {isSaved && (isActive
          ? <Badge variant="active" dot>Piano attivo</Badge>
          : <Badge variant="neutral">In consultazione</Badge>)}
        {validationMode === "second_semester_revision" && (
          <Badge variant="active">{MODE_LABEL[validationMode]}</Badge>
        )}
        {summary.dataStatus === "to_verify" && <Badge variant="warning">Dati da riconfermare</Badge>}
      </div>

      {!isSaved && (
        <p className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm leading-relaxed text-secondary">
          Questa è una proposta calcolata dall&apos;app. Non diventa un piano attivo finché non la salvi.
        </p>
      )}

      <div className={cn(
        "hidden items-start gap-3 rounded-xl border px-4 py-3 sm:flex",
        tone.variant === "success" ? "border-success/30 bg-success/5" : tone.variant === "warning" ? "border-warning/30 bg-warning/5" : "border-danger/30 bg-danger/5"
      )}>
        <span className={tone.variant === "success" ? "text-success" : tone.variant === "warning" ? "text-warning" : "text-danger"}>{tone.icon}</span>
        <div>
          <p className="text-sm font-semibold text-primary">{tone.label}</p>
          <p className="mt-0.5 text-xs text-muted">La verifica considera solo gli obblighi esigibili nel piano corrente.</p>
        </div>
      </div>

      {nextYearAction && isSaved && (
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

      <div className="grid gap-2 sm:grid-cols-[1.2fr_2fr]">
        <div className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="text-xs font-semibold text-secondary">Totale del piano</p>
          <p className="mt-1 whitespace-nowrap font-mono text-3xl font-semibold text-accent">{summary.effectiveCfu} CFU</p>
          <p className="mt-1 text-xs text-muted">Attività effettive di quest&apos;anno</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Verbalizzati" value={summary.registeredCareerCfu} hint="in carriera" tone="success" />
          <Metric label="Reinseriti" value={summary.reinsertedCfu} hint="già frequentati" tone="warning" />
          <Metric label="Nuovi" value={summary.contributionCfu} hint="per contribuzione" tone="accent" info={summary.contributionRule} />
        </div>
      </div>
    </div>
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
        <p className="text-xs font-semibold text-secondary">{label}</p>
        {info && <InfoButton title={label}><p>{info}</p></InfoButton>}
      </div>
      <p className={cn(
        "whitespace-nowrap font-mono text-xl font-semibold",
        tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "accent" ? "text-accent" : "text-primary"
      )}>
        {value}
      </p>
      <p className="text-[11px] text-muted">{hint}</p>
    </div>
  );
}
