"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, CopyPlus, GraduationCap, History, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import InfoButton from "@/components/ui/InfoButton";
import { PIANO_GUIDE_SECTIONS, ACTIVITY_CATEGORY_DETAILS } from "@/lib/polimi/guide";
import { getCourse } from "@/lib/polimi/courses";
import { activityCategoryForCourse, sumCFU } from "@/lib/polimi/cfuCalc";
import { getRequiredReinsertions, isValidReinsertionEntry, validatePlanScenario } from "@/lib/polimi/validation";
import { ACADEMIC_YEAR, PROGRAM_IDENTITY, TRACKS } from "@/lib/polimi/constraints";
import { originForAddedCourse, planEntriesToPiano, toDraftEntry } from "@/lib/polimi/planTransforms";
import {
  duplicatePlanForNextAcademicYearAction,
  markPlanCompiledOnPolimiAction,
  markPlanReadyAction,
  savePlanDraftAction,
} from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import ValidationPanel from "./ValidationPanel";
import AddCourseModal from "./AddCourseModal";
import { cn } from "@/lib/ui";
import type { ExamsMap } from "@/lib/esami";
import type { PlanDraftPayload, PlanEntry, PlanScenario } from "@/lib/piano";
import type { PreviousCompiledEntry } from "@/lib/polimi/validation";
import type { EntryOrigin, EntryPosition, PlanStatus, PlanValidationMode, Track } from "@/lib/polimi/constraints";

type Props = {
  initialScenario: PlanScenario;
  initialExams: ExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  baseRevisionScenario: PlanScenario | null;
};

const SEMESTER_LABEL: Record<string | number, string> = { 1: "1° Semestre", 2: "2° Semestre", A: "Annuale" };

const TYPE_COLORS: Record<string, string> = {
  A: "bg-sky-500/20 text-sky-300",
  B: "bg-violet-500/20 text-violet-300",
  C: "bg-amber-500/20 text-amber-300",
  D: "bg-fuchsia-500/20 text-fuchsia-300",
  V: "bg-emerald-500/20 text-emerald-300",
  T: "bg-rose-500/20 text-rose-300",
};

const STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Bozza",
  ready: "Pronto da compilare",
  polimi_compiled: "Compilato su PoliMi",
  archived: "Archiviato",
};

const MODE_LABEL: Record<PlanValidationMode, string> = {
  annual_submission: "Compilazione annuale",
  second_semester_revision: "Revisione secondo semestre",
};

const ORIGIN_LABEL: Record<EntryOrigin, string> = {
  recommended: "Consigliato",
  carried_over: "Reinserito",
  new_frequency: "Nuova frequenza",
  recovery_reinserted: "Recupero",
  free_choice: "Scelta",
};

const REINSERTION_ORIGINS: EntryOrigin[] = ["carried_over", "recovery_reinserted"];

