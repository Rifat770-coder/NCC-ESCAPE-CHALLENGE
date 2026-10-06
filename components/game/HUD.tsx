"use client";

import { motion } from "framer-motion";
import { Heart, Clock, Cpu, AlertTriangle } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface HUDProps {
  playerName: string;
  currentLevel: number;
  totalLevels: number;
  lives: number;
  startingLives: number;
  remainingMs: number;
  totalDurationSeconds: number;
}

export function HUD({ playerName, currentLevel, totalLevels, lives, startingLives, remainingMs, totalDurationSeconds }: HUDProps) {
  const seconds = Math.max(0, Math.floor(remainingMs / 1000));
  const warn = seconds <= 30 && seconds > 10;
  const crit = seconds <= 10;
  const progress = (currentLevel - 1) / totalLevels;

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="game-hud glass-strong sticky top-0 z-30 border-b border-cyber-400/15 px-3 py-2.5 backdrop-blur-xl sm:px-6 sm:py-3"
    >
      <div className="hud-details flex items-center gap-3 sm:gap-5">
        {/* Player */}
        <div className="hud-player flex min-w-0 items-center gap-2 sm:flex-1">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-cyber-400/30 bg-cyber-400/10 text-cyber-300">
            <Cpu className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">PLAYER</p>
            <p className="truncate font-display text-sm font-semibold tracking-wider text-white">{playerName}</p>
          </div>
        </div>

        {/* Level */}
        <div className="hud-level flex min-w-0 flex-col gap-0.5 sm:min-w-[110px]">
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">LEVEL</p>
          <p className="font-display text-base font-semibold text-white sm:text-lg">
            <span className="text-glow">{String(currentLevel).padStart(2, "0")}</span>
            <span className="text-white/30"> / {String(totalLevels).padStart(2, "0")}</span>
          </p>
        </div>

        {/* Lives */}
        <div className="hud-lives flex min-w-0 flex-col gap-0.5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">LIVES</p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: startingLives }).map((_, i) => {
              const alive = i < lives;
              return (
                <motion.span
                  key={i}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`grid h-5 w-5 place-items-center rounded ${
                    alive
                      ? "bg-red-500/15 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      : "bg-white/5 text-white/15"
                  }`}
                >
                  <Heart className={`h-3 w-3 ${alive ? "fill-red-400" : ""}`} />
                </motion.span>
              );
            })}
          </div>
        </div>

        {/* Timer */}
        <div className="hud-timer ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="text-right">
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/40">TIME LEFT</p>
              <motion.p
                key={seconds}
                initial={{ opacity: 1, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`font-mono text-lg font-bold tabular-nums sm:text-2xl ${
                  crit
                    ? "text-red-400 text-glow"
                    : warn
                    ? "text-amber-300"
                    : "text-white"
                }`}
              >
                {formatTime(remainingMs)}
              </motion.p>
            {/* Total duration for this attempt, so the player can verify
                the configured duration at a glance. */}
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">
              of {formatTime(totalDurationSeconds * 1000)}
            </p>
          </div>
          <motion.span
            animate={
              crit
                ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                : warn
                ? { scale: [1, 1.06, 1] }
                : {}
            }
            transition={{ duration: 0.7, repeat: Infinity }}
            className={`grid h-9 w-9 place-items-center rounded-md border ${
              crit
                ? "border-red-500/50 bg-red-500/10 text-red-300"
                : warn
                ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                : "border-cyber-400/30 bg-cyber-400/10 text-cyber-300"
            }`}
          >
            {crit ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </motion.span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-cyber-300 via-cyber-400 to-cyber-400 shadow-[0_0_10px_rgba(239,255,0,0.7)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </motion.header>
  );
}
