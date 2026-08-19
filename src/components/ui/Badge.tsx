import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

/**
 * Pillola di stato. Serve a dire *com'è* qualcosa, non a farci cliccare:
 * per le azioni ci sono `Button` e `IconButton`.
 */

type BadgeVariant = "active" | "success" | "warning" | "danger" | "neutral";
type BadgeSize = "sm" | "md";

const badgeClass: Record<BadgeVariant, string> = {
  active: "border-accent/30 bg-accent/10 text-accent",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  neutral: "border-border bg-surface-muted text-secondary",
};

const sizeClass: Record<BadgeSize, string> = {
  sm: "gap-1 px-2 py-0.5 text-[11px]",
  md: "gap-1.5 px-2.5 py-1 text-xs",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
};

export function Badge({
  className,
  variant = "neutral",
  size = "md",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border font-medium",
        badgeClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
