import { cn } from "@/lib/ui";

export const fieldLabelClass =
  "block text-xs font-medium text-muted";

const controlClass =
  "min-h-11 min-w-0 w-full rounded-control border border-border bg-background-soft px-3 text-sm text-primary outline-none transition placeholder:text-muted hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-45";

export function inputClass(className?: string) {
  return cn(controlClass, className);
}

export function selectClass(className?: string) {
  return cn(controlClass, "pr-8", className);
}
