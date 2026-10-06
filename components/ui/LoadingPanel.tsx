"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

interface LoadingPanelProps {
  label?: string;
  detail?: string;
  className?: string;
}

export function LoadingPanel({ label = "INITIALIZING NCC CORE…", detail, className }: LoadingPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex flex-col items-center justify-center gap-4 text-center ${className || "min-h-[200px]"}`}
    >
      <div className="relative h-16 w-16">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyber-400/30 border-t-cyber-300"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border-2 border-cyber-500/30 border-b-purple-300"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-cyber-300" />
        </div>
      </div>
      <Reveal delay={100}>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyber-200">{label}</p>
        {detail && <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-white/40">{detail}</p>}
      </Reveal>
    </motion.div>
  );
}
