"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, FlaskConical, GraduationCap, History, Layers3, Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  courseOfferings,
  findCourse,
  getCatalog,
  offeringSemester,
  offeringYear,
} from "@/lib/polimi/catalog";
import { DISCLAIMER, type EntryPosition, type Track } from "@/lib/polimi/constraints";
import type { CourseYear } from "@/lib/polimi/catalog/types";
import { originForAddedCourse, toDraftEntry } from "@/lib/polimi/planModel";
import { describeAdditionEffect } from "@/lib/polimi/courseAdvice";
import { validatePlanScenario, type PlanValidationContext } from "@/lib/polimi/validation";
import type { SimulationScenario } from "@/lib/polimi/simulator";
import {
  applySimulationScenarioAction,
  archivePlanCycleAction,
  createAnnualDraftAction,
  createSecondSemesterRevisionAction,
  duplicatePlanForNextAcademicYearAction,
  markPlanCompiledOnPolimiAction,
  markPlanReadyAction,
  restorePlanCycleAction,
  savePlanDraftAction,
  setActivePlanCycleAction,
} from "@/app/actions";
import CollapsibleSection from "./CollapsibleSection";
import PlanHeader from "./PlanHeader";
import PlanIssuesAside, { bucketIssues } from "./PlanIssuesAside";
import ProposedPlanPanel from "./ProposedPlanPanel";
import RequiredActionsPanel from "./RequiredActionsPanel";
import {
  LazyAddCourseModal,
  LazyAllRulesPanel,
  LazyCareerPanel,
  LazyFutureYearsPanel,
  LazyPlanGuide,
  LazyScenarioHistoryPanel,
  LazySimulatorPanel,
} from "./lazyPanels";
import { cn } from "@/lib/ui";
import type { CareerExamsMap } from "@/lib/polimi/career";
import type { PlanCycle, PlanDraftPayload, PlanEntry, PlanScenario, PreviousCompiledEntry } from "@/lib/polimi/planModel";
import type { NextYearAction } from "@/lib/pianoPage";

/**
 * Orchestratore della pagina Piano di Studi.
 *
 * L'ordine dei blocchi risponde, dall'alto verso il basso, alle domande dello studente:
 * qual è il mio piano attivo e per quale AA, cosa è già chiuso in carriera, cosa devo reinserire,
 * quali decisioni devo prendere adesso, quali corsi posso aggiungere e che effetto producono.
 *
 * Le funzioni avanzate (simulatore, catalogo, guida, storico, dettaglio regole, anteprima anni
 * successivi) sono importate dinamicamente da `lazyPanels.ts`: il primo caricamento contiene solo
 * riepilogo, azioni richieste e piano corrente.
 */

type Props = {
  initialScenario: PlanScenario;
  initialCycles: PlanCycle[];
  activeCycleId: number | null;
  initialExams: CareerExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  baseRevisionScenario: PlanScenario | null;
  nextYearAction: NextYearAction | null;
  asOf: string;
};

type Feedback = { ok: boolean; text: string; details?: string[] };

