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
        "rounded-card border",
        tone === "muted" ? "border-border bg-surface-muted/30" : "border-border bg-surface"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-card p-4 text-left transition hover:bg-surface-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-primary">{title}</span>
          {description && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div className="animate-panel-open border-t border-border p-4">{children}</div>
      )}
    </section>
  );
}
