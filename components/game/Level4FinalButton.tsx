"use client";

/**
 * LEVEL 4 — NCC FINAL CORE
 *
 * Reaction game. After a 3-2-1 countdown, a large instruction appears
 * (e.g. "HIT THE GREEN BUTTON!"). The player taps the correct colored
 * button. Wrong taps cause a small shake and only deduct a life on the
 * second+ wrong attempt. When the correct button is hit, the component
 * submits { hit: color, mistakes } to the existing level-completion API.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useAudio } from "@/hooks/useAudio";
import { useToast } from "@/components/ui/Toast";

type Color = "red" | "blue" | "green" | "yellow";

interface Level4Props {
  challenge: { id: string; title: string; briefing: string; targetColor: Color };
  submitting: boolean;
  onSubmit: (payload: { hit: Color; mistakes: number }) => Promise<void>;
}

const COLORS: Color[] = ["red", "blue", "green", "yellow"];

const COLOR_LABEL: Record<Color, string> = {
  red: "RED 🔴",
  blue: "BLUE 🔵",
  green: "GREEN 🟢",
  yellow: "YELLOW 🟡",
};

const COLOR_BG: Record<Color, string> = {
  red: "from-red-500/40 to-red-600/30 border-red-400/60 shadow-[0_0_30px_rgba(239,68,68,0.6)]",
  blue: "from-blue-500/40 to-blue-600/30 border-blue-400/60 shadow-[0_0_30px_rgba(59,130,246,0.6)]",
  green: "from-emerald-500/40 to-emerald-600/30 border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.6)]",
  yellow: "from-amber-400/40 to-amber-500/30 border-amber-300/60 shadow-[0_0_30px_rgba(245,158,11,0.6)]",
};

export function Level4FinalButton({ challenge, submitting, onSubmit }: Level4Props) {
  const audio = useAudio();
  const { push } = useToast();
  const target: Color = (challenge.targetColor as Color) || "green";

  // Shuffle buttons so the answer isn't always in the same position.
  const buttonOrder = useMemo(() => {
    return [...COLORS].sort(() => Math.random() - 0.5);
  }, []);

  const [phase, setPhase] = useState<"intro" | "count" | "play" | "won">("intro");
  const [count, setCount] = useState(3);
  const [wrongColor, setWrongColor] = useState<Color | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const submittedRef = useRef(false);

  // Start the 3-2-1 countdown shortly after mount.
  useEffect(() => {
    const t = setTimeout(() => setPhase("count"), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "count") return;
    if (count <= 0) {
      setPhase("play");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  const hit = useCallback(
    (c: Color) => {
      if (phase !== "play" || submittedRef.current) return;
      if (c === target) {
        audio.play("complete");
        setPhase("won");
        submittedRef.current = true;
        const t = setTimeout(() => {
          void onSubmit({ hit: c, mistakes });
        }, 700);
        void t;
        return;
      }
      audio.play("wrong");
      setMistakes((m) => m + 1);
      setWrongColor(c);
      push(`WRONG BUTTON! 😆`, "warning");
      setTimeout(() => setWrongColor(null), 450);
    },
    [audio, mistakes, onSubmit, phase, push, target],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {/* Briefing */}
      <div className="glass-strong relative overflow-hidden rounded-sm border border-white/10 p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-cyber-400/10" />
        <div className="relative">
          <p className="section-label">// {challenge.title}</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-wide text-white">
            NCC FINAL CORE
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/80">
            {challenge.briefing}
          </p>

          <div className="mt-5 rounded-sm border border-white/10 bg-black/40 p-4">
            <p className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> ONE LAST TASK
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              When the countdown ends, follow the instruction shown on the right and
              hit the correct button. Easy!
            </p>
          </div>

          {/* Current status / mistakes */}
          <div className="mt-5 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Mistakes</p>
              <p className="font-display text-lg font-bold text-cyber-200">{mistakes}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">Lives</p>
              <p className="font-display text-lg font-bold text-red-300">• • •</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action area */}
      <div className="glass-strong relative overflow-hidden rounded-sm border border-white/10 p-6">
        <p className="section-label">// vault terminal</p>

        {/* Instruction banner */}
        <div className="mt-3 rounded-sm border border-white/10 bg-black/40 p-5 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            instruction
          </p>
          <AnimatePresence mode="wait">
            {phase === "count" && (
              <motion.p
                key={`count-${count}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.6 }}
                transition={{ duration: 0.35 }}
                className="font-display text-5xl font-bold text-white text-glow sm:text-6xl"
              >
                {count > 0 ? count : "GO!"}
              </motion.p>
            )}
            {phase === "play" && (
              <motion.p
                key="play"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`font-display text-2xl font-bold tracking-wide sm:text-3xl ${
                  target === "red"
                    ? "text-red-300"
                    : target === "blue"
                    ? "text-blue-300"
                    : target === "green"
                    ? "text-emerald-300"
                    : "text-amber-300"
                }`}
              >
                HIT THE {COLOR_LABEL[target]} BUTTON!
              </motion.p>
            )}
            {phase === "won" && (
              <motion.p
                key="won"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-display text-2xl font-bold tracking-widest text-emerald-200 sm:text-3xl"
              >
                ✨ ACCESS GRANTED ✨
                {submitting && (
                  <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] text-white/70">
                    <Loader2 className="h-3 w-3 animate-spin" /> submitting
                  </span>
                )}
              </motion.p>
            )}
            {phase === "intro" && (
              <motion.p
                key="intro"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-sm uppercase tracking-[0.3em] text-cyber-200"
              >
                INITIALIZING…
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          {buttonOrder.map((c) => (
            <motion.button
              key={c}
              type="button"
              onClick={() => hit(c)}
              disabled={phase !== "play" || submittedRef.current}
              animate={
                wrongColor === c
                  ? { x: [0, -8, 8, -6, 6, 0] }
                  : { x: 0 }
              }
              transition={{ duration: 0.4 }}
              className={`color-button relative grid aspect-[5/3] place-items-center rounded-sm border-2 bg-gradient-to-br text-2xl font-bold uppercase tracking-widest text-white sm:text-3xl ${COLOR_BG[c]} ${
                phase === "play"
                  ? "cursor-pointer hover:brightness-110 active:scale-95"
                  : "cursor-default opacity-90"
              }`}
            >
              <span className="color-label font-display drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]">
                {COLOR_LABEL[c]}
              </span>
              {phase === "count" && (
                <span className="ready-overlay pointer-events-none absolute inset-0 grid place-items-center bg-black/30 text-white/50 backdrop-blur-sm">
                  READY
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
