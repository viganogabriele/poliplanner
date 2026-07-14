"use client";

import { useMemo, useState, useOptimistic, useTransition } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, ChevronUp, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { getCourse } from "@/lib/polimi/courses";
import { sumCFU } from "@/lib/polimi/cfuCalc";
import { weightedAverage, estimateFinalGrade } from "@/lib/polimi/gradeCalc";
import { GRADE_MIN, GRADE_MAX } from "@/lib/polimi/constraints";
import { markExamRegisteredAction, setExamStatusAction, setExamGradeAction } from "@/app/actions";
import { celebrate, celebrateBig } from "@/components/ui/Confetti";
import InfoButton from "@/components/ui/InfoButton";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import StatTile from "@/components/ui/StatTile";
import { cn } from "@/lib/ui";
import { today } from "@/lib/dates";
import type { ExamsMap, ExamRecord } from "@/lib/esami";
import type { PlanEntry, PlanScenario } from "@/lib/piano";
import type { ExamStatus } from "@/lib/polimi/constraints";

const STATUS_LABELS: Record<ExamStatus, string> = {
  planned: "Da fare",
  not_passed: "Non passato",
  passed_unregistered: "Superato, non verbalizzato",
  passed_registered: "Verbalizzato",
  no_class: "Senza frequenza",
  not_required: "Non richiesto",
};

const STATUS_VARIANT: Record<ExamStatus, "neutral" | "success" | "warning" | "danger"> = {
  planned: "neutral",
  not_passed: "danger",
  passed_unregistered: "warning",
  passed_registered: "success",
  no_class: "warning",
  not_required: "warning",
};

type Props = { initialExams: ExamsMap; scenario: PlanScenario; calendarSubjectByCourse: Record<string, string> };
type MutationResult = { ok: boolean; error?: string };
type Toast = { message: string; variant: "success" | "danger" };

