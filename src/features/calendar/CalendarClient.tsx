"use client";

import { useState } from "react";
import { CalendarPlus, Pencil, X } from "lucide-react";
import InfoButton from "@/components/ui/InfoButton";
import WeeklyGrid from "@/features/calendar/WeeklyGrid";
import ScheduleEditor from "@/features/calendar/ScheduleEditor";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
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
      {/* Un solo posto per l'azione di modo: la testata. La scheda sotto contiene solo il contenuto. */}
      <PageHeader
        title="Calendario"
        subtitle={isEditing
          ? "Modifica le ricorrenze. Le lezioni già completate restano associate alle date invariate."
          : "Le tue lezioni ricorrenti, giorno per giorno."}
        actions={isEditing ? (
          <Button variant="secondary" onClick={requestCloseEditor} className="w-full sm:w-auto">
            <X className="size-4" aria-hidden="true" />
            Annulla modifica
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
            <Pencil className="size-4" aria-hidden="true" />
            Modifica calendario
          </Button>
        )}
      />
      {!isEditing ? (
        <div className="animate-fadeup">
          <Card>
            <CardHeader>
              <CardTitle>Vista settimanale</CardTitle>
              <InfoButton title="Come funziona il calendario">
                <p>Ogni riga definisce una lezione <strong>ricorrente</strong>: un giorno della settimana, una materia, un intervallo di date e una modalità.</p>
                <p className="mt-1">Salvando, l&apos;app genera automaticamente tutte le singole occorrenze di lezione.</p>
                <p className="mt-1"><strong>In presenza</strong>: lezione dal vivo da seguire/frequentare.</p>
                <p className="mt-1"><strong>Asincrona</strong>: registrazione o video da guardare quando vuoi.</p>
              </InfoButton>
            </CardHeader>
            {initialRows.length === 0 ? (
              <EmptyState
                icon={<CalendarPlus className="size-5" aria-hidden="true" />}
                title="Nessuna lezione configurata"
                description="Aggiungi le ricorrenze settimanali: l'app genera da sole lezioni, arretrati e riepiloghi."
                action={
                  <Button variant="primary" size="sm" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                    Configura calendario
                  </Button>
                }
              />
            ) : (
              <WeeklyGrid rows={initialRows} />
            )}
          </Card>
        </div>
      ) : (
        <div className="animate-fadeup">
          <Card elevated>
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
