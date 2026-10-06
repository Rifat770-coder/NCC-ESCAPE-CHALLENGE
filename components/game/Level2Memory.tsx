"use client";

/**
 * LEVEL 2 — MEMORY MATCH
 *
 * Beginner-friendly card-matching mini-game. 6 cards (3 pairs of emojis)
 * are shuffled and flipped face-down. Player taps two at a time. Matched
 * pairs stay face up. After 3 matches the component submits
 * { pairsMatched: 3 }. No life penalty for wrong matches — they just
 * flip back after a short pause.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";
import { useAudio } from "@/hooks/useAudio";

interface Level2Props {
  // The Level 2 plan keeps metadata for context (title/prompt) but the
  // memory-match gameplay is purely client-driven.
  puzzle: { id: string; prompt: string };
  submitting: boolean;
  onSubmit: (payload: { pairsMatched: number }) => Promise<void>;
}

const EMOJI_POOL = [
  ["🚀", "💻", "🤖", "⚡", "🎮", "📱", "🎧", "📷", "🍕", "☕"],
];
const PAIR_COUNT = 3;

type Card = {
  id: string;
  pairId: number;
  emoji: string;
  index: number; // visual position
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useDeck() {
  // Pick PAIR_COUNT pairs deterministically per mount from a wider pool.
  return useMemo(() => {
    const pool = EMOJI_POOL[0];
    const chosen = shuffle(pool).slice(0, PAIR_COUNT);
    const cards: Card[] = [];
    chosen.forEach((emoji, p) => {
      cards.push({ id: `${p}-a`, pairId: p, emoji, index: 0 });
      cards.push({ id: `${p}-b`, pairId: p, emoji, index: 1 });
    });
    const shuffled = shuffle(cards).map((c, i) => ({ ...c, index: i }));
    return shuffled;
  }, []);
}

export function Level2Memory({ puzzle, submitting, onSubmit }: Level2Props) {
  const audio = useAudio();
  const deck = useDeck();
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [flipped, setFlipped] = useState<string[]>([]);
  const [lock, setLock] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const submittedRef = useRef(false);
  // Persistent submission timeout — held in a ref so it is not cancelled
  // by React's effect cleanup when `onSubmit` / `audio` change reference
  // on subsequent renders.
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always-on refs to the latest callbacks/props so we can fire the
  // submission from a stable place without including them in effect deps.
  const onSubmitRef = useRef(onSubmit);
  const audioRef = useRef(audio);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
    audioRef.current = audio;
  }, [onSubmit, audio]);
  // Cancel any pending submission if the component unmounts.
  useEffect(() => () => {
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
  }, []);

  // `matched` stores one entry per matched pairId. Its size IS the
  // number of pairs found — never divide by 2.
  const matches = matched.size;
  const allMatched = matches >= PAIR_COUNT;

  const triggerSubmit = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setFeedback("MEMORY CORE RESTORED!");
    audioRef.current.play("complete");
    // Clear local UI state so the success overlay is the only thing shown.
    setFlipped([]);
    setLock(true);
    submitTimerRef.current = setTimeout(() => {
      submitTimerRef.current = null;
      void onSubmitRef.current({ pairsMatched: PAIR_COUNT });
    }, 600);
  }, []);

  const tap = useCallback(
    (card: Card) => {
      if (lock || submittedRef.current) return;
      if (matched.has(card.pairId)) return;
      if (flipped.includes(card.id)) return;
      audio.play("click");
      const next = [...flipped, card.id];
      setFlipped(next);
      if (next.length === 2) {
        const [aId, bId] = next;
        const a = deck.find((c) => c.id === aId)!;
        const b = deck.find((c) => c.id === bId)!;
        if (a.pairId === b.pairId) {
          setLock(true);
          setFeedback("MATCHED! ✨");
          audio.play("correct");
          setTimeout(() => {
            // Compute whether this match completes the level BEFORE we
            // commit the new state. If yes, trigger the existing
            // completion flow (which submits via onSubmit) immediately.
            const willComplete = matched.size + 1 >= PAIR_COUNT;
            setMatched((cur) => {
              const next = new Set(cur);
              next.add(a.pairId);
              return next;
            });
            if (willComplete) {
              // Skip the "flip back" UX — we're going straight to the
              // success overlay. triggerSubmit handles state cleanup.
              triggerSubmit();
            } else {
              setFlipped([]);
              setLock(false);
              setFeedback(null);
            }
          }, 500);
        } else {
          setLock(true);
          setFeedback("Almost 😄");
          audio.play("wrong");
          setTimeout(() => {
            setFlipped([]);
            setLock(false);
            setFeedback(null);
          }, 800);
        }
      }
    },
    [audio, deck, flipped, lock, matched, triggerSubmit],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      {/* Board */}
      <div className="glass-strong relative overflow-hidden rounded-sm border border-white/10 p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-400/5 via-transparent to-cyber-500/5" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="section-label">// memory core</p>
              <p className="font-display text-sm font-bold tracking-wider text-white">
                Memory Match
              </p>
            </div>
            <p className="chip border-cyber-300/40 bg-cyber-400/10 text-cyber-100">
              PAIRS FOUND: {matches} / {PAIR_COUNT}
            </p>
          </div>

          {/* 3-col x 2-row grid */}
          <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-3 sm:max-w-none sm:gap-4">
            {deck.map((c) => {
              const isMatched = matched.has(c.pairId);
              const isFlipped = isMatched || flipped.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => tap(c)}
                  disabled={isMatched || lock || submittedRef.current}
                  className="relative aspect-square"
                  style={{ perspective: "600px" }}
                  aria-label={isMatched ? `Matched ${c.emoji}` : "Memory card"}
                >
                  <motion.div
                    initial={false}
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="relative h-full w-full"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Back */}
                    <div
                      className="absolute inset-0 grid place-items-center rounded-sm border border-cyber-400/40 bg-gradient-to-br from-cyber-400/15 to-cyber-500/15 text-cyber-200 shadow-[inset_0_0_20px_rgba(239,255,0,0.2)]"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <span className="font-display text-2xl font-bold opacity-70">?</span>
                    </div>
                    {/* Front */}
                    <div
                      className={`absolute inset-0 grid place-items-center rounded-sm border text-4xl shadow-[inset_0_0_20px_rgba(239,255,0,0.3)] sm:text-5xl ${
                        isMatched
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
                          : "border-cyber-300/50 bg-cyber-400/10 text-white"
                      }`}
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <span>{c.emoji}</span>
                      {isMatched && (
                        <Sparkles className="pointer-events-none absolute -top-1 -right-1 h-4 w-4 text-emerald-300" />
                      )}
                    </div>
                  </motion.div>
                </button>
              );
            })}
          </div>

          {/* Feedback / final */}
          <div className="mt-4 min-h-7 text-center font-mono text-xs uppercase tracking-widest">
            <AnimatePresence mode="wait">
              {feedback && !allMatched && (
                <motion.p
                  key={feedback + Date.now()}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-cyber-200"
                >
                  {feedback}
                </motion.p>
              )}
              {allMatched && (
                <motion.p
                  key="cleared"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-display text-base font-bold text-emerald-200"
                >
                  ✨ MEMORY CORE RESTORED! ✨
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
          Find the 3 Matching Pairs
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/65">
          Tap two cards to flip them. Matching pairs stick; mismatches flip
          back. Take your time — no life penalty here.
        </p>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-3 text-xs leading-relaxed text-white/70">
          🧠 <span className="font-semibold text-white">Hint:</span> your brain still works!
          <br />
          <span className="text-white/40">Goal: 3 pairs. Easy at small sizes.</span>
        </div>

        {/* Mini progress */}
        <div className="mt-5 flex items-center gap-2">
          {Array.from({ length: PAIR_COUNT }).map((_, i) => {
            const filled = i < matches;
            return (
              <div
                key={i}
                className={`grid h-7 w-7 place-items-center rounded-md border text-xs ${
                  filled
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                    : "border-white/15 bg-black/30 text-white/30"
                }`}
              >
                {filled ? "✓" : "·"}
              </div>
            );
          })}
        </div>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          // wrong matches don't cost lives
        </p>
      </div>
    </div>
  );
}
