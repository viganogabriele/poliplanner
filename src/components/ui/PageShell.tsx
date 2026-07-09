import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

export function PageShell({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-screen-xl space-y-5 px-4 py-5 sm:px-5 lg:px-6 lg:py-6",
        className
      )}
      {...props}
    />
  );
}
