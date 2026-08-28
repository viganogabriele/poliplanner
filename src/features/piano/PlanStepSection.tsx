"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/ui";
import ExpandRows from "./ExpandRows";

/**
 * Sezione di passo numerata, mirror dei tre step dello strumento ufficiale
 * ("1 Frequenze acquisite", "2 Nuove frequenze", "3 Concludi"). Stessa meccanica di apertura
 * di `CollapsibleSection`, con l'occhiello numerato al posto del solo titolo.
 */
export default function PlanStepSection({
  number,
  title,
  description,
  badge,
  open,
  onToggle,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tap-scale flex w-full items-center gap-3 rounded-card p-4 text-left transition hover:bg-surface-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent transition-transform duration-300 ease-[var(--ease-spring)]"
        >
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold tracking-tight text-primary">{title}</span>
          {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown
            className={cn("size-4 text-muted transition-transform duration-300 ease-[var(--ease-spring)]", open && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </button>
      <ExpandRows open={open}>
        <div className="space-y-4 border-t border-border p-4">{children}</div>
      </ExpandRows>
    </section>
  );
}
