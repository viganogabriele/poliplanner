"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import InfoButton from "@/components/ui/InfoButton";
import WeeklyGrid from "@/features/calendar/WeeklyGrid";
import ScheduleEditor from "@/features/calendar/ScheduleEditor";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ScheduleRow } from "@/lib/types";

interface CalendarClientProps {
  initialRows: ScheduleRow[];
}

export default function CalendarClient({ initialRows }: CalendarClientProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!isEditing ? (
        <motion.div
          key="view"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Vista settimanale</CardTitle>
                <CardDescription>Distribuzione delle lezioni dal lunedì al venerdì</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <InfoButton title="Come funziona il calendario">
                  <p>Ogni riga definisce una lezione <strong>ricorrente</strong>: un giorno della settimana, una materia, un intervallo di date e una modalità.</p>
                  <p className="mt-1">Salvando, l&apos;app genera automaticamente tutte le singole occorrenze di lezione.</p>
                  <p className="mt-1"><strong>In presenza</strong>: lezione dal vivo da seguire/frequentare.</p>
                  <p className="mt-1"><strong>Asincrona</strong>: registrazione/video da guardare quando vuoi.</p>
                </InfoButton>
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="size-3.5" />
                  Modifica calendario
                </Button>
              </div>
            </CardHeader>
            {initialRows.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/60 p-6 text-center">
                <p className="text-sm font-semibold text-primary">Nessuna lezione configurata</p>
                <p className="mt-1 text-xs text-muted">Clicca &ldquo;Modifica calendario&rdquo; per aggiungere le tue lezioni ricorrenti.</p>
              </div>
            ) : (
              <WeeklyGrid rows={initialRows} />
            )}
          </Card>
        </motion.div>
      ) : (
        <motion.div
          key="edit"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Card elevated>
            <CardHeader>
              <div>
                <CardTitle>Modifica calendario</CardTitle>
                <CardDescription>Modifica righe, intervalli e modalità senza perdere le lezioni già completate</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                <X className="size-4" />
                Annulla
              </Button>
            </CardHeader>
            <ScheduleEditor initialRows={initialRows} onSaveSuccess={() => setIsEditing(false)} />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
