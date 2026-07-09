// StatTile — Server Component
//
// A single stat tile: a small label + a big number.
// Used in the stats grid (overall progress, pending, done, total)
// and in the "Oggi" panel (date, time, today count, weekday).
//
// This is a Server Component because it's purely presentational —
// it has no state, no effects, and no browser APIs.

interface StatTileProps {
  label: string;
  value: string | number;
  accent?: "green" | "red" | "sky" | "amber";
}

const accentClass: Record<string, string> = {
  green: "text-success",
  red: "text-danger",
  sky: "text-accent",
  amber: "text-warning",
};

export default function StatTile({ label, value, accent }: StatTileProps) {
  const valueClass = accent ? accentClass[accent] : "text-primary";

  return (
    <div className="flex min-h-28 flex-col justify-between gap-3 rounded-card border border-border bg-surface-muted/70 px-4 py-3 shadow-inset transition hover:border-border-strong hover:bg-surface-hover">
      <span className="text-xs font-medium uppercase text-muted">
        {label}
      </span>
      <span className={`break-words text-2xl font-semibold leading-tight tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}
