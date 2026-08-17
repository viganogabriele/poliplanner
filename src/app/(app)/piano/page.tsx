import { getBaseRevisionScenario, getCurrentPlanScenario, getPlanScenario, getPreviousCompiledEntries, listPlanCycles } from "@/lib/piano";
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

  return (
    <PageShell className="max-w-[1440px]">
      <PianoClient
        key={scenario.cycle.id ?? "virtual"}
        initialScenario={scenario}
        initialCycles={listPlanCycles()}
        activeCycleId={activeScenario.cycle.id}
        initialExams={getExams()}
        previousCompiledEntries={getPreviousCompiledEntries(scenario.cycle.id)}
        baseRevisionScenario={getBaseRevisionScenario(scenario)}
      />
    </PageShell>
  );
}
