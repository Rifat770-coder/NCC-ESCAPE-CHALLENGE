import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPublicAttemptView } from "@/lib/game/attempt-service";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
  const base = host ? new URL(`${protocol}://${host}`) : undefined;
  const resultPath = `/result/${encodeURIComponent(params.id)}`;
  const attempt = await getPublicAttemptView(params.id).catch(() => null);
  const title = `NCC Escape Challenge · ${attempt?.status === "COMPLETED" ? "Mission Completed" : attempt?.status === "FAILED" ? "Mission Failed" : "Result"}`;
  const description = attempt
    ? `${attempt.participantName} — NCC Escape Challenge result. Batch ${attempt.participantBatch}.`
    : "View this NCC Escape Challenge result from the NITER Computer Club.";
  const images = attempt ? [{ url: `${resultPath}/share-image`, width: 1254, height: 1254, alt: "NCC Escape Challenge result card" }] : [];

  return {
    metadataBase: base,
    title,
    description,
    alternates: { canonical: resultPath },
    openGraph: { title, description, url: resultPath, type: "website", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default function ResultLayout({ children }: { children: React.ReactNode }) {
  return children;
}
