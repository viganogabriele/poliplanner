import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ className, elevated = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface p-5",
        "bg-[linear-gradient(180deg,#101820_0%,#0A0F14_100%)]",
        elevated
          ? "border-border-strong bg-[linear-gradient(180deg,#101820,#070B0F)] shadow-elevated"
          : "shadow-card",
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
      className={cn("mb-5 flex items-start justify-between gap-4", className)}
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
      className={cn("text-lg font-semibold text-primary", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-sm text-muted", className)} {...props} />
  );
}
