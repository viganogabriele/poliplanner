"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "./Button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallButton() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      promptRef.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  const handleInstall = async () => {
    if (!promptRef.current) return;
    await promptRef.current.prompt();
    await promptRef.current.userChoice;
    setShow(false);
    promptRef.current = null;
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleInstall} className="w-full justify-start gap-2">
      <Download className="size-3.5 shrink-0" aria-hidden="true" />
      Installa app
    </Button>
  );
}
