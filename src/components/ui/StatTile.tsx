import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

/**
 * Riquadro con una metrica: etichetta, valore e — se serve — una nota o un
 * pulsante informativo.
 *
 * Non ha stati di hover: non è cliccabile, e fingere il contrario faceva
 * sembrare interattivi dei numeri.
 */

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Slot per un `InfoButton`, allineato all'etichetta. */
  info?: ReactNode;
  accent?: "green" | "red" | "sky" | "amber";
  className?: string;
}

const accentClass: Record<string, string> = {
  green: "text-success",
  red: "text-danger",
  sky: "text-accent",
  amber: "text-warning",
};

export default function StatTile({ label, value, hint, info, accent, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "flex min-h-24 flex-col justify-between gap-2 rounded-card border border-border bg-surface-muted/60 px-4 py-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-medium text-muted">{label}</span>
        {info}
      </div>
      <div>
        <span
          className={cn(
            "block whitespace-nowrap text-2xl font-semibold leading-tight tabular-nums",
            accent ? accentClass[accent] : "text-primary"
          )}
        >
          {value}
        </span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </div>
    </div>
  );
}
