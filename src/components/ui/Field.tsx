import { cn } from "@/lib/ui";

export const fieldLabelClass =
  "text-xs font-medium uppercase text-muted";

const controlClass =
  "min-h-10 min-w-0 w-full rounded-xl border border-border bg-background-soft px-3 text-sm text-primary outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50";

export function inputClass(className?: string) {
  return cn(controlClass, className);
}

export function selectClass(className?: string) {
  return cn(controlClass, "pr-8", className);
}
