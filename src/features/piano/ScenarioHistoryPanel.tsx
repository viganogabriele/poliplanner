"use client";

import { Archive, ArchiveRestore, CalendarClock, CopyPlus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AVAILABLE_ACADEMIC_YEARS } from "@/lib/polimi/catalog";
import { PROGRAM_IDENTITY, TRACKS, type Track } from "@/lib/polimi/constraints";
import type { CourseYear } from "@/lib/polimi/catalog/types";
import type { PlanCycle } from "@/lib/polimi/planModel";
import { MODE_LABEL, STATUS_LABEL } from "./PlanHeader";

/**
 * Storico e gestione degli scenari. Resta disponibile ma è deliberatamente separato dalle azioni
 * quotidiane: prima il passaggio all'anno accademico successivo era sepolto qui dentro, dietro un
 * accordion, mentre ora è un'azione in testata e questo pannello torna a fare solo archivio.
 */

type Props = {
  cycles: PlanCycle[];
  currentCycleId: number | null;
  activeCycleId: number | null;
  currentAcademicYear: string;
  currentStudentYear: CourseYear;
  currentTrack: Track;
  validationMode: PlanCycle["validationMode"];
  isHistorical: boolean;
  isCompiled: boolean;
  pending: boolean;
  onSelect: (cycleId: number) => void;
  onSetActive: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onCreate: (academicYear: string, studentYear: CourseYear, track: Track) => void;
  onDuplicateNextYear: () => void;
  onCreateRevision: () => void;
};

export default function ScenarioHistoryPanel({
  cycles,
  currentCycleId,
  activeCycleId,
  currentAcademicYear,
  currentStudentYear,
  currentTrack,
  validationMode,
  isHistorical,
  isCompiled,
  pending,
  onSelect,
  onSetActive,
  onArchive,
  onRestore,
  onCreate,
  onDuplicateNextYear,
  onCreateRevision,
}: Props) {
  const compiled = cycles.filter((cycle) => cycle.status === "polimi_compiled" && !cycle.archivedAt);
  const editable = cycles.filter((cycle) => cycle.status !== "polimi_compiled" && !cycle.archivedAt);
  const archived = cycles.filter((cycle) => cycle.archivedAt);

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-muted">
        {cycles.length} piano/i in archivio · lo scenario aperto è in modalità {MODE_LABEL[validationMode]}.
        Gli scenari compilati su PoliMi sono storico immutabile: da lì si calcolano le frequenze già acquisite.
      </p>

      <ScenarioList title="Scenari modificabili" cycles={editable} currentCycleId={currentCycleId} activeCycleId={activeCycleId} onSelect={onSelect} />
      <ScenarioList title="Compilati su PoliMi (storico)" cycles={compiled} currentCycleId={currentCycleId} activeCycleId={activeCycleId} onSelect={onSelect} />
      <ScenarioList title="Archiviati" cycles={archived} currentCycleId={currentCycleId} activeCycleId={activeCycleId} onSelect={onSelect} />

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {currentCycleId !== null && !isHistorical && currentCycleId !== activeCycleId && (
          <Button variant="secondary" size="sm" onClick={onSetActive} disabled={pending}>
            Imposta come piano attivo
          </Button>
        )}
        {isCompiled && (
          <>
            <Button variant="secondary" size="sm" onClick={onDuplicateNextYear} disabled={pending}>
              <CopyPlus className="size-4" />
              Costruisci il piano dell&apos;anno successivo
            </Button>
            <Button variant="ghost" size="sm" onClick={onCreateRevision} disabled={pending}>
              <CalendarClock className="size-4" />
              Apri la modifica del 2° semestre
            </Button>
          </>
        )}
        {currentCycleId !== null && !cycles.some((cycle) => cycle.id === currentCycleId && cycle.archivedAt) && (
          <Button variant="ghost" size="sm" onClick={onArchive} disabled={pending}>
            <Archive className="size-4" />
            Archivia
          </Button>
        )}
        {currentCycleId !== null && cycles.some((cycle) => cycle.id === currentCycleId && cycle.archivedAt) && (
          <Button variant="ghost" size="sm" onClick={onRestore} disabled={pending}>
            <ArchiveRestore className="size-4" />
            Ripristina
          </Button>
        )}
      </div>

      <NewScenarioForm
        defaultAcademicYear={currentAcademicYear}
        defaultStudentYear={currentStudentYear}
        defaultTrack={currentTrack}
        pending={pending}
        onCreate={onCreate}
      />
    </div>
  );
}

