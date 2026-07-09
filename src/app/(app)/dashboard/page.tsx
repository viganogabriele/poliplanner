import { getDashboard } from "@/lib/dashboard";
import { WEEKDAY_LABELS } from "@/lib/dates";
import ProgressChart from "@/features/dashboard/ProgressChart";
import StatTile from "@/components/ui/StatTile";
import TodayPanel from "@/features/dashboard/TodayPanel";
import SubjectProgress from "@/features/subjects/SubjectProgress";
import { Badge } from "@/components/ui/Badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const dashboard = getDashboard();

  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_0.85fr]">
        <Card elevated>
          <CardHeader className="mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-primary">
                Panoramica
              </h1>
              <p className="mt-1 text-sm text-muted">
                {WEEKDAY_LABELS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]},{" "}
                <span className="tabular-nums">{dashboard.today}</span>
              </p>
            </div>
            <Badge variant="active" dot>
              Porto 3000
            </Badge>
          </CardHeader>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(220px,0.75fr)_1fr]">
            <div className="rounded-panel border border-border bg-background-soft/60 p-4 shadow-inset">
              <ProgressChart
                done={dashboard.done_count}
                pending={dashboard.pending_count}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatTile
                label="Avanzamento"
                value={`${dashboard.progress_percent}%`}
                accent="green"
              />
              <StatTile
                label="Da seguire"
                value={dashboard.pending_count}
                accent="red"
              />
              <StatTile
                label="Seguite"
                value={dashboard.done_count}
                accent="sky"
              />
              <StatTile
                label="Totale generate"
                value={dashboard.total_count}
              />
            </div>
          </div>
        </Card>

        <TodayPanel
          today={dashboard.today}
          today_weekday={dashboard.today_weekday}
          today_count={dashboard.today_count}
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Progresso per materia</CardTitle>
            <CardDescription>
              Stato delle lezioni seguite e arretrate per corso
            </CardDescription>
          </div>
        </CardHeader>
        <SubjectProgress subjects={dashboard.subject_progress} />
      </Card>
    </PageShell>
  );
}
