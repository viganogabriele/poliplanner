import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "md" | "lg";
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "lg", className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-lg border border-border bg-surface text-muted transition",
        "hover:border-border-strong hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        size === "lg" ? "size-11" : "size-10",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
