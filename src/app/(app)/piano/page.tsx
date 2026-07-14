import { getCurrentPlanScenario, getPlanScenario, getPreviousCompiledEntries, listPlanCycles } from "@/lib/piano";
import { getExams } from "@/lib/esami";
import PianoClient from "@/features/piano/PianoClient";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piano di Studi – Poliplanner" };

export default async function PianoPage({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const activeScenario = getCurrentPlanScenario();
  const requested = Number((await searchParams).scenario);
  const scenario = Number.isSafeInteger(requested) && requested > 0
    ? getPlanScenario(requested) ?? activeScenario
    : activeScenario;
  const exams = getExams();
  const previousCompiledEntries = getPreviousCompiledEntries(scenario.cycle.id);
  const baseRevisionScenario = scenario.cycle.revisionOfCycleId ? getPlanScenario(scenario.cycle.revisionOfCycleId) : null;

  return (
    <PageShell className="max-w-[1440px]">
      <PianoClient
        key={scenario.cycle.id ?? "virtual"}
        initialScenario={scenario}
        initialCycles={listPlanCycles()}
        activeCycleId={activeScenario.cycle.id}
        initialExams={exams}
        previousCompiledEntries={previousCompiledEntries}
        baseRevisionScenario={baseRevisionScenario}
      />
    </PageShell>
  );
}
