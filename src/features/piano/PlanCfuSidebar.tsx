import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import InfoButton from "@/components/ui/InfoButton";
import type { Catalog } from "@/lib/polimi/catalog";
import type { PlanValidationSummary } from "@/lib/polimi/validation";
import { cn } from "@/lib/ui";

/**
 * Pannello CFU laterale, mirror della sidebar dello strumento ufficiale ("CFU aggiunti",
 * "CFU effettivi", "CFU soprannumero"): stessi numeri già calcolati da `validatePlanScenario`,
 * nessun dato nuovo. Sostituisce la griglia di metriche che stava in `PlanHeader`.
 */

type Props = {
  catalog: Catalog;
  summary: PlanValidationSummary;
};

export default function PlanCfuSidebar({ catalog, summary }: Props) {
  const [minCfu, maxCfu] = catalog.annual.cfuRange;
  const totalCfu = catalog.degree.totalCfu;
  const supernumeraryMax = catalog.annual.supernumeraryMaxCfu;
  const plannedEffective = Math.max(summary.projectedCfu - summary.registeredCareerCfu, 0);
  const isAutoApproved = summary.approvalStatus === "auto_approved_after_deadline";

  return (
    <Card elevated className="space-y-4">
      <div
        className={cn(
          "flex items-start gap-2 rounded-control border px-3 py-2.5 transition-colors duration-300",
          isAutoApproved ? "border-success/25 bg-success/5" : "border-warning/30 bg-warning/5"
        )}
      >
        {isAutoApproved
          ? <CheckCircle2 className="animate-pop mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />}
        <p className="text-xs leading-relaxed text-secondary">
          {isAutoApproved
            ? "Tutte le scelte appartengono alle tabelle ufficiali: approvazione automatica alla scadenza."
            : "Il piano contiene attività fuori dalle tabelle preapprovate: serve la valutazione della commissione."}
        </p>
      </div>

      <div>
        <p className="flex items-center gap-1 section-label">
          CFU aggiunti
          <InfoButton size="sm" title="Come contano i CFU aggiunti">
            <p>{summary.contributionRule}</p>
          </InfoButton>
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-primary">
          {summary.newFrequencyCfu}
          <span className="text-sm font-medium tracking-normal text-muted"> /{minCfu}min–{maxCfu}max</span>
        </p>
        {summary.reinsertedCfu > 0 && (
          <p className="mt-1 text-xs text-muted">
            + <span className="tabular-nums">{summary.reinsertedCfu}</span> CFU reinseriti, già frequentati: non contano per la contribuzione.
          </p>
        )}
      </div>

      <CfuBar
        label="CFU effettivi"
        total={totalCfu}
        solid={summary.registeredCareerCfu}
        hatched={plannedEffective}
        solidLabel="Sostenuti"
        hatchedLabel="Pianificati"
      />

      <CfuBar
        label="CFU soprannumero"
        total={supernumeraryMax}
        solid={0}
        hatched={summary.supernumeraryCfu}
        solidLabel="Sostenuti"
        hatchedLabel="Pianificati"
      />

      <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted">CFU totali</span>
        <span className="font-semibold tabular-nums text-primary">{summary.totalPlanCfu}</span>
      </div>
    </Card>
  );
}

function CfuBar({
  label,
  total,
  solid,
  hatched,
  solidLabel,
  hatchedLabel,
}: {
  label: string;
  total: number;
  solid: number;
  hatched: number;
  solidLabel: string;
  hatchedLabel: string;
}) {
  const safeTotal = Math.max(total, solid + hatched, 1);
  const solidPct = Math.min((solid / safeTotal) * 100, 100);
  const hatchedPct = Math.min((hatched / safeTotal) * 100, 100 - solidPct);

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="section-label">{label}</span>
        <span className="tabular-nums">tot: {solid + hatched} / {total}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="flex h-full">
          <div className="progress-fill h-full transition-[width] duration-500 ease-[var(--ease-spring)]" style={{ width: `${solidPct}%` }} />
          <div className="h-full bg-accent/35 transition-[width] duration-500 ease-[var(--ease-spring)]" style={{ width: `${hatchedPct}%` }} />
        </div>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          {solid} {solidLabel}
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-accent/35" aria-hidden="true" />
          {hatched} {hatchedLabel}
        </span>
      </p>
    </div>
  );
}
