import { getDashboard } from "@/lib/dashboard";
import SubjectProgress from "@/features/subjects/SubjectProgress";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default function SubjectsPage() {
  const { subject_progress } = getDashboard();

  return (
    <PageShell>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Progresso per materia</CardTitle>
            <CardDescription>Avanzamento aggregato per ogni corso pianificato</CardDescription>
          </div>
        </CardHeader>
        <SubjectProgress subjects={subject_progress} />
      </Card>
    </PageShell>
  );
}
