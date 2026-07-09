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
  const total = done + pending;

  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-card border border-dashed border-border bg-surface/60 text-sm text-muted">
        Nessun dato disponibile
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
    animation: false as const,
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
    <div className="relative h-56">
      <Doughnut data={data} options={options} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs font-medium uppercase text-muted">
          Completate
        </span>
        <span className="text-3xl font-semibold tabular-nums text-primary">
          {progress}%
        </span>
      </div>
    </div>
  );
}
