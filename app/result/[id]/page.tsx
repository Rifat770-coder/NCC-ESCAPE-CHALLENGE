"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { BackgroundFX } from "@/components/effects/BackgroundFX";
import { ArrowLeft, Download, Trophy, AlertTriangle } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { Reveal } from "@/components/ui/Reveal";
import resultTemplate from "@/public/ncc-result-template.png";
import { ShareResult } from "@/components/game/ShareResult";
import { fetchSharedJSON } from "@/lib/client/shared-read";

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
  const downloadPending = useRef(false);

  useEffect(() => {
    fetchSharedJSON<{ ok: boolean; attempt: Attempt }>(`/api/attempt?id=${params?.id}`)
      .then((d) => {
        if (d.ok) setData(d.attempt);
      })
      .catch(() => push("Could not load result.", "error"));
  }, [params?.id, push]);

  async function download() {
    if (!data || downloadPending.current) return;
    downloadPending.current = true;
    setDownloading(true);
    try {
      const [{ jsPDF }, template] = await Promise.all([
        import("jspdf"),
        fetch(resultTemplate.src).then(async (response) => {
          if (!response.ok) throw new Error("Could not load result template");
          return new Uint8Array(await response.arrayBuffer());
        }),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: [1254, 1254] });
      const title = data.status === "COMPLETED" ? "MISSION COMPLETED" : data.status === "FAILED" ? "MISSION FAILED" : "ATTEMPT RECORD";
      pdf.setProperties({ title: "NCC Escape Challenge Result", author: "NITER Computer Club" });

      // Preserve the supplied artwork, including its logo, colours and frame.
      pdf.addImage(template, "PNG", 0, 0, 1254, 1254);

      function field(text: string, box: [number, number, number, number], baseline: number,
        size: number, color: [number, number, number], bold = false) {
        const [x, y, width, height] = box;
        // Replace the sample value inside its existing frame.
        pdf.setFillColor(0, 0, 0);
        pdf.rect(x, y, width, height, "F");
        pdf.setFont("helvetica", bold ? "bold" : "normal");
        pdf.setFontSize(size);
        const measured = pdf.getTextWidth(text);
        if (measured > width - 16) pdf.setFontSize(size * (width - 16) / measured);
        pdf.setTextColor(...color);
        pdf.text(text, x + width / 2, baseline, { align: "center" });
      }

      const white: [number, number, number] = [255, 255, 255];
      const muted: [number, number, number] = [190, 190, 190];
      const neon: [number, number, number] = [239, 255, 0];
      if (data.status !== "COMPLETED") {
        field(title, [225, 420, 810, 79], 483, 70, white, true);
      }
      field(data.participantName.toUpperCase(), [342, 568, 570, 65], 615, 48, white, true);
      field("Batch " + data.participantBatch, [549, 653, 156, 37], 682, 30, muted);
      field(formatTime(data.completionTimeMs), [542, 754, 259, 84], 826, 84, neon, true);
      field(data.rank ? "#" + data.rank : "-", [609, 923, 112, 74], 987, 76, white, true);
      const prizeStatus = data.prizeClaimed ? "Prize claimed" : data.prizeEligible ? "Prize eligible" : "Not eligible for prize";
      field(prizeStatus, [578, 1032, 144, 31], 1056, 22, white);

      const filename = data.participantName.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").trim().replace(/\s+/g, "_") || "result";
      await pdf.save(`ncc-escape-${filename}.pdf`, { returnPromise: true });
      push("Result PDF downloaded.", "success");
    } catch {
      push("Could not download the PDF.", "error");
    } finally {
      downloadPending.current = false;
      setDownloading(false);
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
          <ShareResult resultId={params.id} />
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
