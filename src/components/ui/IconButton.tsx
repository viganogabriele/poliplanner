import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui";

/**
 * Pulsante con la sola icona. `label` è obbligatoria: diventa il nome
 * accessibile e il tooltip, così un controllo muto non finisce nell'interfaccia.
 */

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "md" | "lg";
  variant?: "solid" | "ghost";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "lg", variant = "solid", className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-control border transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
        variant === "solid"
          ? "border-border bg-surface-elevated text-muted hover:border-border-strong hover:bg-surface-hover hover:text-primary"
          : "border-transparent bg-transparent text-muted hover:bg-surface-hover hover:text-primary",
        size === "lg" ? "size-11" : "size-10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
