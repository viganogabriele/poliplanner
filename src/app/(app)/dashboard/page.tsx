import { getDashboard } from "@/lib/dashboard";
import { WEEKDAY_LABELS } from "@/lib/dates";
import ProgressChart from "@/features/dashboard/ProgressChart";
import AnimatedNumber from "@/features/dashboard/AnimatedNumber";
import DashboardHero from "@/features/dashboard/DashboardHero";
import StatTile from "@/components/ui/StatTile";
import TodayPanel from "@/features/dashboard/TodayPanel";
import SubjectProgress from "@/features/subjects/SubjectProgress";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const dashboard = getDashboard();
  const examsMissing = Math.max(0, dashboard.exam_total_count - dashboard.exam_passed_count);
  const dayLabel = WEEKDAY_LABELS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <PageShell>
      <DashboardHero
        dayLabel={dayLabel}
        today={dashboard.today}
        pendingCount={dashboard.pending_count}
        examTotalCount={dashboard.exam_total_count}
        examPassedCount={dashboard.exam_passed_count}
        examAverage={dashboard.exam_average}
      />

      {/* KPI ROW */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Avanzamento" value={<AnimatedNumber value={dashboard.progress_percent} suffix="%" />} accent="sky" />
        <StatTile label="Da seguire" value={<AnimatedNumber value={dashboard.pending_count} />} accent="red" />
        <StatTile label="Esami mancanti" value={<AnimatedNumber value={examsMissing} />} accent="green" />
        <StatTile label="Media" value={dashboard.exam_average !== null ? dashboard.exam_average.toFixed(2) : "—"} />
      </div>

      {/* CHART + TODAY */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_0.85fr]">
        <Card elevated>
          <CardHeader>
            <div>
              <CardTitle>Progressione lezioni</CardTitle>
              <CardDescription>Lezioni completate rispetto all&apos;arretrato</CardDescription>
            </div>
          </CardHeader>
          <div className="rounded-panel border border-border bg-background-soft/60 p-4 shadow-inset">
            <ProgressChart done={dashboard.done_count} pending={dashboard.pending_count} />
          </div>
        </Card>
        <TodayPanel today={dashboard.today} today_weekday={dashboard.today_weekday} today_count={dashboard.today_count} />
      </div>

      {/* PER-SUBJECT PROGRESS */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Progresso per materia</CardTitle>
            <CardDescription>Clicca su una materia per vederne i dettagli</CardDescription>
          </div>
        </CardHeader>
        <SubjectProgress subjects={dashboard.subject_progress} />
      </Card>
    </PageShell>
  );
}
