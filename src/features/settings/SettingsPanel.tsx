"use client";

import { useState, useTransition } from "react";
import { Database, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import { resetDatabaseAction, seedDatabaseAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PwaInstallButton from "@/components/ui/PwaInstallButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Callout from "@/components/ui/Callout";

export default function SettingsPanel() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  function handleAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      setMessage(
        result.ok
          ? { text: "Operazione completata.", ok: true }
          : { text: result.error ?? "Errore sconosciuto", ok: false }
      );
      setTimeout(() => setMessage(null), 3000);
    });
  }

  return (
    <div className="space-y-5">
      {message && (
        <Callout role="status" tone={message.ok ? "success" : "danger"}>
          {message.text}
        </Callout>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Dati locali</CardTitle>
            <CardDescription>
              Questa istanza non ha utenti: i dati restano nel database SQLite di questa macchina.
            </CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-control border border-border bg-surface-muted/40 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              Istanza privata
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Se pubblichi l&apos;app, proteggila con autenticazione tramite reverse proxy.
            </p>
          </div>
          <div className="rounded-control border border-border bg-surface-muted/40 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Smartphone className="size-4 text-accent" aria-hidden="true" />
              App sul dispositivo
            </p>
            <p className="mt-1 mb-3 text-sm leading-relaxed text-muted">
              Quando il browser lo consente, puoi installare Poliplanner sulla schermata Home.
            </p>
            <PwaInstallButton />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dati di esempio</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Carica un calendario dimostrativo per esplorare l&apos;app: sostituisce calendario, lezioni,
            esami, piani e avanzamento attuali.
          </p>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowSeedConfirm(true)}
            disabled={isPending}
          >
            <Database className="size-4" aria-hidden="true" />
            {isPending ? "Attendere…" : "Carica dati di esempio"}
          </Button>
        </div>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle>Azioni pericolose</CardTitle>
        </CardHeader>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Elimina calendario, occorrenze delle lezioni, completamenti, esami, carriera, piani di studio,
            scenari e impostazioni. Non si può annullare.
          </p>
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowResetConfirm(true)}
            disabled={isPending}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {isPending ? "Attendere…" : "Elimina tutti i dati"}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={showResetConfirm}
        title="Eliminare tutti i dati?"
        description="Verranno eliminati calendario, lezioni, completamenti, esami, carriera, piani di studio, scenari e impostazioni. L'operazione è irreversibile."
        confirmLabel="Elimina tutto"
        variant="danger"
        onConfirm={() => { setShowResetConfirm(false); handleAction(resetDatabaseAction); }}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        open={showSeedConfirm}
        title="Caricare i dati di esempio?"
        description="I dati attuali verranno eliminati e sostituiti con un calendario e un avanzamento dimostrativi."
        confirmLabel="Carica esempi"
        variant="default"
        onConfirm={() => { setShowSeedConfirm(false); handleAction(seedDatabaseAction); }}
        onCancel={() => setShowSeedConfirm(false)}
      />
    </div>
  );
}
