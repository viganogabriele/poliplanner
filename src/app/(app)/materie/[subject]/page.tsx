import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getSubjectData } from "@/lib/subjects";
import { PageShell } from "@/components/ui/PageShell";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import SubjectTodoList from "@/features/subjects/SubjectTodoList";
import { formatItalianDate, WEEKDAY_LABELS } from "@/lib/dates";
import { LESSON_MODE_LABELS } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";

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
      <nav aria-label="Percorso">
        <Link
          href="/materie"
          className="inline-flex min-h-10 items-center gap-2 rounded-control pr-3 text-sm font-medium text-secondary transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Materie
        </Link>
      </nav>

      <PageHeader title={data.subjectName} />

      {/* Avanzamento: unico posto in cui compaiono i conteggi della materia. */}
      <Card>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted">Avanzamento</p>
          <p className="text-2xl font-semibold tabular-nums text-primary">{data.progressPercent}%</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-background-soft">
          <div className="progress-fill h-full rounded-full" style={{ width: `${data.progressPercent}%` }} />
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dd className="font-semibold tabular-nums text-success">{data.doneCount}</dd>
            <dt className="text-xs text-muted">seguite</dt>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dd className="font-semibold tabular-nums text-danger">{data.backlog.length}</dd>
            <dt className="text-xs text-muted">arretrate</dt>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dd className="font-semibold tabular-nums text-secondary">{data.toWatch.length}</dd>
            <dt className="text-xs text-muted">da guardare</dt>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dd className="font-semibold tabular-nums text-secondary">{data.totalCount}</dd>
            <dt className="text-xs text-muted">in totale</dt>
          </div>
        </dl>
      </Card>

      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Esame collegato</CardTitle>
            {/* Senza corso collegato il messaggio sta una volta sola, nel corpo della scheda. */}
            {data.relatedCourse && (
              <CardDescription>{data.relatedCourse.name} · {data.relatedCourse.cfu} CFU</CardDescription>
            )}
          </div>
          {data.relatedCourse && (
            <Link
              href="/esami"
              className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-control border border-border px-3 text-sm font-medium text-secondary transition hover:border-border-strong hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              Vai agli esami
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </CardHeader>
        {!data.relatedCourse ? (
          <p className="text-sm text-muted">
            Nessun esame collegato. Controlla il codice corso nel Calendario.
          </p>
        ) : data.examRecord ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={STATUS_VARIANT[data.examRecord.status] ?? "neutral"}>
              {STATUS_LABELS[data.examRecord.status] ?? data.examRecord.status}
            </Badge>
            {data.examRecord.grade && (
              <span className="font-mono text-sm font-semibold text-success">{data.examRecord.grade}/30</span>
            )}
            {data.examRecord.passedAt && (
              <span className="text-xs text-muted">
                superato il {formatItalianDate(data.examRecord.passedAt)}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Nessun dato esame disponibile.</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Da recuperare</CardTitle>
          <Badge variant={data.backlog.length > 0 ? "danger" : "success"}>
            {data.backlog.length > 0 ? `${data.backlog.length} arretrate` : "In pari"}
          </Badge>
        </CardHeader>
        <SubjectTodoList items={data.backlog} />
      </Card>

      {data.toWatch.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lezioni da guardare</CardTitle>
            <span className="shrink-0 text-xs text-muted">{data.toWatch.length} registrazioni future</span>
          </CardHeader>
          <ul className="space-y-2">
            {data.toWatch.map((lesson) => (
              <li
                key={lesson.id}
                className="flex items-center gap-3 rounded-control border border-border bg-surface-muted/40 px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 text-sm text-secondary">
                  {WEEKDAY_LABELS[lesson.weekday]}{" "}
                  <span className="text-primary">{formatItalianDate(lesson.lesson_date, "long")}</span>
                </span>
                <Badge
                  size="sm"
                  variant={lesson.mode === "presenza" ? "active" : "warning"}
                  title={LESSON_MODE_LABELS[lesson.mode as "presenza" | "asincrona"] ?? lesson.mode}
                >
                  {lesson.mode === "presenza" ? "In presenza" : "Asincrona"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}
