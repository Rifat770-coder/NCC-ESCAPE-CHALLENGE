"use client";
import { Reveal } from "@/components/ui/Reveal";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { registerSchema, type RegisterInput } from "@/lib/validation/schemas";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface RegistrationFormProps {
  onRegistered: (data: {
    participant: { id: string; name: string; batch: string; department: string };
    attempt: { id: string; levelSeed: number; status: string; livesRemaining: number };
    settings: { durationSeconds: number; startingLives: number };
  }) => void;
}

const DEPARTMENTS = [
  "Computer Science & Engineering (CSE)",
  "Electrical & Electronic Engineering (EEE)",
  "Textile Engineering (TE)",
  "Industrial & Production Engineering (IPE)",
  "Fashion Design & Apparel Engineering (FDAE)",
  "Other",
];
const BATCHES = ["12", "13", "14", "15", "16"];

export function RegistrationForm({ onRegistered }: RegistrationFormProps) {
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const submissionPending = useRef(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateClient(values: RegisterInput): Record<string, string> {
    const out: Record<string, string> = {};
    const parsed = registerSchema.safeParse(values);
    if (parsed.success) return out;
    for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (v && v[0]) out[k] = v[0];
    }
    return out;
  }

  async function onSubmit(formEl: HTMLFormElement) {
    if (submissionPending.current) return;
    setErrors({});
    const fd = new FormData(formEl);
    const values = {
      name: String(fd.get("name") || ""),
      studentId: String(fd.get("studentId") || ""),
      department: String(fd.get("department") || ""),
      batch: String(fd.get("batch") || ""),
      phone: String(fd.get("phone") || ""),
    };
    const localErrs = validateClient(values);
    if (Object.keys(localErrs).length > 0) {
      setErrors(localErrs);
      return;
    }
    submissionPending.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "DUPLICATE_STUDENT_ID") {
          setErrors({ studentId: "This Student ID is already registered." });
          push("This Student ID has already been used.", "error");
          return;
        }
        if (data.error === "GAME_PAUSED") {
          push("The challenge is currently paused by the organizers.", "warning");
          return;
        }
        push("Registration failed. Please try again.", "error");
        return;
      }
      onRegistered(data);
    } catch (e) {
      push("Network error. Please try again.", "error");
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e.currentTarget);
      }}
      className="glass-strong neon-border relative space-y-5 rounded-sm p-6 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cyber-400/40 bg-cyber-400/10 text-cyber-300">
          <UserPlus className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="section-label">// participant registration</p>
          <h2 className="font-display text-xl font-bold tracking-wide text-white">
            Identify yourself, challenger
          </h2>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="f-name" className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-white/60">
            Full name <span className="text-red-400">*</span>
          </label>
          <input
            id="f-name"
            name="name"
            placeholder="e.g. Rifat Hossain"
            aria-invalid={!!errors.name}
            className="input-cyber"
            autoComplete="name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-300">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="f-sid" className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-white/60">
            Student ID <span className="text-red-400">*</span>
          </label>
          <input
            id="f-sid"
            name="studentId"
            placeholder="e.g. CSE-2024-001"
            aria-invalid={!!errors.studentId}
            className="input-cyber"
            autoComplete="off"
          />
          {errors.studentId && <p className="mt-1 text-xs text-red-300">{errors.studentId}</p>}
        </div>
        <div>
          <label htmlFor="f-dep" className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-white/60">
            Department <span className="text-red-400">*</span>
          </label>
          <select id="f-dep" name="department" aria-invalid={!!errors.department} className="input-cyber" defaultValue="">
            <option value="" disabled>Select department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.department && <p className="mt-1 text-xs text-red-300">{errors.department}</p>}
        </div>
        <div>
          <label htmlFor="f-batch" className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-white/60">
            Batch <span className="text-red-400">*</span>
          </label>
          <select id="f-batch" name="batch" aria-invalid={!!errors.batch} className="input-cyber" defaultValue="">
            <option value="" disabled>Select batch</option>
            {BATCHES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {errors.batch && <p className="mt-1 text-xs text-red-300">{errors.batch}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="f-phone" className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-white/60">
            Phone
          </label>
          <input
            id="f-phone"
            name="phone"
            placeholder="e.g. +880 1XXXXXXXXX"
            aria-invalid={!!errors.phone}
            className="input-cyber"
            autoComplete="tel"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-300">{errors.phone}</p>}
          <p className="mt-1 text-[10px] text-white/40">
            Phone numbers are kept private and never shown on the leaderboard.
          </p>
        </div>
      </div>

      <Reveal delay={100} className="flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-white/40">
          By registering you agree your attempt will be logged on the leaderboard.
        </p>
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>Register <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </Reveal>
    </motion.form>
  );
}
