import { getSchedule } from "@/lib/schedule";
import WeeklyGrid from "@/features/calendar/WeeklyGrid";
import ScheduleEditor from "@/features/calendar/ScheduleEditor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const schedule = getSchedule();

  return (
    <PageShell>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Vista settimanale</CardTitle>
            <CardDescription>Distribuzione delle lezioni dal lunedi al venerdi</CardDescription>
          </div>
        </CardHeader>
        <WeeklyGrid rows={schedule} />
      </Card>

      <Card elevated>
        <CardHeader>
          <div>
            <CardTitle>Configurazione calendario settimanale</CardTitle>
            <CardDescription>
              Modifica righe, intervalli e modalita senza perdere le lezioni gia completate
            </CardDescription>
          </div>
        </CardHeader>
        <ScheduleEditor initialRows={schedule} />
      </Card>
    </PageShell>
  );
}
