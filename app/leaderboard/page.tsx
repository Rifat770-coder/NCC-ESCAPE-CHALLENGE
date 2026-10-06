"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowLeft, Medal, Crown, Sparkles, Users, Zap, Activity } from "lucide-react";
import { BackgroundFX } from "@/components/effects/BackgroundFX";
import { formatTime } from "@/lib/utils";

interface Stats {
  totalAttempts: number;
  totalParticipants: number;
  successfulMissions: number;
  failedMissions: number;
  prizesEligible: number;
  prizesClaimed: number;
  completionRate: number;
  fastestTimeMs: number | null;
}
interface Entry {
  $id: string;
  participantName: string;
  participantBatch: string;
  completionTimeMs: number;
  rank: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  async function load() {
    try {
      const r = await fetch("/api/leaderboard", { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        setEntries(d.entries);
        setStats(d.stats);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(() => {
      load();
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen">
      <BackgroundFX />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6">
        <Link href="/" className="btn-ghost shrink-0 text-xs">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <p className="min-w-0 text-right font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
          live · updated every 5s
        </p>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-20 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="section-label">// live ranking</p>
          <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
            <span className="bg-gradient-to-r from-cyber-200 via-cyber-300 to-cyber-300 bg-clip-text text-transparent">
              LEADERBOARD
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/60 sm:text-base">
            Top finishers of the NCC Escape Challenge. Fastest successful missions rank highest.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Players" value={String(stats?.totalParticipants ?? 0)} />
          <StatCard icon={Activity} label="Completion Rate" value={`${stats?.completionRate ?? 0}%`} accent />
          <StatCard icon={Zap} label="Fastest Time" value={stats?.fastestTimeMs ? formatTime(stats.fastestTimeMs) : "—"} />
          <StatCard icon={Sparkles} label="Successful Missions" value={String(stats?.successfulMissions ?? 0)} />
        </div>

        {/* Podium */}
        {entries.length >= 3 && (
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <PodiumCard rank={2} entry={entries[1]} />
            <PodiumCard rank={1} entry={entries[0]} highlight />
            <PodiumCard rank={3} entry={entries[2]} />
          </div>
        )}

        {/* Full table */}
        <div className="glass-strong mt-10 overflow-hidden rounded-sm border border-white/10">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <p className="font-display text-sm font-semibold tracking-widest text-white/80">
              FULL RANKING
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
            </p>
          </div>

          {loading && entries.length === 0 ? (
            <div className="grid place-items-center py-16">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                loading leaderboard...
              </p>
            </div>
          ) : entries.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="divide-y divide-white/5">
              {entries.map((e, i) => (
                <motion.li
                  key={e.$id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-white/[0.02]"
                >
                  <span className={`grid h-9 w-9 place-items-center rounded-md font-mono text-sm font-bold ${rankColor(e.rank)}`}>
                    #{e.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold text-white sm:text-base">{e.participantName}</p>
                    <p className="text-[11px] text-white/40">Batch {e.participantBatch}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-cyber-200 sm:text-base">
                      {formatTime(e.completionTimeMs)}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-300">completed</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <Reveal inView className={`glass rounded-sm border ${accent ? "border-cyber-400/30" : "border-white/10"} p-4`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyber-300" />
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">{label}</p>
      </div>
      <p className={`mt-1 font-display text-2xl font-bold ${accent ? "text-glow" : "text-white"}`}>{value}</p>
    </Reveal>
  );
}

function PodiumCard({ rank, entry, highlight }: { rank: 1 | 2 | 3; entry: Entry; highlight?: boolean }) {
  const colors: Record<number, { bg: string; text: string; border: string; shadow: string; icon: any }> = {
    1: { bg: "from-amber-400/30 to-amber-600/10", text: "text-amber-200", border: "border-amber-300/40", shadow: "shadow-[0_0_30px_rgba(245,158,11,0.35)]", icon: Crown },
    2: { bg: "from-slate-300/20 to-slate-500/10", text: "text-slate-200", border: "border-slate-300/40", shadow: "shadow-[0_0_25px_rgba(203,213,225,0.3)]", icon: Medal },
    3: { bg: "from-orange-400/20 to-orange-700/10", text: "text-orange-200", border: "border-orange-300/40", shadow: "shadow-[0_0_25px_rgba(234,88,12,0.3)]", icon: Medal },
  };
  const c = colors[rank];
  const Icon = c.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`relative overflow-hidden rounded-sm border bg-gradient-to-br ${c.bg} ${c.border} ${c.shadow} p-5 ${highlight ? "sm:order-first sm:scale-105" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-md border bg-black/30 ${c.border} ${c.text}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`font-display text-3xl font-bold ${c.text}`}>#{rank}</span>
      </div>
      <p className="mt-4 font-display text-lg font-bold text-white">{entry.participantName}</p>
      <p className="text-xs text-white/50">Batch {entry.participantBatch}</p>
      <p className={`mt-2 font-mono text-xl font-bold ${c.text}`}>{formatTime(entry.completionTimeMs)}</p>
    </motion.div>
  );
}

function rankColor(rank: number) {
  if (rank === 1) return "bg-amber-400/15 text-amber-200 border border-amber-300/40";
  if (rank === 2) return "bg-slate-300/15 text-slate-200 border border-slate-300/40";
  if (rank === 3) return "bg-orange-400/15 text-orange-200 border border-orange-300/40";
  return "bg-white/5 text-white/70 border border-white/10";
}

function EmptyState() {
  return (
    <div className="grid place-items-center px-5 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full border border-cyber-400/30 bg-cyber-400/10 text-cyber-300">
        <Crown className="h-7 w-7" />
      </div>
      <p className="mt-4 font-display text-xl font-bold tracking-wider text-white">NO CHAMPION YET</p>
      <p className="mt-1 max-w-sm text-sm text-white/55">
        The NCC Core is waiting for its first challenger. Be the one to break the vault.
      </p>
      <Link href="/" className="btn-primary mt-5">Be the first</Link>
    </div>
  );
}
