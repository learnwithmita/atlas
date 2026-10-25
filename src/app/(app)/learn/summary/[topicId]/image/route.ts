import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/admin";
import { getEntitlement } from "@/lib/entitlements";
import { summaryFileForTopic } from "@/lib/summaries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SHEET_BG = "#f3f4fb"; // matches the summary sheet background
const FOOTER_H = 74;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A coarse, non-identifying device label (e.g. "Chrome · iOS") — enough to
 * distinguish sessions without storing the full user-agent or any IP. */
function coarseDevice(ua: string | null): string | null {
  if (!ua) return null;
  const os = /iphone|ipad|ipod/i.test(ua)
    ? "iOS"
    : /android/i.test(ua)
      ? "Android"
      : /windows/i.test(ua)
        ? "Windows"
        : /mac os x|macintosh/i.test(ua)
          ? "macOS"
          : /linux/i.test(ua)
            ? "Linux"
            : "other";
  // Order matters: Edge/Opera/Samsung UAs also contain "Chrome"; Chrome contains "Safari".
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /samsungbrowser/i.test(ua)
        ? "Samsung Internet"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /chrome|crios/i.test(ua)
            ? "Chrome"
            : /safari/i.test(ua)
              ? "Safari"
              : "other";
  return `${browser} · ${os}`;
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

  const overlay = `<svg width="${w}" height="${h + FOOTER_H}" xmlns="http://www.w3.org/2000/svg">
  <text x="${w / 2}" y="${h + 30}" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#7a808c" text-anchor="middle">${esc(line1)}</text>
  <text x="${w / 2}" y="${h + 54}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#9aa0ad" text-anchor="middle">${esc(line2)}</text>
</svg>`;

  const out = await sharp(base)
    .extend({ top: 0, bottom: FOOTER_H, left: 0, right: 0, background: SHEET_BG })
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
