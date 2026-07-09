import SettingsPanel from "@/features/settings/SettingsPanel";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageShell } from "@/components/ui/PageShell";

export default function SettingsPage() {
  return (
    <PageShell>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Impostazioni</CardTitle>
            <CardDescription>Gestione locale dei dati demo e del database</CardDescription>
          </div>
        </CardHeader>
        <SettingsPanel />
      </Card>
    </PageShell>
  );
}
