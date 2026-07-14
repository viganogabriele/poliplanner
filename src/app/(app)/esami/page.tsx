import { getCurrentPlanScenario } from "@/lib/piano";
import { getExams } from "@/lib/esami";
import { getSchedule } from "@/lib/schedule";
import EsamiClient from "@/features/esami/EsamiClient";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Esami – Poliplanner" };

export default function EsamiPage() {
  const scenario = getCurrentPlanScenario();
  const exams = getExams();
  const calendarSubjectByCourse = Object.fromEntries(
    getSchedule()
      .filter((row) => row.course_code)
      .map((row) => [row.course_code as string, row.subject])
  );
  return (
    <PageShell>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-primary">Esami</h1>
        <p className="mt-1 text-sm text-muted">Monitora il tuo avanzamento verso la laurea</p>
      </div>
      <EsamiClient initialExams={exams} scenario={scenario} calendarSubjectByCourse={calendarSubjectByCourse} />
    </PageShell>
  );
}
