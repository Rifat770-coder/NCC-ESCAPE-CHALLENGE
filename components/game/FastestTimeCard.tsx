"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface Stats {
  fastestTimeMs: number | null;
  totalAttempts: number;
}

export function FastestTimeCard() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const r = await fetch("/api/leaderboard", { cache: "no-store" });
        const d = await r.json();
        if (active && d.ok) setStats(d.stats);
      } catch {}
    }
    load();
    const t = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const ms = stats?.fastestTimeMs ?? null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
      className="glass inline-flex max-w-full items-center gap-3 rounded-full border border-cyber-400/20 px-4 py-2.5 sm:gap-4 sm:px-5"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyber-400/10 text-cyber-300">
        <Zap className="h-4 w-4" />
      </span>
      <div className="min-w-0 text-left">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/50">
          Can you beat todays fastest time?
        </p>
        <p className="font-mono text-sm text-white">
          <span className="text-glow">{formatFastest(ms)}</span>
          <span className="ml-2 text-white/40">
            {stats?.totalAttempts ? `${stats.totalAttempts} attempts` : "be the first"}
          </span>
        </p>
      </div>
    </motion.div>
  );
}

function formatFastest(ms: number | null) {
  if (ms == null || !isFinite(ms)) return "—";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
