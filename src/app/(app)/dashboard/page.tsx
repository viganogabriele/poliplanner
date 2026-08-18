import { getDashboard } from "@/lib/dashboard";
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
  const hasCalendar = dashboard.total_count > 0;

  return (
    <PageShell>
      <DashboardHero
        dayLabel={dashboard.today_weekday}
        today={dashboard.today}
        hasCalendar={hasCalendar}
        hasSavedPlan={dashboard.has_saved_plan}
        examTotalCount={dashboard.exam_total_count}
        examPassedCount={dashboard.exam_passed_count}
      />

      {(hasCalendar || dashboard.has_saved_plan) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {hasCalendar && <StatTile label="Lezioni seguite" value={<AnimatedNumber value={dashboard.done_count} />} accent="green" />}
          {hasCalendar && <StatTile label="Da seguire" value={<AnimatedNumber value={dashboard.pending_count} />} accent="red" />}
          {dashboard.has_saved_plan && <StatTile label="Esami mancanti" value={<AnimatedNumber value={examsMissing} />} accent="green" />}
          {dashboard.has_saved_plan && <StatTile label="Media" value={dashboard.exam_average !== null ? dashboard.exam_average.toFixed(2) : "—"} />}
        </div>
      )}

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
        <TodayPanel today_count={dashboard.today_count} todoItems={dashboard.todo_items} hasCalendar={hasCalendar} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Progresso per materia</CardTitle>
            <CardDescription>Apri una materia per vedere lezioni, arretrati ed esame collegato</CardDescription>
          </div>
        </CardHeader>
        <SubjectProgress subjects={dashboard.subject_progress} />
      </Card>
    </PageShell>
  );
}
