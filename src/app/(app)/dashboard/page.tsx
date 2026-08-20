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

      {/* I conteggi delle lezioni stanno nella legenda del grafico: qui solo la carriera. */}
      {dashboard.has_saved_plan && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
          <StatTile
            label="Esami mancanti"
            value={<AnimatedNumber value={examsMissing} />}
            hint={`su ${dashboard.exam_total_count} nel piano`}
          />
          <StatTile
            label="Media pesata"
            value={dashboard.exam_average !== null ? dashboard.exam_average.toFixed(2) : "—"}
            hint={dashboard.exam_average !== null ? "sui voti verbalizzati" : "nessun voto registrato"}
            accent="sky"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-5">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Progressione lezioni</CardTitle>
              <CardDescription>Lezioni completate rispetto all&apos;arretrato</CardDescription>
            </div>
          </CardHeader>
          <ProgressChart done={dashboard.done_count} pending={dashboard.pending_count} />
        </Card>
        <TodayPanel today_count={dashboard.today_count} todoItems={dashboard.todo_items} hasCalendar={hasCalendar} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Progresso per materia</CardTitle>
            <CardDescription>Apri una materia per lezioni, arretrati ed esame collegato</CardDescription>
          </div>
        </CardHeader>
        <SubjectProgress subjects={dashboard.subject_progress} />
      </Card>
    </PageShell>
  );
}
