"use client";

import { useId, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Info, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCatalog } from "@/lib/polimi/catalog";
import {
  BUCKET_HINTS,
  BUCKET_LABELS,
  describeAddableCourses,
  type CourseBucket,
  type CourseChoiceInfo,
} from "@/lib/polimi/courseAdvice";
import type { StructuralChoice } from "@/lib/polimi/structuralChoice";
import type { Track } from "@/lib/polimi/constraints";
import type { CourseYear } from "@/lib/polimi/catalog/types";
import { cn } from "@/lib/ui";
import { IconButton } from "@/components/ui/IconButton";
import EmptyState from "@/components/ui/EmptyState";
import { useModalDialog } from "@/components/ui/useModalDialog";
import CourseInfoCard, { courseMetaItems } from "./CourseInfoCard";

/**
 * Modale "Aggiungi insegnamento".
 *
 * Prima era un elenco piatto con un filtro per anno: mostrava sigle come TABREC senza spiegarle e
 * non diceva se il corso avrebbe consumato i CFU del gruppo a scelta. Ora ogni corso arriva già
 * descritto da `courseAdvice.ts`, raggruppato per ciò che serve fare, e la scheda espansa risponde
 * in linguaggio semplice prima dell'aggiunta: semestre, CFU, gruppo, se conta nei CFU a scelta,
 * progetto collegato, se è solo una scelta libera, eventuali limitazioni.
 */

const CATEGORY_COLORS: Record<string, string> = {
  A: "bg-sky-500/20 text-sky-300",
  B: "bg-violet-500/20 text-violet-300",
  C: "bg-amber-500/20 text-amber-300",
  D: "bg-fuchsia-500/20 text-fuchsia-300",
  V: "bg-emerald-500/20 text-emerald-300",
  T: "bg-rose-500/20 text-rose-300",
};

const BUCKET_ORDER: CourseBucket[] = [
  "reinsertion",
  "mandatory_choice",
  "compulsory",
  "choice_group",
  "recommended",
  "extra",
];

type SemesterFilter = "all" | 1 | 2;

type Props = {
  onClose: () => void;
  academicYear: string;
  track: Track;
  studentYear: CourseYear;
  alreadyInPlan: Set<string>;
  alreadyPassed: Set<string>;
  reinsertionCodes: Set<string>;
  structuralChoices: StructuralChoice[];
  /** In modifica semestrale si possono aggiungere solo insegnamenti di questo semestre. */
  restrictToSemester?: 1 | 2 | null;
  /** Se presente, mostra solo gli insegnamenti di questi gruppi/tabelle (apertura da un "Gruppo a scelta"). */
  restrictToGroups?: string[] | null;
  onAdd: (code: string) => void;
};

