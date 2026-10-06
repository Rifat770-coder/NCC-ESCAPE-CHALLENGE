"use client";

import type { ReactNode } from "react";
import { Fade } from "@/components/animate-ui/primitives/effects/fade";

/** Theme-neutral reveal: no transforms or changes to the layout/touch area. */
export function Reveal({ children, className, delay = 0, inView = false }: {
  children: ReactNode;
  className?: string;
  delay?: number;
  inView?: boolean;
}) {
  return (
    <Fade className={className} delay={delay} inView={inView} inViewOnce
      initialOpacity={0.65} transition={{ duration: 0.4, ease: "easeOut" }}>
      {children}
    </Fade>
  );
}
