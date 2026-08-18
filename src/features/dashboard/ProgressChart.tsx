"use client";
// ProgressChart — Client Component
//
// Renders a Chart.js doughnut chart showing done vs pending lessons.
//
// Why Client? Chart.js needs to draw on a <canvas> element, which
// is a browser API. Server Components run in Node.js and have no DOM.
//
// We use react-chartjs-2, a thin React wrapper around Chart.js.
// It handles creating and destroying the chart as React re-renders.

import { useReducedMotion } from "motion/react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";

// Chart.js requires you to register the components you use.
// This is a tree-shaking mechanism — you only bundle what you need.
ChartJS.register(ArcElement, Tooltip, Legend);

interface ProgressChartProps {
  done: number;
  pending: number;
}

export default function ProgressChart({ done, pending }: ProgressChartProps) {
  const reducedMotionPreference = useReducedMotion();
  const prefersReduced = Boolean(reducedMotionPreference);
  const total = done + pending;

  if (total === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/60 px-5 text-center">
        <p className="text-sm font-semibold text-primary">Nessun dato sulle lezioni</p>
        <p className="mt-1 text-xs text-muted">Il grafico apparirà dopo aver configurato il calendario.</p>
      </div>
    );
  }

  const progress = Math.round((done / total) * 100);

  const data = {
    labels: ["Seguite", "Da seguire"],
    datasets: [
      {
        data: [done, pending],
        backgroundColor: ["#56D7FD", "#FF6B6B"],
        borderColor: "#0A0F14",
        borderWidth: 4,
        hoverBackgroundColor: ["#7FE2FF", "#FF8585"],
        hoverBorderColor: "#101820",
        hoverOffset: 4,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    animation: prefersReduced ? false : { duration: 700, easing: 'easeInOutQuart' as const },
    plugins: {
      legend: {
        display: false,
        labels: { color: "#B5B5B5" },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#101820",
        borderColor: "#1B2A31",
        borderWidth: 1,
        titleColor: "#7D8A90",
        bodyColor: "#FCFCFC",
        displayColors: false,
        padding: 12,
      },
    },
  };

  return (
    <div>
      <p className="sr-only" id="lesson-progress-summary">
        {done} lezioni completate, {pending} lezioni da seguire. Avanzamento {progress}%.
      </p>
      <div className="relative h-52" aria-describedby="lesson-progress-summary">
        <Doughnut
          data={data}
          options={options}
          role="img"
          aria-label={`${done} lezioni completate, ${pending} lezioni da seguire`}
        />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
          <span className="text-xs font-medium uppercase text-muted">Completate</span>
          <span className="text-3xl font-semibold tabular-nums text-primary">{progress}%</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm" aria-hidden="true">
        <div className="flex items-center gap-2 rounded-lg bg-accent/5 px-3 py-2 text-secondary">
          <span className="size-2.5 rounded-sm bg-accent" />
          <span>Seguite</span>
          <span className="ml-auto font-semibold tabular-nums text-primary">{done}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-danger/5 px-3 py-2 text-secondary">
          <span className="size-2.5 rounded-sm bg-danger" />
          <span>Da seguire</span>
          <span className="ml-auto font-semibold tabular-nums text-primary">{pending}</span>
        </div>
      </div>
    </div>
  );
}
