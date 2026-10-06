"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface BackgroundFXProps {
  className?: string;
  density?: "low" | "high";
}

/**
 * Animated background combining a slowly-drifting grid, soft floating
 * particles, and a vignette. Mounted on the main layout to give every
 * page the same premium feel without re-rendering anything on each route.
 */
export function BackgroundFX({ className, density = "low" }: BackgroundFXProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const count = density === "low" ? 38 : 90;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: count }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      a: Math.random() * 0.6 + 0.2,
    }));

    function step() {
      ctx!.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(239,255,0,${p.a})`;
        ctx!.shadowBlur = 8;
        ctx!.shadowColor = "rgba(239,255,0,0.8)";
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
      raf = requestAnimationFrame(step);
    }

    if (!reduce) step();
    else {
      // Render a single frame for reduced-motion users.
      step();
      cancelAnimationFrame(raf);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [density]);

  return (
    <div className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}>
      {/* base gradient */}
      <div className="absolute inset-0 fx-ambient" />
      <div className="fx-honeycomb hex-bg" />
      {/* grid */}
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute inset-0 grid-bg-fine opacity-10" />
      {/* particles */}
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.7)_100%)]" />
      {/* scanning line */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 -top-1/2 h-1/2 bg-gradient-to-b from-transparent via-cyber-400/10 to-transparent animate-scan" />
      </div>
    </div>
  );
}