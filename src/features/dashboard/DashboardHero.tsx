"use client";

import { useEffect } from "react";
import { celebrate, celebrateBig } from "@/components/ui/Confetti";
import Link from "next/link";
import { ArrowRight, CalendarPlus, GraduationCap } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";
import { formatItalianDate } from "@/lib/dates";

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

  return (
    <div className="animate-fadeup rounded-card border border-border-strong bg-[linear-gradient(135deg,#101820_0%,#0a0f14_100%)] p-6 shadow-elevated sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm capitalize text-muted">{dayLabel}, {formatItalianDate(today, "long")}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-secondary">
            {hasCalendar && hasSavedPlan
              ? "Ciao. Qui trovi le attività di oggi e l'avanzamento delle tue lezioni."
              : "Ciao. Completa la configurazione per trasformare questa pagina nel tuo riepilogo personale."}
          </p>
        </div>
        {(!hasCalendar || !hasSavedPlan) && (
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            {!hasCalendar && (
              <Link href="/calendar" className={buttonClass({ variant: "primary", className: "w-full sm:w-auto" })}>
                <CalendarPlus className="size-4" aria-hidden="true" />
                Configura calendario
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
            {!hasSavedPlan && (
              <Link href="/piano" className={buttonClass({ variant: hasCalendar ? "primary" : "secondary", className: "w-full sm:w-auto" })}>
                <GraduationCap className="size-4" aria-hidden="true" />
                Crea il tuo piano
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
