"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal } from "@/components/ui/Reveal";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Trophy, ShieldCheck, Cpu, Zap, BookOpen, Volume2, VolumeX } from "lucide-react";
import { BackgroundFX } from "@/components/effects/BackgroundFX";
import { HeroArt } from "@/components/effects/HeroArt";
import { FastestTimeCard } from "@/components/game/FastestTimeCard";
import { RulesModal } from "@/components/game/RulesModal";
import { RegistrationForm } from "@/components/game/RegistrationForm";
import { CountUp } from "@/components/effects/CountUp";
import { useAudio } from "@/hooks/useAudio";

interface PublicSettings {
  durationSeconds: number;
  startingLives: number;
}

const FEATURES_TEMPLATE = [
  { icon: Zap, key: "duration", desc: "A single global timer. The server is authoritative." },
  { icon: ShieldCheck, title: "4 challenges", desc: "Signal · Logic · System · Vault — each more intense." },
  { icon: Trophy, title: "Live leaderboard", desc: "Top finishers are projected live on the stall screen." },
  { icon: Cpu, title: "Built by NCC", desc: "Designed and engineered by the NITER Computer Club." },
];

export default function HomePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"landing" | "registering" | "registered">("landing");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [gameSettings, setGameSettings] = useState<PublicSettings>({
    durationSeconds: 120,
    startingLives: 3,
  });
  const audio = useAudio();

  useEffect(() => {
    // Fetch the authoritative duration from the server. If this fails
    // we deliberately keep the seed default — the registration flow
    // re-fetches via /api/register, so a stale landing value cannot leak
    // into the actual attempt.
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && d.settings) {
          setGameSettings({
            durationSeconds: d.settings.durationSeconds,
            startingLives: d.settings.startingLives,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="home-shell relative min-h-screen overflow-x-hidden">
      <BackgroundFX />

      {/* Top bar */}
      <header className="home-header relative z-20 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-bold tracking-[0.3em] text-white">
          <Image
            src="/niter-computer-club-logo.jpeg"
            alt="NITER Computer Club logo"
            width={44}
            height={48}
            className="h-11 w-10 shrink-0 rounded-sm bg-white object-contain sm:h-12 sm:w-11"
          />
          NCC · ESCAPE
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={audio.toggle}
            aria-label={audio.muted ? "Unmute" : "Mute"}
            className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/30 hover:text-white"
          >
            {audio.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <main className="home-main relative z-10 mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-8 sm:pt-10">
        <AnimatePresence mode="wait">
          {phase === "landing" && (
            <motion.section
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="home-hero"
            >
              <div className="hero-copy">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyber-400/30 bg-cyber-400/5 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.3em] text-cyber-200"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyber-300 shadow-[0_0_10px_#efff00]" />
                  NITER Computer Club · Orientation 2026
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
                  className="font-display text-5xl font-bold leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl"
                >
                  NCC
                  <br />
                  <span className="bg-gradient-to-r from-cyber-200 via-cyber-300 to-cyber-300 bg-clip-text text-transparent text-glow">
                    ESCAPE
                  </span>{" "}
                  <span className="text-white/80">CHALLENGE</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.6 }}
                  className="mt-6 font-mono text-sm uppercase tracking-[0.3em] text-cyber-200 sm:text-base"
                >
                  <span className="text-glow"><CountUp value={gameSettings.durationSeconds} duration={0.8} /></span>{" "}
                  <span className="text-white/40">·</span>{" "}
                  <span className="text-glow">4 Challenges</span>{" "}
                  <span className="text-white/40">·</span>{" "}
                  <span className="text-glow-purple">1 Mission</span>
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg"
                >
                  Complete the mission. Win the prize. <br className="hidden sm:block" />
                  Step into the NCC Core — a futuristic digital escape-room built for the orientation stall.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55, duration: 0.5 }}
                  className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
                >
                  <button onClick={() => setPhase("registering")} className="btn-primary text-base">
                    Start Challenge <ArrowRight className="h-5 w-5" />
                  </button>
                  <button onClick={() => setRulesOpen(true)} className="btn-ghost text-base">
                    <BookOpen className="h-4 w-4" /> Mission Rules
                  </button>
                </motion.div>

                <div className="mt-8">
                  <FastestTimeCard />
                </div>
              </div>

              {/* Right: emblem + HUD */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="hero-visual"
              >
                <HeroArt />

                <div className="hero-features">
                  {FEATURES_TEMPLATE.map((f, i) => {
                    const Icon = f.icon;
                    // The duration feature card derives its title from the
                    // authoritative server-side setting — no hardcoded 120.
                    const title =
                      "key" in f && f.key === "duration"
                        ? `${gameSettings.durationSeconds} seconds`
                        : (f as { title: string }).title;
                    return (
                      <motion.div
                        key={title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.08 }}
                        className="glass rounded-sm p-3"
                      >
                        <div className="mb-2 grid h-8 w-8 place-items-center rounded-md border border-cyber-400/30 bg-cyber-400/10 text-cyber-300">
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="font-display text-sm font-semibold tracking-wide text-white">
                          {title}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-white/55">{f.desc}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.section>
          )}

          {phase === "registering" && (
            <motion.section
              key="register"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45 }}
              className="mx-auto max-w-2xl"
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setPhase("landing")}
                  className="btn-ghost text-xs"
                  aria-label="Back to landing"
                >
                  ← Back
                </button>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Step 1 / 2 · Identity Check
                </p>
              </div>
              <RegistrationForm
                onRegistered={(data) => {
                  setGameSettings(data.settings);
                  setPhase("registered");
                  audio.play("levelup");
                  setTimeout(() => router.push(`/play/${data.attempt.id}`), 1300);
                }}
              />
            </motion.section>
          )}

          {phase === "registered" && (
            <motion.section
              key="registered"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.6, ease: "linear" }}
                className="mb-6 grid h-20 w-20 place-items-center rounded-full border-2 border-cyber-400/40"
              >
                <div className="grid h-12 w-12 place-items-center rounded-full border border-cyber-400/60 bg-cyber-400/20 text-cyber-200">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </motion.div>
              <h2 className="font-display text-2xl font-bold tracking-[0.3em] text-white">
                PLAYER REGISTERED
              </h2>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-cyber-200">
                INITIALIZING CHALLENGE…
              </p>
              <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyber-300 to-cyber-300"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <RulesModal
          open={rulesOpen}
          onClose={() => setRulesOpen(false)}
          onContinue={() => {
            setRulesOpen(false);
            setPhase("registering");
          }}
          durationSeconds={gameSettings.durationSeconds}
          startingLives={gameSettings.startingLives}
        />
      </main>

      {/* Decorative footer tag */}
      <footer className="home-footer relative z-10 mx-auto max-w-7xl px-4 pb-8 pt-4 text-center sm:px-8">
        <Reveal inView>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
          
          <span>// DESIGNED & BUILT BY THE NITER COMPUTER CLUB </span>

  <a
    href="https://www.linkedin.com/in/minhajulislamrifat"
    target="_blank"
    rel="noopener noreferrer"
      className="
        text-[#EFFF00]
        transition-all duration-300
        hover:text-[#F5FF5A]
        hover:[text-shadow:0_0_8px_#EFFF00,0_0_18px_#EFFF00]
      "
  >
    DEVELOPED BY MINHAJUL ISLAM RIFAT ↗
  </a>
        </p>
        </Reveal>
      </footer>
    </div>
  );
}
