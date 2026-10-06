"use client";

/**
 * LEVEL 3 — TECH MATCH
 *
 * Match 3 familiar system icons with their functions. Tap-to-select on
 * mobile, drag-to-pair on desktop (optional). Wrong matches cause a small
 * shake and a friendly message; only the SECOND+ wrong attempt deducts
 * a life (forgiving-mistake rule). When all 3 are matched, the component
 * submits { matches, mistakes } to the existing level-completion API.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Lucide from "lucide-react";
import { Check, Loader2, X, Zap } from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { useToast } from "@/components/ui/Toast";

interface TechPair { left: string; right: string }

interface Level3Props {
  puzzle: {
    id: string;
    title?: string;
    prompt?: string;
    techPairs: TechPair[];
  };
  submitting: boolean;
  onSubmit: (payload: { matches: Record<string, string>; mistakes: number }) => Promise<void>;
}

type Side = "left" | "right";

function shuffleStable<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Level3TechMatch({ puzzle, submitting, onSubmit }: Level3Props) {
  const audio = useAudio();
  const { push } = useToast();

  const pairs = useMemo(() => puzzle.techPairs || [], [puzzle.techPairs]);
  const leftOrder = useMemo(() => shuffleStable(pairs.map((p) => p.left)), [pairs]);
  const rightOrder = useMemo(() => {
    const shuffled = shuffleStable(pairs.map((p) => p.right));
    // Never offer the complete answer simply by matching rows.
    if (shuffled.length > 1 && leftOrder.every((id, i) =>
      pairs.find((p) => p.left === id)?.right === shuffled[i])) {
      shuffled.push(shuffled.shift()!);
    }
    return shuffled;
  }, [pairs, leftOrder]);

  const [matches, setMatches] = useState<Record<string, string>>({});
  const [pickLeft, setPickLeft] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const submittedRef = useRef(false);
  const matchesRef = useRef<Record<string, string>>({});
  const pickLeftRef = useRef<string | null>(null);
  const mistakesRef = useRef(0);
  // Persistent submission timeout held in a ref so it is NOT cancelled
  // by React's effect cleanup when `onSubmit` / `audio` change reference
  // on subsequent renders (which is what silently killed the previous
  // version of this effect).
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSubmitRef = useRef(onSubmit);
  const audioRef = useRef(audio);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
    audioRef.current = audio;
  }, [onSubmit, audio]);
  // Cancel any pending submission only on unmount.
  useEffect(() => () => {
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
  }, []);

  const allMatched = pairs.length > 0 && pairs.every((p) => matches[p.left] === p.right);

  const triggerSubmit = useCallback(
    (finalMatches: Record<string, string>, finalMistakes: number) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      audioRef.current.play("complete");
      submitTimerRef.current = setTimeout(() => {
        submitTimerRef.current = null;
        void onSubmitRef.current({ matches: finalMatches, mistakes: finalMistakes });
      }, 500);
    },
    [],
  );

  const tapLeft = useCallback(
    (id: string) => {
      audio.play("click");
      if (submitting || submittedRef.current || matchesRef.current[id]) return;
      pickLeftRef.current = pickLeftRef.current === id ? null : id;
      setPickLeft(pickLeftRef.current);
    },
    [audio, submitting],
  );

  const tapRight = useCallback(
    (id: string) => {
      const selected = pickLeftRef.current;
      if (!selected || submitting || submittedRef.current || matchesRef.current[selected] ||
        Object.values(matchesRef.current).includes(id)) return;
      // Consume the selection synchronously to guard rapid/double taps.
      pickLeftRef.current = null;
      audio.play("click");
      const expected = pairs.find((p) => p.left === selected)?.right;
      if (id === expected) {
        // Correct!
        audio.play("correct");
        setPickLeft(null);
        // Compute the final matches map with this new pair committed.
        // We do not need to wait for React to render — we already have
        // every value we need to decide completion and to send to the
        // server.
        const nextMatches: Record<string, string> = { ...matchesRef.current, [selected]: id };
        matchesRef.current = nextMatches;
        const willComplete = pairs.every((p) => nextMatches[p.left] === p.right);
        setMatches(nextMatches);
        if (willComplete) {
          triggerSubmit(nextMatches, mistakesRef.current);
        }
      } else {
        // Wrong — show shake, count mistake, then reset pick
        audio.play("wrong");
        mistakesRef.current += 1;
        setMistakes(mistakesRef.current);
        setWrongPair(id);
        push("Almost! Try again 😄", "info");
        setTimeout(() => setWrongPair(null), 500);
        // Forgiving rule: first mistake is free; second and onward deduct a life
        // on the server side via the `mistakes` payload.
        setPickLeft(null);
      }
    },
    [audio, pairs, push, submitting, triggerSubmit],
  );

  const isMatched = (id: string, side: Side) => {
    if (side === "left") return !!matches[id];
    return Object.values(matches).includes(id);
  };

  const isPicked = (id: string, side: Side) => side === "left" && pickLeft === id;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Board */}
      <div className="glass-strong relative overflow-hidden rounded-sm border border-white/10 p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-500/5 via-transparent to-cyber-400/5" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-label">// tech match</p>
              <p className="font-display text-sm font-bold tracking-wider text-white">
                RESTORE CONNECTIONS
              </p>
            </div>
            <p className="chip border-cyber-300/40 bg-cyber-400/10 text-cyber-100">
              {Object.keys(matches).length} / {pairs.length} CONNECTED
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5">
            {/* Left (icons) */}
            <div className="space-y-2">
              {leftOrder.map((id) => {
                const Icon = (Lucide as any)[id] || Zap;
                const matched = isMatched(id, "left");
                const picked = isPicked(id, "left");
                return (
                  <motion.button
                    key={id}
                    type="button"
                    aria-label={id}
                    aria-pressed={picked}
                    onClick={() => tapLeft(id)}
                    disabled={matched || submitting || submittedRef.current}
                    whileTap={{ scale: 0.97 }}
                    className={`relative flex min-h-[68px] w-full min-w-0 items-center justify-center gap-2 rounded-sm border px-2 py-3 text-left text-sm font-medium transition sm:gap-3 sm:px-4 sm:py-3.5 ${
                      matched
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                        : picked
                        ? "border-cyber-300 bg-cyber-400/10 text-cyber-100 shadow-[0_0_20px_rgba(239,255,0,0.5)]"
                        : "border-white/10 bg-black/30 text-white/80 hover:border-cyber-400/40 hover:bg-cyber-400/5"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/15 bg-black/40">
                      <Icon className="h-6 w-6" />
                    </span>
                    {matched && (
                      <Check className="absolute right-2 h-4 w-4 shrink-0 text-emerald-300" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Right (labels) */}
            <div className="space-y-2">
              {rightOrder.map((label) => {
                const matched = isMatched(label, "right");
                const wrong = wrongPair === label;
                const disabled = !pickLeft || matched || submitting || submittedRef.current;
                return (
                  <motion.button
                    key={label}
                    type="button"
                    onClick={() => tapRight(label)}
                    disabled={disabled}
                    animate={wrong ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                    transition={{ duration: 0.35 }}
                    className={`relative flex min-h-[62px] w-full min-w-0 items-center justify-between gap-1 rounded-sm border px-2 py-3 text-left text-sm font-medium transition sm:px-4 sm:py-3.5 ${
                      matched
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                        : wrong
                        ? "border-red-400/60 bg-red-500/10 text-red-200"
                        : "border-white/10 bg-black/30 text-white/80 hover:border-cyber-400/40 hover:bg-cyber-400/5 disabled:opacity-40"
                  }`}
                  >
                    <span className="min-w-0 break-words font-display tracking-wide">{label}</span>
                    {matched && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Status line */}
          <div className="mt-4 min-h-7 text-center font-mono text-xs uppercase tracking-widest">
            <AnimatePresence mode="wait">
              {pickLeft && !allMatched && (
                <motion.p
                  key="picked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-cyber-200"
                >
                  SELECT THE CORRECT FUNCTION
                </motion.p>
              )}
              {allMatched && (
                <motion.p
                  key="cleared"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-display text-base font-bold text-emerald-200"
                >
                  ⚡ SYSTEM CONNECTION RESTORED ⚡
                  {submitting && (
                    <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] text-white/70">
                      <Loader2 className="h-3 w-3 animate-spin" /> submitting
                    </span>
                  )}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Side */}
      <div className="glass-strong rounded-sm border border-white/10 p-5">
        <p className="section-label">// briefing</p>
        <h3 className="mt-1 font-display text-lg font-semibold tracking-wide text-white">
          Match Icons with Functions
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/65">
          Select a system icon, then connect it to the correct function.
          Restore all 3 connections to repair the system.
        </p>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-white/70">
          🎯 <span className="font-semibold text-white">Tip:</span> Think about what each icon does.
          <br />
          <span className="text-white/40">Lives are protected — first mistake is free.</span>
        </div>

        {/* Status */}
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat label="MATCHED" value={`${Object.keys(matches).length}/${pairs.length}`} />
          <Stat label="MISTAKES" value={String(mistakes)} />
          <Stat label="LIVES" value="• • •" accent="red" />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "red" | "cyan" }) {
  const cls = accent === "red" ? "text-red-300" : "text-cyber-200";
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-2">
      <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">{label}</p>
      <p className={`font-display text-base font-bold ${cls}`}>{value}</p>
    </div>
  );
}
