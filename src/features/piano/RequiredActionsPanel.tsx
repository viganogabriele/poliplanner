"use client";

import { ArrowDownToLine, CalendarDays, CheckCircle2, CircleAlert, Clock3, Plus, SearchCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { groupLabel, type Catalog } from "@/lib/polimi/catalog";
import type { StructuralChoice } from "@/lib/polimi/structuralChoice";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import { ProvenanceChip } from "./ProvenanceChip";
import CourseInfoCard from "./CourseInfoCard";

/**
 * "Azioni richieste adesso": decisioni obbligate ed errori bloccanti dello step "Nuove frequenze".
 * I reinserimenti (frequenza già acquisita) sono un pannello a parte, `ReinsertionsPanel`, montato
 * nello step "Frequenze acquisite".
 */

type Props = {
  catalog: Catalog;
  validation: PlanValidationResult;
  readOnly: boolean;
  onAddCourse: (code: string) => void;
  onOpenCatalog: () => void;
};

export default function RequiredActionsPanel({
  catalog,
  validation,
  readOnly,
  onAddCourse,
  onOpenCatalog,
}: Props) {
  const { structuralChoices, issues } = validation;
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

  const nothingToDo = blockingErrors.length === 0
    && openDecisions.length === 0
    && actionableWarnings.length === 0;
  const totalToHandle = blockingErrors.length + openDecisions.length + actionableWarnings.length;

  return (
    <Card className={blockingErrors.length > 0 ? "border-danger/40" : undefined}>
      <CardHeader>
        <div>
          <CardTitle>Decisioni ed errori del piano {catalog.academicYear}</CardTitle>
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
        {/* 1. Scelte obbligate: mai scelte prima, quindi da scegliere ora in tabella di recupero. */}
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

        {/* 2. Errori bloccanti residui, spiegati con la regola applicata. */}
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

        {/* 3. Verifiche da fare fuori dall'app: azionabili, ma non bloccanti. */}
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
  const metadata = [{ icon: Clock3, text: `${choice.cfu} CFU` }];
  if (choice.targetSemester) metadata.push({ icon: CalendarDays, text: `${choice.targetSemester}° semestre` });

  return (
    <CourseInfoCard
      title={choice.name}
      tone="accent"
      metadata={metadata}
      badges={
        <>
          {table && <span className="text-xs text-muted">{table}</span>}
          <Badge size="sm" variant="active">Conta nel gruppo a scelta</Badge>
        </>
      }
      action={!readOnly && (
        <Button size="sm" onClick={onAdd}>
          <ArrowDownToLine className="size-4" />
          Scegli ora
        </Button>
      )}
    >
      {choice.inferredFromMissingHistory && (
        <p className="text-[11px] leading-snug text-warning">
          Non ho piani degli anni precedenti in archivio: che non fosse già stato scelto è una deduzione.
          Se lo avevi inserito, registra quel piano oppure segna l&apos;esito dell&apos;esame in carriera.
        </p>
      )}
    </CourseInfoCard>
  );
}
