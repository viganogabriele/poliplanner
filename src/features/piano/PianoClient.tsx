"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { COURSES, getCourse } from "@/lib/polimi/courses";
import { cfuPerYear } from "@/lib/polimi/cfuCalc";
import { validatePlan } from "@/lib/polimi/validation";
import { TRACKS } from "@/lib/polimi/constraints";
import { savePianoAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import ValidationPanel from "./ValidationPanel";
import AddCourseModal from "./AddCourseModal";
import { cn } from "@/lib/ui";
import type { Piano } from "@/lib/piano";
import type { Track } from "@/lib/polimi/constraints";

const SEMESTER_LABEL: Record<string | number, string> = { 1: "1° Semestre", 2: "2° Semestre", A: "Annuale" };

const TYPE_COLORS: Record<string, string> = {
  A: "bg-sky-500/20 text-sky-300",
  B: "bg-violet-500/20 text-violet-300",
  C: "bg-amber-500/20 text-amber-300",
  V: "bg-emerald-500/20 text-emerald-300",
  T: "bg-rose-500/20 text-rose-300",
};

export default function PianoClient({ initialPiano, initialTrack }: { initialPiano: Piano; initialTrack: Track }) {
  const [piano, setPiano] = useState<Piano>(initialPiano);
  const [track, setTrack] = useState<Track>(initialTrack);
  const [activeYear, setActiveYear] = useState<1 | 2 | 3>(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const yearCFU = useMemo(() => cfuPerYear(piano), [piano]);
  const issues = useMemo(() => validatePlan(piano, track), [piano, track]);

  const addCourse = (code: string) => {
    const course = getCourse(code);
    if (!course) return;
    setPiano((prev) => {
      const updated = { ...prev, [activeYear]: { ...prev[activeYear], courses: [...prev[activeYear].courses, code] } };
      if (course.linkedExams?.length) {
        course.linkedExams.forEach((le) => {
          if (!updated[activeYear].courses.includes(le.code)) {
            updated[activeYear] = { ...updated[activeYear], courses: [...updated[activeYear].courses, le.code] };
          }
        });
      }
      return updated;
    });
  };

  const removeCourse = (year: 1 | 2 | 3, code: string) => {
    const course = getCourse(code);
    setPiano((prev) => {
      const linked = course?.linkedExams?.map((le) => le.code) ?? [];
      const toRemove = new Set([code, ...linked]);
      return {
        ...prev,
        [year]: {
          courses: prev[year].courses.filter((c) => !toRemove.has(c)),
          soprannumero: prev[year].soprannumero.filter((c) => !toRemove.has(c)),
        },
      };
    });
  };

  const save = () => {
    startTransition(async () => {
      const result = await savePianoAction(piano, track);
      setSaveMsg({ ok: result.ok, text: result.ok ? "Piano salvato." : (result.error ?? "Errore.") });
      setTimeout(() => setSaveMsg(null), 3000);
    });
  };

  const yearCourses = piano[activeYear].courses
    .map(getCourse)
    .filter(Boolean);

  const bySemester = [1, 2, "A" as const].map((sem) => ({
    sem,
    courses: yearCourses.filter((c) => c && !c.isLinkedExam && c.semester === sem),
  })).filter((g) => g.courses.length > 0 || typeof g.sem === "number");

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main panel */}
      <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
        {/* Track selector */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-muted uppercase tracking-wide">Percorso</span>
          {(Object.values(TRACKS) as { code: Track; label: string }[]).map((t) => (
            <button
              key={t.code}
              onClick={() => setTrack(t.code)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-semibold transition",
                track === t.code
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:border-border-strong hover:text-primary"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Year tabs */}
        <div className="flex gap-2 flex-wrap">
          {([1, 2, 3] as const).map((y) => (
            <button
              key={y}
              onClick={() => setActiveYear(y)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                activeYear === y
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-secondary hover:border-border-strong hover:text-primary"
              )}
            >
              Anno {y}
              <span className={cn("font-mono text-xs", activeYear === y ? "text-accent/70" : "text-muted")}>
                {yearCFU[y] ?? 0} CFU
              </span>
            </button>
          ))}
        </div>

        {/* Semester sections */}
        {[1, 2, "A" as const].map((sem) => {
          const semCourses = yearCourses.filter((c) => c && !c.isLinkedExam && c.semester === sem);
          return (
            <Card key={String(sem)}>
              <CardHeader>
                <CardTitle>{SEMESTER_LABEL[sem]}</CardTitle>
                <span className="text-xs text-muted">{semCourses.reduce((s, c) => s + (c?.cfu ?? 0), 0)} CFU</span>
              </CardHeader>
              <div className="px-4 pb-4 space-y-2">
                {semCourses.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted">Nessun corso aggiunto.</p>
                )}
                {semCourses.map((course) => {
                  if (!course) return null;
                  const linkedInPlan = course.linkedExams?.filter((le) => piano[activeYear].courses.includes(le.code)) ?? [];
                  return (
                    <div key={course.code} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-primary">{course.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-muted">{course.cfu} CFU</span>
                          {course.type.map((t) => (
                            <span key={t} className={cn("rounded px-1 py-0.5 text-[10px] font-bold", TYPE_COLORS[t] ?? "")}>
                              {t}
                            </span>
                          ))}
                          {course.electiveGroup && (
                            <Badge variant="neutral" className="text-[10px] py-0">{course.electiveGroup}</Badge>
                          )}
                          {linkedInPlan.map((le) => (
                            <span key={le.code} className="text-[10px] text-muted">+{le.name} ({le.cfu} CFU)</span>
                          ))}
                        </div>
                      </div>
                      {!course.isCompulsory && (
                        <button
                          onClick={() => removeCourse(activeYear, course.code)}
                          className="shrink-0 rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition"
                          title="Rimuovi corso"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)} className="w-full border border-dashed border-border mt-1">
                  <Plus className="size-4" />
                  Aggiungi corso
                </Button>
              </div>
            </Card>
          );
        })}

        {/* Save bar */}
        <div className="flex items-center gap-3">
          <Button variant="primary" onClick={save} disabled={isPending}>
            <GraduationCap className="size-4" />
            {isPending ? "Salvataggio…" : "Salva Piano"}
          </Button>
          {saveMsg && (
            <span className={cn("text-sm", saveMsg.ok ? "text-success" : "text-danger")}>
              {saveMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Validation sidebar */}
      <aside className="hidden lg:block w-72 shrink-0 overflow-y-auto border-l border-border bg-background-soft p-4">
        <p className="mb-4 text-xs font-semibold text-muted uppercase tracking-wide">Validazione Piano</p>
        <ValidationPanel issues={issues} />
      </aside>

      <AddCourseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        year={activeYear}
        track={track}
        piano={piano}
        onAdd={addCourse}
      />
    </div>
  );
}
