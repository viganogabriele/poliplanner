"use client";

import { useEffect, useMemo, useRef, useState, useOptimistic, useTransition } from "react";
import Link from "next/link";
import { MoreHorizontal, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toggleLessonAction, resetCompletionsAction, setLessonModeAction } from "@/app/actions";
import { formatItalianDate, WEEKDAY_LABELS } from "@/lib/dates";
import { LESSON_MODE_LABELS, type TodoItem, type LessonMode } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import InfoButton from "@/components/ui/InfoButton";

interface TodoListProps {
  items: TodoItem[];
  configured: boolean;
}

export default function TodoList({ items, configured }: TodoListProps) {
  const [isPending, startTransition] = useTransition();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [optimisticDone, setOptimisticDone] = useState<Set<number>>(new Set());
  const [lastCompleted, setLastCompleted] = useState<TodoItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [optimisticModes, updateOptimisticMode] = useOptimistic(
    {} as Record<number, LessonMode>,
    (state, update: { id: number; mode: LessonMode }) => ({ ...state, [update.id]: update.mode })
  );

  function handleToggle(item: TodoItem, checked: boolean) {
    if (checked) {
      setOptimisticDone((current) => new Set(current).add(item.id));
      setLastCompleted(item);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => setLastCompleted(null), 6000);
    }
    startTransition(async () => {
      await toggleLessonAction(item.id, checked);
    });
  }

  function undoLastCompletion() {
    if (!lastCompleted) return;
    const item = lastCompleted;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setLastCompleted(null);
    setOptimisticDone((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    startTransition(async () => {
      await toggleLessonAction(item.id, false);
    });
  }

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

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
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-border px-3 text-muted transition hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 [&::-webkit-details-marker]:hidden">
            <MoreHorizontal className="size-4" aria-hidden="true" />
            <span className="hidden text-xs font-semibold sm:inline">Azioni</span>
            <span className="sr-only sm:hidden">Altre azioni</span>
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
          <div className="mb-2 text-3xl" aria-hidden="true">{configured ? "🎉" : "📅"}</div>
          <h3 className="text-base font-semibold text-primary">{configured ? "Sei in pari!" : "Calendario non configurato"}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {configured
              ? "Le lezioni arretrate o previste per oggi appariranno qui."
              : "Aggiungi le ricorrenze settimanali per iniziare a monitorare le lezioni."}
          </p>
          {!configured && (
            <Link href="/calendar" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              Configura calendario
            </Link>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {groups.map(([date, groupItems]) => (
              <motion.div key={date} layout exit={{ opacity: 0, height: 0 }}>
                {/* Date header */}
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {WEEKDAY_LABELS[groupItems[0].weekday]}, {formatItalianDate(date, "long")}
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
                          <label className="-m-2 grid size-10 shrink-0 place-items-center">
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={(e) => handleToggle(item, e.target.checked)}
                              aria-label={`Segna ${item.subject} del ${formatItalianDate(date, "long")} come completata`}
                              disabled={isPending}
                              className="size-5 cursor-pointer rounded border-border bg-background-soft accent-accent disabled:cursor-not-allowed"
                            />
                          </label>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/materie/${encodeURIComponent(item.subject)}`}
                              title={item.subject}
                              className="line-clamp-2 text-sm font-semibold text-primary transition hover:text-accent sm:line-clamp-1"
                            >
                              {item.subject}
                            </Link>
                            <div className="mt-0.5 text-xs text-muted">
                              <span className="tabular-nums">{formatItalianDate(date)}</span>
                              <span className="ml-2">{LESSON_MODE_LABELS[mode]}</span>
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
                            className="inline-flex min-h-10 items-center rounded-lg px-1 transition hover:bg-surface-hover disabled:cursor-not-allowed"
                          >
                            <Badge variant={mode === "presenza" ? "active" : "warning"}>
                              {mode === "asincrona" ? "Asincrona" : "In presenza"}
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

      <AnimatePresence>
        {lastCompleted && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            role="status"
            className="fixed inset-x-4 z-40 flex items-center justify-between gap-3 rounded-xl border border-border-strong bg-surface-elevated px-4 py-3 text-sm shadow-elevated sm:left-auto sm:right-5 sm:w-[24rem]"
            style={{ bottom: "calc(6.5rem + env(safe-area-inset-bottom))" }}
          >
            <span className="min-w-0 truncate text-secondary">Lezione completata: {lastCompleted.subject}</span>
            <button type="button" onClick={undoLastCompletion} className="min-h-10 shrink-0 rounded-lg px-2 font-semibold text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
              Annulla
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
