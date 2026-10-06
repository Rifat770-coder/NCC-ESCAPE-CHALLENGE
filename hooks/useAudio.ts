"use client";

import { useEffect, useState } from "react";

/**
 * Tiny SFX engine. Uses the WebAudio API to synthesise short beep-like
 * sounds so we don't have to ship binary audio files (keeps the project
 * 100% deployable from source, no asset pipeline required).
 */
type Sfx = "click" | "wrong" | "correct" | "levelup" | "warning" | "complete" | "fail" | "tick";

const FREQUENCIES: Record<Sfx, number[]> = {
  click: [880, 1100],
  wrong: [200, 140],
  correct: [660, 880, 1320],
  levelup: [523, 659, 784, 1046],
  warning: [800, 600],
  complete: [523, 659, 784, 1046, 1318],
  fail: [300, 220, 160],
  tick: [1000],
};

export function useAudio() {
  const [muted, setMuted] = useState(false);
  const [ctx, setCtx] = useState<AudioContext | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ncc-muted");
      if (stored === "1") setMuted(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ncc-muted", muted ? "1" : "0");
    } catch {}
  }, [muted]);

  function ensureCtx() {
    if (typeof window === "undefined") return null;
    if (ctx) return ctx;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      const c = new Ctx();
      setCtx(c);
      return c;
    } catch {
      return null;
    }
  }

  function play(sfx: Sfx) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    const freqs = FREQUENCIES[sfx];
    freqs.forEach((f, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = sfx === "wrong" || sfx === "fail" ? "sawtooth" : "sine";
      osc.frequency.value = f;
      const t = c.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  return {
    muted,
    toggle: () => setMuted((m) => !m),
    play,
  };
}