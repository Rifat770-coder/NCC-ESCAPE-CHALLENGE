"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import nccLogo from "@/public/NCC NEW Version Logo.png";
import {
  LogOut,
  Users,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Crown,
  Gift,
  Filter,
  Search,
  Trash2,
  Ban,
  RotateCcw,
  Award,
  Trophy,
  Pause,
  Play,
  Clock,
  Heart,
  Settings,
} from "lucide-react";
import { BackgroundFX } from "@/components/effects/BackgroundFX";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatTime } from "@/lib/utils";

interface Stats {
  totalAttempts: number;
  totalParticipants: number;
  successfulMissions: number;
  failedMissions: number;
  prizesEligible: number;
  prizesClaimed: number;
  prizesRemaining: number;
  completionRate: number;
  fastestTimeMs: number | null;
}
interface Attempt {
  $id: string;
  participantName: string;
  participantBatch: string;
  status: string;
  currentLevel: number;
  livesRemaining: number;
  startedAt: string | null;
  completedAt: string | null;
  completionTimeMs: number | null;
  prizeEligible: boolean;
  prizeClaimed: boolean;
  createdAt: string;
}
interface Participant {
  $id: string;
  name: string;
  studentId: string;
  department: string;
  batch: string;
  phone?: string;
  createdAt: string;
}
interface SettingsType {
  gameActive: boolean;
  durationSeconds: number;
  startingLives: number;
  retryAllowed: boolean;
  maximumAttempts: number;
  leaderboardEnabled: boolean;
  prizeMode: boolean;
}

type FilterType = "all" | "completed" | "failed" | "claimed" | "unclaimed";

