import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

type BadgeVariant = "active" | "success" | "warning" | "danger" | "neutral";

const badgeClass: Record<BadgeVariant, string> = {
  active: "border-accent/30 bg-accent/10 text-accent",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  neutral: "border-border bg-surface-muted text-secondary",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  dot?: boolean;
};

export function Badge({
  className,
  variant = "neutral",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        badgeClass[variant],
        className
      )}
      {...props}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
