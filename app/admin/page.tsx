"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { BackgroundFX } from "@/components/effects/BackgroundFX";
import { ShieldCheck, Loader2, ArrowRight, Lock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const { push } = useToast();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const loginPending = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loginPending.current) return;
    loginPending.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        push("Invalid password.", "error");
        return;
      }
      push("Welcome back, operator.", "success");
      router.push("/admin/dashboard");
    } catch {
      push("Network error.", "error");
    } finally {
      loginPending.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-6">
      <BackgroundFX />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-strong neon-border relative w-full max-w-md rounded-sm p-5 sm:p-8"
      >
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-sm border border-cyber-400/40 bg-cyber-400/10 text-cyber-300">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="section-label text-center">// operator access</p>
        <h1 className="mt-1 text-center font-display text-2xl font-bold tracking-widest text-white">
          NCC CONTROL
        </h1>
        <p className="mt-2 text-center text-xs text-white/55">
          Enter your operator credentials to manage the challenge.
        </p>

        <label className="mt-6 block text-[10px] font-mono uppercase tracking-widest text-white/60">
          Password
        </label>
        <div className="relative mt-1">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="Enter password"
            className="input-cyber pl-10"
            autoFocus
          />
        </div>

        <button type="submit" disabled={loading || !pwd} className="btn-primary mt-6 w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
        </button>

        <p className="mt-5 text-center text-[10px] text-white/30">
          // not for public use. Unauthorised access is logged.
        </p>
      </motion.form>
    </div>
  );
}
