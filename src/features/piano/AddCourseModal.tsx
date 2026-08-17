"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { activityCategory, courseGroupsForTrack, courseOfferings, getCatalog } from "@/lib/polimi/catalog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/ui";
import type { Track } from "@/lib/polimi/constraints";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  academicYear: string;
  track: Track;
  studentYear: 1 | 2 | 3;
  alreadyInPlan: Set<string>;
  alreadyPassed: Set<string>;
  /** In modifica semestrale si possono aggiungere solo insegnamenti di questo semestre. */
  restrictToSemester?: 1 | 2 | null;
  onAdd: (code: string) => void;
};

const CATEGORY_COLORS: Record<string, string> = {
  A: "bg-sky-500/20 text-sky-300",
  B: "bg-violet-500/20 text-violet-300",
  C: "bg-amber-500/20 text-amber-300",
  D: "bg-fuchsia-500/20 text-fuchsia-300",
  V: "bg-emerald-500/20 text-emerald-300",
  T: "bg-rose-500/20 text-rose-300",
};

export default function AddCourseModal({
  isOpen,
  onClose,
  academicYear,
  track,
  studentYear,
  alreadyInPlan,
  alreadyPassed,
  restrictToSemester = null,
  onAdd,
}: Props) {
  const [search, setSearch] = useState("");
  const [onlyCurrentYear, setOnlyCurrentYear] = useState(true);
  const catalog = useMemo(() => getCatalog(academicYear), [academicYear]);

  const available = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalog.courses
      .filter((course) => {
        if (alreadyInPlan.has(course.code) || alreadyPassed.has(course.code)) return false;
        if (course.isLinkedExam) return false;
        const offerings = courseOfferings(course).filter((offering) => offering.tracks.includes(track));
        if (offerings.length === 0) return false;
        if (restrictToSemester && !offerings.some((offering) => offering.semester === restrictToSemester)) return false;
        if (onlyCurrentYear && !offerings.some((offering) => offering.year === studentYear)) return false;
        if (query && !course.name.toLowerCase().includes(query) && !course.code.includes(query)) return false;
        return true;
      })
      .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name, "it"));
  }, [catalog, alreadyInPlan, alreadyPassed, track, restrictToSemester, onlyCurrentYear, studentYear, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[82vh] w-full max-w-xl flex-col rounded-panel border border-border bg-background-soft shadow-elevated">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-primary">Aggiungi un insegnamento</h2>
            <p className="mt-0.5 text-xs text-muted">
              Catalogo AA {catalog.academicYear} · percorso {track}
              {restrictToSemester && ` · solo ${restrictToSemester}° semestre`}
              {catalog.dataStatus === "to_verify" && " · dati da verificare"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted transition hover:bg-surface-hover hover:text-primary" aria-label="Chiudi">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              type="text"
              placeholder="Cerca per nome o codice…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={onlyCurrentYear}
              onChange={(event) => setOnlyCurrentYear(event.target.checked)}
              className="size-3.5 accent-[var(--color-accent,#56d7fd)]"
            />
            Mostra solo gli insegnamenti dell&apos;anno {studentYear}
          </label>
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {available.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              Nessun insegnamento disponibile con questi filtri.
            </p>
          )}
          {available.map((course) => {
            const category = activityCategory(catalog, course.code, track);
            const groups = courseGroupsForTrack(catalog, course.code, track);
            const years = [...new Set(courseOfferings(course).filter((offering) => offering.tracks.includes(track)).map((offering) => offering.year))];
            return (
              <button
                key={course.code}
                onClick={() => { onAdd(course.code); onClose(); setSearch(""); }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition hover:border-border hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{course.name}</p>
                  <p className="text-xs text-muted">
                    {course.code} · {course.cfu} CFU · anno {years.join("/")}
                    {groups.length > 0 && ` · ${groups.join(", ")}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {course.linkedExams.length > 0 && <Badge variant="neutral" className="py-0 text-[10px]">+ prova finale</Badge>}
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", CATEGORY_COLORS[category] ?? "bg-surface text-muted")}>
                    {category}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full">Annulla</Button>
        </div>
      </div>
    </div>
  );
}
