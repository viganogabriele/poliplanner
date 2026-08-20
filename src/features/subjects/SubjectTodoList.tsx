"use client";

import { useMemo, useOptimistic, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeftRight } from "lucide-react";
import { setLessonModeAction, toggleLessonAction } from "@/app/actions";
import { formatItalianDate, WEEKDAY_LABELS } from "@/lib/dates";
import { LESSON_MODE_LABELS, type LessonMode } from "@/lib/types";
import { cn } from "@/lib/ui";
import type { SubjectLesson } from "@/lib/subjects";

interface SubjectTodoListProps {
  items: SubjectLesson[];
}

export default function SubjectTodoList({ items }: SubjectTodoListProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticDone, addOptimisticDone] = useOptimistic(
    new Set<number>(),
    (current, id: number) => { const next = new Set(current); next.add(id); return next; }
  );
  const [optimisticModes, updateOptimisticMode] = useOptimistic(
    {} as Record<number, LessonMode>,
    (state, update: { id: number; mode: LessonMode }) => ({ ...state, [update.id]: update.mode })
  );

  function handleToggle(id: number, checked: boolean) {
    startTransition(async () => {
      if (checked) addOptimisticDone(id);
      await toggleLessonAction(id, checked);
    });
  }

  function handleModeToggle(id: number, mode: LessonMode) {
    const next: LessonMode = mode === "asincrona" ? "presenza" : "asincrona";
    startTransition(async () => {
      updateOptimisticMode({ id, mode: next });
      await setLessonModeAction(id, next);
    });
  }

  const visibleItems = useMemo(
    () => items.filter((item) => !optimisticDone.has(item.id)),
    [items, optimisticDone]
  );

  if (visibleItems.length === 0) {
    return <p className="py-5 text-center text-sm text-muted">Nessuna lezione arretrata.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
      {visibleItems.map((item) => {
        const mode = optimisticModes[item.id] ?? item.mode;
        return (
          <motion.li
            key={item.id}
            layout
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2.5 rounded-control border border-border bg-surface-muted/40 px-3 py-2.5 transition hover:border-border-strong"
          >
            <label className="grid size-8 shrink-0 place-items-center">
              <input
                type="checkbox"
                checked={false}
                onChange={(e) => handleToggle(item.id, e.target.checked)}
                disabled={isPending}
                aria-label={`Segna la lezione del ${formatItalianDate(item.lesson_date, "long")} come completata`}
                className="size-5 cursor-pointer rounded accent-accent"
              />
            </label>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-secondary">
                {WEEKDAY_LABELS[item.weekday]}{" "}
                <span className="font-medium text-primary">{formatItalianDate(item.lesson_date, "long")}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleModeToggle(item.id, mode)}
              disabled={isPending}
              aria-label={`Cambia modalità: attualmente ${LESSON_MODE_LABELS[mode]}`}
              title={`Passa a ${mode === "asincrona" ? "in presenza" : "asincrona"}`}
              className={cn(
                "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-45",
                mode === "presenza"
                  ? "border-accent/30 bg-accent/10 text-accent hover:border-accent/60"
                  : "border-warning/30 bg-warning/10 text-warning hover:border-warning/60"
              )}
            >
              <ArrowLeftRight className="size-3" aria-hidden="true" />
              {mode === "asincrona" ? "Asincrona" : "In presenza"}
            </button>
          </motion.li>
        );
      })}
      </AnimatePresence>
    </ul>
  );
}
