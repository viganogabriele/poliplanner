import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, actions, eyebrow, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-accent">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-[1.75rem]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div>}
    </header>
  );
}
