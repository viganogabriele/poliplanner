"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Sezione richiudibile. L'apertura è una transizione CSS: nessuna libreria di animazione entra
 * nel primo caricamento solo per aprire un accordion.
 */
export default function CollapsibleSection({
  title,
  description,
  badge,
  open,
  onToggle,
  children,
  tone = "neutral",
}: {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  tone?: "neutral" | "muted";
}) {
  return (
    <section
      className={cn(
        "rounded-panel border p-4",
        tone === "muted" ? "border-border/70 bg-surface/20" : "border-border bg-surface/40"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-primary">{title}</span>
          {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="animate-panel-open mt-4 border-t border-border pt-4">{children}</div>}
    </section>
  );
}
