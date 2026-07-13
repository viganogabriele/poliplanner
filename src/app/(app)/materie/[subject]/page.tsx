import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getSubjectData } from "@/lib/subjects";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import SubjectTodoList from "@/features/subjects/SubjectTodoList";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { LESSON_MODE_LABELS } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  planned: "Da fare",
  not_passed: "Non passato",
  passed_unregistered: "Superato, non verbalizzato",
  passed_registered: "Verbalizzato",
  no_class: "Senza frequenza",
  not_required: "Non richiesto",
};

const STATUS_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger"> = {
  planned: "neutral",
  not_passed: "danger",
  passed_unregistered: "warning",
  passed_registered: "success",
  no_class: "warning",
  not_required: "warning",
};

export default function MateriePage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = use(params);
  const subjectName = decodeURIComponent(subject);
  const data = getSubjectData(subjectName);
  if (!data) notFound();

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/materie"
          className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted transition hover:border-border-strong hover:text-primary"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-primary">{data.subjectName}</h1>
          <p className="mt-1 text-sm text-muted">
            {data.doneCount} di {data.totalCount} lezioni completate
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-card border border-border bg-surface p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Avanzamento</span>
          <span className="font-semibold tabular-nums text-accent">{data.progressPercent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-background-soft">
          <div
            className="h-full rounded-full progress-fill transition-all"
            style={{ width: `${data.progressPercent}%` }}
          />
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted">
          <span><span className="font-semibold text-success">{data.doneCount}</span> seguite</span>
          <span><span className="font-semibold text-danger">{data.backlog.length}</span> arretrate</span>
          <span><span className="font-semibold text-secondary">{data.toWatch.length}</span> da guardare</span>
        </div>
      </div>

      {/* Related exam */}
      {data.relatedCourse && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Esame collegato</CardTitle>
              <CardDescription>{data.relatedCourse.name} · {data.relatedCourse.cfu} CFU</CardDescription>
            </div>
            <Link
              href="/esami"
              className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-border-strong hover:text-primary"
            >
              <ExternalLink className="size-3" />
              Vai agli esami
            </Link>
          </CardHeader>
          {data.examRecord ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={STATUS_VARIANT[data.examRecord.status] ?? "neutral"}>
                {STATUS_LABELS[data.examRecord.status] ?? data.examRecord.status}
              </Badge>
              {data.examRecord.grade && (
                <span className="font-mono text-sm font-semibold text-success">
                  Voto: {data.examRecord.grade}
                </span>
              )}
              {data.examRecord.passedAt && (
                <span className="text-xs text-muted">Superato: {data.examRecord.passedAt}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Nessun dato esame disponibile.</p>
          )}
        </Card>
      )}

      {/* Backlog */}
      <Card>
        <CardHeader>
          <CardTitle>Da recuperare</CardTitle>
          <Badge variant={data.backlog.length > 0 ? "danger" : "success"}>
            {data.backlog.length > 0 ? `${data.backlog.length} arretrate` : "In pari"}
          </Badge>
        </CardHeader>
        <SubjectTodoList items={data.backlog} />
      </Card>

      {/* Async lessons to watch */}
      <Card>
        <CardHeader>
          <CardTitle>Lezioni da guardare</CardTitle>
          <span className="text-xs text-muted">{data.toWatch.length} registrazioni future</span>
        </CardHeader>
        {data.toWatch.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted">Nessuna registrazione futura da guardare.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.toWatch.map((lesson) => (
              <li key={lesson.id} className="flex items-center gap-3 rounded-card border border-border bg-surface-muted/60 px-4 py-2.5">
                <div className="min-w-0 flex-1 text-sm text-secondary">
                  {WEEKDAY_LABELS[lesson.weekday]},{" "}
                  <span className="tabular-nums text-primary">{lesson.lesson_date}</span>
                </div>
                <Badge variant={lesson.mode === "presenza" ? "active" : "warning"}>
                  {LESSON_MODE_LABELS[lesson.mode as "presenza" | "asincrona"] ?? lesson.mode}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}
