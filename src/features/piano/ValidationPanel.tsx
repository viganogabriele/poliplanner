"use client";

import { AlertTriangle, CheckCircle, FlaskConical, Info, Lightbulb, ScrollText, SearchCheck, XCircle } from "lucide-react";
import { PROVENANCE_LABELS, type RuleProvenance } from "@/lib/polimi/catalog/types";
import type { IssueSeverity, ValidationIssue } from "@/lib/polimi/validation";

const PROVENANCE_STYLE: Record<RuleProvenance, { icon: React.ReactNode; short: string; className: string }> = {
  manifesto: { icon: <ScrollText className="size-3" />, short: "Manifesto", className: "border-border bg-surface-muted text-secondary" },
  operational_to_verify: { icon: <SearchCheck className="size-3" />, short: "Da verificare", className: "border-warning/30 bg-warning/10 text-warning" },
  user_simulation: { icon: <FlaskConical className="size-3" />, short: "Simulazione", className: "border-accent/30 bg-accent/10 text-accent" },
};

const ICONS: Record<IssueSeverity, React.ReactNode> = {
  error: <XCircle className="size-4 shrink-0 text-danger" />,
  warning: <AlertTriangle className="size-4 shrink-0 text-warning" />,
  advice: <Lightbulb className="size-4 shrink-0 text-accent" />,
  info: <Info className="size-4 shrink-0 text-muted" />,
};

const BORDERS: Record<IssueSeverity, string> = {
  error: "border-danger/30 bg-danger/5",
  warning: "border-warning/30 bg-warning/5",
  advice: "border-accent/25 bg-accent/5",
  info: "border-border bg-surface/40",
};

const GROUPS: { severity: IssueSeverity; title: (n: number) => string; tone: string }[] = [
  { severity: "error", title: (n) => `${n} problema${n === 1 ? "" : "i"} da risolvere`, tone: "text-danger" },
  { severity: "warning", title: (n) => `${n} avviso${n === 1 ? "" : "i"} da controllare`, tone: "text-warning" },
  { severity: "advice", title: (n) => `${n} consiglio${n === 1 ? "" : ""}`, tone: "text-accent" },
  { severity: "info", title: () => "Informazioni", tone: "text-muted" },
];

export default function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  const blocking = issues.filter((item) => item.type === "error");
  const warnings = issues.filter((item) => item.type === "warning");

  return (
    <div className="space-y-3">
      {blocking.length === 0 && warnings.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success/5 py-6 text-center text-sm">
          <CheckCircle className="size-7 text-success" />
          <span className="font-semibold text-success">Nessun problema rilevato</span>
          <span className="px-4 text-xs text-muted">
            Il piano rispetta i vincoli che questo assistente conosce. Verificalo comunque sui Servizi Online.
          </span>
        </div>
      )}

      {GROUPS.map((group) => {
        const rows = issues.filter((item) => item.type === group.severity);
        if (rows.length === 0) return null;
        return (
          <section key={group.severity} className="space-y-2">
            <p className={`text-xs font-semibold uppercase tracking-wide ${group.tone}`}>
              {group.title(rows.length)}
            </p>
            {rows.map((item) => (
              <div key={item.id} className={`rounded-xl border p-3 text-xs leading-snug ${BORDERS[item.type]}`}>
                <div className="flex gap-2">
                  {ICONS[item.type]}
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold text-primary">{item.category}</p>
                      <ProvenanceChip provenance={item.provenance} />
                    </div>
                    <p className="text-secondary">{item.message}</p>
                    {item.source && <p className="text-[10px] text-muted">Regola applicata: {item.source}</p>}
                  </div>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      <div className="rounded-xl border border-border bg-surface/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Provenienza dei vincoli</p>
        <ul className="space-y-1.5">
          {(Object.keys(PROVENANCE_STYLE) as RuleProvenance[]).map((provenance) => (
            <li key={provenance} className="flex items-start gap-2">
              <ProvenanceChip provenance={provenance} />
              <span className="text-[10px] leading-snug text-muted">{PROVENANCE_LABELS[provenance]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ProvenanceChip({ provenance }: { provenance: RuleProvenance }) {
  const style = PROVENANCE_STYLE[provenance];
  return (
    <span
      title={PROVENANCE_LABELS[provenance]}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${style.className}`}
    >
      {style.icon}
      {style.short}
    </span>
  );
}
