import { getCurrentPlanScenario, getPlanScenario, getPreviousCompiledEntries } from "@/lib/piano";
import { getExams } from "@/lib/esami";
import PianoClient from "@/features/piano/PianoClient";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piano di Studi – Poliplanner" };

export default function PianoPage() {
  const scenario = getCurrentPlanScenario();
  const exams = getExams();
  const previousCompiledEntries = getPreviousCompiledEntries(scenario.cycle.id);
  const baseRevisionScenario = scenario.cycle.revisionOfCycleId ? getPlanScenario(scenario.cycle.revisionOfCycleId) : null;

  return (
    <PageShell className="max-w-[1440px]">
      <PianoClient
        initialScenario={scenario}
        initialExams={exams}
        previousCompiledEntries={previousCompiledEntries}
        baseRevisionScenario={baseRevisionScenario}
      />
    </PageShell>
  );
}
