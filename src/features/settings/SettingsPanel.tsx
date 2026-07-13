"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Database, RotateCcw } from "lucide-react";
import { resetDatabaseAction, seedDatabaseAction } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

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
    <div className="space-y-6">
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

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-primary">Gestione dati</h3>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowSeedConfirm(true)}
            disabled={isPending}
          >
            <Database className="size-4" aria-hidden="true" />
            {isPending ? "Attendere…" : "Carica dati demo (seed)"}
          </Button>

          <Button
            type="button"
            variant="danger"
            onClick={() => setShowResetConfirm(true)}
            disabled={isPending}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {isPending ? "Attendere…" : "Reset database"}
          </Button>
        </div>

        <div className="space-y-1 text-xs text-muted">
          <p>
            <span className="font-semibold text-accent">Carica dati demo</span> — resetta il database e inserisce un calendario di esempio con materie universitarie e progressi simulati.
          </p>
          <p>
            <span className="font-semibold text-danger">Reset database</span> — elimina tutti i dati (calendario, lezioni, progressi). Operazione irreversibile.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset database"
        description="Questa operazione eliminerà tutti i dati (calendario, lezioni, progressi). L'operazione è irreversibile. Continuare?"
        confirmLabel="Reset"
        variant="danger"
        onConfirm={() => { setShowResetConfirm(false); handleAction(resetDatabaseAction); }}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        open={showSeedConfirm}
        title="Carica dati demo"
        description="Questa operazione resetterà il database e caricherà dati di esempio. I dati attuali andranno persi. Continuare?"
        confirmLabel="Carica demo"
        variant="default"
        onConfirm={() => { setShowSeedConfirm(false); handleAction(seedDatabaseAction); }}
        onCancel={() => setShowSeedConfirm(false)}
      />
    </div>
  );
}
