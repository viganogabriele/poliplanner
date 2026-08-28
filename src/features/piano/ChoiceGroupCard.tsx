"use client";

import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { findCourse, type Catalog } from "@/lib/polimi/catalog";
import type { ChoiceGroupProgress } from "@/lib/polimi/choiceGroups";
import { cn } from "@/lib/ui";
import CourseInfoCard, { courseMetaItems } from "./CourseInfoCard";

/**
 * "GRUPPO A SCELTA": mirror della card dello strumento ufficiale. Mostra quanti CFU del gruppo
 * sono già coperti, le voci già scelte, e apre il catalogo filtrato su questo gruppo specifico
 * per completarlo.
 */

type Props = {
  catalog: Catalog;
  group: ChoiceGroupProgress;
  readOnly: boolean;
  onSelect: () => void;
};

export default function ChoiceGroupCard({ catalog, group, readOnly, onSelect }: Props) {
  const missing = Math.max(group.requiredCfu - group.selectedCfu, 0);
  const fillPct = Math.min((group.selectedCfu / Math.max(group.requiredCfu, 1)) * 100, 100);

  return (
    <div className={cn(
      "rounded-card border p-4 transition-colors duration-300",
      group.satisfied ? "border-success/25 bg-success/5" : "border-warning/30 bg-warning/5"
    )}>
      <div className="flex items-start gap-2">
        {group.satisfied
          ? <CheckCircle2 key="done" className="animate-pop mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{group.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {group.satisfied
              ? `Completo: ${group.selectedCfu} CFU selezionati su ${group.requiredCfu}.`
              : `Seleziona insegnamenti da ${group.tablesLabel} per un totale di ${group.requiredCfu} CFU: mancano ${missing} CFU.`}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-[var(--ease-spring)]",
                  group.satisfied ? "bg-success" : "progress-fill"
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted">
              <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
              {group.selectedCfu}/{group.requiredCfu}
            </span>
          </div>
        </div>
      </div>

      {group.entries.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {group.entries.map((entry) => {
            const course = findCourse(catalog, entry.courseCode);
            return (
              <CourseInfoCard
                key={entry.courseCode}
                title={course?.name ?? entry.courseCode}
                metadata={courseMetaItems(entry.courseYear, entry.semester, course?.cfu ?? 0)}
                tone="success"
              />
            );
          })}
        </div>
      )}

      {!readOnly && (
        <Button variant="secondary" size="sm" onClick={onSelect} className="mt-3">
          {group.entries.length > 0 ? "Modifica insegnamenti" : "Seleziona insegnamenti"}
        </Button>
      )}
    </div>
  );
}
