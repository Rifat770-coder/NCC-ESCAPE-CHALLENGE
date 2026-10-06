"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldX, RotateCcw, Trophy, ArrowRight } from "lucide-react";
import { formatTime } from "@/lib/utils";

export function FailureScreen({
  reason,
  levelReached,
  durationSeconds,
  completionTimeMs,
  retryAllowed,
}: {
  reason: "TIME_UP" | "NO_LIVES";
  levelReached: number;
  durationSeconds: number;
  completionTimeMs: number | null;
  retryAllowed: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative mx-auto max-w-2xl text-center"
    >
      <GlitchOverlay />
      <motion.div
        animate={{ x: [-2, 2, -2, 0] }}
        transition={{ duration: 0.6, repeat: 4 }}
        className="mx-auto mb-6 inline-flex"
      >
        <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-red-500/60 bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.6)]">
          <ShieldX className="h-10 w-10 text-red-300" />
        </div>
      </motion.div>

      <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
        MISSION{" "}
        <span className="bg-gradient-to-r from-red-300 to-red-500 bg-clip-text text-transparent">
          FAILED
        </span>
      </h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-red-300">
        {reason === "TIME_UP" ? "// system locked · time expired" : "// system locked · no lives remaining"}
      </p>

      <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
        <Stat label="Reached" value={`Level ${levelReached} / 4`} />
        <Stat label="Time Used" value={completionTimeMs != null ? formatTime(completionTimeMs) : "—"} />
        <Stat label="Duration" value={`${durationSeconds}s`} />
      </div>

      <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-white/60">
        You are not eligible for the completion prize this time.{" "}
        {retryAllowed
          ? "The organizers have allowed a retry — you may attempt the mission again."
          : "Retries are disabled for this event."}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/leaderboard" className="btn-ghost">
          <Trophy className="h-4 w-4" /> Leaderboard
        </Link>
        <Link href="/" className="btn-primary">
          <ArrowRight className="h-4 w-4" /> Return Home
        </Link>
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-strong rounded-sm border-red-500/15 p-4">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function GlitchOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15),transparent_60%)]" />
    </div>
  );
}