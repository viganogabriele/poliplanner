import type { HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

export function PageShell({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-screen-xl space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 lg:px-8 lg:py-8",
        className
      )}
      {...props}
    />
  );
}
