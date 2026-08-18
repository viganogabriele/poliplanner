"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Database, HardDrive, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import { resetDatabaseAction, seedDatabaseAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PwaInstallButton from "@/components/ui/PwaInstallButton";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

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
        <div
          className={`flex items-center gap-2 rounded-card border px-4 py-3 text-sm font-medium ${
            message.ok
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
          role="status"
        >
          {message.ok ? (
            <CheckCircle2 className="size-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="size-4" aria-hidden="true" />
          )}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><HardDrive className="size-5" aria-hidden="true" /></span>
            <div>
              <CardTitle>Dati locali</CardTitle>
              <CardDescription>Questa istanza non ha utenti. I dati restano nel database SQLite locale.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface-muted/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              Istanza privata
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">Se pubblichi l&apos;app, proteggila con autenticazione tramite reverse proxy.</p>
          </div>
          <div className="rounded-xl border border-border bg-surface-muted/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Smartphone className="size-4 text-accent" aria-hidden="true" />
              App sul dispositivo
            </div>
            <p className="mt-1 mb-3 text-xs leading-relaxed text-muted">Quando il browser lo consente, puoi installare Poliplanner dalla schermata Home.</p>
            <PwaInstallButton />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Dati di esempio</CardTitle>
            <CardDescription>Carica un calendario dimostrativo per esplorare l&apos;app.</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-secondary">Questa operazione sostituisce calendario, lezioni, esami, piani e avanzamento attuali con dati di esempio.</p>
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowSeedConfirm(true)}
            disabled={isPending}
          >
            <Database className="size-4" aria-hidden="true" />
            {isPending ? "Attendere..." : "Carica dati di esempio"}
          </Button>
        </div>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <div>
            <CardTitle>Azioni pericolose</CardTitle>
            <CardDescription>Il ripristino elimina tutti i dati e non può essere annullato.</CardDescription>
          </div>
        </CardHeader>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm leading-relaxed text-secondary">Elimina calendario, occorrenze delle lezioni, completamenti, esami, carriera, piani di studio, scenari e impostazioni.</p>
          <Button
            type="button"
            variant="danger"
            onClick={() => setShowResetConfirm(true)}
            disabled={isPending}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {isPending ? "Attendere..." : "Elimina tutti i dati"}
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