export default function PianoClient({ initialScenario, initialExams, previousCompiledEntries, baseRevisionScenario }: Props) {
  const [scenario, setScenario] = useState<PlanScenario>(initialScenario);
  const [activeYear, setActiveYear] = useState<1 | 2 | 3>(initialScenario.cycle.studentYear);
  const [modalOpen, setModalOpen] = useState(false);
  const [showValidation, setShowValidation] = useState(() => validatePlanScenario(initialScenario, {
    exams: initialExams,
    previousCompiledEntries,
    baseRevisionScenario,
  }).issues.some((issue) => issue.type === "error"));
  const [isPending, startTransition] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showReinsertions, setShowReinsertions] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const validation = useMemo(() => validatePlanScenario(scenario, {
    exams: initialExams,
    previousCompiledEntries,
    baseRevisionScenario,
  }), [scenario, initialExams, previousCompiledEntries, baseRevisionScenario]);

  const piano = useMemo(() => planEntriesToPiano(scenario.entries), [scenario.entries]);
  const requiredReinsertions = useMemo(() => getRequiredReinsertions(previousCompiledEntries, initialExams), [previousCompiledEntries, initialExams]);
  const missingReinsertions = requiredReinsertions.filter((required) => !scenario.entries.some((entry) => isValidReinsertionEntry(entry, required.courseCode)));
  const errors = validation.issues.filter((issue) => issue.type === "error");
  const warnings = validation.issues.filter((issue) => issue.type === "warning");
  const reinsertionsExpanded = missingReinsertions.length > 0 || showReinsertions;
  const summaryExpanded = errors.length > 0 || showSummary;
  const isHistorical = scenario.cycle.status === "polimi_compiled";
  const compiledCycles = new Set(previousCompiledEntries.map(({ cycle }) => cycle.id).filter(Boolean));
  const needsHistoricalSetup = !isHistorical && scenario.cycle.studentYear > 1 && compiledCycles.size === 0;

  const yearEntries = scenario.entries.filter((entry) => entry.courseYear === activeYear && entry.position === "effective");
  const supernumeraryEntries = scenario.entries.filter((entry) => entry.position === "supernumerary");

  const setDirtyScenario = (updater: (prev: PlanScenario) => PlanScenario) => {
    setScenario((prev) => {
      const next = updater(prev);
      return {
        ...next,
        cycle: {
          ...next.cycle,
          status: next.cycle.status === "draft" ? "draft" : "draft",
          approvalStatus: null,
          compiledOnPolimiAt: null,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const payloadFor = (source: PlanScenario): PlanDraftPayload => ({
    cycleId: source.cycle.id,
    academicYear: source.cycle.academicYear,
    studentYear: source.cycle.studentYear,
    track: source.cycle.track,
    validationMode: source.cycle.validationMode,
    status: source.cycle.status === "polimi_compiled" ? "draft" : source.cycle.status,
    entries: source.entries.map(toDraftEntry),
  });

  const persistDraft = async (source = scenario) => {
    const result = await savePlanDraftAction(payloadFor(source));
    if (!result.ok || !result.scenario) {
      setSaveMsg({ ok: false, text: result.error ?? "Errore salvataggio." });
      return null;
    }
    setScenario(result.scenario);
    setSaveMsg({ ok: true, text: "Bozza salvata." });
    return result.scenario;
  };

  const addEntry = (code: string, origin: EntryOrigin = originForAddedCourse(code), position: EntryPosition = "effective") => {
    const course = getCourse(code);
    if (!course) return;
    setDirtyScenario((prev) => {
      const existing = new Set(prev.entries.map((entry) => entry.courseCode));
      const createdAt = new Date().toISOString();
      const entries: PlanEntry[] = [...prev.entries];
      if (existing.has(code) && REINSERTION_ORIGINS.includes(origin)) {
        return {
          ...prev,
          entries: prev.entries.map((entry) => entry.courseCode === code
            ? { ...entry, position: "effective", origin, isNewFrequency: false, feeCounted: true }
            : entry
          ),
        };
      }
      if (!existing.has(code)) {
        entries.push({
          id: null,
          cycleId: prev.cycle.id,
          courseCode: code,
          courseYear: course.year,
          position,
          origin,
          isNewFrequency: true,
          feeCounted: true,
          createdAt,
        });
      }
      course.linkedExams.forEach((linked) => {
        const linkedCourse = getCourse(linked.code);
        if (!existing.has(linked.code) && linkedCourse) {
          entries.push({
            id: null,
            cycleId: prev.cycle.id,
            courseCode: linked.code,
            courseYear: linkedCourse.year,
            position,
            origin,
            isNewFrequency: true,
            feeCounted: true,
            createdAt,
          });
        }
      });
      return { ...prev, entries };
    });
  };

  const removeEntry = (code: string) => {
    const course = getCourse(code);
    const linked = course?.linkedExams.map((le) => le.code) ?? [];
    const toRemove = new Set([code, ...linked]);
    setDirtyScenario((prev) => ({ ...prev, entries: prev.entries.filter((entry) => !toRemove.has(entry.courseCode)) }));
  };

  const setPosition = (code: string, position: EntryPosition) => {
    setDirtyScenario((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => entry.courseCode === code ? { ...entry, position } : entry),
    }));
  };

  const save = () => {
    startTransition(async () => {
      await persistDraft();
      setTimeout(() => setSaveMsg(null), 3000);
    });
  };

  const verify = () => {
    setShowValidation(true);
    setSaveMsg({ ok: errors.length === 0, text: errors.length === 0 ? "Scenario compilabile secondo i vincoli duri." : `Scenario non pronto: ${errors.length} errori bloccanti.` });
  };

  const markReady = () => {
    startTransition(async () => {
      const saved = await persistDraft();
      if (!saved?.cycle.id) return;
      const result = await markPlanReadyAction(saved.cycle.id);
      if (result.ok && result.scenario) {
        setScenario(result.scenario);
        setSaveMsg({ ok: true, text: "Scenario marcato come pronto." });
      } else {
        setSaveMsg({ ok: false, text: result.error ?? "Scenario non pronto." });
      }
    });
  };

  const markCompiled = () => {
    startTransition(async () => {
      const saved = await persistDraft();
      if (!saved?.cycle.id) return;
      const result = await markPlanCompiledOnPolimiAction(saved.cycle.id);
      if (result.ok && result.scenario) {
        setScenario(result.scenario);
        setSaveMsg({ ok: true, text: "Scenario segnato come compilato su PoliMi." });
      } else {
        setSaveMsg({ ok: false, text: result.error ?? "Impossibile segnare come compilato." });
      }
    });
  };

  const duplicateNextYear = () => {
    startTransition(async () => {
      const saved = isHistorical ? scenario : await persistDraft();
      if (!saved?.cycle.id) return;
      const result = await duplicatePlanForNextAcademicYearAction(saved.cycle.id);
      if (result.ok && result.scenario) {
        setScenario(result.scenario);
        setActiveYear(result.scenario.cycle.studentYear);
        setSaveMsg({ ok: true, text: `Creato scenario ${result.scenario.cycle.academicYear}.` });
      } else {
        setSaveMsg({ ok: false, text: result.error ?? "Duplicazione non riuscita." });
      }
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] overflow-hidden rounded-panel border border-border bg-background-soft shadow-card">
      <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-5 sm:p-5">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{PROGRAM_IDENTITY.courseName} {PROGRAM_IDENTITY.courseCode}</CardTitle>
              <p className="mt-1 text-xs text-muted">Planner sempre aperto per preparare la compilazione PoliMi.</p>
            </div>
            <div className="flex items-center gap-2">
              <InfoButton title="Come funziona il Piano di Studi">
                <p>Apri la guida per capire stati, CFU, reinserimenti e categorie del piano.</p>
              </InfoButton>
              <Button variant="ghost" size="sm" onClick={() => setShowGuide((value) => !value)} aria-expanded={showGuide}>
                <BookOpen className="size-4" />
                Guida
              </Button>
              <Badge variant={scenario.cycle.status === "polimi_compiled" ? "success" : scenario.cycle.status === "ready" ? "active" : "neutral"}>
                {STATUS_LABEL[scenario.cycle.status]}
              </Badge>
            </div>
          </CardHeader>

          <button
            type="button"
            onClick={() => setShowConfig(v => !v)}
            className="mb-3 flex items-center gap-2 text-xs text-muted hover:text-primary transition"
          >
            {showConfig ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {showConfig ? "Nascondi impostazioni" : `${scenario.cycle.academicYear} · Anno ${scenario.cycle.studentYear} · ${scenario.cycle.track}`}
          </button>

          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted">AA pianificato</span>
              <input
                value={scenario.cycle.academicYear}
                onChange={(e) => setDirtyScenario((prev) => ({ ...prev, cycle: { ...prev.cycle, academicYear: e.target.value } }))}
                placeholder={ACADEMIC_YEAR}
                disabled={isHistorical}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary outline-none disabled:opacity-60"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted">Anno studente</span>
              <select
                value={scenario.cycle.studentYear}
                disabled={isHistorical}
                onChange={(e) => {
                  const year = Number(e.target.value) as 1 | 2 | 3;
                  setActiveYear(year);
                  setDirtyScenario((prev) => ({ ...prev, cycle: { ...prev.cycle, studentYear: year } }));
                }}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary outline-none disabled:opacity-60"
              >
                <option value={1}>Anno 1</option>
                <option value={2}>Anno 2</option>
                <option value={3}>Anno 3</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted">Percorso</span>
              <select
                value={scenario.cycle.track}
                disabled={isHistorical}
                onChange={(e) => setDirtyScenario((prev) => ({ ...prev, cycle: { ...prev.cycle, track: e.target.value as Track } }))}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary outline-none disabled:opacity-60"
              >
                {(Object.values(TRACKS) as { code: Track; label: string }[]).map((track) => (
                  <option key={track.code} value={track.code}>{track.label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-muted">Validazione</span>
              <select
                value={scenario.cycle.validationMode}
                disabled={isHistorical}
                onChange={(e) => setDirtyScenario((prev) => ({ ...prev, cycle: { ...prev.cycle, validationMode: e.target.value as PlanValidationMode } }))}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary outline-none disabled:opacity-60"
              >
                <option value="annual_submission">{MODE_LABEL.annual_submission}</option>
                <option value="second_semester_revision">{MODE_LABEL.second_semester_revision}</option>
              </select>
            </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        <AnimatePresence initial={false}>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-accent/25 bg-accent/5">
                <CardHeader>
                  <div>
                    <CardTitle>Guida al Piano di Studi</CardTitle>
                    <p className="mt-1 text-sm text-muted">Come interpretare questo planner prima di copiare il piano nei Servizi Online.</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowGuide(false)}>Chiudi</Button>
                </CardHeader>
                <div className="grid gap-4 md:grid-cols-2">
                  {PIANO_GUIDE_SECTIONS.map((section) => (
                    <section key={section.title} className="rounded-xl border border-border bg-surface/60 p-4">
                      <h3 className="text-sm font-semibold text-primary">{section.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-secondary">{section.content}</p>
                    </section>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isHistorical && (
          <Card className="border-success/30 bg-[linear-gradient(180deg,rgba(33,181,115,0.12),rgba(10,15,20,0.9))]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                  <History className="size-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-primary">Storico PoliMi congelato</h3>
                  <p className="mt-1 text-sm text-muted">Questo scenario conta come piano realmente compilato. Per pianificare l&apos;anno dopo crea una nuova bozza.</p>
                </div>
              </div>
              <Button variant="primary" onClick={duplicateNextYear} disabled={isPending}>
                <CopyPlus className="size-4" />
                Crea bozza prossimo AA
              </Button>
            </div>
          </Card>
        )}

        {needsHistoricalSetup && (
          <Card className="border-warning/40 bg-[linear-gradient(180deg,rgba(245,181,76,0.12),rgba(10,15,20,0.9))]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-primary">Storico PoliMi precedente mancante</h3>
                <p className="mt-1 text-sm text-muted">Per calcolare gli arretrati del secondo o terzo anno serve prima uno scenario marcato come compilato su PoliMi.</p>
              </div>
            </div>
          </Card>
        )}

        {!isHistorical && (
          <Card className="bg-surface/70">
            <div className="grid gap-3 md:grid-cols-3">
              <FlowStep label="1. Storico reale" done={compiledCycles.size > 0} text={compiledCycles.size > 0 ? `${compiledCycles.size} piano/i PoliMi usati per i reinserimenti` : "Assente: gli arretrati non sono ancora automatici"} />
              <FlowStep label="2. Esami registrati" done={Object.values(initialExams).some((exam) => exam.status === "passed_registered")} text="Solo i verbalizzati scalano recuperi e media" />
              <FlowStep label="3. Bozza futura" done={errors.length === 0} text={errors.length === 0 ? "Pronta per essere copiata nei Servizi Online" : `${errors.length} errore/i bloccanti`} />
            </div>
          </Card>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="CFU effettivi" value={`${validation.summary.totalEffectiveCfu} / 180`} />
          <Metric label="CFU tassa anno" value={String(validation.summary.annualFeeCfu)} />
          <Metric label="Recuperi scalati" value={String(validation.summary.recoveredCfu)} />
          <Metric label="Soprannumero" value={`${validation.summary.supernumeraryCfu} / 32`} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reinserimenti obbligatori</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={missingReinsertions.length ? "danger" : "success"}>
                {missingReinsertions.length ? `${missingReinsertions.length} mancanti` : "Completi"}
              </Badge>
              {missingReinsertions.length === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReinsertions((value) => !value)}
                  aria-expanded={reinsertionsExpanded}
                >
                  {reinsertionsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {reinsertionsExpanded ? "Nascondi" : "Dettagli"}
                </Button>
              )}
            </div>
          </CardHeader>
          {reinsertionsExpanded && <div className="space-y-2">
            {requiredReinsertions.length === 0 && (
              <p className="text-sm text-muted">Nessun piano marcato come compilato su PoliMi richiede reinserimenti.</p>
            )}
            {requiredReinsertions.map((required) => {
              const course = getCourse(required.courseCode);
              const existingEntry = scenario.entries.find((entry) => entry.courseCode === required.courseCode);
              const present = existingEntry ? isValidReinsertionEntry(existingEntry, required.courseCode) : false;
              const needsOriginFix = Boolean(existingEntry && !present);
              return (
                <div key={required.courseCode} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-primary">{course?.name ?? required.courseCode}</p>
                    <p className="text-xs text-muted">Dal piano {required.sourceAcademicYear}</p>
                  </div>
                  <Badge variant={present ? "success" : needsOriginFix ? "warning" : "danger"}>
                    {present ? "Reinserito" : needsOriginFix ? "Da classificare" : "Manca"}
                  </Badge>
                  {!present && !isHistorical && (
                    <Button size="sm" onClick={() => addEntry(required.courseCode, "recovery_reinserted")}>
                      <RotateCcw className="size-4" />
                      {needsOriginFix ? "Marca recupero" : "Inserisci"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>}
        </Card>

        <div className="flex gap-2 flex-wrap">
          {([1, 2, 3] as const).map((year) => {
            const cfu = sumCFU(scenario.entries
              .filter((entry) => entry.courseYear === year && entry.position === "effective")
              .map((entry) => getCourse(entry.courseCode))
              .filter(isVisibleCourse));
            return (
              <button
                key={year}
                onClick={() => setActiveYear(year)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition",
                  activeYear === year
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-secondary hover:border-border-strong hover:text-primary"
                )}
              >
                Anno {year}
                <span className={cn("font-mono text-xs", activeYear === year ? "text-accent/70" : "text-muted")}>{cfu} CFU</span>
              </button>
            );
          })}
        </div>

        {[1, 2, "A" as const].map((sem) => {
          const semEntries = yearEntries.filter((entry) => getCourse(entry.courseCode)?.semester === sem);
          const cfu = sumCFU(semEntries.map((entry) => getCourse(entry.courseCode)).filter(isVisibleCourse));
          return (
            <Card key={String(sem)}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{SEMESTER_LABEL[sem]}</CardTitle>
                  {sem === 1 && (
                    <InfoButton title="Categorie attività">
                      {Object.entries(ACTIVITY_CATEGORY_DETAILS).map(([k, v]) => (
                        <p key={k}><strong>{k}</strong>: {v.label} — {v.description}</p>
                      ))}
                    </InfoButton>
                  )}
                </div>
                <span className="text-xs text-muted">{cfu} CFU</span>
              </CardHeader>
              <EntryList entries={semEntries} scenario={scenario} readOnly={isHistorical} onRemove={removeEntry} onSetPosition={setPosition} />
              {!isHistorical && (
                <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)} className="mt-3 w-full border border-dashed border-border">
                  <Plus className="size-4" />
                  Aggiungi corso
                </Button>
              )}
            </Card>
          );
        })}

        <Card>
          <CardHeader>
            <CardTitle>Soprannumero</CardTitle>
            <span className="text-xs text-muted">{validation.summary.supernumeraryCfu} CFU</span>
          </CardHeader>
          <EntryList entries={supernumeraryEntries} scenario={scenario} readOnly={isHistorical} onRemove={removeEntry} onSetPosition={setPosition} />
          {supernumeraryEntries.length === 0 && <p className="text-sm text-muted">Nessun corso in soprannumero.</p>}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Riepilogo compilabilità</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={errors.length ? "danger" : warnings.length ? "warning" : "success"}>
                {errors.length ? `${errors.length} errori` : warnings.length ? `${warnings.length} avvisi` : "Compilabile"}
              </Badge>
              {errors.length === 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSummary((value) => !value)}
                  aria-expanded={summaryExpanded}
                >
                  {summaryExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  {summaryExpanded ? "Nascondi" : "Dettagli"}
                </Button>
              )}
            </div>
          </CardHeader>
          {summaryExpanded && <div className="grid gap-2 text-sm text-secondary md:grid-cols-3">
            <p>Approvazione: <span className="text-primary">{validation.summary.approvalStatus === "auto_approved_after_deadline" ? "automatica" : "commissione"}</span></p>
            <p>Modalità: <span className="text-primary">{MODE_LABEL[scenario.cycle.validationMode]}</span></p>
            <p>Stato: <span className="text-primary">{STATUS_LABEL[scenario.cycle.status]}</span></p>
          </div>}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          {!isHistorical && (
            <>
              <Button variant="secondary" onClick={save} disabled={isPending}>
                <Save className="size-4" />
                Salva bozza
              </Button>
              <div className="relative">
                <Button variant="ghost" onClick={() => setShowMoreActions(v => !v)}>
                  <ChevronDown className="size-4" />
                  Altre azioni
                </Button>
                <AnimatePresence>
                  {showMoreActions && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-xl border border-border bg-surface-elevated p-2 shadow-elevated"
                    >
                      <button type="button" onClick={() => { verify(); setShowMoreActions(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-surface-hover hover:text-primary transition">
                        <ClipboardCheck className="size-4" /> Controlla regole PoliMi
                      </button>
                      <button type="button" onClick={() => { markReady(); setShowMoreActions(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-surface-hover hover:text-primary transition">
                        <CheckCircle2 className="size-4" /> Pronto per Servizi Online
                      </button>
                      <button type="button" onClick={() => { markCompiled(); setShowMoreActions(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-surface-hover hover:text-primary transition">
                        <GraduationCap className="size-4" /> Ho copiato su PoliMi
                      </button>
                      <button type="button" onClick={() => { duplicateNextYear(); setShowMoreActions(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-secondary hover:bg-surface-hover hover:text-primary transition">
                        <CopyPlus className="size-4" /> Crea bozza prossimo AA
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
          {saveMsg && <span className={cn("text-sm", saveMsg.ok ? "text-success" : "text-danger")}>{saveMsg.text}</span>}
        </div>

        <div className="lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowValidation((value) => !value)}
            aria-expanded={showValidation}
          >
            {showValidation ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            Validazione Piano
          </Button>
          <AnimatePresence initial={false}>
            {showValidation && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                <ValidationPanel issues={validation.issues} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-background-soft p-4 lg:block">
        <button
          type="button"
          onClick={() => setShowValidation((value) => !value)}
          aria-expanded={showValidation}
          className="mb-4 flex w-full items-center justify-between gap-3 text-left text-xs font-semibold uppercase tracking-wide text-muted transition hover:text-primary"
        >
          Validazione Piano
          {showValidation ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        <AnimatePresence initial={false}>
          {showValidation && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <ValidationPanel issues={validation.issues} />
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      <AddCourseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        year={activeYear}
        track={scenario.cycle.track}
        piano={piano}
        onAdd={addEntry}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold text-primary">{value}</p>
    </div>
  );
}

function FlowStep({ label, done, text }: { label: string; done: boolean; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        <Badge variant={done ? "success" : "warning"} className="py-0.5">{done ? "OK" : "Da fare"}</Badge>
      </div>
      <p className="text-sm text-secondary">{text}</p>
    </div>
  );
}

function EntryList({
  entries,
  scenario,
  readOnly,
  onRemove,
  onSetPosition,
}: {
  entries: PlanEntry[];
  scenario: PlanScenario;
  readOnly: boolean;
  onRemove: (code: string) => void;
  onSetPosition: (code: string, position: EntryPosition) => void;
}) {
  if (entries.length === 0) {
    return <p className="py-3 text-center text-xs text-muted">Nessun corso aggiunto.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const course = getCourse(entry.courseCode);
        if (!course || course.isLinkedExam) return null;
        const linkedInPlan = course.linkedExams?.filter((le) => scenario.entries.some((planEntry) => planEntry.courseCode === le.code)) ?? [];
        const activityCategory = activityCategoryForCourse(course);
        return (
          <div key={entry.courseCode} className="flex items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-primary">{course.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted">{course.cfu} CFU</span>
                {!(course.type as string[]).includes(activityCategory) && (
                  <span className={cn("rounded px-1 py-0.5 text-[10px] font-bold", TYPE_COLORS[activityCategory] ?? "")}>{activityCategory}</span>
                )}
                {course.type.map((t) => (
                  <span key={t} className={cn("rounded px-1 py-0.5 text-[10px] font-bold", TYPE_COLORS[t] ?? "")}>{t}</span>
                ))}
                <Badge variant="neutral" className="py-0 text-[10px]">{ORIGIN_LABEL[entry.origin]}</Badge>
                {!entry.feeCounted && <Badge variant="success" className="py-0 text-[10px]">CFU scalati</Badge>}
                {linkedInPlan.map((le) => (
                  <span key={le.code} className="text-[10px] text-muted">+{le.name} ({le.cfu} CFU)</span>
                ))}
              </div>
            </div>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSetPosition(entry.courseCode, entry.position === "effective" ? "supernumerary" : "effective")}
              >
                {entry.position === "effective" ? "Soprannumero" : "Effettivo"}
              </Button>
            )}
            {!readOnly && !course.isCompulsory && (
              <button
                onClick={() => onRemove(entry.courseCode)}
                className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                title="Rimuovi corso"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function isVisibleCourse(course: ReturnType<typeof getCourse>): course is NonNullable<ReturnType<typeof getCourse>> {
  if (!course) return false;
  return !course.isLinkedExam;
}