export default function AddCourseModal({
  onClose,
  academicYear,
  track,
  studentYear,
  alreadyInPlan,
  alreadyPassed,
  reinsertionCodes,
  structuralChoices,
  restrictToSemester = null,
  restrictToGroups = null,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");
  const [bucketFilter, setBucketFilter] = useState<CourseBucket | "all">("all");
  const [semesterFilter, setSemesterFilter] = useState<SemesterFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const prefersReducedMotion = useReducedMotion();

  /**
   * La chiusura è un'uscita animata, non uno smontaggio istantaneo: il modale resta montato
   * (focus trap e blocco dello scroll compresi) finché l'animazione non è finita, poi avvisa
   * il chiamante. Un'uscita che si vede è anche un'uscita che si può annullare cliccando altrove
   * per errore, mentre l'animazione è ancora a metà.
   */
  const requestClose = () => setClosing(true);
  const dialogRef = useModalDialog<HTMLDivElement>(true, requestClose, searchRef);

  const sheetTransition = prefersReducedMotion
    ? { duration: 0.15, ease: "easeOut" as const }
    : { type: "spring" as const, bounce: 0.18, duration: 0.4 };
  const backdropTransition = { duration: prefersReducedMotion ? 0.15 : 0.25, ease: "easeOut" as const };

  const catalog = useMemo(() => getCatalog(academicYear), [academicYear]);

  const described = useMemo(
    () => describeAddableCourses({
      catalog,
      track,
      studentYear,
      inPlan: alreadyInPlan,
      registered: alreadyPassed,
      reinsertionCodes,
      structuralChoices,
      restrictToSemester,
    }),
    [catalog, track, studentYear, alreadyInPlan, alreadyPassed, reinsertionCodes, structuralChoices, restrictToSemester]
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return described.filter((course) => {
      // `[]` è truthy in JS: senza il controllo sulla lunghezza, un gruppo senza tabelle
      // filtrerebbe via ogni corso invece di non applicare alcuna restrizione.
      if (restrictToGroups && restrictToGroups.length > 0 && (!course.rawGroup || !restrictToGroups.includes(course.rawGroup))) return false;
      if (bucketFilter !== "all" && course.bucket !== bucketFilter) return false;
      if (semesterFilter !== "all" && course.semester !== semesterFilter) return false;
      if (query && !course.name.toLowerCase().includes(query) && !course.code.includes(query)) return false;
      return true;
    });
  }, [described, restrictToGroups, bucketFilter, semesterFilter, search]);

  const counts = useMemo(() => {
    const map = new Map<CourseBucket, number>();
    for (const course of described) map.set(course.bucket, (map.get(course.bucket) ?? 0) + 1);
    return map;
  }, [described]);

  const grouped = useMemo(() => {
    const map = new Map<CourseBucket, CourseChoiceInfo[]>();
    for (const course of visible) map.set(course.bucket, [...(map.get(course.bucket) ?? []), course]);
    return BUCKET_ORDER.filter((bucket) => map.has(bucket)).map((bucket) => ({ bucket, courses: map.get(bucket)! }));
  }, [visible]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={requestClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={backdropTransition}
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col rounded-card border border-border-strong bg-surface-elevated shadow-elevated sm:max-h-[86vh]"
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 16 }}
        animate={
          closing
            ? (prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 })
            : (prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 })
        }
        transition={sheetTransition}
        onAnimationComplete={() => { if (closing) onClose(); }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold tracking-tight text-primary">Aggiungi un insegnamento</h2>
            <p className="mt-0.5 text-xs text-muted">
              Catalogo AA {catalog.academicYear} · percorso {track} · anno {studentYear}
              {restrictToSemester && ` · solo ${restrictToSemester}° semestre`}
              {restrictToGroups && " · solo il gruppo a scelta selezionato"}
              {catalog.dataStatus === "to_verify" && " · dati da riconfermare"}
            </p>
          </div>
          <IconButton onClick={requestClose} label="Chiudi catalogo" size="md" variant="ghost">
            <X className="size-4" aria-hidden="true" />
          </IconButton>
        </div>

        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-control border border-border bg-surface px-3 py-2">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Cerca per nome o codice…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={bucketFilter === "all"} onClick={() => setBucketFilter("all")}>
              Tutti ({described.length})
            </FilterChip>
            {BUCKET_ORDER.filter((bucket) => counts.get(bucket)).map((bucket) => (
              <FilterChip key={bucket} active={bucketFilter === bucket} onClick={() => setBucketFilter(bucket)}>
                {BUCKET_LABELS[bucket]} ({counts.get(bucket)})
              </FilterChip>
            ))}
          </div>

          {!restrictToSemester && (
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={semesterFilter === "all"} onClick={() => setSemesterFilter("all")}>Tutto l&apos;anno</FilterChip>
              <FilterChip active={semesterFilter === 1} onClick={() => setSemesterFilter(1)}>1° semestre</FilterChip>
              <FilterChip active={semesterFilter === 2} onClick={() => setSemesterFilter(2)}>2° semestre</FilterChip>
            </div>
          )}
        </div>

        <div className="scroll-fade-y flex-1 space-y-4 overflow-y-auto p-3">
          {visible.length === 0 && (
            <EmptyState
              title="Nessun insegnamento con questi filtri"
              description="Prova a togliere un filtro o a cercare per nome o codice."
            />
          )}

          {grouped.map(({ bucket, courses }) => (
            <section key={bucket}>
              <h3 className="px-1 text-sm font-semibold text-primary">{BUCKET_LABELS[bucket]}</h3>
              <p className="mb-2 px-1 text-xs leading-relaxed text-muted">{BUCKET_HINTS[bucket]}</p>
              <div className="space-y-1.5">
                {courses.map((course) => (
                  <CourseRow
                    key={course.code}
                    course={course}
                    expanded={expanded === course.code}
                    onToggle={() => setExpanded((current) => (current === course.code ? null : course.code))}
                    onAdd={() => { onAdd(course.code); requestClose(); }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="border-t border-border px-4 py-3">
          <Button variant="secondary" onClick={requestClose} className="w-full">Chiudi</Button>
        </div>
      </motion.div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tap-scale inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:border-border-strong hover:bg-surface-hover hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

function CourseRow({
  course,
  expanded,
  onToggle,
  onAdd,
}: {
  course: CourseChoiceInfo;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
}) {
  return (
    <CourseInfoCard
      title={course.name}
      code={course.code}
      expanded={expanded}
      onToggle={onToggle}
      metadata={courseMetaItems(course.courseYear, course.semester, course.cfu)}
      badges={
        <>
          <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-bold", CATEGORY_COLORS[course.category] ?? "bg-surface-muted text-muted")}>
            {course.category}
          </span>
          {course.group && <span className="text-xs text-muted">{course.group}</span>}
          {course.linkedModule && <Badge size="sm" variant="neutral">+ progetto</Badge>}
          {course.limitations.length > 0 && (
            <span title="Ci sono limitazioni da leggere" className="text-warning">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </>
      }
      action={<Button size="sm" onClick={onAdd}>Aggiungi</Button>}
    >
      <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {course.facts.map((fact) => (
          <div key={fact.label} className="text-xs">
            <dt className="text-xs text-muted">{fact.label}</dt>
            <dd className="text-secondary">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {course.groupExplanation && (
        <p className="flex gap-2 text-xs leading-relaxed text-muted">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {course.groupExplanation}
        </p>
      )}

      {course.satisfies && (
        <p className="rounded-control border border-success/25 bg-success/5 px-3 py-2 text-xs leading-relaxed text-success">
          {course.satisfies}
        </p>
      )}

      {course.isFreeChoiceOnly && (
        <p className="rounded-control border border-border bg-surface-muted/50 px-3 py-2 text-xs leading-relaxed text-muted">
          Non copre nessun obbligo: è soltanto una scelta libera. Va bene se ti interessa la materia o se ti serve
          per completare i CFU a scelta.
        </p>
      )}

      {course.limitations.map((limitation) => (
        <p key={limitation} className="flex gap-2 rounded-control border border-warning/25 bg-warning/5 px-3 py-2 text-xs leading-relaxed text-warning">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {limitation}
        </p>
      ))}
    </CourseInfoCard>
  );
}
