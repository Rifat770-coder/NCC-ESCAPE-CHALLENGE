"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Sparkles, Share2, Download, ArrowRight } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface SuccessProps {
  participant: { name: string; batch: string };
  completionTimeMs: number;
  livesRemaining: number;
  rank: number | null;
  attemptId: string;
}

export function SuccessScreen({ participant, completionTimeMs, livesRemaining, rank, attemptId }: SuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto max-w-3xl text-center"
    >
      <ConfettiBurst />
      <motion.div
        animate={{ rotate: [0, -2, 2, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mx-auto mb-6 inline-flex"
      >
        <div className="grid h-20 w-20 place-items-center rounded-full border border-cyber-300/60 bg-cyber-400/10 shadow-[0_0_50px_rgba(239,255,0,0.6)]">
          <Trophy className="h-10 w-10 text-cyber-200" />
        </div>
      </motion.div>

      <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
        MISSION{" "}
        <span className="bg-gradient-to-r from-cyber-200 via-cyber-300 to-emerald-300 bg-clip-text text-transparent">
          COMPLETED
        </span>
      </h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-emerald-300">
        access granted · you won a prize
      </p>

      <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
        <Stat label="Player" value={participant.name} />
        <Stat label="Completion Time" value={formatTime(completionTimeMs)} glow />
        <Stat label="Lives Left" value={`${livesRemaining}`} sub={livesRemaining > 0 ? "impressive" : ""} />
      </div>

      <div className="mx-auto mt-6 max-w-md rounded-sm border border-cyber-400/30 bg-cyber-400/5 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyber-200">
          current leaderboard position
        </p>
        <p className="mt-2 font-display text-4xl font-bold text-white">
          {rank ? `#${rank}` : "—"}
        </p>
        <p className="mt-1 text-xs text-white/50">
          Faster times climb the board. Share your result to claim your prize at the stall.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={`/result/${attemptId}`} className="btn-primary">
          <Sparkles className="h-4 w-4" /> View Result Card
        </Link>
        <Link href="/leaderboard" className="btn-ghost">
          <Trophy className="h-4 w-4" /> Leaderboard
        </Link>
        <Link href="/" className="btn-ghost">
          <ArrowRight className="h-4 w-4" /> Return Home
        </Link>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, glow, sub }: { label: string; value: string; glow?: boolean; sub?: string }) {
  return (
    <div className="glass-strong rounded-sm p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${glow ? "text-glow" : "text-white"}`}>{value}</p>
      {sub && <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">{sub}</p>}
    </div>
  );
}

/** Lightweight SVG particle burst — pure CSS/SVG so no extra deps. */
function ConfettiBurst() {
  const particles = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {particles.map((_, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 1, y: -50, x: 0 }}
          animate={{
            opacity: 0,
            y: 400 + Math.random() * 100,
            x: (Math.random() - 0.5) * 400,
            rotate: Math.random() * 360,
          }}
          transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5 }}
          className="absolute left-1/2 top-0 h-2 w-2 rounded-sm"
          style={{
            background: ["#efff00", "#b9c400", "#22c55e", "#efff00"][i % 4],
            boxShadow: "0 0 8px currentColor",
          }}
        />
      ))}
    </div>
  );
}