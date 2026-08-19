"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PIANO_GUIDE_SECTIONS } from "@/lib/polimi/guide";
import { DISCLAIMER } from "@/lib/polimi/constraints";

/**
 * Guida al pianificatore. Era l'unica ragione per cui `motion/react` entrava nel primo
 * caricamento della pagina: un'animazione di apertura da ~150 KB non compressi per un pannello
 * che quasi nessuno apre. Ora il componente è caricato in modo differito e l'apertura è una
 * transizione CSS, che rispetta anche `prefers-reduced-motion` senza codice aggiuntivo.
 */

export default function PlanGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="animate-panel-open">
      <Card className="border-accent/25 bg-accent/5">
        <CardHeader>
          <div>
            <CardTitle>Come funziona questo pianificatore</CardTitle>
            <CardDescription>{DISCLAIMER}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
            Chiudi
          </Button>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {PIANO_GUIDE_SECTIONS.map((section) => (
            <section key={section.title} className="rounded-control border border-border bg-surface-muted/50 p-4">
              <h3 className="text-sm font-semibold text-primary">{section.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-secondary">{section.content}</p>
            </section>
          ))}
        </div>
      </Card>
    </div>
  );
}
