import { headers } from "next/headers";

/**
 * Best-effort site origin (scheme + host) from proxy headers, for building
 * absolute redirect/callback URLs. Server-only.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * A coarse, non-identifying device label (e.g. "Chrome · iOS") from a
 * user-agent string — enough to distinguish sessions without storing the full
 * user-agent or any IP.
 */
export function coarseDevice(ua: string | null): string | null {
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
