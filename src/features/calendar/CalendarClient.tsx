"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import InfoButton from "@/components/ui/InfoButton";
import WeeklyGrid from "@/features/calendar/WeeklyGrid";
import ScheduleEditor from "@/features/calendar/ScheduleEditor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { ScheduleRow } from "@/lib/types";

interface CalendarClientProps {
  initialRows: ScheduleRow[];
}

export default function CalendarClient({ initialRows }: CalendarClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestCloseEditor = () => {
    if (isDirty) setConfirmDiscard(true);
    else setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        subtitle={isEditing
          ? "Modifica le ricorrenze. Le lezioni già completate restano associate alle date invariate."
          : "Lezioni ricorrenti distribuite dal lunedì alla domenica."}
        actions={!isEditing ? (
          <Button variant="secondary" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
            <Pencil className="size-4" aria-hidden="true" />
            Modifica calendario
          </Button>
        ) : undefined}
      />
      {!isEditing ? (
        <div className="animate-fadeup">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Vista settimanale</CardTitle>
                <CardDescription>La settimana completa, con weekend separato dai giorni feriali</CardDescription>
              </div>
              <InfoButton title="Come funziona il calendario">
                <p>Ogni riga definisce una lezione <strong>ricorrente</strong>: un giorno della settimana, una materia, un intervallo di date e una modalità.</p>
                <p className="mt-1">Salvando, l&apos;app genera automaticamente tutte le singole occorrenze di lezione.</p>
                <p className="mt-1"><strong>In presenza</strong>: lezione dal vivo da seguire/frequentare.</p>
                <p className="mt-1"><strong>Asincrona</strong>: registrazione o video da guardare quando vuoi.</p>
              </InfoButton>
            </CardHeader>
            {initialRows.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/60 p-6 text-center">
                <p className="text-sm font-semibold text-primary">Nessuna lezione configurata</p>
                <p className="mt-1 max-w-sm text-xs text-muted">Aggiungi le ricorrenze settimanali per generare lezioni, arretrati e riepiloghi.</p>
                <Button variant="primary" onClick={() => setIsEditing(true)} className="mt-4 w-full sm:w-auto">
                  Configura calendario
                </Button>
              </div>
            ) : (
              <WeeklyGrid rows={initialRows} />
            )}
          </Card>
        </div>
      ) : (
        <div className="animate-fadeup">
          <Card elevated>
            <CardHeader>
              <div>
                <CardTitle>Modifica calendario</CardTitle>
                <CardDescription>Modifica righe, intervalli e modalità senza perdere le lezioni già completate</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={requestCloseEditor}>
                <X className="size-4" />
                Annulla
              </Button>
            </CardHeader>
            <ScheduleEditor
              initialRows={initialRows}
              onDirtyChange={setIsDirty}
              onSaveSuccess={() => {
                setIsDirty(false);
                setIsEditing(false);
              }}
            />
          </Card>
        </div>
      )}
      <ConfirmDialog
        open={confirmDiscard}
        title="Scartare le modifiche?"
        description="Le modifiche non salvate al calendario andranno perse."
        confirmLabel="Scarta modifiche"
        variant="danger"
        onConfirm={() => {
          setConfirmDiscard(false);
          setIsDirty(false);
          setIsEditing(false);
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}
