"use client";
// TodoList — Client Component
//
// Shows lessons that are overdue or scheduled for today,
// each with a checkbox to mark them as done.
//
// Why Client? Checkboxes need onChange handlers, and we use
// useOptimistic to make the UI feel instant: the checkbox appears
// checked immediately, before the server action completes.
//
// useOptimistic is a React 19 hook. It lets you apply a local
// "optimistic" state while an async operation is in flight, then
// reconcile with the real server state when it finishes.

import { useOptimistic, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { toggleLessonAction, resetCompletionsAction } from "@/app/actions";
import { WEEKDAY_LABELS } from "@/lib/dates";
import type { TodoItem } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface TodoListProps {
  items: TodoItem[];
}

export default function TodoList({ items }: TodoListProps) {
  // useTransition lets us mark async operations as "pending" without
  // blocking the UI thread. isPending becomes true while an action runs.
  const [isPending, startTransition] = useTransition();

  // Optimistic state: a Set of IDs we've optimistically marked as done.
  // When the user checks a box, we add to this set immediately so the UI
  // responds at once. The server action runs in the background, and Next.js
  // re-renders the page with real DB data when it completes.
  const [optimisticDone, addOptimistic] = useOptimistic(
    new Set<number>(),
    (current, id: number) => {
      const next = new Set(current);
      next.add(id);
      return next;
    }
  );

  function handleToggle(item: TodoItem, checked: boolean) {
    startTransition(async () => {
      if (checked) addOptimistic(item.id);
      await toggleLessonAction(item.id, checked);
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetCompletionsAction();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          {items.length === 0
            ? "Nessuna lezione da seguire."
            : `${items.length} lezioni arretrate da recuperare.`}
        </p>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleReset}
          disabled={isPending}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset completate
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/60 p-8 text-center">
          <h3 className="text-base font-semibold text-primary">
            Sei in pari con tutte le lezioni
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Le lezioni arretrate o previste per oggi appariranno qui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const isDone = optimisticDone.has(item.id);
            return (
              <li
                key={item.id}
                className={`flex flex-col gap-3 rounded-card border border-border bg-surface-muted/60 px-4 py-4 shadow-inset transition hover:border-border-strong hover:bg-surface-hover sm:flex-row sm:items-center ${
                  isDone ? "opacity-50" : ""
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={(e) => handleToggle(item, e.target.checked)}
                    disabled={isPending}
                    className="mt-0.5 size-5 cursor-pointer rounded border-border bg-background-soft accent-accent disabled:cursor-not-allowed"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-primary">
                      {item.subject}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {WEEKDAY_LABELS[item.weekday]} ·{" "}
                      <span className="tabular-nums">{item.lesson_date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant={item.mode === "presenza" ? "active" : "warning"}>
                    {item.mode}
                  </Badge>
                  <Badge
                    dot
                    variant={
                      isDone
                        ? "success"
                        : item.status === "late"
                        ? "danger"
                        : "warning"
                    }
                  >
                    {isDone
                      ? "completata"
                      : item.status === "late"
                      ? "arretrata"
                      : "oggi"}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
