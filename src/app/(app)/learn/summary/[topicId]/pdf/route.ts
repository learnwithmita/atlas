import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";
import { getEntitlement } from "@/lib/entitlements";
import { summaryPdfPagesForTopic } from "@/lib/summaries";
import { coarseDevice } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A4 in PDF points (72pt per inch).
const A4_W = 595.28;
const A4_H = 841.89;

/**
 * Per-student download of a topic summary as a multi-page A4 PDF. Each page
 * master lives server-only in /assets/summaries; this route checks Pro access,
 * draws the viewer's email and the date into each page's bottom margin, records
 * the download, and returns a no-store PDF. Kept separate from the image route
 * so the in-app view stays a single image while the download prints cleanly.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  const pages = summaryPdfPagesForTopic(topicId);
  if (!pages || pages.length === 0)
    return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in required", { status: 401 });

  const ent = await getEntitlement();
  if (!ent.isPro) return new Response("Pro required", { status: 403 });

  let masters: Buffer[];
  try {
    masters = await Promise.all(
      pages.map((f) =>
        readFile(path.join(process.cwd(), "assets", "summaries", f))
      )
    );
  } catch {
    return new Response("Summary unavailable", { status: 404 });
  }

  const email = user.email ?? `account ${user.id.slice(0, 8)}`;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const year = new Date().getFullYear();
  // Helvetica (WinAnsi) cannot encode an em dash, so the footer uses middots.
  const line1 = `© ${year} Atlas · G3 Biology · personal study use only. Not to be copied, resold or redistributed.`;
  const line2 = `Licensed to ${email} · viewed ${today}`;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const SIZE1 = 7.5;
  const SIZE2 = 7;
  const ink = rgb(0.48, 0.5, 0.55);

  for (const master of masters) {
    const img = await pdf.embedPng(master);
    const page = pdf.addPage([A4_W, A4_H]);
    // Fill the A4 page with the sheet; the sheet is drawn at the A4 aspect
    // ratio so nothing is stretched, and its own bottom margin holds the text.
    page.drawImage(img, { x: 0, y: 0, width: A4_W, height: A4_H });
    for (const [text, size, y] of [
      [line1, SIZE1, 22],
      [line2, SIZE2, 11],
    ] as const) {
      const tw = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: (A4_W - tw) / 2,
        y,
        size,
        font,
        color: ink,
      });
    }
  }

  const bytes = await pdf.save();

  // Best-effort access log (shares the summary_views table with the image
  // route). Minimal by design: account, topic, time, coarse device.
  try {
    if (isServiceConfigured) {
      const svc = createServiceClient();
      await svc.from("summary_views").insert({
        user_id: user.id,
        topic_id: topicId,
        device: coarseDevice(req.headers.get("user-agent")),
      });
    }
  } catch {
    /* logging is best-effort; never block delivery */
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="summary.pdf"',
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
