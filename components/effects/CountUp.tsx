"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CountUpProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Animated number counter. Used for the "fastest time" hero metric.
 */
export function CountUp({ value, duration = 1.2, format, className }: CountUpProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const target = value;
    if (reduce) {
      setDisplay(target);
      return;
    }
    function step(ts: number) {
      if (start == null) start = ts;
      const t = Math.min(1, (ts - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <motion.span className={className}>
      {format ? format(display) : Math.round(display)}
    </motion.span>
  );
}