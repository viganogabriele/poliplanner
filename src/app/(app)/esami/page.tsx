import { getCurrentPlanScenario } from "@/lib/piano";
import { getExams } from "@/lib/esami";
import { getSchedule } from "@/lib/schedule";
import EsamiClient from "@/features/esami/EsamiClient";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";

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
      <PageHeader title="Esami" subtitle="Monitora gli esiti verbalizzati e ciò che resta aperto in carriera." />
      <EsamiClient initialExams={exams} scenario={scenario} calendarSubjectByCourse={calendarSubjectByCourse} />
    </PageShell>
  );
}
