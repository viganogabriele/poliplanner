import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

/**
 * Stato vuoto: una sola forma per tutta l'app, così "non c'è ancora nulla"
 * si distingue subito da "non c'è più niente da fare".
 *
 * `title` dice cosa manca, `description` cosa cambia se agisci, `action` è
 * l'unico passo successivo. Senza azione lo stato è solo informativo.
 */

type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface-muted/30 px-5 py-9 text-center",
        className
      )}
    >
      {icon && (
        <span className="mb-3 grid size-11 place-items-center rounded-full border border-border bg-surface text-muted">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{action}</div>}
    </div>
  );
}
