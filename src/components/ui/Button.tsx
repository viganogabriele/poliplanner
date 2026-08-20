import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui";

/**
 * Pulsante. Una sola gerarchia: `primary` è l'azione della schermata,
 * `secondary` le alternative, `ghost` le azioni di servizio, `danger` ciò che
 * distrugge dati. Le pillole (bordo tondo) restano a stati e filtri.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "icon";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-accent font-semibold text-background hover:bg-accent/90",
  secondary:
    "border border-border bg-surface-elevated text-primary hover:border-border-strong hover:bg-surface-hover",
  ghost:
    "border border-transparent bg-transparent text-secondary hover:bg-surface-hover hover:text-primary",
  danger:
    "border border-danger/30 bg-danger/10 text-danger hover:border-danger/50 hover:bg-danger/20",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "min-h-10 px-3 py-2 text-sm",
  md: "min-h-11 px-4 py-2.5 text-sm",
  icon: "size-11 p-0",
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
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium transition duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
    "active:scale-[0.99] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
    variantClass[variant],
    sizeClass[size],
    className
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
});
