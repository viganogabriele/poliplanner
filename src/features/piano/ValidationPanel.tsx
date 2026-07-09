"use client";

import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import type { ValidationIssue } from "@/lib/polimi/validation";

const icons = {
  error:   <XCircle className="size-4 shrink-0 text-danger" />,
  warning: <AlertTriangle className="size-4 shrink-0 text-warning" />,
  info:    <Info className="size-4 shrink-0 text-accent" />,
};

const borderColors = {
  error:   "border-danger/30 bg-danger/5",
  warning: "border-warning/30 bg-warning/5",
  info:    "border-accent/30 bg-accent/5",
};

export default function ValidationPanel({ issues }: { issues: ValidationIssue[] }) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted">
        <CheckCircle className="size-8 text-success" />
        <span className="font-medium text-success">Piano valido</span>
        <span className="text-xs">Tutti i vincoli sono soddisfatti.</span>
      </div>
    );
  }

  const errors = issues.filter((i) => i.type === "error");
  const warnings = issues.filter((i) => i.type === "warning");

  return (
    <div className="space-y-2">
      {errors.length > 0 && (
        <p className="text-xs font-semibold text-danger uppercase tracking-wide">
          {errors.length} errore{errors.length > 1 ? "i" : ""}
        </p>
      )}
      {errors.map((issue) => (
        <div key={issue.id} className={`flex gap-2 rounded-xl border p-3 text-xs leading-snug ${borderColors[issue.type]}`}>
          {icons[issue.type]}
          <span className="text-primary">{issue.message}</span>
        </div>
      ))}
      {warnings.length > 0 && (
        <p className="mt-3 text-xs font-semibold text-warning uppercase tracking-wide">
          {warnings.length} avviso{warnings.length > 1 ? "i" : ""}
        </p>
      )}
      {warnings.map((issue) => (
        <div key={issue.id} className={`flex gap-2 rounded-xl border p-3 text-xs leading-snug ${borderColors[issue.type]}`}>
          {icons[issue.type]}
          <span className="text-primary">{issue.message}</span>
        </div>
      ))}
    </div>
  );
}
