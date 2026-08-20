import { getDashboard } from "@/lib/dashboard";
import SubjectProgress from "@/features/subjects/SubjectProgress";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default function MateriePage() {
  const { subject_progress } = getDashboard();
  const count = subject_progress.length;

  return (
    <PageShell>
      <PageHeader
        title="Materie"
        subtitle={count > 0
          ? "Apri una materia per vedere lezioni, arretrati e stato dell'esame."
          : "Le materie nascono dalle ricorrenze del calendario."}
      />
      {/* Nessuna scheda contenitore: le materie sono già schede, una dentro l'altra era rumore. */}
      <SubjectProgress subjects={subject_progress} />
    </PageShell>
  );
}
