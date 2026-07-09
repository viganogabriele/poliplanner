"use client";

import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { COURSES } from "@/lib/polimi/courses";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/ui";
import type { Track } from "@/lib/polimi/constraints";
import type { Piano } from "@/lib/piano";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  year: 1 | 2 | 3;
  track: Track;
  piano: Piano;
  onAdd: (code: string) => void;
};

const TYPE_COLORS: Record<string, string> = {
  A: "bg-sky-500/20 text-sky-300",
  B: "bg-violet-500/20 text-violet-300",
  C: "bg-amber-500/20 text-amber-300",
  V: "bg-emerald-500/20 text-emerald-300",
  T: "bg-rose-500/20 text-rose-300",
};

export default function AddCourseModal({ isOpen, onClose, year, track, piano, onAdd }: Props) {
  const [search, setSearch] = useState("");

  const alreadyInPlan = useMemo(() => {
    const codes = new Set<string>();
    ([1, 2, 3] as const).forEach((y) => {
      piano[y].courses.forEach((c) => codes.add(c));
      piano[y].soprannumero.forEach((c) => codes.add(c));
    });
    return codes;
  }, [piano]);

  const available = useMemo(() => {
    const q = search.toLowerCase();
    return COURSES.filter((c) => {
      if (alreadyInPlan.has(c.code)) return false;
      if (c.isLinkedExam) return false;
      if (c.track && c.track !== "both" && c.track !== track) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.code.includes(q)) return false;
      return true;
    });
  }, [alreadyInPlan, track, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-panel border border-border bg-background-soft shadow-elevated">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-primary">Aggiungi corso — Anno {year}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-surface-hover hover:text-primary transition">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <Search className="size-4 shrink-0 text-muted" />
            <input
              type="text"
              placeholder="Cerca per nome o codice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-primary placeholder:text-muted outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {available.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">Nessun corso disponibile.</p>
          )}
          {available.map((course) => (
            <button
              key={course.code}
              onClick={() => { onAdd(course.code); onClose(); setSearch(""); }}
              className={cn(
                "w-full flex items-center justify-between gap-3 rounded-xl border border-transparent px-4 py-3 text-left transition",
                "hover:border-border hover:bg-surface-hover"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-primary">{course.name}</p>
                <p className="text-xs text-muted">{course.code} · Anno {course.year} · {course.cfu} CFU</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {course.type.map((t) => (
                  <span key={t} className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", TYPE_COLORS[t] ?? "bg-surface text-muted")}>
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="w-full">
            Annulla
          </Button>
        </div>
      </div>
    </div>
  );
}
