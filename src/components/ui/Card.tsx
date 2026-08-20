import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

/**
 * Scheda. La gerarchia è nella scala delle superfici, non nelle ombre:
 * pagina < scheda (`surface`) < livello flottante (`surface-elevated`).
 * Niente gradienti scritti a mano: cambiare un token deve bastare.
 */

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Livello leggermente rialzato, per il contenuto principale di una pagina. */
  elevated?: boolean;
  /** Superficie incassata: per le schede annidate dentro un'altra scheda. */
  inset?: boolean;
  /** Rimuove il padding quando il contenuto gestisce da sé i propri margini. */
  flush?: boolean;
};

export function Card({ className, elevated = false, inset = false, flush = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border",
        flush ? "" : "p-4 sm:p-5",
        elevated
          ? "border-border-strong bg-surface-elevated"
          : inset
            ? "border-border bg-surface-muted/40"
            : "border-border bg-surface",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mb-4 flex items-start justify-between gap-3", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-base font-semibold text-primary sm:text-lg", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-sm leading-relaxed text-muted", className)} {...props} />
  );
}
