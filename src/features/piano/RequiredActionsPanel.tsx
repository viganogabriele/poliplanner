"use client";

import { ArrowDownToLine, CheckCircle2, CircleAlert, Plus, RotateCcw, SearchCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { groupLabel, type Catalog } from "@/lib/polimi/catalog";
import { EXAM_STATUS_LABELS } from "@/lib/polimi/constraints";
import type { StructuralChoice } from "@/lib/polimi/structuralChoice";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import { ProvenanceChip } from "./ProvenanceChip";

/**
 * "Azioni richieste adesso": la sezione principale della pagina.
 *
 * Contiene solo cose che si possono fare oggi, in ordine di urgenza: sistemare gli errori del
 * piano corrente, reinserire le frequenze dovute, prendere le decisioni che il Regolamento
 * richiede a questo anno. Niente obblighi degli anni successivi, niente note sui dati.
 */

type Props = {
  catalog: Catalog;
  validation: PlanValidationResult;
  readOnly: boolean;
  onAddReinsertion: (code: string) => void;
  onAddCourse: (code: string) => void;
  onOpenCatalog: () => void;
};

export default function RequiredActionsPanel({
  catalog,
  validation,
  readOnly,
  onAddReinsertion,
  onAddCourse,
  onOpenCatalog,
}: Props) {
  const { missingReinsertions, requiredReinsertions, structuralChoices, issues } = validation;
  const planCodes = new Set([
    ...validation.sections.reinsertions.map((entry) => entry.courseCode),
    ...validation.sections.newFrequencies.map((entry) => entry.courseCode),
    ...validation.sections.supernumerary.map((entry) => entry.courseCode),
  ]);

  const blockingErrors = issues.filter((issue) => issue.type === "error" && issue.scope === "current_plan");
  // Avvisi su cui si può agire adesso: tipicamente una verifica da fare sui Servizi Online.
  // Compaiono qui perché altrimenti la sezione direbbe "nulla da fare" mentre il pannello
  // laterale segnala qualcosa: due messaggi in contraddizione sulla stessa schermata.
  const actionableWarnings = issues.filter((issue) => issue.type === "warning" && issue.scope === "current_plan");
  // Le decisioni che il Regolamento richiede a questo anno e che non sono ancora nel piano.
  const openDecisions = structuralChoices.filter(
    (choice) => choice.state === "choose_in_recovery_table" && !planCodes.has(choice.courseCode)
  );
  const pendingReinsertions = missingReinsertions;

  const nothingToDo = blockingErrors.length === 0
    && openDecisions.length === 0
    && pendingReinsertions.length === 0
    && actionableWarnings.length === 0;
  const totalToHandle = blockingErrors.length + openDecisions.length + pendingReinsertions.length + actionableWarnings.length;

  return (
    <Card className={blockingErrors.length > 0 ? "border-danger/40" : undefined}>
      <CardHeader>
        <div>
          <CardTitle>Azioni richieste adesso</CardTitle>
          <CardDescription>
            Solo ciò che riguarda il piano {catalog.academicYear}. Gli obblighi degli anni successivi
            stanno nell&apos;anteprima in fondo alla pagina.
          </CardDescription>
        </div>
        <Badge variant={nothingToDo ? "success" : blockingErrors.length ? "danger" : "warning"}>
          {nothingToDo ? "Nulla da fare" : `${totalToHandle} da gestire`}
        </Badge>
      </CardHeader>

      {/* Lo stato del piano è già nella testata: qui basta la riga con il solo avvertimento utile. */}
      {nothingToDo && (
        <p className="flex items-start gap-2 rounded-control border border-success/30 bg-success/5 px-4 py-3 text-xs leading-relaxed text-muted">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          Nessuna azione richiesta per l&apos;anno {catalog.academicYear}. Verifica comunque il piano sui
          Servizi Online prima di compilarlo.
        </p>
      )}

      <div className="space-y-4">
        {/* 1. Reinserimenti dovuti: frequenza storica da riportare, non nuove scelte. */}
        {pendingReinsertions.length > 0 && (
          <section>
            <SectionTitle
              icon={<RotateCcw className="size-3.5 text-warning" />}
              title="Reinserisci le frequenze già acquisite"
              hint="Erano nel tuo piano di un anno precedente e l'esame non è ancora verbalizzato. Vanno riportati come erano: non sono nuove scelte e non occupano i CFU del gruppo a scelta."
            />
            <div className="space-y-2">
              {pendingReinsertions.map((item) => (
                <div key={item.courseCode} className="flex flex-wrap items-center gap-3 rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5">
                  <div className="min-w-[11rem] flex-1">
                    <p className="text-sm font-medium leading-snug text-primary">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.cfu} CFU · {item.semester}° semestre ·{" "}
                      {item.sourceAcademicYear ? `dal piano ${item.sourceAcademicYear}` : "dalla carriera"} ·{" "}
                      esame: {EXAM_STATUS_LABELS[item.examStatus]}
                    </p>
                  </div>
                  {!readOnly && (
                    <Button size="sm" onClick={() => onAddReinsertion(item.courseCode)}>
                      <ArrowDownToLine className="size-4" />
                      Reinserisci
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. Scelte obbligate: mai scelte prima, quindi da scegliere ora in tabella di recupero. */}
        {openDecisions.length > 0 && (
          <section>
            <SectionTitle
              icon={<Sparkles className="size-3.5 text-accent" />}
              title="Decisioni che devi prendere adesso"
              hint="Il Regolamento le rende obbligatorie a questo anno perché non risultano scelte negli anni precedenti. Sono nuove frequenze e i loro CFU contano nel gruppo a scelta."
            />
            <div className="space-y-2">
              {openDecisions.map((choice) => (
                <DecisionRow
                  key={choice.courseCode}
                  choice={choice}
                  table={groupLabel(catalog, choice.recoveryGroup)}
                  readOnly={readOnly}
                  onAdd={() => onAddCourse(choice.courseCode)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 3. Errori bloccanti residui, spiegati con la regola applicata. */}
        {blockingErrors.length > 0 && (
          <section>
            <SectionTitle
              icon={<CircleAlert className="size-3.5 text-danger" />}
              title="Problemi che bloccano la compilazione"
              hint="Finché restano, il piano non può essere marcato come pronto."
            />
            <div className="space-y-2">
              {blockingErrors.map((issue) => (
                <div key={issue.id} className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-primary">{issue.category}</p>
                    <ProvenanceChip provenance={issue.provenance} />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-secondary">{issue.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Verifiche da fare fuori dall'app: azionabili, ma non bloccanti. */}
        {actionableWarnings.length > 0 && (
          <section>
            <SectionTitle
              icon={<SearchCheck className="size-3.5 text-warning" />}
              title="Da verificare prima di compilare"
              hint="Non bloccano il piano, ma vanno controllati: sono punti che questo assistente non può risolvere offline."
            />
            <div className="space-y-2">
              {actionableWarnings.map((issue) => (
                <div key={issue.id} className="rounded-control border border-warning/30 bg-warning/5 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-primary">{issue.category}</p>
                    <ProvenanceChip provenance={issue.provenance} />
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-secondary">{issue.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {!readOnly && (
        <Button variant="secondary" onClick={onOpenCatalog} className="mt-4 w-full sm:w-auto">
          <Plus className="size-4" aria-hidden="true" />
          Aggiungi un insegnamento
        </Button>
      )}

      {requiredReinsertions.length > 0 && pendingReinsertions.length === 0 && (
        <p className="mt-3 text-xs text-muted">
          Tutti i {requiredReinsertions.length} reinserimenti dovuti sono già nel piano.
        </p>
      )}
    </Card>
  );
}

function SectionTitle({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="mb-2.5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
        {icon}
        {title}
      </h3>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>
    </div>
  );
}

function DecisionRow({
  choice,
  table,
  readOnly,
  onAdd,
}: {
  choice: StructuralChoice;
  table: string | null;
  readOnly: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-control border border-accent/25 bg-accent/5 px-3 py-2.5">
      <div className="min-w-[11rem] flex-1">
        <p className="text-sm font-medium leading-snug text-primary">{choice.name}</p>
        <p className="text-xs text-muted">
          {choice.cfu} CFU
          {choice.targetSemester ? ` · ${choice.targetSemester}° semestre` : ""}
          {table ? ` · ${table}` : ""}
          {" · conta nel gruppo a scelta"}
        </p>
        {choice.inferredFromMissingHistory && (
          <p className="mt-1 text-[11px] leading-snug text-warning">
            Non ho piani degli anni precedenti in archivio: che non fosse già stato scelto è una deduzione.
            Se lo avevi inserito, registra quel piano oppure segna l&apos;esito dell&apos;esame in carriera.
          </p>
        )}
      </div>
      {!readOnly && (
        <Button size="sm" onClick={onAdd}>
          <ArrowDownToLine className="size-4" />
          Scegli ora
        </Button>
      )}
    </div>
  );
}
