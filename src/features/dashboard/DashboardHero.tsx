"use client";

import { useEffect } from "react";
import AnimatedNumber from "@/features/dashboard/AnimatedNumber";
import { celebrate, celebrateBig } from "@/components/ui/Confetti";

type Props = {
  dayLabel: string;
  today: string;
  pendingCount: number;
  examTotalCount: number;
  examPassedCount: number;
  examAverage: number | null;
};

const LAST_REGISTERED_EXAMS_KEY = "poliplanner:last-registered-exam-count";

export default function DashboardHero({
  dayLabel,
  today,
  pendingCount,
  examTotalCount,
  examPassedCount,
  examAverage,
}: Props) {
  const examsMissing = Math.max(0, examTotalCount - examPassedCount);

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
    <div className="animate-fadeup rounded-card border border-border bg-[linear-gradient(135deg,#101820_0%,#0a0f14_100%)] p-6 shadow-elevated">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted">{dayLabel}, {today}</p>
          <h1 className="mt-1 text-2xl font-semibold text-primary">Ciao 👋</h1>
          <p className="mt-1 text-sm text-secondary">
            {pendingCount === 0 ? "Sei in pari con tutte le lezioni." : `Hai ${pendingCount} lezioni arretrate.`}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-accent/20 bg-accent/5 px-5 py-3 text-center">
          <p className="text-3xl font-bold tabular-nums text-accent"><AnimatedNumber value={examsMissing} /></p>
          <p className="mt-0.5 text-xs text-muted">
            {examsMissing === 0 ? "Tutti gli esami superati! 🎉" : `${examsMissing === 1 ? "esame" : "esami"} alla laurea`}
          </p>
          {examAverage !== null && <p className="mt-1 text-xs font-semibold text-success">Media {examAverage.toFixed(2)}</p>}
        </div>
      </div>
    </div>
  );
}
