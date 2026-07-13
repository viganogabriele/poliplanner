import confetti from "canvas-confetti";

const COLORS = ["#56d7fd", "#5ee6a8", "#f2c94c", "#fcfcfc"];

function reducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function celebrate(): void {
  if (reducedMotion()) return;
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.7 },
    colors: COLORS,
    disableForReducedMotion: true,
  });
}

export function celebrateBig(): void {
  if (reducedMotion()) return;
  const opts = (x: number) => ({
    particleCount: 120,
    angle: x === 0 ? 60 : 120,
    spread: 55,
    origin: { x, y: 0.75 },
    colors: COLORS,
    disableForReducedMotion: true,
  });
  confetti(opts(0));
  setTimeout(() => confetti(opts(1)), 150);
}
