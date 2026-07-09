import { getDashboard } from "@/lib/dashboard";
import TodoList from "@/features/lessons/TodoList";
import StatTile from "@/components/ui/StatTile";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export const dynamic = "force-dynamic";

export default function LessonsPage() {
  const dashboard = getDashboard();

  return (
    <PageShell>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Seguite" value={dashboard.done_count} accent="green" />
        <StatTile label="Da seguire" value={dashboard.pending_count} accent="red" />
        <StatTile
          label="Avanzamento"
          value={`${dashboard.progress_percent}%`}
          accent="sky"
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Lezioni da seguire / segnare</CardTitle>
            <CardDescription>Attivita arretrate e previste per oggi</CardDescription>
          </div>
        </CardHeader>
        <TodoList items={dashboard.todo_items} />
      </Card>
    </PageShell>
  );
}
