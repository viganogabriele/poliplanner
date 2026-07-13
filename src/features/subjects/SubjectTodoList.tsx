"use client";

import { useMemo, useOptimistic, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { setLessonModeAction, toggleLessonAction } from "@/app/actions";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { LESSON_MODE_LABELS, type LessonMode } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
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
    return (
      <p className="py-6 text-center text-sm text-muted">Nessuna lezione arretrata. 🎉</p>
    );
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
            className="flex items-center gap-3 rounded-card border border-border bg-surface-muted/60 px-4 py-3 transition"
          >
            <input
              type="checkbox"
              checked={false}
              onChange={(e) => handleToggle(item.id, e.target.checked)}
              disabled={isPending}
              aria-label={`Segna la lezione del ${item.lesson_date} come completata`}
              className="size-5 cursor-pointer rounded accent-accent"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">
                {WEEKDAY_LABELS[item.weekday]}, <span className="tabular-nums">{item.lesson_date}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleModeToggle(item.id, mode)}
              disabled={isPending}
              aria-label={`Cambia modalità: attualmente ${LESSON_MODE_LABELS[mode]}`}
              className="transition hover:opacity-80 disabled:cursor-not-allowed"
            >
              <Badge variant={mode === "presenza" ? "active" : "warning"}>
                {LESSON_MODE_LABELS[mode]}
              </Badge>
            </button>
          </motion.li>
        );
      })}
      </AnimatePresence>
    </ul>
  );
}
