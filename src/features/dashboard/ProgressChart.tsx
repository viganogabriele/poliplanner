"use client";
// ProgressChart — Client Component
//
// Ciambella Chart.js con lezioni seguite e da seguire. È client perché Chart.js
// disegna su <canvas>, che nei Server Components non esiste.
//
// Il grafico non è l'unica fonte: la legenda sotto riporta le stesse cifre in
// testo, e un riepilogo per screen reader descrive la ciambella.

import { useReducedMotion } from "motion/react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { BarChart3 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

// Chart.js richiede la registrazione esplicita dei moduli usati: è il suo tree-shaking.
ChartJS.register(ArcElement, Tooltip, Legend);

interface ProgressChartProps {
  done: number;
  pending: number;
}

const DONE_COLOR = "#56d7fd";
const PENDING_COLOR = "#ff6b6b";

export default function ProgressChart({ done, pending }: ProgressChartProps) {
  const reducedMotionPreference = useReducedMotion();
  const prefersReduced = Boolean(reducedMotionPreference);
  const total = done + pending;

  if (total === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="size-5" aria-hidden="true" />}
        title="Nessun dato sulle lezioni"
        description="Il grafico appare dopo aver configurato il calendario."
      />
    );
  }

  const progress = Math.round((done / total) * 100);

  const data = {
    labels: ["Seguite", "Da seguire"],
    datasets: [
      {
        data: [done, pending],
        backgroundColor: [DONE_COLOR, PENDING_COLOR],
        borderColor: "#0d141a",
        borderWidth: 3,
        hoverBackgroundColor: ["#7fe2ff", "#ff8585"],
        hoverBorderColor: "#141d24",
        hoverOffset: 4,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "74%",
    animation: prefersReduced ? false : { duration: 700, easing: "easeInOutQuart" as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "#141d24",
        borderColor: "#2d454f",
        borderWidth: 1,
        titleColor: "#859399",
        bodyColor: "#f4f7f8",
        displayColors: false,
        padding: 10,
      },
    },
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <p className="sr-only" id="lesson-progress-summary">
        {done} lezioni completate, {pending} lezioni da seguire. Avanzamento {progress}%.
      </p>
      <div className="relative mx-auto h-40 w-40 shrink-0 sm:mx-0" aria-describedby="lesson-progress-summary">
        <Doughnut
          data={data}
          options={options}
          role="img"
          aria-label={`${done} lezioni completate, ${pending} lezioni da seguire`}
        />
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          aria-hidden="true"
        >
          <span className="text-2xl font-semibold tabular-nums text-primary">{progress}%</span>
          <span className="text-xs text-muted">completate</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2" aria-hidden="true">
        <LegendRow color={DONE_COLOR} label="Seguite" value={done} />
        <LegendRow color={PENDING_COLOR} label="Da seguire" value={pending} />
        <LegendRow label="Totale" value={total} />
      </ul>
    </div>
  );
}

function LegendRow({ color, label, value }: { color?: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2.5 border-b border-border/60 pb-2 text-sm last:border-0 last:pb-0">
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={color ? { backgroundColor: color } : { border: "1px solid #2d454f" }}
      />
      <span className="text-muted">{label}</span>
      <span className="ml-auto font-semibold tabular-nums text-primary">{value}</span>
    </li>
  );
}
