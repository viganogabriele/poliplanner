"use client";

import { useEffect } from "react";
import { celebrate, celebrateBig } from "@/components/ui/Confetti";
import Link from "next/link";
import { ArrowRight, CalendarPlus, GraduationCap } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatItalianDate } from "@/lib/dates";

/**
 * Testata della dashboard. Usa la stessa `PageHeader` di ogni altra pagina — prima era
 * un riquadro a sé, con un titolo che non somigliava a nessun altro — e resta un
 * componente client perché festeggia le verbalizzazioni nuove.
 */

type Props = {
  dayLabel: string;
  today: string;
  hasCalendar: boolean;
  hasSavedPlan: boolean;
  examTotalCount: number;
  examPassedCount: number;
};

const LAST_REGISTERED_EXAMS_KEY = "poliplanner:last-registered-exam-count";

export default function DashboardHero({
  dayLabel,
  today,
  hasCalendar,
  hasSavedPlan,
  examTotalCount,
  examPassedCount,
}: Props) {
  useEffect(() => {
    const previousRaw = window.localStorage.getItem(LAST_REGISTERED_EXAMS_KEY);
    const previous = previousRaw === null ? null : Number(previousRaw);
    const hasNewRegisteredExam = previous !== null && Number.isFinite(previous) && examPassedCount > previous;

    if (hasNewRegisteredExam) {
      if (examTotalCount > 0 && examPassedCount === examTotalCount) celebrateBig();
      else celebrate();
    }
    window.localStorage.setItem(LAST_REGISTERED_EXAMS_KEY, String(examPassedCount));
  }, [examPassedCount, examTotalCount]);

  const setupDone = hasCalendar && hasSavedPlan;

  return (
    <PageHeader
      eyebrow={`${dayLabel} ${formatItalianDate(today, "long")}`}
      title="Dashboard"
      subtitle={
        setupDone
          ? "Le attività di oggi e l'avanzamento delle tue lezioni."
          : "Completa la configurazione: da qui in poi questa pagina diventa il tuo riepilogo."
      }
      actions={setupDone ? undefined : (
        <>
          {!hasCalendar && (
            <Link href="/calendar" className={buttonClass({ variant: "primary", className: "w-full sm:w-auto" })}>
              <CalendarPlus className="size-4" aria-hidden="true" />
              Configura calendario
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          {!hasSavedPlan && (
            <Link
              href="/piano"
              className={buttonClass({ variant: hasCalendar ? "primary" : "secondary", className: "w-full sm:w-auto" })}
            >
              <GraduationCap className="size-4" aria-hidden="true" />
              Crea il tuo piano
            </Link>
          )}
        </>
      )}
    />
  );
}
