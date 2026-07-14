"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker registration failed", error));
      return;
    }
    // Avoid stale production caches interfering with local development.
    navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
    caches.keys().then((keys) => keys.filter((key) => key.startsWith("poliplanner-") || key.startsWith("lesson-tracker-")).forEach((key) => caches.delete(key)));
  }, []);
  return null;
}
