"use client";

import { useMemo, useState, useTransition } from "react";
import { getCourse } from "@/lib/polimi/courses";
import { allPlanoCodes } from "@/lib/polimi/cfuCalc";
import { weightedAverage, estimateFinalGrade, parseGrade, displayGrade } from "@/lib/polimi/gradeCalc";
import { GRADE_MIN, GRADE_MAX } from "@/lib/polimi/constraints";
import { setExamStatusAction, setExamGradeAction } from "@/app/actions";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import StatTile from "@/components/ui/StatTile";
import { cn } from "@/lib/ui";
import type { ExamsMap } from "@/lib/esami";
import type { Piano } from "@/lib/piano";
import type { ExamStatus } from "@/lib/polimi/constraints";

const STATUS_LABELS: Record<ExamStatus, string> = {
  planned:     "Pianificato",
  passed:      "Superato",
  noclass:     "Non previsto",
  notrequired: "Non obbligatorio",
};

const STATUS_VARIANT: Record<ExamStatus, "neutral" | "success" | "warning" | "danger"> = {
  planned:     "neutral",
  passed:      "success",
  noclass:     "warning",
  notrequired: "warning",
};

type Props = { initialExams: ExamsMap; piano: Piano };

export default function EsamiClient({ initialExams, piano }: Props) {
  const [exams, setExams] = useState<ExamsMap>(initialExams);
  const [filterYear, setFilterYear] = useState<"all" | "1" | "2" | "3">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | ExamStatus>("all");
  const [, startTransition] = useTransition();

  const allCodes = useMemo(() => allPlanoCodes(piano), [piano]);
  const allCourses = useMemo(
    () => allCodes.map(getCourse).filter((c): c is NonNullable<typeof c> => !!c && !c.isLinkedExam),
    [allCodes]
  );

  const { average, passedCFU } = useMemo(() => weightedAverage(exams, piano), [exams, piano]);
  const estimatedFinal = useMemo(() => estimateFinalGrade(average), [average]);
  const passedCount = allCourses.filter((c) => exams[c.code]?.status === "passed").length;
  const totalPlanCFU = allCourses.reduce((s, c) => s + c.cfu, 0);

  const filtered = useMemo(() => allCourses.filter((c) => {
    if (filterYear !== "all" && String(c.year) !== filterYear) return false;
    if (filterStatus !== "all" && (exams[c.code]?.status ?? "planned") !== filterStatus) return false;
    return true;
  }), [allCourses, exams, filterYear, filterStatus]);

  const updateStatus = (code: string, status: ExamStatus) => {
    setExams((prev) => ({ ...prev, [code]: { ...(prev[code] ?? {}), status, grade: status !== "passed" ? null : prev[code]?.grade ?? null } }));
    startTransition(() => setExamStatusAction(code, status));
  };

  const updateGrade = (code: string, gradeStr: string) => {
    const val = gradeStr === "30L" ? "30L" : gradeStr;
    setExams((prev) => ({ ...prev, [code]: { ...(prev[code] ?? { status: "passed" }), grade: val || null } }));
    startTransition(() => setExamGradeAction(code, val || null));
  };

  const byCourse = (code: string) => exams[code] ?? { status: "planned" as ExamStatus, grade: null };

  return (
    <div className="space-y-6 p-5 pb-10">
      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Media Pesata" value={average ? average.toFixed(2) : "—"} accent="sky" />
        <StatTile label="CFU Conseguiti" value={`${passedCFU} / ${totalPlanCFU}`} accent="green" />
        <StatTile label="Esami Superati" value={`${passedCount} / ${allCourses.length}`} />
      </div>
      {average && (
        <p className="text-xs text-muted">Stima voto di laurea: <span className="font-semibold text-primary">{estimatedFinal} / 110</span></p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value as typeof filterYear)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-primary outline-none"
        >
          <option value="all">Tutti gli anni</option>
          <option value="1">Anno 1</option>
          <option value="2">Anno 2</option>
          <option value="3">Anno 3</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-primary outline-none"
        >
          <option value="all">Tutti gli stati</option>
          {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Courses grouped by year */}
      {([1, 2, 3] as const).map((year) => {
        const yearCourses = filtered.filter((c) => c.year === year);
        if (yearCourses.length === 0) return null;
        return (
          <Card key={year}>
            <CardHeader>
              <CardTitle>Anno {year}</CardTitle>
            </CardHeader>
            <div className="divide-y divide-border">
              {yearCourses.map((course) => {
                const exam = byCourse(course.code);
                return (
                  <div key={course.code} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary">{course.name}</p>
                      <p className="text-xs text-muted">{course.cfu} CFU</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={STATUS_VARIANT[exam.status]}>{STATUS_LABELS[exam.status]}</Badge>
                      <select
                        value={exam.status}
                        onChange={(e) => updateStatus(course.code, e.target.value as ExamStatus)}
                        className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-primary outline-none"
                      >
                        {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                      {exam.status === "passed" && (
                        <GradeInput
                          grade={exam.grade}
                          onChange={(g) => updateGrade(course.code, g)}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-16 text-center text-sm text-muted">Nessun esame corrisponde ai filtri selezionati.</p>
      )}
    </div>
  );
}

function GradeInput({ grade, onChange }: { grade: string | null; onChange: (g: string) => void }) {
  const options = Array.from({ length: GRADE_MAX - GRADE_MIN + 1 }, (_, i) => GRADE_MIN + i);
  return (
    <select
      value={grade ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-20 rounded-xl border border-border bg-surface px-2 py-1 text-xs font-mono text-primary outline-none",
        grade ? "text-success border-success/30" : "text-muted"
      )}
    >
      <option value="">— voto</option>
      {options.map((n) => (
        <option key={n} value={String(n)}>{n}</option>
      ))}
      <option value="30L">30L</option>
    </select>
  );
}
