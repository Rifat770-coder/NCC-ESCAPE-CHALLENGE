"use client";

import { Modal } from "@/components/ui/Modal";
import { motion } from "framer-motion";
import { Timer, Heart, Trophy, ShieldAlert, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { formatTime } from "@/lib/utils";

interface RulesProps {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  durationSeconds: number;
  startingLives: number;
}

export function RulesModal({ open, onClose, onContinue, durationSeconds, startingLives }: RulesProps) {
  // Build the rules list dynamically so the duration/lives values are never
  // hardcoded.
  const rules: Array<{ icon: any; label: ReactNode; desc: string }> = [
    {
      icon: Timer,
      label: `${durationSeconds} seconds`,
      desc: `You have ${formatTime(durationSeconds * 1000)} from the moment you press BEGIN MISSION.`,
    },
    {
      icon: ShieldAlert,
      label: "4 levels",
      desc: "Complete Signal Discovery, Logic Sequence, System Repair and the Final Vault.",
    },
    {
      icon: Heart,
      label: `${startingLives} lives`,
      desc: "Wrong answers may cost a life. Lose all lives — mission ends.",
    },
    {
      icon: Trophy,
      label: "Win a prize",
      desc: "Complete the entire mission before time expires to claim your prize eligibility.",
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Mission Rules" size="lg">
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-white/70">
          Welcome, challenger. You are about to enter the NCC Core — a digital escape-room
          built by the NITER Computer Club. Read the rules, then proceed.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {rules.map((r, i) => {
            const Icon = r.icon;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass rounded-sm p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-md border border-cyber-400/30 bg-cyber-400/10 text-cyber-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="font-display text-base font-semibold tracking-wider text-white">
                    {r.label}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-white/60">{r.desc}</p>
              </motion.li>
            );
          })}
        </ul>
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs leading-relaxed text-amber-200/80">
          ⚠ The server is the source of truth. Closing the tab or refreshing does not pause
          the timer.
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button onClick={onClose} className="btn-ghost">
            Close
          </button>
          <button onClick={onContinue} className="btn-primary">
            I Understand — Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
}