export default function EsamiClient({ initialExams, scenario, calendarSubjectByCourse }: Props) {
  const router = useRouter();
  const [optimisticExams, updateOptimisticExams] = useOptimistic(
    initialExams,
    (state, update: { code: string; exam: ExamRecord }) => ({
      ...state,
      [update.code]: update.exam,
    })
  );
  const entries = scenario.entries;
  const [filterYear, setFilterYear] = useState<"all" | 1 | 2 | 3>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | ExamStatus>("all");
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [, startTransition] = useTransition();

  const rows = useMemo(
    () =>
      entries
        .map((entry) => ({ entry, course: getCourse(entry.courseCode) }))
        .filter(isExamCourseRow),
    [entries]
  );

  const { average, passedCFU } = useMemo(() => weightedAverage(optimisticExams, entries), [optimisticExams, entries]);
  const estimatedFinal = useMemo(() => estimateFinalGrade(average), [average]);

  const feeCFU = sumCFU(
    rows
      .filter(({ entry }) =>
        entry.feeCounted &&
        (entry.courseYear === scenario.cycle.studentYear ||
          ["carried_over", "recovery_reinserted"].includes(entry.origin))
      )
      .map(({ course }) => course)
  );
  const recoveredCFU = sumCFU(
    rows
      .filter(({ entry }) => !entry.feeCounted && ["carried_over", "recovery_reinserted"].includes(entry.origin))
      .map(({ course }) => course)
  );
  const registeredCount = rows.filter(
    ({ entry }) =>
      entry.position === "effective" && optimisticExams[entry.courseCode]?.status === "passed_registered"
  ).length;
  const unregisteredCount = rows.filter(
    ({ entry }) =>
      entry.position === "effective" && optimisticExams[entry.courseCode]?.status === "passed_unregistered"
  ).length;

  const availableYears = useMemo(
    () => [...new Set(rows.map((r) => r.entry.courseYear))].sort() as (1 | 2 | 3)[],
    [rows]
  );

  const filtered = useMemo(
    () =>
      rows.filter(({ entry }) => {
        if (filterYear !== "all" && entry.courseYear !== filterYear) return false;
        if (filterStatus !== "all" && (optimisticExams[entry.courseCode]?.status ?? "planned") !== filterStatus) return false;
        return true;
      }),
    [rows, optimisticExams, filterYear, filterStatus]
  );

  const showToast = (message: string, variant: Toast["variant"] = "success") => {
    setToast({ message, variant });
    setTimeout(() => setToast(null), 3000);
  };

  const byCourse = (code: string): ExamRecord =>
    optimisticExams[code] ?? {
      status: "planned" as ExamStatus,
      grade: null,
      passedAt: null,
      registeredAt: null,
      updatedAt: new Date().toISOString(),
    };

  const runExamMutation = (
    code: string,
    exam: ExamRecord,
    mutation: () => Promise<MutationResult>,
    onSuccess?: () => void
  ) => {
    startTransition(async () => {
      updateOptimisticExams({ code, exam });
      try {
        const result = await mutation();
        if (!result.ok) throw new Error(result.error ?? "Salvataggio non riuscito.");
        onSuccess?.();
        router.refresh();
      } catch (error) {
        router.refresh();
        showToast(error instanceof Error ? error.message : "Salvataggio non riuscito.", "danger");
      }
    });
  };

  const updateStatus = (code: string, status: ExamStatus) => {
    const current = byCourse(code);
    const passedAt = status.startsWith("passed_") ? current.passedAt ?? today() : null;
    const registeredAt = status === "passed_registered" ? current.registeredAt ?? today() : null;
    const newExam: ExamRecord = {
      ...(current),
      status,
      grade: status.startsWith("passed_") ? current.grade : null,
      passedAt,
      registeredAt,
      updatedAt: new Date().toISOString(),
    };
    runExamMutation(
      code,
      newExam,
      () => setExamStatusAction(code, status, { passedAt, registeredAt }),
      () => {
      if (status === "passed_registered") {
        celebrateBig();
        showToast("Congratulazioni! Esame verbalizzato 🎓");
      } else if (status === "passed_unregistered") {
        celebrate();
        showToast("Esame superato! Non dimenticare di verbalizzarlo 🎉");
      }
      }
    );
  };

  const updateGrade = (code: string, gradeStr: string) => {
    const current = byCourse(code);
    const newExam: ExamRecord = {
      ...current,
      status: current.status === "passed_registered" ? "passed_registered" : "passed_unregistered",
      grade: gradeStr || null,
      passedAt: current.passedAt ?? today(),
      updatedAt: new Date().toISOString(),
    };
    runExamMutation(code, newExam, () => setExamGradeAction(code, gradeStr || null));
  };

  const updateDate = (code: string, field: "passedAt" | "registeredAt", value: string) => {
    const current = byCourse(code);
    const newExam: ExamRecord = { ...current, [field]: value || null, updatedAt: new Date().toISOString() };
    runExamMutation(
      code,
      newExam,
      () => setExamStatusAction(code, newExam.status, { passedAt: newExam.passedAt, registeredAt: newExam.registeredAt })
    );
  };

  const markRegistered = (code: string) => {
    const registeredAt = today();
    const current = byCourse(code);
    const newExam: ExamRecord = {
      ...current,
      status: "passed_registered",
      passedAt: current.passedAt ?? registeredAt,
      registeredAt,
      updatedAt: new Date().toISOString(),
    };
    runExamMutation(
      code,
      newExam,
      () => markExamRegisteredAction(code, registeredAt),
      () => {
        celebrateBig();
        showToast("Congratulazioni! Esame verbalizzato 🎓");
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            role="status"
            className={cn(
              "fixed right-4 top-20 z-50 rounded-xl border px-4 py-3 text-sm font-semibold shadow-elevated",
              toast.variant === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="relative">
          <StatTile label="Media Pesata" value={average ? average.toFixed(2) : "—"} accent="sky" />
          <div className="absolute right-2 top-2">
            <InfoButton title="Media Pesata">
              <p>Media ponderata sui CFU degli esami <strong>verbalizzati</strong> con voto.</p>
              <p>Non include esami senza voto o non ancora verbalizzati.</p>
              {average && <p className="mt-1 text-accent">Stima laurea: {estimatedFinal}/110</p>}
            </InfoButton>
          </div>
        </div>
        <StatTile label="CFU Registrati" value={`${passedCFU}`} accent="green" />
        <div className="relative">
          <StatTile label="CFU Tassa Anno" value={`${feeCFU}`} />
          <div className="absolute right-2 top-2">
            <InfoButton title="CFU Tassa Anno">
              <p>CFU per cui paghi la tassa di iscrizione nell&apos;anno corrente.</p>
              <p>Include i corsi effettivi dell&apos;anno + i recuperi non ancora verbalizzati.</p>
            </InfoButton>
          </div>
        </div>
        <div className="relative">
          <StatTile label="Recuperi Scalati" value={`${recoveredCFU}`} accent="green" />
          <div className="absolute right-2 top-2">
            <InfoButton title="Recuperi Scalati">
              <p>CFU di esami recuperati che sono stati verbalizzati e quindi <strong>non paghi</strong> di tassa.</p>
            </InfoButton>
          </div>
        </div>
      </div>

      {/* Warning for unregistered */}
      {unregisteredCount > 0 && (
        <Card className="border-warning/30 bg-[linear-gradient(180deg,rgba(245,181,76,0.10),rgba(10,15,20,0.9))]">
          <p className="text-sm font-semibold text-primary">{unregisteredCount} esame/i superato/i non verbalizzato/i</p>
          <p className="mt-1 text-sm text-muted">Non scalano i recuperi e non entrano in media finché non risultano verbalizzati.</p>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterYear === "all" ? "all" : String(filterYear)}
          onChange={(e) => setFilterYear(e.target.value === "all" ? "all" : Number(e.target.value) as 1|2|3)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-primary outline-none"
        >
          <option value="all">Tutti gli anni</option>
          {availableYears.map((y) => (
            <option key={y} value={String(y)}>Anno {y}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
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
          <InfoButton title="Stati esame">
            <p><strong>Da fare</strong>: esame non ancora affrontato.</p>
            <p><strong>Non passato</strong>: tentato ma non superato.</p>
            <p><strong>Superato</strong>: passato, in attesa di verbalizzazione.</p>
            <p><strong>Verbalizzato</strong>: registrato ufficialmente, contribuisce alla media.</p>
            <p><strong>Senza frequenza</strong>: corso senza esame associato.</p>
            <p><strong>Non richiesto</strong>: non necessario per il piano.</p>
          </InfoButton>
        </div>
        {(filterYear !== "all" || filterStatus !== "all") && (
          <button
            type="button"
            onClick={() => { setFilterYear("all"); setFilterStatus("all"); }}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:text-primary"
          >
            Azzera filtri
          </button>
        )}
      </div>

      {/* Exam groups by year */}
      {availableYears.map((year) => {
        const yearRows = filtered.filter(({ entry }) => entry.courseYear === year);
        if (yearRows.length === 0) return null;
        return (
          <Card key={year}>
            <CardHeader>
              <CardTitle>Anno {year}</CardTitle>
            </CardHeader>
            <div className="divide-y divide-border">
              {yearRows.map(({ entry, course }) => {
                const exam = byCourse(entry.courseCode);
                const isExpanded = expandedExam === entry.courseCode;
                const isPassed = exam.status.startsWith("passed_");
                const isDone = exam.status === "passed_registered";
                const rowKey = entry.id != null ? String(entry.id) : entry.courseCode;
                const calendarSubject = calendarSubjectByCourse[entry.courseCode];

                return (
                  <div
                    key={rowKey}
                    className={cn(
                      "transition",
                      isDone && "border-l-2 border-l-success/40"
                    )}
                  >
                    {/* Compact row */}
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        {calendarSubject ? (
                          <Link href={`/materie/${encodeURIComponent(calendarSubject)}`} className="truncate text-sm font-medium text-primary hover:text-accent transition">
                            {course.name}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-medium text-primary">{course.name}</p>
                        )}
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <p className="text-xs text-muted">{course.cfu} CFU</p>
                          <Badge variant={entry.position === "supernumerary" ? "warning" : "neutral"} className="py-0 text-[10px]">
                            {entry.position === "supernumerary" ? "Soprannumero" : "Effettivo"}
                          </Badge>
                          {!entry.feeCounted && <Badge variant="success" className="py-0 text-[10px]">CFU scalati</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[exam.status]}>{STATUS_LABELS[exam.status]}</Badge>
                        {isPassed && exam.grade && (
                          <span className="font-mono text-sm font-semibold text-success">{exam.grade}/30</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedExam(isExpanded ? null : entry.courseCode)}
                          className="grid size-7 place-items-center rounded-full border border-border text-muted transition hover:border-border-strong hover:text-primary"
                          aria-label={isExpanded ? "Chiudi" : "Modifica"}
                        >
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <Pencil className="size-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded editing area */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center gap-3 border-t border-border/50 bg-surface-muted/40 px-4 py-3">
                            {/* Status select */}
                            <FieldShell label="Stato">
                              <select
                                value={exam.status}
                                onChange={(e) => updateStatus(entry.courseCode, e.target.value as ExamStatus)}
                                className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-primary outline-none"
                              >
                                {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((s) => (
                                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                              </select>
                            </FieldShell>

                            {isPassed && (
                              <>
                                <FieldShell label="Voto">
                                  <GradeInput grade={exam.grade} onChange={(g) => updateGrade(entry.courseCode, g)} />
                                </FieldShell>
                                <FieldShell label="Superato il">
                                  <input
                                    type="date"
                                    value={exam.passedAt ?? ""}
                                    onChange={(e) => updateDate(entry.courseCode, "passedAt", e.target.value)}
                                    className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-primary outline-none"
                                  />
                                </FieldShell>
                              </>
                            )}
                            {exam.status === "passed_registered" && (
                              <FieldShell label="Verbalizzato il">
                                <input
                                  type="date"
                                  value={exam.registeredAt ?? ""}
                                  onChange={(e) => updateDate(entry.courseCode, "registeredAt", e.target.value)}
                                  className="rounded-xl border border-border bg-surface px-2 py-1 text-xs text-primary outline-none"
                                />
                              </FieldShell>
                            )}
                            {exam.status === "passed_unregistered" && (
                              <Button size="sm" variant="secondary" onClick={() => markRegistered(entry.courseCode)}>
                                <CheckCircle2 className="size-4" />
                                Segna verbalizzato
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedExam(null)}
                              className="ml-auto grid size-7 place-items-center rounded-full text-muted transition hover:text-primary"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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

      <p className="text-xs text-muted">
        Esami registrati: {registeredCount} / {rows.length}. La media usa solo esami verbalizzati con voto.
      </p>
    </div>
  );
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
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
        grade ? "border-success/30 text-success" : "text-muted"
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

function isExamCourseRow(row: { entry: PlanEntry; course: ReturnType<typeof getCourse> }): row is { entry: PlanEntry; course: NonNullable<ReturnType<typeof getCourse>> } {
  if (!row.course) return false;
  return !row.course.isLinkedExam;
}
