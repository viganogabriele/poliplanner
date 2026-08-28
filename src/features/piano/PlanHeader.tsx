"use client";

import { CheckCircle2, ChevronRight, CircleAlert, FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Callout from "@/components/ui/Callout";
import { TRACKS, type PlanStatus, type PlanValidationMode } from "@/lib/polimi/constraints";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import type { NextYearAction } from "@/lib/pianoPage";
import { cn } from "@/lib/ui";
import { PageHeader } from "@/components/ui/PageHeader";
import { bucketIssues } from "./PlanIssuesAside";

/**
 * Testata del piano. Risponde nell'ordine alle prime domande della pagina: qual è il piano
 * attivo e per quale anno accademico, com'è andata la verifica, quanti CFU muove.
 *
 * Tutto questo sta in **una** scheda di riepilogo: prima erano cinque riquadri colorati
 * impilati che dicevano quasi la stessa cosa. Restano fuori solo i messaggi che chiedono
 * un'azione o segnalano un'eccezione.
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

const STATUS_TONE: Record<PlanValidationResult["summary"]["status"], { label: string; variant: "success" | "warning" | "danger" }> = {
  valid: { label: "Nessun problema per quest'anno", variant: "success" },
  warning: { label: "Da controllare prima di compilare", variant: "warning" },
  invalid: { label: "Da sistemare prima di compilare", variant: "danger" },
};

const TONE_TEXT = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

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
  const { errors, warnings } = bucketIssues(validation);
  const headline = errors.length > 0
    ? `${errors.length} ${errors.length === 1 ? "problema da risolvere" : "problemi da risolvere"}`
    : warnings.length > 0
      ? `${warnings.length} ${warnings.length === 1 ? "avviso da controllare" : "avvisi da controllare"}`
      : tone.label;
  const StatusIcon = summary.status === "valid" ? CheckCircle2 : CircleAlert;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Piano di studi"
        eyebrow={`Anno accademico ${summary.academicYear}`}
        subtitle={`Anno ${summary.studentYear} · ${TRACKS[summary.track].label}`}
      />

      {!isSaved && (
        <Callout tone="warning" title="Proposta non salvata">
          È il piano che l&apos;app calcola per te. Non diventa un piano attivo finché non lo salvi.
        </Callout>
      )}

      {/* Riepilogo: stato, verifica e CFU in un'unica scheda. */}
      <Card elevated>
        {/* Le pillole servono solo quando aggiungono qualcosa: se il piano non è salvato
            lo dice già il riquadro qui sopra. */}
        {(isSaved || validationMode === "second_semester_revision" || summary.dataStatus === "to_verify") && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {isSaved && (
              <Badge variant={planStatus === "polimi_compiled" ? "success" : planStatus === "ready" ? "active" : "neutral"}>
                {STATUS_LABEL[planStatus]}
              </Badge>
            )}
            {isSaved && (isActive
              ? <Badge variant="active" dot>Piano attivo</Badge>
              : <Badge variant="neutral">In consultazione</Badge>)}
            {validationMode === "second_semester_revision" && (
              <Badge variant="active">{MODE_LABEL[validationMode]}</Badge>
            )}
            {summary.dataStatus === "to_verify" && <Badge variant="warning">Dati da riconfermare</Badge>}
          </div>
        )}

        <div className="flex items-start gap-2.5">
          <StatusIcon className={cn("mt-0.5 size-4 shrink-0", TONE_TEXT[tone.variant])} aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">{headline}</p>
            <p className="mt-0.5 text-xs text-muted">
              {errors.length > 0 || warnings.length > 0
                ? tone.label
                : "La verifica considera solo gli obblighi esigibili nel piano corrente."}
            </p>
          </div>
        </div>
      </Card>

      {nextYearAction && isSaved && (
        <Callout
          tone="info"
          icon={<FileCheck2 className="size-4" aria-hidden="true" />}
          title={nextYearAction.kind === "open_existing"
            ? `Apri il piano ${nextYearAction.academicYear}`
            : `Crea il piano ${nextYearAction.academicYear}`}
          actions={
            <Button variant="primary" onClick={onNextYear} disabled={pending}>
              {nextYearAction.kind === "open_existing" ? "Apri" : "Passa all'anno successivo"}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          }
        >
          {nextYearAction.reason}
        </Callout>
      )}

      {dataStatusReason && (
        <Callout tone="warning">{dataStatusReason}</Callout>
      )}
    </div>
  );
}
