import SettingsPanel from "@/features/settings/SettingsPanel";
import { PageShell } from "@/components/ui/PageShell";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsPage() {
  return (
    <PageShell>
      <PageHeader title="Impostazioni" subtitle="Gestisci l'installazione e i dati conservati in questa istanza." />
      <SettingsPanel />
    </PageShell>
  );
}
