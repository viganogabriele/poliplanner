"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CATALOG_SOURCE_KIND_LABELS, type Catalog } from "@/lib/polimi/catalog";
import type { IssueScope, PlanValidationResult, ValidationIssue } from "@/lib/polimi/validation";
import { ProvenanceChip, ProvenanceLegend, SEVERITY_BORDERS, SEVERITY_ICONS } from "./ProvenanceChip";

/**
 * "Tutti i dettagli della verifica": l'elenco completo, diviso per scopo.
 *
 * Sostituisce il vecchio pulsante "Verifica regole": la validazione è già live a ogni modifica,
 * quindi non c'è niente da lanciare. Questo pannello si apre solo su richiesta ed è caricato in
 * modo differito, perché nel percorso base non serve.
 */

const SCOPE_ORDER: IssueScope[] = ["current_plan", "future_years", "degree_projection", "data_quality", "context"];

const SCOPE_TITLES: Record<IssueScope, { title: string; hint: string }> = {
  current_plan: {
    title: "Piano di quest'anno",
    hint: "Vincoli esigibili adesso: sono gli unici che determinano se il piano è compilabile.",
  },
  future_years: {
    title: "Anni successivi",
    hint: "Obblighi che diventeranno esigibili più avanti. Sono informazioni, non problemi del piano corrente.",
  },
  degree_projection: {
    title: "Proiezione verso la laurea",
    hint: "Carriera verbalizzata più piano corrente, confrontati con i 180 CFU. Mai bloccanti: il piano copre un anno.",
  },
  data_quality: {
    title: "Affidabilità dei dati",
    hint: "Quanto ci si può fidare del catalogo di quest'anno accademico, e cosa va riconfrontato sui Servizi Online.",
  },
  context: {
    title: "Contesto e avvertenze",
    hint: "Struttura del percorso, regime di approvazione e limiti di questo assistente.",
  },
};

type Props = {
  catalog: Catalog;
  validation: PlanValidationResult;
  onClose: () => void;
};

export default function AllRulesPanel({ catalog, validation, onClose }: Props) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-primary">Tutti i dettagli della verifica</h2>
          <p className="mt-0.5 text-xs text-muted">
            {validation.issues.length} voci · la validazione è continua: si aggiorna a ogni modifica del piano,
            non serve lanciarla.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="size-4" />
          Chiudi
        </Button>
      </div>

      <div className="space-y-5">
        {SCOPE_ORDER.map((scope) => {
          const issues = validation.issues.filter((issue) => issue.scope === scope);
          if (issues.length === 0) return null;
          return (
            <div key={scope}>
              <h3 className="text-sm font-semibold text-primary">{SCOPE_TITLES[scope].title}</h3>
              <p className="mb-2 mt-0.5 text-xs leading-relaxed text-muted">{SCOPE_TITLES[scope].hint}</p>
              <div className="space-y-2">
                {issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)}
              </div>
            </div>
          );
        })}

        <div>
          <h3 className="text-sm font-semibold text-primary">Fonti del catalogo</h3>
          <ul className="mt-2 space-y-2">
            {catalog.sources.map((source) => (
              <li key={source.label} className="rounded-control border border-border bg-surface-muted/40 p-3 text-xs">
                <p className="font-medium text-primary">{source.label}</p>
                <p className="mt-0.5 text-muted">
                  {CATALOG_SOURCE_KIND_LABELS[source.kind]}
                  {source.retrievedOn ? ` · consultata il ${source.retrievedOn}` : ""}
                </p>
                {source.note && <p className="mt-1 leading-relaxed text-secondary">{source.note}</p>}
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block break-all text-accent underline decoration-accent/40"
                  >
                    {source.url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {catalog.dataNotes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-primary">Note sui dati dell&apos;anno</h3>
            <ul className="mt-2 space-y-1.5">
              {catalog.dataNotes.map((note) => (
                <li key={note} className="text-xs leading-relaxed text-muted">· {note}</li>
              ))}
            </ul>
          </div>
        )}

        <ProvenanceLegend />
      </div>
    </section>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`rounded-control border p-3 text-xs leading-snug ${SEVERITY_BORDERS[issue.type]}`}>
      <div className="flex gap-2">
        {SEVERITY_ICONS[issue.type]}
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-semibold text-primary">{issue.category}</p>
            <ProvenanceChip provenance={issue.provenance} />
            {!issue.dueNow && issue.dueByYear && (
              <span className="rounded-full border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                dall&apos;anno {issue.dueByYear}
              </span>
            )}
          </div>
          {issue.message && <p className="text-secondary">{issue.message}</p>}
          {issue.source && <p className="text-[11px] text-muted">Regola applicata: {issue.source}</p>}
        </div>
      </div>
    </div>
  );
}
