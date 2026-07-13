"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

type Props = {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
};

export default function AnimatedNumber({ value, suffix = "", decimals = 0, className }: Props) {
  const [displayValue, setDisplayValue] = useState(value);
  const displayValueRef = useRef(value);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const controls = animate(displayValueRef.current, value, {
      duration: 0.55,
      ease: "easeOut",
      onUpdate: (latest) => {
        displayValueRef.current = latest;
        setDisplayValue(latest);
      },
    });
    return () => controls.stop();
  }, [reducedMotion, value]);

  const renderedValue = reducedMotion ? value : displayValue;
  return <span className={className}>{renderedValue.toFixed(decimals)}{suffix}</span>;
}
