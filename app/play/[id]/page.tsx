"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BackgroundFX } from "@/components/effects/BackgroundFX";
import { HUD } from "@/components/game/HUD";
import { Level1BugHunt } from "@/components/game/Level1BugHunt";
import { Level2Memory } from "@/components/game/Level2Memory";
import { Level3TechMatch } from "@/components/game/Level3TechMatch";
import { Level4FinalButton } from "@/components/game/Level4FinalButton";
import { ReadyScreen } from "@/components/game/ReadyScreen";
import { SuccessScreen } from "@/components/game/SuccessScreen";
import { FailureScreen } from "@/components/game/FailureScreen";
import { LoadingPanel } from "@/components/ui/LoadingPanel";
import { useToast } from "@/components/ui/Toast";
import { useAudio } from "@/hooks/useAudio";
import { Cpu, Volume2, VolumeX } from "lucide-react";

type Phase = "ready" | "playing" | "success" | "failed";

interface Plan {
  level1: any;
  level2: any;
  level3: any;
  level4: any;
}

const TOTAL_LEVELS = 4;

export default function PlayPage() {
  const params = useParams<{ id: string }>();
  const attemptId = params?.id as string;
  const router = useRouter();
  const { push: toastPush } = useToast();
  const audio = useAudio();

  const [view, setView] = useState<any | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(Date.now());
  const [startingLives, setStartingLives] = useState(3);
  // Offset between client clock and server clock, learned from the attempt
  // view's serverNow. Lets the countdown stay accurate even if the device
  // clock is wrong.
  const [clockOffsetMs, setClockOffsetMs] = useState<number>(0);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards so we only POST /api/attempt/fail ONCE per attempt.
  const failedForAttemptRef = useRef<string | null>(null);
  const submissionPending = useRef(false);
  const startPending = useRef(false);
  const pendingLoads = useRef(new Set<string>());

  async function load() {
    if (!attemptId || pendingLoads.current.has(attemptId)) return;
    pendingLoads.current.add(attemptId);
    setLoading(true);
    try {
      const res = await fetch("/api/attempt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (data.error === "GAME_PAUSED") {
          toastPush("The challenge is paused by the organizers.", "warning");
        } else if (data.error === "ATTEMPT_ENDED") {
          toastPush("This attempt already ended.", "info");
          router.replace(`/result/${attemptId}`);
          return;
        } else {
          toastPush("Could not load your attempt.", "error");
        }
        setLoading(false);
        return;
      }
      setView(data.attempt);
      setPlan(data.plan);
      setStartingLives(3);
      // Lock in the server-vs-client clock offset so the countdown uses
      // server-anchored time and ignores a wrong device clock.
      if (data.attempt?.serverNow) {
        const serverNowMs = new Date(data.attempt.serverNow).getTime();
        setClockOffsetMs(serverNowMs - Date.now());
      }
      if (data.attempt.status === "ACTIVE") {
        setPhase("playing");
        audio.play("levelup");
      } else if (data.attempt.status === "COMPLETED") {
        setPhase("success");
      } else if (data.attempt.status === "FAILED" || data.attempt.status === "DISQUALIFIED") {
        setPhase("failed");
      } else {
        setPhase("ready");
      }
    } catch {
      toastPush("Network error loading attempt.", "error");
    } finally {
      pendingLoads.current.delete(attemptId);
      setLoading(false);
    }
  }

  useEffect(() => {
    failedForAttemptRef.current = null;
    load();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  useEffect(() => {
    if (phase !== "playing") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase]);

  const remainingMs = useMemo(() => {
    if (!view) return 0;
    const capMs = (view.durationSeconds || 0) * 1000;
    if (!view.startedAt) return capMs;
    // Prefer the server-anchored expiresAt when available; otherwise
    // compute from startedAt + durationSeconds.
    const expiresMs = view.expiresAt
      ? new Date(view.expiresAt).getTime()
      : new Date(view.startedAt).getTime() + capMs;
    const serverAlignedNow = now + clockOffsetMs;
    return Math.max(0, expiresMs - serverAlignedNow);
  }, [view, now, clockOffsetMs]);

  useEffect(() => {
    if (phase !== "playing" || remainingMs > 0) return;
    // Don't fire multiple fail requests for the same attempt.
    if (failedForAttemptRef.current === attemptId) return;
    failedForAttemptRef.current = attemptId;
    fetch("/api/attempt/fail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.view) {
          setView(d.view);
          setPhase("failed");
          audio.play("fail");
          toastPush("Time up! Mission failed.", "error");
        }
      })
      .catch(() => {});
  }, [remainingMs, phase, attemptId, audio, toastPush]);

  async function begin() {
    if (startPending.current) return;
    startPending.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/attempt/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toastPush(data.error === "GAME_PAUSED" ? "Paused by organizers." : "Could not start mission.", "error");
        return;
      }
      setView(data.attempt);
      setPlan(data.plan);
      if (data.attempt?.serverNow) {
        setClockOffsetMs(new Date(data.attempt.serverNow).getTime() - Date.now());
      }
      setNow(Date.now());
      setPhase("playing");
      audio.play("levelup");
    } catch {
      toastPush("Network error.", "error");
    } finally {
      startPending.current = false;
      setLoading(false);
    }
  }

  async function submitLevel(payload: any) {
    if (!view || submissionPending.current) return;
    submissionPending.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/attempt/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId, level: view.currentLevel, payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toastPush("Server rejected submission.", "error");
        audio.play("wrong");
        return;
      }
      audio.play(data.passed ? "correct" : "wrong");
      setView(data.attempt);
      if (!data.passed) {
        toastPush(data.message || "Wrong answer. -1 life.", "error");
      }
      if (data.attempt.status === "COMPLETED") {
        audio.play("complete");
        setPhase("success");
      } else if (data.attempt.status === "FAILED") {
        audio.play("fail");
        setPhase("failed");
      }
    } catch {
      toastPush("Network error.", "error");
      audio.play("wrong");
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  }

  if (loading && !view) {
    return (
      <div className="grid min-h-screen place-items-center px-4">
        <BackgroundFX />
        <LoadingPanel label="Establishing secure connection..." detail="verifying attempt" />
      </div>
    );
  }

  if (!view || !plan) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <BackgroundFX />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-red-300">attempt not found</p>
          <p className="mt-2 text-white/60">This challenge attempt does not exist or has expired.</p>
          <Link href="/" className="btn-primary mt-5">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundFX density="high" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.3em] text-white">
          <span className="grid h-7 w-7 place-items-center rounded-md border border-cyber-400/40 bg-cyber-400/10 text-cyber-300">
            <Cpu className="h-3.5 w-3.5" />
          </span>
          NCC - ESCAPE
        </Link>
        <button
          onClick={audio.toggle}
          aria-label={audio.muted ? "Unmute" : "Mute"}
          className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/30 hover:text-white"
        >
          {audio.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </header>

      <AnimatePresence mode="wait">
        {phase === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 mx-auto max-w-7xl px-4 pb-12 pt-2 sm:px-6"
          >
            <ReadyScreen
              player={{ name: view.participantName, batch: view.participantBatch }}
              durationSeconds={view.durationSeconds}
              startingLives={startingLives}
              totalLevels={TOTAL_LEVELS}
              starting={loading}
              onBegin={begin}
              onAbort={() => router.push("/")}
            />
          </motion.div>
        )}

        {phase === "playing" && (
          <motion.div
            key="play"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 mx-auto max-w-7xl px-3 pb-10 pt-1 sm:px-6"
          >
            <HUD
              playerName={view.participantName}
              currentLevel={view.currentLevel}
              totalLevels={TOTAL_LEVELS}
              lives={view.livesRemaining}
              startingLives={startingLives}
              remainingMs={remainingMs}
              totalDurationSeconds={view.durationSeconds}
            />

            <div className="mt-6 overflow-x-clip">
              <LevelHeader level={view.currentLevel} />
              <AnimatePresence mode="wait">
                <motion.div
                  key={view.currentLevel}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35 }}
                  className="mt-4"
                >
                  {view.currentLevel === 1 && (
                    <Level1BugHunt scene={plan.level1} submitting={submitting} onSubmit={submitLevel} />
                  )}
                  {view.currentLevel === 2 && (
                    <Level2Memory puzzle={plan.level2} submitting={submitting} onSubmit={submitLevel} />
                  )}
                  {view.currentLevel === 3 && (
                    <Level3TechMatch puzzle={plan.level3} submitting={submitting} onSubmit={submitLevel} />
                  )}
                  {view.currentLevel === 4 && (
                    <Level4FinalButton challenge={plan.level4} submitting={submitting} onSubmit={submitLevel} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6"
          >
            <SuccessScreen
              participant={{ name: view.participantName, batch: view.participantBatch }}
              completionTimeMs={view.completionTimeMs || 0}
              livesRemaining={view.livesRemaining}
              rank={view.rank}
              attemptId={view.id}
            />
          </motion.div>
        )}

        {phase === "failed" && (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6"
          >
            <FailureScreen
              reason={remainingMs <= 0 ? "TIME_UP" : "NO_LIVES"}
              levelReached={view.currentLevel}
              durationSeconds={view.durationSeconds}
              completionTimeMs={view.completionTimeMs}
              retryAllowed={false}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LevelHeader({ level }: { level: number }) {
  const TITLES = ["Signal Discovery", "Logic Sequence", "System Repair", "NCC Core Vault"];
  const TAGS = [
    "// scan the environment",
    "// solve the pattern",
    "// repair the system",
    "// unlock the vault",
  ];
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div>
        <p className="section-label">{TAGS[level - 1]}</p>
        <h1 className="font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
          LEVEL {String(level).padStart(2, "0")} - {TITLES[level - 1]}
        </h1>
      </div>
      <div className="hidden gap-2 sm:flex">
        {Array.from({ length: TOTAL_LEVELS }).map((_, i) => (
          <span
            key={i}
            className={`grid h-7 w-7 place-items-center rounded-md border text-[10px] font-mono ${
              i + 1 < level
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : i + 1 === level
                ? "border-cyber-300/70 bg-cyber-400/10 text-cyber-200"
                : "border-white/10 bg-white/[0.03] text-white/40"
            }`}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
        ))}
      </div>
    </div>
  );
}
