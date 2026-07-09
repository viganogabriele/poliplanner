// TodayPanel — Server Component (with a Client sub-component)
//
// The "Oggi" stat panel: date, weekday, lesson count today, live clock.
// The live clock (LiveClock) is a Client Component embedded inside
// this Server Component — that's perfectly fine in App Router.
// Server Components CAN render Client Components; they just can't use
// hooks themselves.

import LiveClock from "@/components/ui/LiveClock";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";

interface TodayPanelProps {
  today: string;
  today_weekday: string;
  today_count: number;
}

export default function TodayPanel({
  today,
  today_weekday,
  today_count,
}: TodayPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Oggi</CardTitle>
          <CardDescription>Riepilogo locale aggiornato</CardDescription>
        </div>
      </CardHeader>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <StatTile label="Data locale" value={today} />
        <div className="flex min-h-28 flex-col justify-between gap-3 rounded-card border border-border bg-surface-muted/70 px-4 py-3 shadow-inset">
          <span className="text-xs font-medium uppercase text-muted">
            Ora locale
          </span>
          <LiveClock />
        </div>
        <StatTile label="Lezioni previste oggi" value={today_count} accent="sky" />
        <StatTile label="Giorno settimana" value={today_weekday} />
      </div>
    </Card>
  );
}
