"use client";

import { useId, useMemo, useState, useOptimistic, useTransition } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, ChevronUp, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { findCourse, getCatalog } from "@/lib/polimi/catalog";
import { careerAverage, estimateFinalGrade } from "@/lib/polimi/gradeCalc";
import { GRADE_MIN, GRADE_MAX, REINSERTION_ORIGINS } from "@/lib/polimi/constraints";
import { markExamRegisteredAction, setExamStatusAction, setExamGradeAction } from "@/app/actions";
import { celebrate, celebrateBig } from "@/components/ui/Confetti";
import InfoButton from "@/components/ui/InfoButton";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Callout from "@/components/ui/Callout";
import EmptyState from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { fieldLabelClass, inputClass, selectClass } from "@/components/ui/Field";
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
  const yearFilterId = useId();
  const statusFilterId = useId();
  const [, startTransition] = useTransition();

  // Il catalogo è quello dell'anno accademico del piano: non esiste un anno "di default".
  const catalog = useMemo(() => getCatalog(scenario.cycle.academicYear), [scenario.cycle.academicYear]);
  const rows = useMemo(
    () =>
      entries
        .map((entry) => ({ entry, course: findCourse(catalog, entry.courseCode) }))
        .filter(isExamCourseRow),
    [entries, catalog]
  );
  const sumCfu = (selected: typeof rows) => selected.reduce((total, row) => total + row.course.cfu, 0);

  // La media e i CFU acquisiti guardano l'intera carriera; le due metriche di piano
  // guardano solo l'anno accademico corrente.
  const { average, registeredCfu: passedCFU } = useMemo(
    () => careerAverage(optimisticExams, scenario.cycle.academicYear),
    [optimisticExams, scenario.cycle.academicYear]
  );
  const estimatedFinal = useMemo(() => estimateFinalGrade(average), [average]);

  const newFrequencyCFU = sumCfu(rows.filter(({ entry }) => !REINSERTION_ORIGINS.includes(entry.origin)));
  const reinsertedCFU = sumCfu(rows.filter(({ entry }) => REINSERTION_ORIGINS.includes(entry.origin)));
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
              "fixed right-4 top-[4.5rem] z-50 max-w-[calc(100vw-2rem)] rounded-card border px-4 py-3 text-sm font-medium shadow-elevated lg:top-6",
              toast.variant === "success" ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metriche: l'InfoButton vive nell'intestazione del riquadro, non sopra al numero. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Media pesata"
          value={average ? average.toFixed(2) : "—"}
          hint={average ? `stima laurea ${estimatedFinal}/110` : "nessun voto verbalizzato"}
          accent={average ? "sky" : undefined}
          info={
            <InfoButton size="sm" title="Media pesata">
              <p>Media ponderata sui CFU degli esami <strong>verbalizzati</strong> con voto.</p>
              <p>Non include esami senza voto o non ancora verbalizzati.</p>
            </InfoButton>
          }
        />
        <StatTile label="CFU verbalizzati" value={`${passedCFU}`} hint="acquisiti in carriera" accent="green" />
        <StatTile
          label="CFU nuove frequenze"
          value={`${newFrequencyCFU}`}
          hint="di quest'anno accademico"
          info={
            <InfoButton size="sm" title="CFU nuove frequenze">
              <p>Corsi che segui per la prima volta in questo anno accademico.</p>
              <p>Sono i soli conteggiati per la contribuzione: i reinserimenti sono già stati pagati.</p>
            </InfoButton>
          }
        />
        <StatTile
          label="CFU reinseriti"
          value={`${reinsertedCFU}`}
          hint="frequenze già acquisite"
          accent="amber"
          info={
            <InfoButton size="sm" title="CFU reinseriti">
              <p>Esami già frequentati e non ancora verbalizzati, riportati nel piano di quest&apos;anno.</p>
              <p>Non contano nei CFU di nuova frequenza.</p>
            </InfoButton>
          }
        />
      </div>

      {unregisteredCount > 0 && (
        <Callout
          tone="warning"
          title={unregisteredCount === 1
            ? "1 esame superato non verbalizzato"
            : `${unregisteredCount} esami superati non verbalizzati`}
        >
          Non scalano i recuperi e non entrano nella media finché non risultano verbalizzati.
        </Callout>
      )}

      <section aria-label="Filtri esami" className="rounded-card border border-border bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-primary">Filtri</h2>
            <p className="mt-0.5 text-xs text-muted">
              {filtered.length} {filtered.length === 1 ? "esame visualizzato" : "esami visualizzati"} su {rows.length}
            </p>
          </div>
          {(filterYear !== "all" || filterStatus !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setFilterYear("all"); setFilterStatus("all"); }}
            >
              Reimposta filtri
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-2xl">
          <div className="space-y-1.5">
            <span className="flex min-h-7 items-center gap-1">
              <label htmlFor={yearFilterId} className={fieldLabelClass}>Anno</label>
            </span>
            <select
              id={yearFilterId}
              value={filterYear === "all" ? "all" : String(filterYear)}
              onChange={(e) => setFilterYear(e.target.value === "all" ? "all" : Number(e.target.value) as 1|2|3)}
              className={selectClass()}
            >
              <option value="all">Tutti gli anni</option>
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>Anno {y}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <span className="flex min-h-7 items-center gap-1">
              <label htmlFor={statusFilterId} className={fieldLabelClass}>Stato</label>
              <InfoButton size="sm" title="Stati esame">
                <p><strong>Da fare</strong>: esame non ancora affrontato.</p>
                <p><strong>Non passato</strong>: tentato ma non superato.</p>
                <p><strong>Superato</strong>: passato, in attesa di verbalizzazione.</p>
                <p><strong>Verbalizzato</strong>: registrato ufficialmente, contribuisce alla media.</p>
                <p><strong>Senza frequenza</strong>: corso senza esame associato.</p>
                <p><strong>Non richiesto</strong>: non necessario per il piano.</p>
              </InfoButton>
            </span>
          <select
            id={statusFilterId}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className={selectClass()}
          >
            <option value="all">Tutti gli stati</option>
            {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          </div>
        </div>
      </section>

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
                    {/* Riga compatta */}
                    <div className="flex flex-wrap items-center gap-3 px-1 py-3 sm:px-2">
                      <div className="min-w-[11rem] flex-1">
                        {calendarSubject ? (
                          <Link href={`/materie/${encodeURIComponent(calendarSubject)}`} title={course.name} className="line-clamp-2 text-sm font-medium text-primary transition hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50">
                            {course.name}
                          </Link>
                        ) : (
                          <p className="line-clamp-2 text-sm font-medium text-primary" title={course.name}>{course.name}</p>
                        )}
                        <p className="mt-0.5 text-xs text-muted">
                          {course.cfu} CFU · {entry.position === "supernumerary" ? "in soprannumero" : "conta nei 180 CFU"}
                          {!entry.feeCounted && " · frequenza già acquisita"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[exam.status]}>{STATUS_LABELS[exam.status]}</Badge>
                        {isPassed && exam.grade && (
                          <span className="font-mono text-sm font-semibold text-success">{exam.grade}/30</span>
                        )}
                        <IconButton
                          onClick={() => setExpandedExam(isExpanded ? null : entry.courseCode)}
                          label={isExpanded ? `Chiudi modifica di ${course.name}` : `Modifica ${course.name}`}
                          size="md"
                        >
                          {isExpanded ? <ChevronUp className="size-3.5" /> : <Pencil className="size-3.5" />}
                        </IconButton>
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
                                className={selectClass("min-h-10 w-auto py-1 text-xs")}
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
                                    className={inputClass("min-h-10 w-auto py-1 text-xs")}
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
                                  className={inputClass("min-h-10 w-auto py-1 text-xs")}
                                />
                              </FieldShell>
                            )}
                            {exam.status === "passed_unregistered" && (
                              <Button size="sm" variant="secondary" onClick={() => markRegistered(entry.courseCode)}>
                                <CheckCircle2 className="size-4" />
                                Segna verbalizzato
                              </Button>
                            )}
                            <IconButton
                              onClick={() => setExpandedExam(null)}
                              label={`Chiudi modifica di ${course.name}`}
                              size="md"
                              className="ml-auto border-transparent bg-transparent"
                            >
                              <X className="size-3.5" />
                            </IconButton>
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
        <EmptyState
          title="Nessun esame corrisponde ai filtri"
          description="Rimuovi o cambia un filtro per rivedere gli esami del piano."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => { setFilterYear("all"); setFilterStatus("all"); }}
            >
              Reimposta filtri
            </Button>
          }
        />
      )}

      <p className="text-xs text-muted">
        Verbalizzati {registeredCount} su {rows.length}. La media considera solo gli esami verbalizzati con voto.
      </p>
    </div>
  );
}

function FieldShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
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
        selectClass("min-h-10 w-20 py-1 text-xs font-mono"),
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

function isExamCourseRow(row: { entry: PlanEntry; course: ReturnType<typeof findCourse> }): row is { entry: PlanEntry; course: NonNullable<ReturnType<typeof findCourse>> } {
  if (!row.course) return false;
  return !row.course.isLinkedExam;
}
