"use client";
// LiveClock — Client Component
//
// The ONLY reason this is a Client Component is that it needs setInterval
// to update the displayed time every second. Everything else in the "Oggi"
// panel is a Server Component.
//
// "use client" means this code runs in the browser. It can use useState,
// useEffect, and browser APIs. It cannot access the database directly.

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    // Format: HH:MM:SS in Italian locale
    const tick = () =>
      setTime(new Date().toLocaleTimeString("it-IT"));

    tick(); // run immediately on mount
    const id = setInterval(tick, 1000);
    return () => clearInterval(id); // cleanup when component unmounts
  }, []);

  // Empty string on first render (server-side) to avoid hydration mismatch.
  // The time will appear after the first client-side tick.
  return (
    <span className="text-2xl font-semibold leading-tight text-accent tabular-nums">
      {time || "—"}
    </span>
  );
}
