import { getCurrentPlanScenario } from "@/lib/piano";
import { getExams } from "@/lib/esami";
import EsamiClient from "@/features/esami/EsamiClient";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Esami – Poliplanner" };

export default function EsamiPage() {
  const scenario = getCurrentPlanScenario();
  const exams = getExams();
  return (
    <PageShell>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-primary">Esami</h1>
        <p className="mt-1 text-sm text-muted">Monitora il tuo avanzamento verso la laurea</p>
      </div>
      <EsamiClient initialExams={exams} scenario={scenario} />
    </PageShell>
  );
}
