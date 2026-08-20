"use client";

import { AlertTriangle, FlaskConical, Info, Lightbulb, ScrollText, SearchCheck, XCircle } from "lucide-react";
import { PROVENANCE_LABELS, type RuleProvenance } from "@/lib/polimi/catalog/types";
import type { IssueSeverity } from "@/lib/polimi/validation";

/**
 * Componenti minimi condivisi dai pannelli del piano. Vivono in un modulo a parte perché il
 * riepilogo iniziale ne ha bisogno, mentre i pannelli avanzati che li usavano prima sono
 * caricati in modo differito: importarli da lì li avrebbe trascinati nel primo bundle.
 */

const PROVENANCE_STYLE: Record<RuleProvenance, { icon: React.ReactNode; short: string; className: string }> = {
  manifesto: { icon: <ScrollText className="size-3" />, short: "Regolamento", className: "border-border bg-surface-muted text-secondary" },
  operational_to_verify: { icon: <SearchCheck className="size-3" />, short: "Da verificare", className: "border-warning/30 bg-warning/10 text-warning" },
  user_simulation: { icon: <FlaskConical className="size-3" />, short: "Simulazione", className: "border-accent/30 bg-accent/10 text-accent" },
};

export const SEVERITY_ICONS: Record<IssueSeverity, React.ReactNode> = {
  error: <XCircle className="size-4 shrink-0 text-danger" />,
  warning: <AlertTriangle className="size-4 shrink-0 text-warning" />,
  advice: <Lightbulb className="size-4 shrink-0 text-accent" />,
  info: <Info className="size-4 shrink-0 text-muted" />,
};

export const SEVERITY_BORDERS: Record<IssueSeverity, string> = {
  error: "border-danger/30 bg-danger/5",
  warning: "border-warning/30 bg-warning/5",
  advice: "border-accent/25 bg-accent/5",
  info: "border-border bg-surface-muted/40",
};

export function ProvenanceChip({ provenance }: { provenance: RuleProvenance }) {
  const style = PROVENANCE_STYLE[provenance];
  return (
    <span
      title={PROVENANCE_LABELS[provenance]}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${style.className}`}
    >
      {style.icon}
      {style.short}
    </span>
  );
}

export function ProvenanceLegend() {
  return (
    <div className="rounded-control border border-border bg-surface-muted/40 p-3">
      <p className="mb-2 text-[11px] font-semibold text-muted">Provenienza dei vincoli</p>
      <ul className="space-y-1.5">
        {(Object.keys(PROVENANCE_STYLE) as RuleProvenance[]).map((provenance) => (
          <li key={provenance} className="flex items-start gap-2">
            <ProvenanceChip provenance={provenance} />
            <span className="text-[11px] leading-snug text-muted">{PROVENANCE_LABELS[provenance]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
