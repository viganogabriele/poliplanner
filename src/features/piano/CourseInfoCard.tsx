"use client";

import type { LucideIcon } from "lucide-react";
import { CalendarDays, ChevronDown, Clock3, GraduationCap } from "lucide-react";
import { cn } from "@/lib/ui";
import ExpandRows from "./ExpandRows";

/**
 * Card insegnamento condivisa da tutti i pannelli del piano.
 *
 * Riprende la forma delle card dello strumento ufficiale PoliMi (titolo, poi una riga di
 * metadati a icone: anno di corso, semestre, CFU, ed eventualmente voto/data per gli esami
 * verbalizzati) ma con i token dark già in uso nel resto dell'app: nessun colore nuovo,
 * nessun tema chiaro.
 */

export type CourseMetaItem = {
  icon: LucideIcon;
  text: string;
  title?: string;
};

type Tone = "default" | "warning" | "accent" | "success" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  default: "border-border bg-surface-muted/40 hover:border-border-strong",
  warning: "border-warning/30 bg-warning/5",
  accent: "border-accent/25 bg-accent/5",
  success: "border-success/25 bg-success/5",
  muted: "border-border bg-surface-muted/25",
};

/**
 * Anno di corso, semestre e CFU: la terna di metadati che compare su quasi ogni card
 * insegnamento del piano. Un solo posto invece di ricostruire l'array in ogni pannello.
 */
export function courseMetaItems(courseYear: number, semester: 1 | 2, cfu: number): CourseMetaItem[] {
  return [
    { icon: GraduationCap, text: `${courseYear}° anno` },
    { icon: CalendarDays, text: `${semester}° semestre` },
    { icon: Clock3, text: `${cfu} CFU` },
  ];
}

type CourseInfoCardProps = {
  title: string;
  code?: string | null;
  metadata: CourseMetaItem[];
  badges?: React.ReactNode;
  tone?: Tone;
  /** Slot azione a destra dell'intestazione (bottone, link, icona…). */
  action?: React.ReactNode;
  /** Se presente, l'intestazione diventa un bottone che apre/chiude `children`. */
  onToggle?: () => void;
  expanded?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export default function CourseInfoCard({
  title,
  code,
  metadata,
  badges,
  tone = "default",
  action,
  onToggle,
  expanded = false,
  children,
  className,
}: CourseInfoCardProps) {
  const heading = (
    <span className="min-w-0 flex-1 text-left">
      <span className="block text-sm font-medium leading-snug text-primary">
        {code ? `${code} · ${title}` : title}
      </span>
      {metadata.length > 0 && (
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {metadata.map((item, index) => (
            <span key={index} title={item.title} className="inline-flex items-center gap-1 text-xs text-muted">
              <item.icon className="size-3.5 shrink-0" aria-hidden="true" />
              {item.text}
            </span>
          ))}
        </span>
      )}
      {badges && <span className="mt-1.5 flex flex-wrap items-center gap-1.5">{badges}</span>}
    </span>
  );

  return (
    <div className={cn("rounded-control border transition", TONE_CLASS[tone], className)}>
      <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start sm:gap-3">
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="tap-scale flex min-w-0 flex-1 items-start gap-2 rounded-control text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {heading}
            <ChevronDown
              className={cn("mt-0.5 size-4 shrink-0 text-muted transition-transform duration-300 ease-[var(--ease-spring)]", expanded && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        ) : (
          heading
        )}
        {action && <div className="flex shrink-0 items-center gap-1.5 sm:justify-end">{action}</div>}
      </div>
      {children && (() => {
        const content = <div className="space-y-2 border-t border-border/60 px-3 py-3">{children}</div>;
        return onToggle ? <ExpandRows open={expanded}>{content}</ExpandRows> : content;
      })()}
    </div>
  );
}
