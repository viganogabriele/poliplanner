"use client";

import { useMemo, useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toggleLessonAction, resetCompletionsAction, setLessonModeAction } from "@/app/actions";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { LESSON_MODE_LABELS, type TodoItem, type LessonMode } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import InfoButton from "@/components/ui/InfoButton";

interface TodoListProps {
  items: TodoItem[];
}

export default function TodoList({ items }: TodoListProps) {
  const [isPending, startTransition] = useTransition();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [optimisticDone, addOptimisticDone] = useOptimistic(
    new Set<number>(),
    (current, id: number) => {
      const next = new Set(current);
      next.add(id);
      return next;
    }
  );

  const [optimisticModes, updateOptimisticMode] = useOptimistic(
    {} as Record<number, LessonMode>,
    (state, update: { id: number; mode: LessonMode }) => ({ ...state, [update.id]: update.mode })
  );

  function handleToggle(item: TodoItem, checked: boolean) {
    startTransition(async () => {
      if (checked) addOptimisticDone(item.id);
      await toggleLessonAction(item.id, checked);
    });
  }

  function handleModeToggle(item: TodoItem) {
    const current = optimisticModes[item.id] ?? item.mode;
    const next: LessonMode = current === "asincrona" ? "presenza" : "asincrona";
    startTransition(async () => {
      updateOptimisticMode({ id: item.id, mode: next });
      await setLessonModeAction(item.id, next);
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetCompletionsAction();
    });
  }

  const visibleItems = useMemo(
    () => items.filter((item) => !optimisticDone.has(item.id)),
    [items, optimisticDone]
  );

  // Group by date after optimistic completions so exiting rows can animate.
  const groups = useMemo(() => {
    const map: Record<string, TodoItem[]> = {};
    for (const item of visibleItems) {
      if (!map[item.lesson_date]) map[item.lesson_date] = [];
      map[item.lesson_date].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted">
            {visibleItems.length === 0
              ? "Nessuna lezione da seguire."
              : `${visibleItems.length} ${visibleItems.length === 1 ? "lezione" : "lezioni"} da recuperare.`}
          </p>
          <InfoButton title="Modalità lezione">
            <p><strong>In presenza</strong>: lezione dal vivo, da seguire fisicamente.</p>
            <p><strong>Asincrona</strong>: registrazione/video da guardare autonomamente.</p>
            <p className="mt-1">Clicca il badge modalità per cambiarla sulla singola lezione.</p>
          </InfoButton>
        </div>
        <details className="relative">
          <summary className="grid size-8 cursor-pointer list-none place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-primary [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="size-4" aria-hidden="true" />
            <span className="sr-only">Altre azioni</span>
          </summary>
          <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-border bg-surface-elevated p-1.5 shadow-elevated">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isPending}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset completate
            </button>
          </div>
        </details>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset completate"
        description="Vuoi davvero azzerare tutte le lezioni completate? Questa azione non può essere annullata."
        variant="danger"
        confirmLabel="Reset"
        onConfirm={() => { setShowResetConfirm(false); handleReset(); }}
        onCancel={() => setShowResetConfirm(false)}
      />

      {visibleItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex min-h-64 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/60 p-8 text-center"
        >
          <div className="mb-2 text-3xl">🎉</div>
          <h3 className="text-base font-semibold text-primary">Sei in pari!</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Le lezioni arretrate o previste per oggi appariranno qui.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {groups.map(([date, groupItems]) => (
              <motion.div key={date} layout exit={{ opacity: 0, height: 0 }}>
                {/* Date header */}
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {WEEKDAY_LABELS[groupItems[0].weekday]}, {date}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false}>
                  {groupItems.map((item) => {
                    const mode = optimisticModes[item.id] ?? item.mode;
                    return (
                      <motion.li
                        key={item.id}
                        layout
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ duration: 0.18 }}
                        className="flex flex-col gap-3 rounded-card border border-border bg-surface-muted/60 px-4 py-3 shadow-inset transition hover:border-border-strong hover:bg-surface-hover sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={(e) => handleToggle(item, e.target.checked)}
                            aria-label={`Segna ${item.subject} del ${date} come completata`}
                            disabled={isPending}
                            className="mt-0.5 size-5 cursor-pointer rounded border-border bg-background-soft accent-accent disabled:cursor-not-allowed"
                          />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/materie/${encodeURIComponent(item.subject)}`}
                              className="block truncate text-sm font-semibold text-primary hover:text-accent transition"
                            >
                              {item.subject}
                            </Link>
                            <div className="mt-0.5 text-xs text-muted">
                              <span className="tabular-nums">{date}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleModeToggle(item)}
                            disabled={isPending}
                            title="Clicca per cambiare modalità"
                            aria-label={`Cambia modalità di ${item.subject}: attualmente ${LESSON_MODE_LABELS[mode]}`}
                            className="cursor-pointer transition hover:opacity-80 disabled:cursor-not-allowed"
                          >
                            <Badge variant={mode === "presenza" ? "active" : "warning"}>
                              {LESSON_MODE_LABELS[mode]}
                            </Badge>
                          </button>
                          <Badge
                            dot
                            variant={
                              item.status === "late" ? "danger" : "warning"
                            }
                          >
                            {item.status === "late" ? "arretrata" : "oggi"}
                          </Badge>
                        </div>
                      </motion.li>
                    );
                  })}
                  </AnimatePresence>
                </ul>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
