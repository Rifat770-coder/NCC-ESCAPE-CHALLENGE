"use client";

import { motion } from "framer-motion";
import { Shield, Cpu, Zap } from "lucide-react";

interface EmblemProps {
  size?: number;
  animated?: boolean;
}

/**
 * NCC Emblem — a futuristic hexagonal shield with a glowing core.
 * Used on the landing hero and throughout the app as a brand mark.
 */
export function Emblem({ size = 220, animated = true }: EmblemProps) {
  return (
    <motion.div
      initial={animated ? { opacity: 0, scale: 0.85 } : false}
      animate={animated ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Outer rotating hexagon */}
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      >
        <defs>
          <linearGradient id="hex-stroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#efff00" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b9c400" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <polygon
          points="100,10 175,55 175,145 100,190 25,145 25,55"
          fill="none"
          stroke="url(#hex-stroke)"
          strokeWidth="1.5"
        />
        <polygon
          points="100,30 160,65 160,135 100,170 40,135 40,65"
          fill="none"
          stroke="rgba(239,255,0,0.25)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />
      </motion.svg>

      {/* Inner pulsing core */}
      <motion.div
        className="absolute inset-[18%] rounded-full border border-cyber-400/40 bg-gradient-to-br from-cyber-400/15 via-cyber-500/10 to-transparent backdrop-blur-xl"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Cpu className="h-10 w-10 text-cyber-300 drop-shadow-[0_0_10px_rgba(239,255,0,0.7)]" />
          <p className="mt-1 font-display text-lg font-bold tracking-[0.4em] text-white">
            NCC
          </p>
          <p className="font-mono text-[8px] tracking-[0.3em] text-cyber-300/80">
            CORE
          </p>
        </div>
        {/* corner accents */}
        <span className="absolute left-1 top-1 h-2 w-2 border-l border-t border-cyber-300" />
        <span className="absolute right-1 top-1 h-2 w-2 border-r border-t border-cyber-300" />
        <span className="absolute left-1 bottom-1 h-2 w-2 border-l border-b border-cyber-300" />
        <span className="absolute right-1 bottom-1 h-2 w-2 border-r border-b border-cyber-300" />
      </motion.div>

      {/* Shield overlay */}
      <motion.div
        className="absolute inset-0 flex items-end justify-center pb-3"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest text-white/60 backdrop-blur">
          <Shield className="h-3 w-3 text-cyber-300" /> v1.0
          <Zap className="h-3 w-3 text-cyber-300" />
        </div>
      </motion.div>

      {/* Glow */}
      <div className="absolute inset-0 -z-10 rounded-full bg-cyber-500/10 blur-3xl" />
    </motion.div>
  );
}