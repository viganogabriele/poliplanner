import { getDashboard } from "@/lib/dashboard";
import SubjectProgress from "@/features/subjects/SubjectProgress";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default function MateriePage() {
  const { subject_progress } = getDashboard();
  return (
    <PageShell>
      <PageHeader title="Materie" subtitle="Apri una materia per vedere lezioni, arretrati e stato dell'esame." />
      <Card>
        <SubjectProgress subjects={subject_progress} />
      </Card>
    </PageShell>
  );
}
