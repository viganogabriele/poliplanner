"use client";

import { ArrowDownToLine, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EXAM_STATUS_LABELS } from "@/lib/polimi/constraints";
import type { PlanValidationResult } from "@/lib/polimi/validation";
import CourseInfoCard, { courseMetaItems } from "./CourseInfoCard";

/**
 * "Reinserisci le frequenze già acquisite": mirror dello step ufficiale "Frequenze acquisite".
 * Frequenza storica da riportare, non una nuova scelta: non occupa i CFU del gruppo a scelta.
 */

type Props = {
  validation: PlanValidationResult;
  readOnly: boolean;
  onAddReinsertion: (code: string) => void;
};

export default function ReinsertionsPanel({ validation, readOnly, onAddReinsertion }: Props) {
  const { missingReinsertions: pendingReinsertions, requiredReinsertions } = validation;

  if (requiredReinsertions.length === 0) return null;

  if (pendingReinsertions.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-control border border-success/30 bg-success/5 px-4 py-3 text-xs leading-relaxed text-muted">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
        Tutti i {requiredReinsertions.length} reinserimenti dovuti sono già nel piano.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-muted">
        Erano nel tuo piano di un anno precedente e l&apos;esame non è ancora verbalizzato. Vanno riportati
        come erano: non sono nuove scelte e non occupano i CFU del gruppo a scelta.
      </p>
      {pendingReinsertions.map((item) => (
        <CourseInfoCard
          key={item.courseCode}
          title={item.name}
          tone="warning"
          metadata={courseMetaItems(item.courseYear, item.semester, item.cfu)}
          badges={
            <>
              <span className="text-xs text-muted">
                {item.sourceAcademicYear ? `dal piano ${item.sourceAcademicYear}` : "dalla carriera"}
              </span>
              <Badge size="sm" variant="warning">{EXAM_STATUS_LABELS[item.examStatus]}</Badge>
            </>
          }
          action={!readOnly && (
            <Button size="sm" onClick={() => onAddReinsertion(item.courseCode)}>
              <ArrowDownToLine className="size-4" />
              Reinserisci
            </Button>
          )}
        />
      ))}
    </div>
  );
}
