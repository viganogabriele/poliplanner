"use client";

import { CalendarClock, Lock, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import InfoButton from "@/components/ui/InfoButton";
import { activityCategory, findCourse, groupLabel, type Catalog } from "@/lib/polimi/catalog";
import { CATEGORY_LABELS, EXAM_STATUS_LABELS, type EntryPosition, type Track } from "@/lib/polimi/constraints";
import type { CareerExamsMap } from "@/lib/polimi/career";
import type { PlanEntry, PlanScenario } from "@/lib/polimi/planModel";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import { cn } from "@/lib/ui";

/**
 * "Piano proposto": le righe che finiranno nei Servizi Online, divise per semestre.
 *
 * La gerarchia visiva è intenzionale e risponde al requisito di non mettere sullo stesso piano
 * cose diverse: i reinserimenti hanno un bordo caldo e la spiegazione "frequenza già acquisita",
 * le nuove frequenze sono neutre, il soprannumero è visivamente separato. Gli esami già
 * verbalizzati non stanno qui: sono nella sezione Carriera, che è di sola lettura.
 */

const CATEGORY_COLORS: Record<string, string> = {
  A: "bg-sky-500/20 text-sky-300",
  B: "bg-violet-500/20 text-violet-300",
  C: "bg-amber-500/20 text-amber-300",
  D: "bg-fuchsia-500/20 text-fuchsia-300",
  V: "bg-emerald-500/20 text-emerald-300",
  T: "bg-rose-500/20 text-rose-300",
};

type Props = {
  catalog: Catalog;
  scenario: PlanScenario;
  validation: PlanValidationResult;
  exams: CareerExamsMap;
  readOnly: boolean;
  revisionMode: boolean;
  editableSemester: 1 | 2;
  onRemove: (code: string) => void;
  onSetPosition: (code: string, position: EntryPosition) => void;
  onOpenCatalog: () => void;
};

export default function ProposedPlanPanel({
  catalog,
  scenario,
  validation,
  exams,
  readOnly,
  revisionMode,
  editableSemester,
  onRemove,
  onSetPosition,
  onOpenCatalog,
}: Props) {
  const { sections, summary } = validation;
  const track = scenario.cycle.track;
  const effective = [...sections.reinsertions, ...sections.newFrequencies];

  const canEdit = (entry: PlanEntry) => {
    if (readOnly) return false;
    if (revisionMode && entry.semester !== editableSemester) return false;
    return true;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-accent" />
              Piano proposto {catalog.academicYear}
            </CardTitle>
            <CardDescription>
              {effective.length} attività effettive · {summary.effectiveCfu} CFU. Prima i reinserimenti,
              poi le nuove frequenze: solo queste ultime contano per la contribuzione.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-accent">{summary.newFrequencyCfu} CFU nuovi</span>
            <InfoButton title="Limiti di CFU dell'anno">
              <p>Intervallo ordinario di presentazione: {catalog.annual.cfuRange[0]}–{catalog.annual.cfuRange[1]} CFU di nuova frequenza.</p>
              <p>{catalog.annual.sources.cfuRange.source}</p>
              {catalog.annual.reinsertionsCountTowardRange === null && (
                <p>Non è documentato se i reinserimenti occupino lo stesso spazio: da verificare sui Servizi Online.</p>
              )}
            </InfoButton>
          </div>
        </CardHeader>

        {([1, 2] as const).map((semester) => {
          const entries = effective.filter((entry) => entry.semester === semester);
          const cfu = entries.reduce(
            (total, entry) => total + (findCourse(catalog, entry.courseCode)?.cfu ?? entry.externalCfu ?? 0),
            0
          );
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
                  Nella modifica del secondo semestre gli insegnamenti del {semester}° semestre non si possono
                  aggiungere né togliere, nemmeno se hai superato l&apos;esame nel frattempo.
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

      {sections.supernumerary.length > 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <div>
              <CardTitle className="text-base">In soprannumero</CardTitle>
              <CardDescription>
                Attività in più: non contano per i 180 CFU della laurea. Massimo {catalog.annual.supernumeraryMaxCfu} CFU
                su tutto il corso.
              </CardDescription>
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
  catalog: Catalog;
  track: Track;
  exams: CareerExamsMap;
  canEdit: (entry: PlanEntry) => boolean;
  onRemove: (code: string) => void;
  onSetPosition: (code: string, position: EntryPosition) => void;
}) {
  if (entries.length === 0) {
    return <p className="py-2 text-center text-xs text-muted">Nessun insegnamento in questo semestre.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const course = findCourse(catalog, entry.courseCode);
        const category = entry.entryKind === "external"
          ? "D"
          : activityCategory(catalog, entry.courseCode, track, entry.courseYear, entry.semester);
        const group = entry.entryKind === "external" ? null : groupLabel(catalog, catalogGroup(catalog, entry, track));
        const status = exams[entry.courseCode]?.status;
        const editable = canEdit(entry);
        const reinserted = !entry.isNewFrequency;
        return (
          <div
            key={entry.courseCode}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-2.5",
              reinserted ? "border-warning/30 bg-warning/5" : "border-border bg-surface/40"
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">
                {course?.name ?? entry.externalName ?? entry.courseCode}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span>{course?.cfu ?? entry.externalCfu ?? 0} CFU</span>
                <span
                  className={cn("rounded px-1 py-0.5 text-[10px] font-bold", CATEGORY_COLORS[category] ?? "")}
                  title={CATEGORY_LABELS[category]}
                >
                  {category}
                </span>
                {group && <span>{group}</span>}
                {reinserted && (
                  <Badge variant="warning" className="gap-1 py-0 text-[10px]">
                    <RotateCcw className="size-3" />
                    Frequenza già acquisita
                  </Badge>
                )}
                {entry.entryKind === "external" && (
                  <Badge variant="warning" className="py-0 text-[10px]">Fuori tabella</Badge>
                )}
                {status && status !== "planned" && (
                  <Badge
                    variant={status === "passed_registered" ? "success" : status === "passed_unregistered" ? "warning" : "neutral"}
                    className="py-0 text-[10px]"
                  >
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
            {!editable && <Lock className="size-3.5 shrink-0 text-muted" aria-label="Non modificabile" />}
          </div>
        );
      })}
    </div>
  );
}

function catalogGroup(catalog: Catalog, entry: PlanEntry, track: Track): string | null {
  const course = findCourse(catalog, entry.courseCode);
  if (!course) return null;
  const offering = (course.offerings ?? []).find(
    (candidate) => candidate.tracks.includes(track) && candidate.year === entry.courseYear && candidate.semester === entry.semester
  );
  return offering?.group ?? course.electiveGroup;
}
