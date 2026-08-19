"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { cn } from "@/lib/ui";

interface InfoButtonProps {
  title: string;
  children: ReactNode;
  /** `sm` per l'uso in linea accanto a testo piccolo, `md` per le intestazioni. */
  size?: "sm" | "md";
  className?: string;
}

export default function InfoButton({ title, children, size = "md", className }: InfoButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const popoverId = useId();
  const titleId = `${popoverId}-title`;

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 32);
    const panelHeight = panelRef.current?.offsetHeight ?? 180;
    const left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - width - 16));
    const below = rect.bottom + 8;
    const top = below + panelHeight <= window.innerHeight - 16
      ? below
      : Math.max(16, rect.top - panelHeight - 8);
    setPosition({ left, top });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const focusTimer = window.setTimeout(() => {
      updatePosition();
      panelRef.current?.focus();
    }, 0);
    function handlePointer(e: PointerEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) close();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [close, open, updatePosition]);

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Info: ${title}`}
        aria-expanded={open}
        aria-controls={popoverId}
        title={`Informazioni: ${title}`}
        className={cn(
          "grid shrink-0 place-items-center rounded-control text-muted transition hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
          size === "sm" ? "size-7" : "size-10"
        )}
      >
        <Info className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          id={popoverId}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          style={{ left: position.left, top: position.top, width: "min(20rem, calc(100vw - 2rem))" }}
          className="fixed z-[70] max-h-[min(24rem,calc(100vh-2rem))] overflow-y-auto rounded-card border border-border-strong bg-surface-elevated p-4 shadow-elevated focus:outline-none"
        >
          <p id={titleId} className="mb-2 text-xs font-semibold text-accent">{title}</p>
          <div className="space-y-1.5 text-xs leading-relaxed text-secondary">{children}</div>
        </div>,
        document.body
      )}
    </div>
  );
}
