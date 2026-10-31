import { readFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";
import { getEntitlement } from "@/lib/entitlements";
import { summaryFileForTopic } from "@/lib/summaries";
import { coarseDevice } from "@/lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEET_BG = "#f3f4fb"; // matches the summary sheet background
// Footer proportions at the sheet's base width of 1000px; scaled up for the 2x
// masters at render time.
const BASE_W = 1000;
const FOOTER_H = 74;

// Make the bundled DejaVu font available to sharp/librsvg. Hosts like Vercel
// have NO system fonts, so without this the footer text renders as empty boxes.
// Restricting fontconfig to just our font dir means the footer always uses the
// same font everywhere. Runs once at module load, before any render.
(() => {
  try {
    const fontDir = path.join(process.cwd(), "assets", "fonts");
    const conf = path.join(os.tmpdir(), "atlas-fonts.conf");
    writeFileSync(
      conf,
      `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fontDir}</dir><cachedir>${path.join(
        os.tmpdir(),
        "atlas-fc-cache"
      )}</cachedir></fontconfig>`
    );
    process.env.FONTCONFIG_FILE = conf;
  } catch {
    /* fall back to system fonts */
  }
})();

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Per-student delivery of a topic summary sheet. The master PNG never leaves
 * the server un-marked: this route checks Pro access, stamps the viewer's email
 * and the date into a footer, records the view, and returns a no-store PNG.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;
  const file = summaryFileForTopic(topicId);
  if (!file) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in required", { status: 401 });

  const ent = await getEntitlement();
  if (!ent.isPro) return new Response("Pro required", { status: 403 });

  let base: Buffer;
  try {
    base = await readFile(path.join(process.cwd(), "assets", "summaries", file));
  } catch {
    return new Response("Summary unavailable", { status: 404 });
  }

  const meta = await sharp(base).metadata();
  const w = meta.width ?? 1000;
  const h = meta.height ?? 1400;

  const email = user.email ?? `account ${user.id.slice(0, 8)}`;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const year = new Date().getFullYear();
  const line1 = `© ${year} Atlas · G3 Biology — personal study use only. Not to be copied, resold or redistributed.`;
  const line2 = `Licensed to ${email} · viewed ${today}`;

  // Scale the footer to the master's resolution (masters are 2x, so ~2).
  const scale = w / BASE_W;
  const footerH = Math.round(FOOTER_H * scale);
  const size1 = 15 * scale;
  const size2 = 14 * scale;
  const overlay = `<svg width="${w}" height="${h + footerH}" xmlns="http://www.w3.org/2000/svg">
  <text x="${w / 2}" y="${h + 30 * scale}" font-family="DejaVu Sans, sans-serif" font-size="${size1}" fill="#7a808c" text-anchor="middle">${esc(line1)}</text>
  <text x="${w / 2}" y="${h + 54 * scale}" font-family="DejaVu Sans, sans-serif" font-size="${size2}" fill="#9aa0ad" text-anchor="middle">${esc(line2)}</text>
</svg>`;

  const out = await sharp(base)
    .extend({ top: 0, bottom: footerH, left: 0, right: 0, background: SHEET_BG })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
    .png()
    .toBuffer();

  // Best-effort access log (works once migration 0025 is applied). Minimal by
  // design: account, topic, time, coarse device — no IP, no full user-agent.
  try {
    if (isServiceConfigured) {
      const svc = createServiceClient();
      await svc.from("summary_views").insert({
        user_id: user.id,
        topic_id: topicId,
        device: coarseDevice(_req.headers.get("user-agent")),
      });
      // Retention: occasionally drop rows older than 90 days so the log never
      // accumulates indefinitely (belt-and-braces with the optional pg_cron job).
      if (Math.random() < 0.02) {
        const cutoff = new Date(
          Date.now() - 90 * 24 * 60 * 60 * 1000
        ).toISOString();
        await svc.from("summary_views").delete().lt("viewed_at", cutoff);
      }
    }
  } catch {
    /* logging is best-effort; never block delivery */
  }

  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
