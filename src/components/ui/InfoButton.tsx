"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/ui";

interface InfoButtonProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function InfoButton({ title, children, className }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Info: ${title}`}
        aria-expanded={open}
        aria-controls={popoverId}
        className="grid size-6 place-items-center rounded-full text-muted transition hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={popoverId}
          role="tooltip"
          className="absolute left-0 top-8 z-50 w-72 rounded-xl border border-border bg-surface-elevated p-4 shadow-elevated"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">{title}</p>
          <div className="space-y-1.5 text-xs leading-relaxed text-secondary">{children}</div>
        </div>
      )}
    </div>
  );
}
