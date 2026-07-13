import { getDashboard } from "@/lib/dashboard";
import SubjectProgress from "@/features/subjects/SubjectProgress";
import { Card } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default function MateriePage() {
  const { subject_progress } = getDashboard();
  return (
    <PageShell>
      <div>
        <h1 className="text-2xl font-semibold text-primary">Materie</h1>
        <p className="mt-1 text-sm text-muted">Clicca su una materia per vederne i dettagli, le lezioni e lo stato dell&apos;esame</p>
      </div>
      <Card>
        <SubjectProgress subjects={subject_progress} />
      </Card>
    </PageShell>
  );
}
