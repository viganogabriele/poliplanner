"use client";

import { cn } from "@/lib/ui";

/**
 * Anima l'altezza fra 0 e quella naturale del contenuto via `grid-template-rows`, così apertura
 * e chiusura seguono lo stesso percorso simmetrico invece di comparire/sparire di scatto.
 *
 * Unico posto dove vive questa tecnica: prima era duplicata identica in `CollapsibleSection`,
 * `PlanStepSection` e `CourseInfoCard`, con il rischio che una correzione (timing, un problema di
 * rendering) venisse applicata in due punti e dimenticata nel terzo.
 *
 * `inert` toglie dal focus e dalla lettura per screen reader il contenuto mentre è chiuso: a
 * `grid-rows-[0fr]` l'altezza è zero, ma senza `inert` resterebbe comunque raggiungibile da tastiera.
 */
export default function ExpandRows({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-[var(--ease-spring)]",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
