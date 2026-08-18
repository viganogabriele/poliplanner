import { getPianoPageModel } from "@/lib/pianoPage";
import PianoClient from "@/features/piano/PianoClient";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piano di Studi – Poliplanner" };

export default async function PianoPage({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  const requested = Number((await searchParams).scenario);
  // Una lettura sola e coordinata: scenario, carriera, storico e base della revisione.
  const model = getPianoPageModel(Number.isSafeInteger(requested) && requested > 0 ? requested : null);

  return (
    <PageShell className="max-w-[1440px]">
      <PianoClient
        key={model.scenario.cycle.id ?? "virtual"}
        initialScenario={model.scenario}
        initialCycles={model.cycles}
        activeCycleId={model.activeCycleId}
        initialExams={model.exams}
        previousCompiledEntries={model.previousCompiledEntries}
        baseRevisionScenario={model.baseRevisionScenario}
        nextYearAction={model.nextYearAction}
        asOf={model.asOf}
      />
    </PageShell>
  );
}