export default function AdminDashboard() {
  const router = useRouter();
  const { push } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/admin/stats", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        push("Session expired. Please log in again.", "error");
        router.push("/admin");
        return;
      }
      setStats(d.stats);
      setAttempts(d.attempts);
      setParticipants(d.participants);
    } catch {
      push("Network error.", "error");
    } finally {
      setLoading(false);
    }
  }
  async function loadSettings() {
    const r = await fetch("/api/admin/settings", { cache: "no-store" });
    const d = await r.json();
    if (d.ok) setSettings(d.settings);
  }
  useEffect(() => {
    load();
    loadSettings();
    const id = setInterval(load, 7000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  async function action(attemptId: string, action: string) {
    const r = await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId, action }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      push(d.error || "Action failed.", "error");
      return;
    }
    push("Action applied.", "success");
    load();
  }

  const filtered = useMemo(() => {
    let list = attempts;
    if (filter === "completed") list = list.filter((a) => a.status === "COMPLETED");
    if (filter === "failed") list = list.filter((a) => a.status === "FAILED" || a.status === "DISQUALIFIED");
    if (filter === "claimed") list = list.filter((a) => a.prizeClaimed);
    if (filter === "unclaimed") list = list.filter((a) => a.prizeEligible && !a.prizeClaimed);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.participantName.toLowerCase().includes(s) ||
          a.participantBatch.toLowerCase().includes(s),
      );
    }
    return list;
  }, [attempts, filter, search]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <BackgroundFX />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyber-200">
          authenticating operator...
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundFX density="low" />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 flex-wrap px-4 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-bold tracking-[0.3em] text-white">
          <Image
            src={nccLogo}
            alt="NITER Computer Club logo"
            width={44}
            height={48}
            className="h-11 w-10 shrink-0 rounded-sm object-contain sm:h-12 sm:w-11"
          />
          NCC · ESCAPE
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/leaderboard" className="btn-ghost text-xs">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
          <button onClick={() => setShowSettings(true)} className="btn-ghost text-xs">
            <Settings className="h-4 w-4" /> Game Settings
          </button>
          <button onClick={logout} className="btn-ghost text-xs">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 sm:px-8">
        {/* Stats grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Users} label="Total Players" value={String(stats?.totalParticipants ?? 0)} />
          <Stat icon={Activity} label="Total Attempts" value={String(stats?.totalAttempts ?? 0)} />
          <Stat icon={CheckCircle2} label="Successful" value={String(stats?.successfulMissions ?? 0)} accent="green" />
          <Stat icon={XCircle} label="Failed" value={String(stats?.failedMissions ?? 0)} accent="red" />
          <Stat icon={Zap} label="Fastest Time" value={stats?.fastestTimeMs ? formatTime(stats.fastestTimeMs) : "—"} accent="cyan" />
          <Stat icon={Award} label="Completion Rate" value={`${stats?.completionRate ?? 0}%`} />
          <Stat icon={Gift} label="Prizes Eligible" value={String(stats?.prizesEligible ?? 0)} accent="green" />
          <Stat icon={Crown} label="Prizes Claimed" value={String(stats?.prizesClaimed ?? 0)} />
        </div>

        {/* Filters + Search */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(["all", "completed", "failed", "unclaimed", "claimed"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`min-h-11 rounded-full border px-3 py-1 text-[10px] font-mono uppercase tracking-widest transition ${
                  filter === f
                    ? "border-cyber-300/60 bg-cyber-400/10 text-cyber-100"
                    : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                }`}
              >
                <Filter className="mr-1 inline h-3 w-3" />
                {f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              placeholder="Search name or batch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-cyber pl-9"
            />
          </div>
        </div>

        {/* Attempts table */}
        <div className="glass-strong mt-4 overflow-hidden rounded-sm border border-white/10">
          <div className="border-b border-white/5 px-5 py-4">
            <p className="font-display text-sm font-semibold tracking-widest text-white/80">
              ATTEMPTS - {filtered.length}
            </p>
          </div>
          {filtered.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                no records match the current filter
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="min-w-[800px] text-left text-sm">
                <thead className="bg-white/[0.03] font-mono text-[10px] uppercase tracking-widest text-white/40">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((a) => (
                    <tr key={a.$id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">{a.participantName}</td>
                      <td className="px-4 py-3 text-white/60">{a.participantBatch}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={a.status} claimed={a.prizeClaimed} eligible={a.prizeEligible} />
                      </td>
                      <td className="px-4 py-3 text-white/70">{a.currentLevel}/4</td>
                      <td className="px-4 py-3 font-mono text-cyber-200">
                        {a.completionTimeMs ? formatTime(a.completionTimeMs) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-white/40">{formatDate(a.startedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {a.status === "COMPLETED" && a.prizeEligible && !a.prizeClaimed && (
                            <ActionBtn icon={Award} label="Claim" onClick={() => action(a.$id, "mark_claimed")} accent="green" />
                          )}
                          {a.prizeClaimed && (
                            <ActionBtn icon={RotateCcw} label="Unclaim" onClick={() => action(a.$id, "mark_unclaimed")} />
                          )}
                          {a.status !== "DISQUALIFIED" && (
                            <ActionBtn icon={Ban} label="DQ" onClick={() => action(a.$id, "disqualify")} accent="red" />
                          )}
                          <ActionBtn icon={Trash2} label="Delete" onClick={() => action(a.$id, "delete")} accent="red" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Participants block */}
        <div className="glass-strong mt-8 overflow-hidden rounded-sm border border-white/10">
          <div className="border-b border-white/5 px-5 py-4">
            <p className="font-display text-sm font-semibold tracking-widest text-white/80">
              PARTICIPANTS - {participants.length}
            </p>
          </div>
          {participants.length === 0 ? (
            <div className="grid place-items-center py-12 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-white/40">
                no participants yet
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="min-w-[800px] text-left text-sm">
                <thead className="bg-white/[0.03] font-mono text-[10px] uppercase tracking-widest text-white/40">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {participants.map((p) => (
                    <tr key={p.$id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-white/70">{p.studentId}</td>
                      <td className="px-4 py-3 text-white/60">{p.department}</td>
                      <td className="px-4 py-3 text-white/60">{p.batch}</td>
                      <td className="px-4 py-3 text-white/60">{p.phone || "—"}</td>
                      <td className="px-4 py-3 text-[11px] text-white/40">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Settings modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Game Control" size="lg">
        {settings && (
          <SettingsForm
            initial={settings}
            onClose={() => setShowSettings(false)}
            onSaved={(s) => {
              setSettings(s);
              push(`SETTINGS SAVED — Duration: ${s.durationSeconds}s`, "success");
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function Stat({
  icon: Icon, label, value, accent,
}: { icon: any; label: string; value: string; accent?: "green" | "red" | "cyan" }) {
  const cls = accent === "green" ? "text-emerald-300" : accent === "red" ? "text-red-300" : accent === "cyan" ? "text-cyber-200" : "text-white";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-sm border border-white/10 p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyber-300" />
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">{label}</p>
      </div>
      <p className={`mt-1 font-display text-2xl font-bold ${cls}`}>{value}</p>
    </motion.div>
  );
}

function StatusBadge({ status, claimed, eligible }: { status: string; claimed: boolean; eligible: boolean }) {
  if (status === "COMPLETED") {
    if (claimed) return <span className="chip border-emerald-400/40 text-emerald-200">PRIZE CLAIMED</span>;
    if (eligible) return <span className="chip border-cyber-300/40 text-cyber-100">COMPLETED</span>;
    return <span className="chip border-white/15 text-white/60">COMPLETED</span>;
  }
  if (status === "FAILED") return <span className="chip border-red-400/40 text-red-200">FAILED</span>;
  if (status === "DISQUALIFIED") return <span className="chip border-red-500/40 text-red-300">DISQUALIFIED</span>;
  if (status === "ACTIVE") return <span className="chip border-amber-400/40 text-amber-200">ACTIVE</span>;
  return <span className="chip border-white/15 text-white/60">{status}</span>;
}

function ActionBtn({ icon: Icon, label, onClick, accent }: { icon: any; label: string; onClick: () => void; accent?: "red" | "green" }) {
  const cls = accent === "red" ? "hover:border-red-400/50 hover:bg-red-500/10" : accent === "green" ? "hover:border-emerald-400/50 hover:bg-emerald-500/10" : "hover:border-white/30 hover:bg-white/5";
  return (
    <button onClick={onClick} className={`inline-flex min-h-11 items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-white/70 transition ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </button>
  );
}

function SettingsForm({ initial, onSaved, onClose }: { initial: SettingsType; onSaved: (s: SettingsType) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<SettingsType>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync the form to whatever the latest server values are when reopened.
  useEffect(() => {
    setDraft(initial);
    setError(null);
  }, [initial]);

  function validate(): string | null {
    if (!Number.isFinite(draft.durationSeconds) || !Number.isInteger(draft.durationSeconds)) {
      return "Duration must be an integer.";
    }
    if (draft.durationSeconds < 30 || draft.durationSeconds > 600) {
      return "Duration must be between 30 and 600 seconds.";
    }
    if (draft.startingLives < 1 || draft.startingLives > 9) {
      return "Starting lives must be between 1 and 9.";
    }
    if (draft.maximumAttempts < 1 || draft.maximumAttempts > 10) {
      return "Maximum attempts must be between 1 and 10.";
    }
    return null;
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const v = validate();
      if (v) {
        setError(v);
        return;
      }
      const r = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setError(d.message || d.error || "Save failed.");
        return;
      }
      // Read-back: refetch from server to confirm the value actually landed
      // in the backend. This guards against any caching/transport drift.
      const rr = await fetch("/api/admin/settings", { cache: "no-store" });
      const rd = await rr.json();
      if (rd.ok && rd.settings?.durationSeconds !== d.settings.durationSeconds) {
        setError(
          `Save mismatch: server reports ${rd.settings.durationSeconds}s, expected ${d.settings.durationSeconds}s.`,
        );
        return;
      }
      onSaved(rd.ok ? rd.settings : d.settings);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Network error while saving.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
        {draft.gameActive ? <Play className="h-4 w-4 text-emerald-300" /> : <Pause className="h-4 w-4 text-amber-300" />}
        <p className="text-xs text-white/70">{draft.gameActive ? "Game is ACTIVE. Participants can register and play." : "Game is PAUSED. Registrations blocked."}</p>
        <button
          onClick={() => setDraft((d) => ({ ...d, gameActive: !d.gameActive }))}
          className="ml-auto min-h-11 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-white hover:bg-white/10"
        >
          {draft.gameActive ? "Pause" : "Resume"}
        </button>
      </div>

      <FieldRow icon={Clock} label="Duration (seconds, 30–600)">
        <input
          type="number"
          min={30}
          max={600}
          step={1}
          value={draft.durationSeconds}
          onChange={(e) => setDraft((d) => ({ ...d, durationSeconds: Number(e.target.value) }))}
          className="input-cyber"
        />
      </FieldRow>
      <FieldRow icon={Heart} label="Starting lives">
        <input type="number" min={1} max={9} value={draft.startingLives} onChange={(e) => setDraft((d) => ({ ...d, startingLives: Number(e.target.value) }))} className="input-cyber" />
      </FieldRow>
      <FieldRow icon={Users} label="Maximum attempts per participant">
        <input type="number" min={1} max={10} value={draft.maximumAttempts} onChange={(e) => setDraft((d) => ({ ...d, maximumAttempts: Number(e.target.value) }))} className="input-cyber" />
      </FieldRow>
      <FieldRow icon={RotateCcw} label="Allow retries (when max > 1)">
        <Toggle value={draft.retryAllowed} onChange={(v) => setDraft((d) => ({ ...d, retryAllowed: v }))} />
      </FieldRow>
      <FieldRow icon={Trophy} label="Public leaderboard">
        <Toggle value={draft.leaderboardEnabled} onChange={(v) => setDraft((d) => ({ ...d, leaderboardEnabled: v }))} />
      </FieldRow>
      <FieldRow icon={Gift} label="Prize mode">
        <Toggle value={draft.prizeMode} onChange={(v) => setDraft((d) => ({ ...d, prizeMode: v }))} />
      </FieldRow>

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="btn-ghost">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function FieldRow({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-3 sm:flex">
      <Icon className="h-4 w-4 shrink-0 text-cyber-300" />
      <p className="sm:w-64 text-xs text-white/70">{label}</p>
      <div className="col-span-2 min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="relative inline-flex h-11 w-11 items-center">
      <span className={`inline-flex h-6 w-11 items-center rounded-full transition ${value ? "bg-cyber-400/60" : "bg-white/10"}`}>
      <motion.span layout className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
    </button>
  );
}