function ScenarioList({
  title,
  cycles,
  currentCycleId,
  activeCycleId,
  onSelect,
}: {
  title: string;
  cycles: PlanCycle[];
  currentCycleId: number | null;
  activeCycleId: number | null;
  onSelect: (cycleId: number) => void;
}) {
  if (cycles.length === 0) return null;
  return (
    <section>
      <p className="mb-2 text-xs font-semibold text-secondary">{title}</p>
      <ul className="space-y-1.5">
        {cycles.map((cycle) => (
          <li key={cycle.id}>
            <button
              type="button"
              onClick={() => cycle.id && onSelect(cycle.id)}
              aria-current={cycle.id === currentCycleId ? "true" : undefined}
              className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-control border px-3 py-2 text-left text-xs transition ${
                cycle.id === currentCycleId
                  ? "border-accent bg-accent/10 text-primary"
                  : "border-border bg-surface-muted/40 text-secondary hover:border-border-strong hover:text-primary"
              }`}
            >
              <span className="font-mono">{cycle.academicYear}</span>
              <span>anno {cycle.studentYear} · {cycle.track}</span>
              <span className="flex items-center gap-1.5">
                <Badge variant={cycle.status === "polimi_compiled" ? "success" : cycle.status === "ready" ? "active" : "neutral"} className="py-0 text-[11px]">
                  {STATUS_LABEL[cycle.status]}
                </Badge>
                {cycle.id === activeCycleId && <Badge variant="active" className="py-0 text-[11px]">attivo</Badge>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewScenarioForm({
  defaultAcademicYear,
  defaultStudentYear,
  defaultTrack,
  pending,
  onCreate,
}: {
  defaultAcademicYear: string;
  defaultStudentYear: CourseYear;
  defaultTrack: Track;
  pending: boolean;
  onCreate: (academicYear: string, studentYear: CourseYear, track: Track) => void;
}) {
  return (
    <form
      className="grid gap-2 border-t border-border pt-4 sm:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onCreate(
          String(data.get("academicYear")),
          Number(data.get("studentYear")) as CourseYear,
          String(data.get("track")) as Track
        );
      }}
    >
      <select
        name="academicYear"
        aria-label="Anno accademico del nuovo piano"
        defaultValue={defaultAcademicYear}
        className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary"
      >
        {AVAILABLE_ACADEMIC_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
      <select
        name="studentYear"
        aria-label="Anno di corso"
        defaultValue={defaultStudentYear}
        className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary"
      >
        <option value={1}>Anno 1</option>
        <option value={2}>Anno 2</option>
        <option value={3}>Anno 3</option>
      </select>
      <select
        name="track"
        aria-label="Percorso"
        defaultValue={defaultTrack}
        className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-primary"
      >
        {Object.values(TRACKS).map((track) => <option key={track.code} value={track.code}>{track.label}</option>)}
      </select>
      <Button type="submit" variant="secondary" disabled={pending}>
        <Plus className="size-4" />
        Crea piano annuale
      </Button>
      <p className="text-xs text-muted sm:col-span-4">
        {PROGRAM_IDENTITY.courseName} · codice {PROGRAM_IDENTITY.courseCode} · {PROGRAM_IDENTITY.className}.
        Il nuovo piano viene costruito da carriera e storico: i corsi già verbalizzati non vengono riproposti.
      </p>
    </form>
  );
}
