import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getPublicAttemptView } from "@/lib/game/attempt-service";
import { formatTime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const result = await getPublicAttemptView(params.id).catch(() => null);
  if (!result) return new Response("Result not found", { status: 404 });
  const template = await readFile(path.join(process.cwd(), "public/ncc-result-template.png"));
  const title = result.status === "COMPLETED" ? "MISSION COMPLETED" : result.status === "FAILED" ? "MISSION FAILED" : "ATTEMPT RECORD";
  const prize = result.prizeClaimed ? "Prize claimed" : result.prizeEligible ? "Prize eligible" : "Not eligible for prize";

  // Overlay the same public fields in the existing PDF artwork's value boxes.
  function field(text: string, left: number, top: number, width: number, height: number, fontSize: number, color = "white", bold = false) {
    return <div style={{ position: "absolute", left, top, width, height, display: "flex", alignItems: "center", justifyContent: "center", background: "black", color, fontSize: Math.min(fontSize, (width - 16) / Math.max(1, text.length * 0.7)), fontWeight: bold ? 700 : 400, whiteSpace: "nowrap" }}>{text}</div>;
  }

  return new ImageResponse(
    <div style={{ width: 1254, height: 1254, display: "flex", position: "relative", background: "black" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${template.toString("base64")}`} width={1254} height={1254} alt="" />
      {result.status !== "COMPLETED" && field(title, 225, 420, 810, 79, 70, "white", true)}
      {field(result.participantName.toUpperCase(), 342, 568, 570, 65, 48, "white", true)}
      {field(`Batch ${result.participantBatch}`, 549, 653, 156, 37, 30, "#bebebe")}
      {field("TIME", 580, 711, 94, 25, 18, "#bebebe")}
      {field(formatTime(result.completionTimeMs), 542, 754, 259, 84, 84, "#efff00", true)}
      {field("RANK", 580, 877, 94, 25, 18, "#bebebe")}
      {field(result.rank ? `#${result.rank}` : "-", 609, 923, 112, 74, 76, "white", true)}
      {field(prize, 578, 1032, 144, 31, 22)}
      {field("NITER COMPUTER CLUB | ORIENTATION 2026", 340, 1140, 574, 30, 20, "#bebebe")}
    </div>,
    { width: 1254, height: 1254, headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } }
  );
}
