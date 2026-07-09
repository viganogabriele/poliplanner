import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border border-accent bg-accent text-background shadow-[0_0_20px_rgba(86,215,253,0.18)] hover:brightness-110",
  secondary:
    "border border-border bg-surface-elevated text-primary hover:border-border-strong hover:bg-surface-hover",
  ghost:
    "border border-transparent bg-transparent text-secondary hover:bg-surface-hover hover:text-primary",
  danger:
    "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  icon: "size-10 p-0",
};

export function buttonClass({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    "active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
    variantClass[variant],
    sizeClass[size],
    className
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
