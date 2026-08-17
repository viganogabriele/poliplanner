"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  CopyPlus,
  FlaskConical,
  GraduationCap,
  History,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import InfoButton from "@/components/ui/InfoButton";
import { PIANO_GUIDE_SECTIONS } from "@/lib/polimi/guide";
import {
  AVAILABLE_ACADEMIC_YEARS,
  courseOfferings,
  findCourse,
  getCatalog,
  offeringSemester,
  offeringYear,
} from "@/lib/polimi/catalog";
import { DISCLAIMER, PROGRAM_IDENTITY, TRACKS, type EntryPosition, type PlanStatus, type PlanValidationMode, type Track } from "@/lib/polimi/constraints";
import { originForAddedCourse, toDraftEntry } from "@/lib/polimi/planModel";
import { validatePlanScenario, type PlanValidationContext } from "@/lib/polimi/validation";
import type { SimulationScenario } from "@/lib/polimi/simulator";
import {
  archivePlanCycleAction,
  createAnnualDraftAction,
  createSecondSemesterRevisionAction,
  duplicatePlanForNextAcademicYearAction,
  markPlanCompiledOnPolimiAction,
  markPlanReadyAction,
  restorePlanCycleAction,
  savePlanDraftAction,
  setActivePlanCycleAction,
  upsertCareerExamAction,
} from "@/app/actions";
import AddCourseModal from "./AddCourseModal";
import AnnualPlanPanel from "./AnnualPlanPanel";
import CareerPanel from "./CareerPanel";
import PlanSummaryBar from "./PlanSummaryBar";
import SimulatorPanel from "./SimulatorPanel";
import ValidationPanel from "./ValidationPanel";
import { cn } from "@/lib/ui";
import type { CareerExamsMap } from "@/lib/polimi/career";
import type { PlanCycle, PlanDraftPayload, PlanEntry, PlanScenario, PreviousCompiledEntry } from "@/lib/polimi/planModel";

type Props = {
  initialScenario: PlanScenario;
  initialCycles: PlanCycle[];
  activeCycleId: number | null;
  initialExams: CareerExamsMap;
  previousCompiledEntries: PreviousCompiledEntry[];
  baseRevisionScenario: PlanScenario | null;
};

type Tab = "career" | "plan" | "simulator";

const STATUS_LABEL: Record<PlanStatus, string> = {
  draft: "Bozza",
  ready: "Pronto da compilare",
  polimi_compiled: "Compilato su PoliMi",
};

const MODE_LABEL: Record<PlanValidationMode, string> = {
  annual_submission: "Compilazione annuale",
  second_semester_revision: "Modifica secondo semestre",
};

