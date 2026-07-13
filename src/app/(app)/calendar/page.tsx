import { getSchedule } from "@/lib/schedule";
import CalendarClient from "@/features/calendar/CalendarClient";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const schedule = getSchedule();
  return (
    <PageShell>
      <CalendarClient initialRows={schedule} />
    </PageShell>
  );
}
