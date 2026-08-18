"use client";

import { useMemo, useState } from "react";
import { ArrowRight, FlaskConical, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { courseName, getCatalog } from "@/lib/polimi/catalog";
import {
  BASELINE_SCENARIO,
  compareSimulations,
  simulate,
  suggestSimulations,
  type SimulationScenario,
} from "@/lib/polimi/simulator";
import type { PlanScenario } from "@/lib/polimi/planModel";
import type { PlanValidationContext } from "@/lib/polimi/validation";
import { ProvenanceChip } from "./ProvenanceChip";
import { cn } from "@/lib/ui";

type Props = {
  scenario: PlanScenario;
  context: PlanValidationContext;
  /** Applica lo scenario alla carriera reale. Assente = la conferma non è disponibile. */
  onConfirm?: (simulation: SimulationScenario) => void;
};

export default function SimulatorPanel({ scenario, context, onConfirm }: Props) {
  const catalog = useMemo(() => getCatalog(scenario.cycle.academicYear), [scenario.cycle.academicYear]);
  const suggestions = useMemo(() => suggestSimulations(scenario, context), [scenario, context]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const baseline = useMemo(() => simulate(scenario, context, BASELINE_SCENARIO), [scenario, context]);
  const selected = suggestions.filter((suggestion) => selectedIds.includes(suggestion.id));
  const outcomes = useMemo(
    () => selected.map((simulation) => simulate(scenario, context, simulation)),
    [selected, scenario, context]
  );

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id].slice(-3)));
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="size-4 text-accent" />
              Simulatore di scenari
            </CardTitle>
            <CardDescription>
              Prova le ipotesi senza toccare nulla: la carriera reale e il piano salvato non cambiano
              finché non premi <strong>Applica alla carriera</strong>. Puoi confrontare fino a tre scenari.
            </CardDescription>
          </div>
          <Badge variant="neutral">{selectedIds.length}/3 selezionati</Badge>
        </CardHeader>

        {suggestions.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">
            Non ci sono esami aperti da simulare: nessuna frequenza precedente risulta senza verbalizzazione.
          </p>
        )}

        <div className="grid gap-2 md:grid-cols-2">
          {suggestions.map((suggestion) => {
            const active = selectedIds.includes(suggestion.id);
            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => toggle(suggestion.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border px-4 py-3 text-left transition",
                  active ? "border-accent bg-accent/10" : "border-border bg-surface/40 hover:border-border-strong"
                )}
              >
                <p className={cn("text-sm font-medium", active ? "text-accent" : "text-primary")}>{suggestion.label}</p>
                <p className="mt-1 text-xs text-muted">{suggestion.description}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {outcomes.map((outcome) => {
        const diffs = compareSimulations(baseline, outcome);
        const addedReinsertions = outcome.reinsertions
          .map((item) => item.courseCode)
          .filter((code) => !baseline.reinsertions.some((item) => item.courseCode === code));
        const removedReinsertions = baseline.reinsertions
          .map((item) => item.courseCode)
          .filter((code) => !outcome.reinsertions.some((item) => item.courseCode === code));
        const addedFrequencies = outcome.newFrequencyCodes.filter((code) => !baseline.newFrequencyCodes.includes(code));
        const removedFrequencies = baseline.newFrequencyCodes.filter((code) => !outcome.newFrequencyCodes.includes(code));

        return (
          <Card key={outcome.scenario.id}>
            <CardHeader>
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  {outcome.scenario.label}
                  <ProvenanceChip provenance="user_simulation" />
                </CardTitle>
                <CardDescription>
                  {outcome.scenario.additions?.length
                    ? "Ipotesi di modifica del piano: mostra l'effetto di aggiungere l'insegnamento, in questa presentazione o nella finestra del secondo semestre."
                    : outcome.rebuildsPlan
                      ? "Il piano annuale viene riproposto da zero: l'ipotesi precede la presentazione."
                      : "Il piano presentato resta com'è: cambia solo cosa risulta dovuto."}
                </CardDescription>
              </div>
              <Badge variant={outcome.summary.status === "valid" ? "success" : outcome.summary.status === "warning" ? "warning" : "danger"}>
                {outcome.summary.status === "valid" ? "Valido" : outcome.summary.status === "warning" ? "Attenzione" : "Non valido"}
              </Badge>
            </CardHeader>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {diffs.map((diff) => (
                <div key={diff.label} className="rounded-xl border border-border bg-surface/40 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{diff.label}</p>
                  <p className="flex items-center gap-1.5 font-mono text-sm text-primary">
                    <span className="text-muted">{diff.baselineValue}</span>
                    <ArrowRight className="size-3 text-muted" />
                    <span>{diff.scenarioValue}</span>
                  </p>
                  <Delta delta={diff.delta} />
                </div>
              ))}
            </div>

            <div className="mt-3 space-y-1 text-xs">
              <CodeList label="Non serve più reinserire" codes={removedReinsertions} catalog={catalog} tone="text-success" />
              <CodeList label="Diventa un reinserimento" codes={addedReinsertions} catalog={catalog} tone="text-warning" />
              <CodeList label="Nuove frequenze che si liberano" codes={removedFrequencies} catalog={catalog} tone="text-muted" />
              <CodeList label="Nuove frequenze che si aggiungono" codes={addedFrequencies} catalog={catalog} tone="text-accent" />
            </div>

            {outcome.issues.filter((issue) => issue.type === "error").length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-danger">Vincoli non soddisfatti in questo scenario</p>
                {outcome.issues.filter((issue) => issue.type === "error").map((issue) => (
                  <p key={issue.id} className="text-xs text-secondary"><strong className="text-primary">{issue.category}:</strong> {issue.message}</p>
                ))}
              </div>
            )}

            {onConfirm && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <Button variant="secondary" size="sm" onClick={() => onConfirm(outcome.scenario)}>
                  {outcome.scenario.assumptions.length > 0 ? "Applica a carriera e piano" : "Applica al piano"}
                </Button>
                <span className="text-xs text-muted">
                  {outcome.scenario.assumptions.length > 0
                    ? "Scrive gli esiti ipotizzati nella carriera reale e aggiorna il piano. Finché non lo fai, questo è solo uno scenario."
                    : "Aggiunge l'insegnamento alla bozza del piano. Ricordati di salvare la bozza."}
                </span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Delta({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    return <span className="flex items-center gap-1 text-[10px] text-muted"><Minus className="size-3" />nessuna variazione</span>;
  }
  const positive = delta > 0;
  return (
    <span className={cn("flex items-center gap-1 text-[10px]", positive ? "text-warning" : "text-success")}>
      {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {positive ? "+" : ""}{delta}
    </span>
  );
}

function CodeList({ label, codes, catalog, tone }: { label: string; codes: string[]; catalog: ReturnType<typeof getCatalog>; tone: string }) {
  if (codes.length === 0) return null;
  return (
    <p className={cn("leading-snug", tone)}>
      <strong>{label}:</strong> {codes.map((code) => courseName(catalog, code)).join(", ")}
    </p>
  );
}