export default function PianoClient({
  initialScenario,
  initialCycles,
  activeCycleId,
  initialExams,
  previousCompiledEntries,
  baseRevisionScenario,
}: Props) {
  const router = useRouter();
  const [scenario, setScenario] = useState<PlanScenario>(initialScenario);
  const [tab, setTab] = useState<Tab>(initialScenario.entries.length === 0 ? "career" : "plan");
  const [modalOpen, setModalOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showValidation, setShowValidation] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newAcademicYear, setNewAcademicYear] = useState(initialScenario.cycle.academicYear);
  const [newStudentYear, setNewStudentYear] = useState<1 | 2 | 3>(initialScenario.cycle.studentYear);
  const [newTrack, setNewTrack] = useState<Track>(initialScenario.cycle.track);

  const catalog = useMemo(() => getCatalog(scenario.cycle.academicYear), [scenario.cycle.academicYear]);
  const context = useMemo<PlanValidationContext>(() => ({
    exams: initialExams,
    previousCompiledEntries,
    baseRevisionScenario,
  }), [initialExams, previousCompiledEntries, baseRevisionScenario]);
  const validation = useMemo(() => validatePlanScenario(scenario, context), [scenario, context]);

  const isHistorical = scenario.cycle.status === "polimi_compiled" || Boolean(scenario.cycle.archivedAt);
  const revisionMode = scenario.cycle.validationMode === "second_semester_revision";
  const editableSemester = catalog.annual.secondSemesterRevision.editableSemester;
  const errors = validation.issues.filter((issue) => issue.type === "error");
  const passedCodes = useMemo(
    () => new Set(Object.entries(initialExams).filter(([, exam]) => exam.status === "passed_registered").map(([code]) => code)),
    [initialExams]
  );
  const planCodes = useMemo(() => new Set(scenario.entries.map((entry) => entry.courseCode)), [scenario.entries]);

  const markDirty = (updater: (prev: PlanScenario) => PlanScenario) => {
    setScenario((prev) => {
      const next = updater(prev);
      return {
        ...next,
        cycle: { ...next.cycle, status: "draft", approvalStatus: null, updatedAt: new Date().toISOString() },
      };
    });
  };

  const buildEntry = (code: string, reinserted: boolean, position: EntryPosition = "effective"): PlanEntry | null => {
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
  };

  const addEntry = (code: string, reinserted = false) => {
    markDirty((prev) => {
      const existing = new Map(prev.entries.map((entry) => [entry.courseCode, entry]));
      const entries = [...prev.entries];
      const main = buildEntry(code, reinserted);
      if (!main) return prev;

      if (existing.has(code)) {
        // Riclassificare una voce già presente: serve quando un corso va marcato come recupero.
        return {
          ...prev,
          entries: prev.entries.map((entry) => entry.courseCode === code
            ? { ...entry, position: "effective", origin: main.origin, isNewFrequency: !reinserted, feeCounted: !reinserted }
            : entry),
        };
      }
      entries.push(main);

      const course = findCourse(catalog, code);
      for (const linked of course?.linkedExams ?? []) {
        if (existing.has(linked.code)) continue;
        const linkedEntry = buildEntry(linked.code, reinserted);
        if (!linkedEntry || !course) continue;
        const parentOffering = courseOfferings(course).find((offering) => offering.linkedModules?.includes(linked.code));
        entries.push({ ...linkedEntry, courseYear: parentOffering?.year ?? main.courseYear });
      }
      return { ...prev, entries };
    });
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
      setMessage({ ok: false, text: result.error });
      return null;
    }
    setScenario(result.data);
    setMessage({ ok: true, text: "Bozza salvata." });
    return result.data;
  };

  const save = () => startTransition(async () => { await persist(); });

  const markReady = () => startTransition(async () => {
    const saved = await persist();
    if (!saved?.cycle.id) return;
    const result = await markPlanReadyAction(saved.cycle.id);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    setScenario(result.data);
    setMessage({ ok: true, text: "Piano pronto: ora copialo nei Servizi Online PoliMi." });
  });

  const markCompiled = () => startTransition(async () => {
    if (!scenario.cycle.id || scenario.cycle.status !== "ready") {
      return setMessage({ ok: false, text: "Prima verifica il piano e marcalo come pronto." });
    }
    const result = await markPlanCompiledOnPolimiAction(scenario.cycle.id);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    setScenario(result.data);
    setMessage({ ok: true, text: "Piano registrato come compilato su PoliMi." });
    router.refresh();
  });

  const createAnnual = () => startTransition(async () => {
    const result = await createAnnualDraftAction(newAcademicYear, newStudentYear, newTrack);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    router.push(`/piano?scenario=${result.data.cycle.id}`);
    router.refresh();
  });

  const createNextYear = () => startTransition(async () => {
    if (!scenario.cycle.id) return;
    const result = await duplicatePlanForNextAcademicYearAction(scenario.cycle.id);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    router.push(`/piano?scenario=${result.data.cycle.id}`);
    router.refresh();
  });

  const createRevision = () => startTransition(async () => {
    if (!scenario.cycle.id) return;
    const result = await createSecondSemesterRevisionAction(scenario.cycle.id);
    if (!result.ok) return setMessage({ ok: false, text: result.error });
    router.push(`/piano?scenario=${result.data.cycle.id}`);
    router.refresh();
  });

  const cycleAction = (action: (id: number) => Promise<{ ok: boolean; error?: string }>, label: string, redirect?: string) =>
    startTransition(async () => {
      if (!scenario.cycle.id) return;
      const result = await action(scenario.cycle.id);
      if (!result.ok) return setMessage({ ok: false, text: result.error ?? "Operazione non riuscita." });
      setMessage({ ok: true, text: label });
      if (redirect) router.push(redirect);
      router.refresh();
    });

  /** Conferma esplicita di uno scenario: solo qui la simulazione tocca carriera e bozza. */
  const applySimulation = (simulation: SimulationScenario) => startTransition(async () => {
    for (const assumption of simulation.assumptions) {
      const result = await upsertCareerExamAction({
        code: assumption.courseCode,
        status: assumption.outcome === "registered" ? "passed_registered" : "not_passed",
      });
      if (!result.ok) return setMessage({ ok: false, text: result.error });
    }
    for (const code of simulation.removals ?? []) removeEntry(code);
    for (const code of simulation.additions ?? []) addEntry(code);
    setTab("plan");
    setMessage({
      ok: true,
      text: simulation.assumptions.length > 0
        ? `Scenario "${simulation.label}" applicato. Controlla la bozza e salvala.`
        : `Insegnamento aggiunto alla bozza. Salva per confermare.`,
    });
    if (simulation.assumptions.length > 0) router.refresh();
  });

  return (
    <div className="flex min-h-[calc(100vh-10rem)] overflow-hidden rounded-panel border border-border bg-background-soft shadow-card">
      <div className="flex-1 space-y-5 overflow-y-auto p-4 pb-8 sm:p-5">
        <PlanSummaryBar validation={validation} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex flex-wrap gap-2" aria-label="Sezioni del piano">
            <TabButton active={tab === "career"} onClick={() => setTab("career")} icon={<History className="size-4" />}>
              La mia carriera
            </TabButton>
            <TabButton active={tab === "plan"} onClick={() => setTab("plan")} icon={<CalendarClock className="size-4" />}>
              Piano {scenario.cycle.academicYear}
            </TabButton>
            <TabButton active={tab === "simulator"} onClick={() => setTab("simulator")} icon={<FlaskConical className="size-4" />}>
              Simulatore
            </TabButton>
          </nav>
          <div className="flex items-center gap-2">
            <Badge variant={scenario.cycle.status === "polimi_compiled" ? "success" : scenario.cycle.status === "ready" ? "active" : "neutral"}>
              {STATUS_LABEL[scenario.cycle.status]}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setShowGuide((value) => !value)} aria-expanded={showGuide}>
              <BookOpen className="size-4" />
              Guida
            </Button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showGuide && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="border-accent/25 bg-accent/5">
                <CardHeader>
                  <div>
                    <CardTitle>Come funziona questo pianificatore</CardTitle>
                    <CardDescription>{DISCLAIMER}</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowGuide(false)}>Chiudi</Button>
                </CardHeader>
                <div className="grid gap-3 md:grid-cols-2">
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

        {catalog.dataStatus === "to_verify" && (
          <Card className="border-warning/40 bg-[linear-gradient(180deg,rgba(245,181,76,0.12),rgba(10,15,20,0.9))]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-primary">Dati AA {catalog.academicYear} da verificare</h3>
                <ul className="mt-1 space-y-1 text-sm text-muted">
                  {catalog.dataNotes.slice(0, 3).map((note) => <li key={note}>· {note}</li>)}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {isHistorical && (
          <Card className="border-success/30 bg-[linear-gradient(180deg,rgba(33,181,115,0.12),rgba(10,15,20,0.9))]">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  {scenario.cycle.status === "polimi_compiled" ? "Storico congelato" : "Scenario archiviato"}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {scenario.cycle.status === "polimi_compiled"
                    ? "Questo piano conta come realmente presentato: da qui si calcolano le frequenze acquisite."
                    : "Disponibile in sola lettura finché non lo ripristini."}
                </p>
              </div>
              {scenario.cycle.status === "polimi_compiled" && !scenario.cycle.archivedAt && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={createNextYear} disabled={isPending}>
                    <CopyPlus className="size-4" />
                    Piano dell&apos;anno successivo
                  </Button>
                  <Button variant="secondary" onClick={createRevision} disabled={isPending}>
                    <CalendarClock className="size-4" />
                    Modifica 2° semestre
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {revisionMode && (
          <Card className="border-accent/30 bg-accent/5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-primary">Modifica del {editableSemester}° semestre</h3>
                <p className="mt-1 text-sm text-muted">
                  Puoi aggiungere o togliere solo insegnamenti del {editableSemester}° semestre di questo anno accademico.
                  Percorso e primo semestre sono bloccati, e un esame superato ma non ancora verbalizzato non può essere autocertificato.
                </p>
              </div>
            </div>
          </Card>
        )}

        {tab === "career" && (
          <CareerPanel
            exams={initialExams}
            academicYear={scenario.cycle.academicYear}
            track={scenario.cycle.track}
            onChanged={() => router.refresh()}
          />
        )}

        {tab === "plan" && (
          <AnnualPlanPanel
            scenario={scenario}
            validation={validation}
            exams={initialExams}
            readOnly={isHistorical}
            revisionMode={revisionMode}
            editableSemester={editableSemester}
            onAddReinsertion={(code) => addEntry(code, true)}
            onRemove={removeEntry}
            onSetPosition={setPosition}
            onOpenCatalog={() => setModalOpen(true)}
          />
        )}

        {tab === "simulator" && (
          <SimulatorPanel
            scenario={scenario}
            context={context}
            onConfirm={isHistorical ? undefined : applySimulation}
          />
        )}

        {tab === "plan" && !isHistorical && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <Button variant="secondary" onClick={save} disabled={isPending}>
              <Save className="size-4" />
              Salva bozza
            </Button>
            <Button variant="ghost" onClick={() => setShowValidation(true)} disabled={isPending}>
              <ClipboardCheck className="size-4" />
              Verifica regole
            </Button>
            <Button variant="ghost" onClick={markReady} disabled={isPending || errors.length > 0}>
              <CheckCircle2 className="size-4" />
              Pronto da compilare
            </Button>
            <Button variant="ghost" onClick={markCompiled} disabled={isPending || scenario.cycle.status !== "ready"}>
              <GraduationCap className="size-4" />
              Ho copiato su PoliMi
            </Button>
            {message && <span className={cn("text-sm", message.ok ? "text-success" : "text-danger")}>{message.text}</span>}
          </div>
        )}

        {/* Gestione scenari, in fondo perché è manutenzione, non il flusso principale. */}
        <Card>
          <button
            type="button"
            onClick={() => setShowScenarios((value) => !value)}
            aria-expanded={showScenarios}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <CardTitle className="text-base">Scenari salvati e storico</CardTitle>
              <CardDescription>
                {initialCycles.length} piano/i · {MODE_LABEL[scenario.cycle.validationMode]}
              </CardDescription>
            </div>
            {showScenarios ? <ChevronUp className="size-4 text-muted" /> : <ChevronDown className="size-4 text-muted" />}
          </button>

          {showScenarios && (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  aria-label="Scenario da consultare"
                  value={scenario.cycle.id ?? ""}
                  onChange={(event) => router.push(`/piano?scenario=${event.target.value}`)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary outline-none"
                >
                  {scenario.cycle.id === null && <option value="">Proposta non ancora salvata</option>}
                  {initialCycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id ?? ""}>
                      {cycle.academicYear} · anno {cycle.studentYear} · {cycle.track} · {STATUS_LABEL[cycle.status]}
                      {cycle.archivedAt ? " · archiviato" : ""}{cycle.id === activeCycleId ? " · attivo" : ""}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {scenario.cycle.id !== null && !isHistorical && scenario.cycle.id !== activeCycleId && (
                    <Button variant="secondary" size="sm" onClick={() => cycleAction(setActivePlanCycleAction, "Scenario impostato come attivo.")} disabled={isPending}>
                      Imposta attivo
                    </Button>
                  )}
                  {scenario.cycle.id !== null && !scenario.cycle.archivedAt && (
                    <Button variant="ghost" size="sm" onClick={() => cycleAction(archivePlanCycleAction, "Scenario archiviato.", "/piano")} disabled={isPending}>
                      <Archive className="size-4" />Archivia
                    </Button>
                  )}
                  {scenario.cycle.id !== null && scenario.cycle.archivedAt && (
                    <Button variant="ghost" size="sm" onClick={() => cycleAction(restorePlanCycleAction, "Scenario ripristinato.")} disabled={isPending}>
                      <ArchiveRestore className="size-4" />Ripristina
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-2 border-t border-border pt-4 sm:grid-cols-4">
                <select
                  aria-label="Anno accademico del nuovo piano"
                  value={newAcademicYear}
                  onChange={(event) => setNewAcademicYear(event.target.value)}
                  className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary"
                >
                  {AVAILABLE_ACADEMIC_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <select
                  aria-label="Anno di corso"
                  value={newStudentYear}
                  onChange={(event) => setNewStudentYear(Number(event.target.value) as 1 | 2 | 3)}
                  className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary"
                >
                  <option value={1}>Anno 1</option><option value={2}>Anno 2</option><option value={3}>Anno 3</option>
                </select>
                <select
                  aria-label="Percorso"
                  value={newTrack}
                  onChange={(event) => setNewTrack(event.target.value as Track)}
                  className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-primary"
                >
                  {Object.values(TRACKS).map((track) => <option key={track.code} value={track.code}>{track.label}</option>)}
                </select>
                <Button variant="primary" onClick={createAnnual} disabled={isPending}>
                  <Plus className="size-4" />
                  Crea piano annuale
                </Button>
              </div>
              <p className="text-xs text-muted">
                {PROGRAM_IDENTITY.courseName} · codice {PROGRAM_IDENTITY.courseCode} · {PROGRAM_IDENTITY.className}.
                Il nuovo piano viene costruito da carriera e storico: i corsi già verbalizzati non vengono riproposti.
              </p>
            </div>
          )}
        </Card>

        <div className="lg:hidden">
          <Button variant="ghost" size="sm" onClick={() => setShowValidation((value) => !value)} aria-expanded={showValidation}>
            {showValidation ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            Verifica del piano
          </Button>
          {showValidation && <div className="mt-3"><ValidationPanel issues={validation.issues} /></div>}
        </div>
      </div>

      <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border bg-background-soft p-4 lg:block">
        <button
          type="button"
          onClick={() => setShowValidation((value) => !value)}
          aria-expanded={showValidation}
          className="mb-4 flex w-full items-center justify-between gap-3 text-left text-xs font-semibold uppercase tracking-wide text-muted transition hover:text-primary"
        >
          Verifica del piano
          {showValidation ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {showValidation && <ValidationPanel issues={validation.issues} />}
        <div className="mt-4 rounded-xl border border-border bg-surface/40 p-3">
          <p className="text-[11px] leading-relaxed text-muted">{DISCLAIMER}</p>
          <InfoButton title="Fonti del catalogo" className="mt-2">
            {catalog.sources.map((source) => <p key={source}>· {source}</p>)}
          </InfoButton>
        </div>
      </aside>

      <AddCourseModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        academicYear={scenario.cycle.academicYear}
        track={scenario.cycle.track}
        studentYear={scenario.cycle.studentYear}
        alreadyInPlan={planCodes}
        alreadyPassed={passedCodes}
        restrictToSemester={revisionMode ? editableSemester : null}
        onAdd={(code) => addEntry(code)}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:border-border-strong hover:text-primary"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
