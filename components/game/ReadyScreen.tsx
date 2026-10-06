"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Clock, Heart, Layers, Loader2, Volume2, VolumeX, ArrowRight } from "lucide-react";
import { useAudio } from "@/hooks/useAudio";

interface ReadyProps {
  player: { name: string; batch: string };
  durationSeconds: number;
  startingLives: number;
  totalLevels: number;
  starting: boolean;
  onBegin: () => void;
  onAbort: () => void;
}

export function ReadyScreen({ player, durationSeconds, startingLives, totalLevels, starting, onBegin, onAbort }: ReadyProps) {
  const audio = useAudio();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-2xl"
    >
      <div className="glass-strong neon-border relative overflow-hidden rounded-sm p-6 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(239,255,0,0.2),transparent_60%)]" />

        <div className="relative">
          <p className="section-label">// mission initialized</p>
          <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            MISSION READY
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-cyber-200">
            player verified · timer armed
          </p>

          <div className="mt-6 rounded-sm border border-cyber-400/30 bg-black/40 p-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">player</p>
            <p className="mt-1 font-display text-2xl font-semibold text-white">{player.name}</p>
            <p className="text-xs text-white/50">Batch {player.batch}</p>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Pill icon={Clock} label="Duration" value={`${durationSeconds}s`} />
            <Pill icon={Heart} label="Lives" value={String(startingLives)} />
            <Pill icon={Layers} label="Levels" value={`${totalLevels}`} />
          </div>

          <div className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200/80">
            Pressing <b>BEGIN MISSION</b> starts the server-side timer immediately. It cannot be paused.
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button onClick={onAbort} className="btn-ghost text-xs">Cancel</button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={audio.toggle}
                aria-label={audio.muted ? "Unmute" : "Mute"}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.04] text-white/70 hover:text-white"
              >
                {audio.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button onClick={onBegin} className="btn-primary text-base" disabled={starting}>
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Begin Mission <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Pill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="glass rounded-sm p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-cyber-300" />
      <p className="mt-1 text-[10px] font-mono uppercase tracking-widest text-white/40">{label}</p>
      <p className="font-display text-lg font-bold text-white">{value}</p>
    </div>
  );
}