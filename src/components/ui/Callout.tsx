import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Riquadro informativo: un solo stile per tutti i messaggi in linea
 * (stato, avvisi, spiegazioni, esiti di un'azione).
 *
 * Prima ogni pagina ridisegnava il proprio box colorato con bordi e opacità
 * leggermente diversi. Il tono qui è una scelta semantica, non un colore.
 */

export type CalloutTone = "info" | "success" | "warning" | "danger" | "neutral";

export const CALLOUT_TONE: Record<CalloutTone, { box: string; icon: string }> = {
  info: { box: "border-accent/25 bg-accent/5", icon: "text-accent" },
  success: { box: "border-success/25 bg-success/5", icon: "text-success" },
  warning: { box: "border-warning/25 bg-warning/5", icon: "text-warning" },
  danger: { box: "border-danger/30 bg-danger/5", icon: "text-danger" },
  neutral: { box: "border-border bg-surface-muted/50", icon: "text-muted" },
};

const DEFAULT_ICON: Record<CalloutTone, ReactNode> = {
  info: <Info className="size-4" aria-hidden="true" />,
  success: <CheckCircle2 className="size-4" aria-hidden="true" />,
  warning: <CircleAlert className="size-4" aria-hidden="true" />,
  danger: <CircleAlert className="size-4" aria-hidden="true" />,
  neutral: <Info className="size-4" aria-hidden="true" />,
};

type CalloutProps = {
  tone?: CalloutTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Azione allineata a destra su schermi larghi, sotto al testo su mobile. */
  actions?: ReactNode;
  /** Passa `null` per un riquadro senza icona. */
  icon?: ReactNode | null;
  role?: "status" | "alert";
  className?: string;
};

export default function Callout({
  tone = "neutral",
  title,
  children,
  actions,
  icon,
  role,
  className,
}: CalloutProps) {
  const palette = CALLOUT_TONE[tone];
  const resolvedIcon = icon === null ? null : icon ?? DEFAULT_ICON[tone];

  return (
    <div role={role} className={cn("rounded-card border px-4 py-3", palette.box, className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {resolvedIcon && <span className={cn("mt-0.5 shrink-0", palette.icon)}>{resolvedIcon}</span>}
          <div className="min-w-0">
            {title && <p className="text-sm font-semibold text-primary">{title}</p>}
            {children && (
              <div className={cn("text-sm leading-relaxed text-muted", title ? "mt-0.5" : undefined)}>{children}</div>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
