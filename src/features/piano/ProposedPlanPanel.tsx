"use client";

import { Lock, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import InfoButton from "@/components/ui/InfoButton";
import { activityCategory, findCourse, groupLabel, type Catalog } from "@/lib/polimi/catalog";
import { CATEGORY_LABELS, EXAM_STATUS_LABELS, type EntryPosition, type Track } from "@/lib/polimi/constraints";
import type { CareerExamsMap } from "@/lib/polimi/career";
import type { PlanEntry, PlanScenario } from "@/lib/polimi/planModel";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import { cn } from "@/lib/ui";
import { IconButton } from "@/components/ui/IconButton";

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
            <CardTitle>Piano proposto {catalog.academicYear}</CardTitle>
            {/* Il totale CFU del piano sta nella testata: qui il conteggio e i subtotali per semestre. */}
            <CardDescription>
              {effective.length} attività effettive. Prima i reinserimenti, poi le nuove frequenze:
              solo queste ultime contano per la contribuzione.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-accent">
              {summary.newFrequencyCfu} <span className="text-xs font-medium text-muted">CFU nuovi</span>
            </span>
            <InfoButton size="sm" title="Limiti di CFU dell'anno">
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
                <h3 className="section-label flex items-center gap-1.5">
                  {semester}° semestre
                  {locked && <Lock className="size-3" aria-hidden="true" />}
                </h3>
                <span className="text-xs tabular-nums text-muted">{cfu} CFU</span>
              </div>
              {locked && (
                <p className="mb-2 rounded-control border border-border bg-surface-muted/40 px-3 py-2 text-xs text-muted">
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

        <div className="mt-4 border-t border-border pt-3">
          <h3 className="section-label">Categorie delle attività</h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2">
            {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
              <span key={code} className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold", CATEGORY_COLORS[code] ?? "bg-surface-muted text-muted")}>{code}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
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
            <span className="shrink-0 text-xs tabular-nums text-muted">{summary.supernumeraryCfu} CFU</span>
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
    return <p className="py-2 text-sm text-muted">Nessun insegnamento in questo semestre.</p>;
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
              "flex flex-wrap items-center gap-3 rounded-control border px-3 py-2.5 transition",
              reinserted ? "border-warning/30 bg-warning/5" : "border-border bg-surface-muted/40 hover:border-border-strong"
            )}
          >
            <div className="min-w-[11rem] flex-1">
              <p className="text-sm font-medium leading-snug text-primary" title={course?.name ?? entry.externalName ?? entry.courseCode}>
                {course?.name ?? entry.externalName ?? entry.courseCode}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                <span>{course?.cfu ?? entry.externalCfu ?? 0} CFU</span>
                <span
                  className={cn("rounded px-1 py-0.5 text-[11px] font-bold", CATEGORY_COLORS[category] ?? "")}
                  title={CATEGORY_LABELS[category]}
                >
                  {category}
                </span>
                {group && <span>{group}</span>}
                {reinserted && (
                  <Badge size="sm" variant="warning">
                    <RotateCcw className="size-3" aria-hidden="true" />
                    Frequenza già acquisita
                  </Badge>
                )}
                {entry.entryKind === "external" && (
                  <Badge size="sm" variant="warning">Fuori tabella</Badge>
                )}
                {status && status !== "planned" && (
                  <Badge
                    size="sm"
                    variant={status === "passed_registered" ? "success" : status === "passed_unregistered" ? "warning" : "neutral"}
                  >
                    {EXAM_STATUS_LABELS[status]}
                  </Badge>
                )}
              </div>
            </div>
            {editable && (
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSetPosition(entry.courseCode, entry.position === "effective" ? "supernumerary" : "effective")}
                  className="min-h-8 rounded-control px-1.5 text-xs text-muted underline decoration-border underline-offset-4 transition hover:text-primary hover:decoration-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {entry.position === "effective" ? "Sposta in soprannumero" : "Conta nei 180 CFU"}
                </button>
                <IconButton
                  onClick={() => onRemove(entry.courseCode)}
                  label={`Rimuovi ${course?.name ?? entry.courseCode}`}
                  size="md"
                  className="border-transparent bg-transparent hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
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
