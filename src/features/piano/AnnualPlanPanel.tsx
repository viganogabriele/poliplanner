"use client";

import { useMemo } from "react";
import { ArrowDownToLine, History, Lock, Plus, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import InfoButton from "@/components/ui/InfoButton";
import { activityCategory, findCourse, getCatalog } from "@/lib/polimi/catalog";
import { EXAM_STATUS_LABELS, type EntryPosition, type Track } from "@/lib/polimi/constraints";
import type { CareerExamsMap } from "@/lib/polimi/career";
import type { PlanEntry, PlanScenario } from "@/lib/polimi/planModel";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import { cn } from "@/lib/ui";

const CATEGORY_COLORS: Record<string, string> = {
  A: "bg-sky-500/20 text-sky-300",
  B: "bg-violet-500/20 text-violet-300",
  C: "bg-amber-500/20 text-amber-300",
  D: "bg-fuchsia-500/20 text-fuchsia-300",
  V: "bg-emerald-500/20 text-emerald-300",
  T: "bg-rose-500/20 text-rose-300",
};

type Props = {
  scenario: PlanScenario;
  validation: PlanValidationResult;
  exams: CareerExamsMap;
  readOnly: boolean;
  revisionMode: boolean;
  editableSemester: 1 | 2;
  onAddReinsertion: (code: string) => void;
  onRemove: (code: string) => void;
  onSetPosition: (code: string, position: EntryPosition) => void;
  onOpenCatalog: () => void;
};

export default function AnnualPlanPanel({
  scenario,
  validation,
  exams,
  readOnly,
  revisionMode,
  editableSemester,
  onAddReinsertion,
  onRemove,
  onSetPosition,
  onOpenCatalog,
}: Props) {
  const catalog = useMemo(() => getCatalog(scenario.cycle.academicYear), [scenario.cycle.academicYear]);
  const { sections, summary, requiredReinsertions, missingReinsertions } = validation;
  const track = scenario.cycle.track;
  const missingCodes = new Set(missingReinsertions.map((item) => item.courseCode));

  const canEdit = (entry: PlanEntry) => {
    if (readOnly) return false;
    if (revisionMode && entry.semester !== editableSemester) return false;
    return true;
  };

  return (
    <div className="space-y-5">
      {/* 1. Da reinserire ------------------------------------------------ */}
      <Card className={cn(missingReinsertions.length > 0 && "border-danger/40")}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-warning" />
              1. Da reinserire
            </CardTitle>
            <CardDescription>
              Esami già frequentati e non ancora verbalizzati. Il Regolamento chiede di reinserirli
              <strong> prima</strong> di aggiungere nuove frequenze. Non contano per la contribuzione.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={missingReinsertions.length ? "danger" : requiredReinsertions.length ? "success" : "neutral"}>
              {missingReinsertions.length
                ? `${missingReinsertions.length} mancanti`
                : requiredReinsertions.length ? "Tutti presenti" : "Nessuno"}
            </Badge>
            <span className="text-xs text-muted">{summary.reinsertedCfu} CFU</span>
          </div>
        </CardHeader>

        {requiredReinsertions.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">
            Nessun esame da recuperare: non risultano frequenze precedenti senza verbalizzazione.
          </p>
        )}

        <div className="space-y-2">
          {requiredReinsertions.map((item) => {
            const missing = missingCodes.has(item.courseCode);
            return (
              <div
                key={item.courseCode}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5",
                  missing ? "border-danger/40 bg-danger/5" : "border-warning/30 bg-warning/5"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.cfu} CFU · anno {item.courseYear} · {item.semester}° semestre ·{" "}
                    {item.sourceAcademicYear ? `piano ${item.sourceAcademicYear}` : "dalla carriera"} ·{" "}
                    {EXAM_STATUS_LABELS[item.examStatus]}
                  </p>
                </div>
                <Badge variant="warning" className="gap-1">
                  <RotateCcw className="size-3" />
                  Recupero · frequenza già acquisita
                </Badge>
                {item.registeredAfterSubmission && <Badge variant="success">Verbalizzato dopo la presentazione</Badge>}
                {missing && !readOnly && (
                  <Button size="sm" onClick={() => onAddReinsertion(item.courseCode)}>
                    <ArrowDownToLine className="size-4" />
                    Inserisci nel piano
                  </Button>
                )}
                {missing && readOnly && <Badge variant="danger">Manca nel piano</Badge>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* 2. Nuove frequenze --------------------------------------------- */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-accent" />
              2. Nuove frequenze
            </CardTitle>
            <CardDescription>
              I corsi che segui per la prima volta quest&apos;anno: sono i soli conteggiati nei CFU di
              nuova frequenza e nella contribuzione.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-accent">{summary.newFrequencyCfu} CFU</span>
            <InfoButton title="Limiti CFU">
              <p>Intervallo ordinario di presentazione: {catalog.annual.cfuRange[0]}–{catalog.annual.cfuRange[1]} CFU.</p>
              <p>Regola applicata: {catalog.annual.sources.cfuRange}</p>
              {catalog.annual.reinsertionsCountTowardRange === null && (
                <p>Non è documentato se i reinserimenti occupino lo stesso spazio: da verificare sui Servizi Online.</p>
              )}
            </InfoButton>
          </div>
        </CardHeader>

        {([1, 2] as const).map((semester) => {
          const entries = sections.newFrequencies.filter((entry) => entry.semester === semester);
          const cfu = entries.reduce((total, entry) => total + (findCourse(catalog, entry.courseCode)?.cfu ?? entry.externalCfu ?? 0), 0);
          const locked = revisionMode && semester !== editableSemester;
          return (
            <section key={semester} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                  {semester}° semestre
                  {locked && <Lock className="size-3" />}
                </p>
                <span className="text-xs text-muted">{cfu} CFU</span>
              </div>
              {locked && (
                <p className="mb-2 rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs text-muted">
                  Nella modifica del secondo semestre gli insegnamenti del {semester}° semestre non si possono aggiungere né togliere,
                  nemmeno se hai superato l&apos;esame nel frattempo.
                </p>
              )}
              <EntryRows
                entries={entries}
                catalog={catalog}
                track={track}
                exams={exams}
                canEdit={canEdit}
                onRemove={onRemove}
                onSetPosition={onSetPosition}
              />
            </section>
          );
        })}

        {!readOnly && (
          <Button variant="ghost" size="sm" onClick={onOpenCatalog} className="mt-1 w-full border border-dashed border-border">
            <Plus className="size-4" />
            {revisionMode ? `Aggiungi un insegnamento del ${editableSemester}° semestre` : "Aggiungi un insegnamento"}
          </Button>
        )}
      </Card>

      {/* Soprannumero ---------------------------------------------------- */}
      {sections.supernumerary.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Soprannumero</CardTitle>
              <CardDescription>Non contano per i 180 CFU. Massimo {catalog.annual.supernumeraryMaxCfu} CFU su tutto il corso.</CardDescription>
            </div>
            <span className="text-xs text-muted">{summary.supernumeraryCfu} CFU</span>
          </CardHeader>
          <EntryRows
            entries={sections.supernumerary}
            catalog={catalog}
            track={track}
            exams={exams}
            canEdit={canEdit}
            onRemove={onRemove}
            onSetPosition={onSetPosition}
          />
        </Card>
      )}

      {/* 3. Esami già superati ------------------------------------------ */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>3. Esami già superati</CardTitle>
            <CardDescription>
              Sola lettura: cosa è già chiuso. Questi esami non compaiono come reinserimenti e il validatore
              non li richiede mai.
            </CardDescription>
          </div>
          <Badge variant="success">{summary.registeredCareerCfu} CFU verbalizzati</Badge>
        </CardHeader>
        {sections.alreadyPassed.length === 0 && (
          <p className="py-4 text-center text-sm text-muted">Nessun esame verbalizzato in carriera.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {sections.alreadyPassed.map((row) => (
            <div key={row.courseCode} className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-primary">{row.name}</p>
                <p className="text-xs text-muted">
                  {row.cfu} CFU{row.grade ? ` · voto ${row.grade}` : ""}{row.registeredAt ? ` · verb. ${row.registeredAt}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function EntryRows({
  entries,
  catalog,
  track,
  exams,
  canEdit,
  onRemove,
  onSetPosition,
}: {
  entries: PlanEntry[];
  catalog: ReturnType<typeof getCatalog>;
  track: Track;
  exams: CareerExamsMap;
  canEdit: (entry: PlanEntry) => boolean;
  onRemove: (code: string) => void;
  onSetPosition: (code: string, position: EntryPosition) => void;
}) {
  if (entries.length === 0) {
    return <p className="py-2 text-center text-xs text-muted">Nessun insegnamento.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const course = findCourse(catalog, entry.courseCode);
        const category = entry.entryKind === "external"
          ? "D"
          : activityCategory(catalog, entry.courseCode, track, entry.courseYear, entry.semester);
        const status = exams[entry.courseCode]?.status;
        const editable = canEdit(entry);
        return (
          <div key={entry.courseCode} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">{course?.name ?? entry.externalName ?? entry.courseCode}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">{course?.cfu ?? entry.externalCfu ?? 0} CFU</span>
                <span className={cn("rounded px-1 py-0.5 text-[10px] font-bold", CATEGORY_COLORS[category] ?? "")}>{category}</span>
                {entry.entryKind === "external" && <Badge variant="warning" className="py-0 text-[10px]">Fuori tabella</Badge>}
                {status && status !== "planned" && (
                  <Badge variant={status === "passed_registered" ? "success" : status === "passed_unregistered" ? "warning" : "neutral"} className="py-0 text-[10px]">
                    {EXAM_STATUS_LABELS[status]}
                  </Badge>
                )}
              </div>
            </div>
            {editable && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetPosition(entry.courseCode, entry.position === "effective" ? "supernumerary" : "effective")}
                >
                  {entry.position === "effective" ? "→ Soprannumero" : "→ Effettivo"}
                </Button>
                <button
                  type="button"
                  onClick={() => onRemove(entry.courseCode)}
                  className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Rimuovi ${course?.name ?? entry.courseCode}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
            {!editable && <Lock className="size-3.5 shrink-0 text-muted" />}
          </div>
        );
      })}
    </div>
  );
}
