"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { BackgroundFX } from "@/components/effects/BackgroundFX";
import { ArrowLeft, Download, Share2, Trophy, AlertTriangle } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Reveal } from "@/components/ui/Reveal";

interface Attempt {
  id: string;
  participantName: string;
  participantBatch: string;
  status: string;
  completionTimeMs: number | null;
  prizeEligible: boolean;
  prizeClaimed: boolean;
  rank: number | null;
}

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const { push } = useToast();
  const [data, setData] = useState<Attempt | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch(`/api/attempt?id=${params?.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setData(d.attempt);
      })
      .catch(() => push("Could not load result.", "error"));
  }, [params?.id, push]);

  async function download() {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [600, 600] });
      const title = data.status === "COMPLETED" ? "MISSION COMPLETED" : data.status === "FAILED" ? "MISSION FAILED" : "ATTEMPT RECORD";
      pdf.setProperties({ title: "NCC Escape Challenge Result", author: "NITER Computer Club" });
      pdf.setFillColor(5, 5, 5);
      pdf.rect(0, 0, 600, 600, "F");
      pdf.setDrawColor(239, 255, 0);
      pdf.setLineWidth(1);
      pdf.roundedRect(24, 24, 552, 552, 20, 20, "S");
      pdf.setDrawColor(70, 70, 70);
      pdf.roundedRect(36, 36, 528, 528, 16, 16, "S");

      const logoResponse = await fetch("/ncc-result-logo.png");
      if (!logoResponse.ok) throw new Error("Could not load NCC logo");
      const logo = new Uint8Array(await logoResponse.arrayBuffer());
      const logoProperties = pdf.getImageProperties(logo);
      const logoHeight = 116;
      const logoWidth = logoHeight * logoProperties.width / logoProperties.height;
      pdf.addImage(logo, "PNG", (600 - logoWidth) / 2, 46, logoWidth, logoHeight);

      function centered(text: string, y: number, size: number, color: [number, number, number], bold = false) {
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        // Fit long participant names and batch values inside the card.
        const width = pdf.getTextWidth(text);
        if (width > 480) pdf.setFontSize(size * 480 / width);
        pdf.setTextColor(...color);
        pdf.text(text, 300, y, { align: "center" });
      }

      const white: [number, number, number] = [255, 255, 255];
      const muted: [number, number, number] = [181, 181, 181];
      const cyan: [number, number, number] = [239, 255, 0];
      centered("NCC ESCAPE CHALLENGE", 193, 19, cyan, true);
      centered(title, 231, 29, white, true);
      centered("PLAYER", 261, 11, muted);
      centered(data.participantName, 294, 28, white, true);
      centered(`Batch ${data.participantBatch}`, 320, 15, muted);
      centered("TIME", 357, 11, muted);
      centered(formatTime(data.completionTimeMs), 397, 40, cyan, true);
      centered("RANK", 431, 11, muted);
      centered(data.rank ? `#${data.rank}` : "-", 474, 40, white, true);
      const prizeStatus = data.prizeClaimed ? "Prize claimed" : data.prizeEligible ? "Prize eligible" : "Not eligible for prize";
      centered(prizeStatus, 501, 13, muted);
      centered("NITER COMPUTER CLUB | ORIENTATION 2026", 540, 10, muted);

      const filename = data.participantName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim().replace(/\s+/g, "_") || "result";
      await pdf.save(`ncc-escape-${filename}.pdf`, { returnPromise: true });
      push("Result PDF downloaded.", "success");
    } catch {
      push("Could not download the PDF.", "error");
    } finally {
      setDownloading(false);
    }
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "NCC Escape Challenge · Mission Completed",
          text: `${data?.participantName ?? "I"} completed the NCC Escape Challenge in ${formatTime(data?.completionTimeMs ?? null)}!`,
          url,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        push("Link copied to clipboard.", "success");
      } catch {
        push("Could not share.", "error");
      }
    }
  }

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <BackgroundFX />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyber-200">loading result...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundFX />
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <Link href="/" className="btn-ghost text-xs">
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">result card</p>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-16 sm:px-8">
        <Reveal className="glass-strong neon-border relative overflow-hidden rounded-sm">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-br from-cyber-400/10 via-transparent to-cyber-500/10" />

          <div className="relative p-6 sm:p-10">
            <p className="section-label text-center">// ncc escape challenge</p>
            <h1 className="mt-1 text-center font-display text-3xl font-bold tracking-widest text-white sm:text-4xl">
              {data.status === "COMPLETED" ? "MISSION COMPLETED" : data.status === "FAILED" ? "MISSION FAILED" : "ATTEMPT RECORD"}
            </h1>

            {data.status === "FAILED" && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">
                <AlertTriangle className="h-3.5 w-3.5" /> Not eligible for prize
              </div>
            )}
            {data.status === "COMPLETED" && data.prizeClaimed && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                <Trophy className="h-3.5 w-3.5" /> Prize claimed
              </div>
            )}
            {data.status === "COMPLETED" && !data.prizeClaimed && (
              <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-cyber-400/30 bg-cyber-500/10 px-3 py-1 text-xs text-cyber-100">
                <Trophy className="h-3.5 w-3.5" /> Prize eligible
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Field label="Player" value={data.participantName} />
              <Field label="Batch" value={data.participantBatch} />
              <Field label="Time" value={formatTime(data.completionTimeMs)} glow />
              <Field label="Rank" value={data.rank ? `#${data.rank}` : "—"} />
            </div>

            <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
              NITER Computer Club · Orientation 2026
            </p>
          </div>
        </Reveal>

        <Reveal delay={100} className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={download} disabled={downloading} className="btn-primary disabled:cursor-wait disabled:opacity-60">
            <Download className="h-4 w-4" /> {downloading ? "Generating PDF..." : "Download PDF"}
          </button>
          <button onClick={share} className="btn-ghost">
            <Share2 className="h-4 w-4" /> Share Result
          </button>
          <Link href="/leaderboard" className="btn-ghost">
            <Trophy className="h-4 w-4" /> Leaderboard
          </Link>
        </Reveal>
      </main>
    </div>
  );
}

function Field({ label, value, glow }: { label: string; value: string; glow?: boolean }) {
  return (
    <Reveal delay={80} className="glass rounded-sm p-4 text-center">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${glow ? "text-glow" : "text-white"}`}>{value}</p>
    </Reveal>
  );
}