export default function PianoClient({
  initialScenario,
  initialCycles,
  activeCycleId,
  initialExams,
  previousCompiledEntries,
  baseRevisionScenario,
  nextYearAction,
  asOf,
}: Props) {
  const router = useRouter();
  const [scenario, setScenario] = useState<PlanScenario>(initialScenario);
  const [cycles, setCycles] = useState<PlanCycle[]>(initialCycles);
  const [currentActiveCycleId, setCurrentActiveCycleId] = useState(activeCycleId);
  const [exams, setExams] = useState<CareerExamsMap>(initialExams);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [careerOpen, setCareerOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [futureOpen, setFutureOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const catalog = useMemo(() => getCatalog(scenario.cycle.academicYear), [scenario.cycle.academicYear]);
  const context = useMemo<PlanValidationContext>(() => ({
    exams,
    previousCompiledEntries,
    baseRevisionScenario,
    asOf,
  }), [exams, previousCompiledEntries, baseRevisionScenario, asOf]);
  const validation = useMemo(() => validatePlanScenario(scenario, context), [scenario, context]);

  const isHistorical = scenario.cycle.status === "polimi_compiled" || Boolean(scenario.cycle.archivedAt);
  const revisionMode = scenario.cycle.validationMode === "second_semester_revision";
  const editableSemester = catalog.annual.secondSemesterRevision.editableSemester;
  const buckets = bucketIssues(validation);
  const futureCount = validation.issues.filter((issue) => issue.scope === "future_years").length;

  const registeredCodes = useMemo(
    () => new Set(Object.entries(exams).filter(([, exam]) => exam.status === "passed_registered").map(([code]) => code)),
    [exams]
  );
  const planCodes = useMemo(() => new Set(scenario.entries.map((entry) => entry.courseCode)), [scenario.entries]);
  const reinsertionCodes = useMemo(
    () => new Set(validation.requiredReinsertions.map((item) => item.courseCode)),
    [validation.requiredReinsertions]
  );

  // ---------------------------------------------------------------- mutazioni locali

  const markDirty = (updater: (prev: PlanScenario) => PlanScenario) => {
    setScenario((prev) => {
      const next = updater(prev);
      return {
        ...next,
        cycle: { ...next.cycle, status: "draft", approvalStatus: null, updatedAt: new Date().toISOString() },
      };
    });
  };

  const buildEntry = useCallback((code: string, reinserted: boolean, position: EntryPosition = "effective"): PlanEntry | null => {
    const course = findCourse(catalog, code);
    if (!course) return null;
    const courseYear = offeringYear(catalog, code, scenario.cycle.track, scenario.cycle.studentYear);
    return {
      id: null,
      cycleId: scenario.cycle.id,
      courseCode: code,
      courseYear,
      semester: offeringSemester(catalog, code, scenario.cycle.track, courseYear),
      entryKind: "catalog",
      externalName: null,
      externalCfu: null,
      position,
      origin: reinserted ? "recovery_reinserted" : originForAddedCourse(catalog, code, scenario.cycle.track),
      isNewFrequency: !reinserted,
      feeCounted: !reinserted,
      createdAt: new Date().toISOString(),
    };
  }, [catalog, scenario.cycle.id, scenario.cycle.track, scenario.cycle.studentYear]);

  /** Un reinserimento riporta la frequenza storica: usa anno e semestre di allora, non quelli di ora. */
  const addReinsertion = (code: string) => {
    const required = validation.requiredReinsertions.find((item) => item.courseCode === code);
    markDirty((prev) => {
      const base = buildEntry(code, true);
      if (!base) return prev;
      const entry: PlanEntry = required
        ? { ...base, courseYear: required.courseYear, semester: required.semester, position: required.position }
        : base;
      if (prev.entries.some((item) => item.courseCode === code)) {
        return {
          ...prev,
          entries: prev.entries.map((item) => (item.courseCode === code
            ? { ...item, ...entry, id: item.id, cycleId: item.cycleId, createdAt: item.createdAt }
            : item)),
        };
      }
      return { ...prev, entries: [...prev.entries, entry] };
    });
  };

  const addCourse = (code: string) => {
    const before = validation;
    let added: PlanScenario | null = null;
    markDirty((prev) => {
      if (prev.entries.some((entry) => entry.courseCode === code)) return prev;
      const main = buildEntry(code, false);
      if (!main) return prev;
      const entries = [...prev.entries, main];

      // Il modulo di prova finale segue il corso solo nel contesto in cui il Regolamento
      // lo attesta: fuori da quello il validatore emette una verifica, non un'aggiunta.
      const course = findCourse(catalog, code);
      for (const linked of course?.linkedExams ?? []) {
        if (entries.some((entry) => entry.courseCode === linked.code)) continue;
        const offering = courseOfferings(course!).find(
          (candidate) => candidate.year === main.courseYear
            && candidate.tracks.includes(prev.cycle.track)
            && candidate.linkedModules?.includes(linked.code)
        );
        if (!offering) continue;
        const linkedEntry = buildEntry(linked.code, false);
        if (linkedEntry) entries.push({ ...linkedEntry, courseYear: offering.year });
      }
      added = { ...prev, entries };
      return added;
    });

    // Feedback breve subito dopo l'aggiunta, calcolato confrontando le due validazioni.
    setTimeout(() => {
      setScenario((current) => {
        const after = validatePlanScenario(current, context);
        const effect = describeAdditionEffect(catalog, code, before, after);
        setFeedback({ ok: true, text: effect.headline, details: effect.details });
        return current;
      });
    }, 0);
  };

  const removeEntry = (code: string) => {
    const course = findCourse(catalog, code);
    const toRemove = new Set([code, ...(course?.linkedExams.map((linked) => linked.code) ?? [])]);
    markDirty((prev) => ({ ...prev, entries: prev.entries.filter((entry) => !toRemove.has(entry.courseCode)) }));
  };

  const setPosition = (code: string, position: EntryPosition) => {
    markDirty((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => (entry.courseCode === code ? { ...entry, position } : entry)),
    }));
  };

  // ---------------------------------------------------------------- persistenza

  const payloadFor = (source: PlanScenario): PlanDraftPayload => ({
    cycleId: source.cycle.id,
    academicYear: source.cycle.academicYear,
    studentYear: source.cycle.studentYear,
    track: source.cycle.track,
    validationMode: source.cycle.validationMode,
    entries: source.entries.map(toDraftEntry),
  });

  const persist = async (source = scenario) => {
    const result = await savePlanDraftAction(payloadFor(source));
    if (!result.ok) {
      setFeedback({ ok: false, text: result.error });
      return null;
    }
    setScenario(result.data);
    setFeedback({ ok: true, text: "Bozza salvata." });
    return result.data;
  };

  const save = () => startTransition(async () => { await persist(); });

  const markReady = () => startTransition(async () => {
    const saved = await persist();
    if (!saved?.cycle.id) return;
    const result = await markPlanReadyAction(saved.cycle.id);
    if (!result.ok) return setFeedback({ ok: false, text: result.error });
    setScenario(result.data);
    setFeedback({ ok: true, text: "Piano pronto: ora copialo nei Servizi Online PoliMi." });
  });

  const markCompiled = () => startTransition(async () => {
    if (!scenario.cycle.id || scenario.cycle.status !== "ready") {
      return setFeedback({ ok: false, text: "Prima verifica il piano e marcalo come pronto." });
    }
    const result = await markPlanCompiledOnPolimiAction(scenario.cycle.id);
    if (!result.ok) return setFeedback({ ok: false, text: result.error });
    setScenario(result.data);
    setFeedback({ ok: true, text: "Piano registrato come compilato su PoliMi." });
  });

  const goToScenario = (cycleId: number) => startTransition(() => {
    router.push(`/piano?scenario=${cycleId}`);
  });

  const createAnnual = (academicYear: string, studentYear: CourseYear, track: Track) =>
    startTransition(async () => {
      const result = await createAnnualDraftAction(academicYear, studentYear, track);
      if (!result.ok) return setFeedback({ ok: false, text: result.error });
      router.push(`/piano?scenario=${result.data.cycle.id}`);
    });

  const duplicateNextYear = () => startTransition(async () => {
    if (!scenario.cycle.id) return;
    const result = await duplicatePlanForNextAcademicYearAction(scenario.cycle.id);
    if (!result.ok) return setFeedback({ ok: false, text: result.error });
    router.push(`/piano?scenario=${result.data.cycle.id}`);
  });

  const createRevision = () => startTransition(async () => {
    if (!scenario.cycle.id) return;
    const result = await createSecondSemesterRevisionAction(scenario.cycle.id);
    if (!result.ok) return setFeedback({ ok: false, text: result.error });
    router.push(`/piano?scenario=${result.data.cycle.id}`);
  });

  const cycleAction = (
    action: (id: number) => Promise<{ ok: true; data: PlanScenario } | { ok: false; error: string }>,
    label: string,
    options?: { redirect?: string; activates?: boolean; clearsActive?: boolean }
  ) =>
    startTransition(async () => {
      if (!scenario.cycle.id) return;
      const result = await action(scenario.cycle.id);
      if (!result.ok) return setFeedback({ ok: false, text: result.error ?? "Operazione non riuscita." });
      setScenario(result.data);
      setCycles((previous) => previous.map((cycle) => cycle.id === result.data.cycle.id ? result.data.cycle : cycle));
      if (options?.activates) setCurrentActiveCycleId(result.data.cycle.id);
      if (options?.clearsActive && scenario.cycle.id === currentActiveCycleId) setCurrentActiveCycleId(null);
      setFeedback({ ok: true, text: label });
      if (options?.redirect) router.push(options.redirect);
    });

  /** L'azione della testata: apre il piano dell'anno da pianificare, o lo crea. */
  const handleNextYear = () => {
    if (!nextYearAction) return;
    if (nextYearAction.kind === "open_existing") return goToScenario(nextYearAction.cycleId);
    if (nextYearAction.kind === "continue_from_compiled") return duplicateNextYear();
    createAnnual(nextYearAction.academicYear, nextYearAction.studentYear, nextYearAction.track);
  };

  /**
   * Conferma di uno scenario: una sola azione, una sola transazione, una sola invalidazione.
   * Il risultato torna già letto, quindi non serve un `router.refresh()` in coda.
   */
  const applySimulation = (simulation: SimulationScenario) => startTransition(async () => {
    const withChanges = applyScenarioLocally(simulation);
    const result = await applySimulationScenarioAction({
      outcomes: simulation.assumptions.map((assumption) => ({
        code: assumption.courseCode,
        status: assumption.outcome === "registered" ? "passed_registered" : "not_passed",
      })),
      draft: payloadFor(withChanges),
    });
    if (!result.ok) return setFeedback({ ok: false, text: result.error });
    setScenario(result.data.scenario);
    setExams(result.data.exams);
    setSimulatorOpen(false);
    setFeedback({
      ok: true,
      text: simulation.assumptions.length > 0
        ? `Scenario "${simulation.label}" applicato a carriera e piano.`
        : "Insegnamento aggiunto e piano salvato.",
    });
  });

  /** Calcola lo scenario risultante senza toccare lo stato: serve per inviarlo in un colpo solo. */
  const applyScenarioLocally = (simulation: SimulationScenario): PlanScenario => {
    const removals = new Set(simulation.removals ?? []);
    let entries = scenario.entries.filter((entry) => !removals.has(entry.courseCode));
    for (const code of simulation.additions ?? []) {
      if (entries.some((entry) => entry.courseCode === code)) continue;
      const entry = buildEntry(code, false);
      if (entry) entries = [...entries, entry];
    }
    return { ...scenario, entries };
  };

  // ---------------------------------------------------------------- render

  return (
    <div className="flex rounded-panel border border-border bg-background-soft shadow-card xl:min-h-[calc(100vh-10rem)] xl:overflow-hidden">
      <div className="min-w-0 flex-1 space-y-5 p-4 pb-8 sm:p-5 xl:overflow-y-auto">
        <PlanHeader
          validation={validation}
          planStatus={scenario.cycle.status}
          validationMode={scenario.cycle.validationMode}
          isActive={scenario.cycle.id !== null && scenario.cycle.id === currentActiveCycleId}
          isSaved={scenario.cycle.id !== null && !scenario.cycle.isVirtual}
          dataStatusReason={catalog.dataStatus === "to_verify" ? catalog.dataStatusReason : null}
          nextYearAction={nextYearAction}
          onNextYear={handleNextYear}
          pending={isPending}
        />

        {revisionMode && (
          <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            <p className="text-xs leading-relaxed text-secondary">
              <strong className="text-primary">Modifica del {editableSemester}° semestre.</strong> Puoi aggiungere o
              togliere solo insegnamenti del {editableSemester}° semestre di questo anno accademico. Percorso e primo
              semestre sono bloccati, e un esame superato ma non ancora verbalizzato non può essere autocertificato.
            </p>
          </div>
        )}

        {isHistorical && (
          <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3">
            <p className="text-sm font-semibold text-primary">
              {scenario.cycle.status === "polimi_compiled" ? "Storico congelato" : "Scenario archiviato"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {scenario.cycle.status === "polimi_compiled"
                ? "Questo piano conta come realmente presentato: da qui si calcolano le frequenze già acquisite. È in sola lettura."
                : "Disponibile in sola lettura finché non lo ripristini dallo storico."}
            </p>
          </div>
        )}

        <RequiredActionsPanel
          catalog={catalog}
          validation={validation}
          readOnly={isHistorical}
          onAddReinsertion={addReinsertion}
          onAddCourse={addCourse}
          onOpenCatalog={() => setCatalogOpen(true)}
        />

        <ProposedPlanPanel
          catalog={catalog}
          scenario={scenario}
          validation={validation}
          exams={exams}
          readOnly={isHistorical}
          revisionMode={revisionMode}
          editableSemester={editableSemester}
          onRemove={removeEntry}
          onSetPosition={setPosition}
        />

        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left sm:hidden",
            buckets.errors.length > 0
              ? "border-danger/30 bg-danger/5"
              : buckets.warnings.length > 0
                ? "border-warning/30 bg-warning/5"
                : "border-success/30 bg-success/5"
          )}
        >
          <span>
            <span className="block text-sm font-semibold text-primary">
              {buckets.errors.length > 0
                ? `${buckets.errors.length} problemi da risolvere`
                : buckets.warnings.length > 0
                  ? `${buckets.warnings.length} avvisi da controllare`
                  : "Piano in regola per quest'anno"}
            </span>
            <span className="mt-0.5 block text-xs text-muted">Apri la verifica completa</span>
          </span>
          <CheckCircle2 className={cn("size-5 shrink-0", buckets.errors.length > 0 ? "text-danger" : buckets.warnings.length > 0 ? "text-warning" : "text-success")} />
        </button>

        {!isHistorical && (
          <div className="rounded-panel border border-border bg-surface/40 p-4">
            <p className="text-sm font-semibold text-primary">Compilazione del piano</p>
            <ol className="mt-3 grid gap-2 text-xs sm:grid-cols-3" aria-label="Stato della compilazione">
              <WorkflowStep number="1" label="Salva la proposta" active={scenario.cycle.status === "draft"} complete={scenario.cycle.id !== null} />
              <WorkflowStep number="2" label="Segna come pronta" active={scenario.cycle.status === "ready"} complete={scenario.cycle.status === "ready" || scenario.cycle.status === "polimi_compiled"} />
              <WorkflowStep number="3" label="Conferma la copia su PoliMi" active={scenario.cycle.status === "polimi_compiled"} complete={scenario.cycle.status === "polimi_compiled"} />
            </ol>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button variant="primary" onClick={save} disabled={isPending} className="w-full sm:w-auto">
                <Save className="size-4" />
                {scenario.cycle.id === null ? "Salva piano" : "Salva bozza"}
              </Button>
              <Button variant="secondary" onClick={markReady} disabled={isPending || buckets.errors.length > 0} className="w-full sm:w-auto">
                <CheckCircle2 className="size-4" />
                Pronto da compilare
              </Button>
              <Button variant="secondary" onClick={markCompiled} disabled={isPending || scenario.cycle.status !== "ready"} className="w-full sm:w-auto">
                <GraduationCap className="size-4" />
                Conferma copia su PoliMi
              </Button>
            </div>
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              feedback.ok ? "border-success/30 bg-success/5 text-success" : "border-danger/30 bg-danger/5 text-danger"
            )}
          >
            <p className="font-medium">{feedback.text}</p>
            {feedback.details && feedback.details.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-secondary">
                {feedback.details.map((detail) => <li key={detail}>· {detail}</li>)}
              </ul>
            )}
          </div>
        )}

        <CollapsibleSection
          title="Altre funzioni"
          description="Carriera, guida, simulatore, anni successivi e storico."
          badge={<Layers3 className="size-4 text-muted" />}
          open={toolsOpen}
          onToggle={() => setToolsOpen((value) => !value)}
          tone="muted"
        >
          <div className="space-y-3">
            <Button variant="secondary" onClick={() => setGuideOpen((value) => !value)} aria-expanded={guideOpen}>
              <BookOpen className="size-4" />
              {guideOpen ? "Chiudi guida" : "Apri guida"}
            </Button>
            {guideOpen && <LazyPlanGuide onClose={() => setGuideOpen(false)} />}

            <CollapsibleSection
              title="Carriera"
              description="Cosa risulta davvero in libretto. Solo gli esami verbalizzati chiudono un'attività."
              badge={<Badge variant="success" className="py-0 text-[10px]">{validation.summary.registeredCareerCfu} CFU</Badge>}
              open={careerOpen}
              onToggle={() => setCareerOpen((value) => !value)}
            >
              {careerOpen && <LazyCareerPanel exams={exams} academicYear={scenario.cycle.academicYear} track={scenario.cycle.track} onChanged={setExams} />}
            </CollapsibleSection>

            <CollapsibleSection
              title="Anteprima anni successivi"
              description="Regole che diventeranno esigibili più avanti."
              badge={futureCount > 0 ? <Badge variant="neutral" className="py-0 text-[10px]">{futureCount}</Badge> : undefined}
              open={futureOpen}
              onToggle={() => setFutureOpen((value) => !value)}
              tone="muted"
            >
              {futureOpen && <LazyFutureYearsPanel catalog={catalog} validation={validation} />}
            </CollapsibleSection>

            <CollapsibleSection
              title="Simulatore di scenari"
              description="Prova ipotesi sugli esami senza toccare carriera e piano."
              badge={<FlaskConical className="size-4 text-accent" />}
              open={simulatorOpen}
              onToggle={() => setSimulatorOpen((value) => !value)}
              tone="muted"
            >
              {simulatorOpen && <LazySimulatorPanel scenario={scenario} context={context} onConfirm={isHistorical ? undefined : applySimulation} />}
            </CollapsibleSection>

            <CollapsibleSection
              title="Scenari salvati e storico"
              description="Consultazione, archiviazione e creazione manuale dei piani."
              badge={<span className="flex items-center gap-1 text-[10px] text-muted"><History className="size-3.5" />{cycles.length}</span>}
              open={historyOpen}
              onToggle={() => setHistoryOpen((value) => !value)}
              tone="muted"
            >
              {historyOpen && (
                <LazyScenarioHistoryPanel
                  cycles={cycles}
                  currentCycleId={scenario.cycle.id}
                  activeCycleId={currentActiveCycleId}
                  currentAcademicYear={scenario.cycle.academicYear}
                  currentStudentYear={scenario.cycle.studentYear}
                  currentTrack={scenario.cycle.track}
                  validationMode={scenario.cycle.validationMode}
                  isHistorical={isHistorical}
                  isCompiled={scenario.cycle.status === "polimi_compiled" && !scenario.cycle.archivedAt}
                  pending={isPending}
                  onSelect={goToScenario}
                  onSetActive={() => cycleAction(setActivePlanCycleAction, "Scenario impostato come attivo.", { activates: true })}
                  onArchive={() => cycleAction(archivePlanCycleAction, "Scenario archiviato.", { redirect: "/piano", clearsActive: true })}
                  onRestore={() => cycleAction(restorePlanCycleAction, "Scenario ripristinato.")}
                  onCreate={createAnnual}
                  onDuplicateNextYear={duplicateNextYear}
                  onCreateRevision={createRevision}
                />
              )}
            </CollapsibleSection>
          </div>
        </CollapsibleSection>

        {detailsOpen && (
          <LazyAllRulesPanel catalog={catalog} validation={validation} onClose={() => setDetailsOpen(false)} />
        )}

        <div className="xl:hidden">
          <PlanIssuesAside validation={validation} onOpenDetails={() => setDetailsOpen(true)} />
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-background-soft p-4 xl:block">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          Verifica del piano {scenario.cycle.academicYear}
        </p>
        <PlanIssuesAside validation={validation} onOpenDetails={() => setDetailsOpen(true)} />
        <p className="mt-4 rounded-xl border border-border bg-surface/40 p-3 text-[11px] leading-relaxed text-muted">
          {DISCLAIMER}
        </p>
      </aside>

      {catalogOpen && (
        <LazyAddCourseModal
          onClose={() => setCatalogOpen(false)}
          academicYear={scenario.cycle.academicYear}
          track={scenario.cycle.track}
          studentYear={scenario.cycle.studentYear}
          alreadyInPlan={planCodes}
          alreadyPassed={registeredCodes}
          reinsertionCodes={reinsertionCodes}
          structuralChoices={validation.structuralChoices}
          restrictToSemester={revisionMode ? editableSemester : null}
          onAdd={addCourse}
        />
      )}
    </div>
  );
}

function WorkflowStep({ number, label, active, complete }: { number: string; label: string; active: boolean; complete: boolean }) {
  return (
    <li className={cn(
      "flex items-center gap-2 rounded-xl border px-3 py-2",
      active ? "border-accent/40 bg-accent/5 text-primary" : complete ? "border-success/25 bg-success/5 text-secondary" : "border-border bg-background-soft/50 text-muted"
    )}>
      <span className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md font-semibold",
        active ? "bg-accent text-background" : complete ? "bg-success/15 text-success" : "bg-surface-muted text-muted"
      )}>
        {complete && !active ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : number}
      </span>
      <span>{label}</span>
    </li>
  );
}
