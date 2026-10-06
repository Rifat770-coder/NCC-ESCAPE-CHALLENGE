"use client";

/**
 * LEVEL 1 — BUG HUNT
 *
 * Beginner-friendly reaction game. The player taps a moving digital bug
 * five times. No life penalty for missing — the bug just respawns.
 * On the 5th catch the component calls onSubmit({ bugsCaught: 5 }) and
 * the server validates through the standard level-completion API.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, Loader2 } from "lucide-react";
import { useAudio } from "@/hooks/useAudio";

interface Level1Props {
  // The existing plan keeps Level 1's metadata for context (title, briefing),
  // but the bug hunt gameplay itself is purely client-driven.
  scene: { id: string; title: string; briefing: string };
  submitting: boolean;
  onSubmit: (payload: { bugsCaught: number }) => Promise<void>;
}

const TARGET = 5;
const RESPAWN_MS = 700; // how long before a missed bug disappears & respawns
const PLAY_AREA_PADDING = 8; // % inset from edges (mobile-safe tap zone)

const SQUASH_MESSAGES = [
  "SQUASHED! 💥",
  "Gotcha!",
  "Nice!",
  "Bug deleted!",
  "404: Bug Not Found 😂",
  "ACCESS DENIED... to the bug 🐛",
];

export function Level1BugHunt({ scene, submitting, onSubmit }: Level1Props) {
  const audio = useAudio();
  const [caught, setCaught] = useState(0);
  const [pop, setPop] = useState<{ id: number; x: number; y: number; text: string } | null>(null);
  const [bug, setBug] = useState<{ x: number; y: number; rot: number; emoji: string } | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const popIdRef = useRef(0);
  const bugSeedRef = useRef(0);

  // Place the bug at a random spot inside the play area, avoiding the very edges.
  const spawn = useCallback(() => {
    const min = PLAY_AREA_PADDING;
    const max = 100 - PLAY_AREA_PADDING;
    const x = min + Math.random() * (max - min);
    const y = min + Math.random() * (max - min);
    const rot = Math.random() * 60 - 30;
    const emojis = ["🐛", "🪲", "🐞", "🦗"];
    bugSeedRef.current += 1;
    setBug({ x, y, rot, emoji: emojis[bugSeedRef.current % emojis.length] });
  }, []);

  // Initial bug.
  useEffect(() => {
    spawn();
  }, [spawn]);

  // Move the bug every RESPAWN_MS so it always appears reachable on mobile.
  useEffect(() => {
    if (caught >= TARGET) return;
    const id = setInterval(() => {
      spawn();
    }, RESPAWN_MS);
    return () => clearInterval(id);
  }, [caught, spawn]);

  const handleCatch = useCallback(() => {
    if (!bug) return;
    audio.play("correct");
    const idx = caught % SQUASH_MESSAGES.length;
    const text = SQUASH_MESSAGES[idx];
    const id = ++popIdRef.current;
    setPop({ id, x: bug.x, y: bug.y, text });
    setTimeout(() => {
      setPop((cur) => (cur && cur.id === id ? null : cur));
    }, 700);
    setCaught((c) => {
      const next = c + 1;
      if (next >= TARGET) {
        // Submit slightly after the last squash animation lands.
        setTimeout(() => {
          void onSubmit({ bugsCaught: next });
        }, 350);
      }
      return next;
    });
    // hide the bug immediately on catch, then the interval respawns.
    setBug(null);
  }, [audio, bug, caught, onSubmit]);

  const progress = Math.min(caught, TARGET);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Play area */}
      <div className="glass-strong relative min-w-0 w-full overflow-hidden rounded-sm border border-white/10">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-cyber-500/5" />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between gap-2 px-3 pt-3">
          <div>
            <p className="section-label">// {scene.title}</p>
            <p className="font-display text-sm font-bold tracking-wider text-white">
              Bug Hunt
            </p>
          </div>
          <p className="chip border-red-400/40 bg-red-500/10 text-red-200">
            {progress} / {TARGET}
          </p>
        </div>

        {/* Briefing */}
        <div className="relative z-10 mx-3 mt-2 rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] leading-snug text-white/70 backdrop-blur">
          ⚠️ <span className="font-semibold text-red-200">Alerts!</span> Bugs have nested in the system. Tap them
          before they break everything. <span className="text-white/50">(Tap the bug 5 times)</span>
        </div>

        {/* Playfield */}
        <div className="relative h-[clamp(260px,40vw,480px)] overflow-hidden">
        <div
          ref={areaRef}
          className="absolute inset-12 sm:inset-16"
          style={{ touchAction: "manipulation" }}
        >
          <AnimatePresence>
            {bug && caught < TARGET && (
              <motion.button
                key={bugSeedRef.current}
                type="button"
                onClick={handleCatch}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1, rotate: bug.rot }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.18 }}
                className="absolute -ml-10 -mt-10 grid h-20 w-20 cursor-pointer select-none place-items-center rounded-sm border-2 border-red-400/40 bg-red-500/15 text-4xl shadow-[0_0_24px_rgba(239,68,68,0.5)] backdrop-blur transition active:scale-90 sm:-ml-12 sm:-mt-12 sm:h-24 sm:w-24 sm:text-5xl"
                style={{ left: `${bug.x}%`, top: `${bug.y}%` }}
                aria-label="Bug! Tap to catch"
              >
                <span className="block leading-none">{bug.emoji}</span>
                <Bug className="pointer-events-none absolute -top-1 -right-1 h-4 w-4 text-red-300 opacity-80" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Squash popups */}
          <AnimatePresence>
            {pop && (
              <motion.div
                key={pop.id}
                initial={{ opacity: 0, y: 0, scale: 0.8 }}
                animate={{ opacity: 1, y: -40, scale: 1 }}
                exit={{ opacity: 0, y: -70 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyber-300/40 bg-cyber-400/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-cyber-100 shadow-[0_0_15px_rgba(239,255,0,0.4)]"
                style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
              >
                {pop.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint when bug is gone briefly */}
          {!bug && caught < TARGET && (
            <div className="absolute inset-0 grid place-items-center text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                <span className="animate-pulse">Scanning…</span>
              </p>
            </div>
          )}

          {/* Final success overlay */}
          <AnimatePresence>
            {caught >= TARGET && (
              <motion.div
                key="cleared"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                className="absolute -inset-12 grid place-items-center px-3 sm:-inset-16"
              >
                <div className="max-w-full rounded-sm border border-emerald-400/40 bg-emerald-500/15 px-4 py-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.4)] backdrop-blur sm:px-8">
                  <p className="font-display text-2xl font-bold tracking-wider text-emerald-200">
                    ALL BUGS ELIMINATED
                  </p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.3em] text-emerald-100/80">
                    SYSTEM CLEAN!
                  </p>
                  {submitting && (
                    <p className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/70">
                      <Loader2 className="h-3 w-3 animate-spin" /> submitting
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

      {/* Side panel */}
      <div className="glass-strong rounded-sm border border-white/10 p-5">
        <p className="section-label">// mission</p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-wide text-white">
          Catch 5 Bugs
        </h3>
        <p className="mt-1 text-xs text-white/55">
          Quick! They're breaking the system.
        </p>

        {/* Progress dots */}
        <div className="mt-5 flex items-center gap-2">
          {Array.from({ length: TARGET }).map((_, i) => {
            const filled = i < progress;
            return (
              <div
                key={i}
                className={`grid h-8 w-8 place-items-center rounded-md border text-xs font-bold transition ${
                  filled
                    ? "border-red-400/60 bg-red-500/15 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                    : "border-white/15 bg-black/30 text-white/25"
                }`}
              >
                {filled ? "✓" : i + 1}
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-white/70">
          🐛 Bugs are <span className="text-red-200">tap-able</span>. They
          re-spawn quickly — stay sharp!
          <br />
          <span className="text-white/40">Tip: too easy? You'll find the next level harder.</span>
        </div>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          // lives unaffected
        </p>
      </div>
    </div>
  );
}
