import type { NextConfig } from "next";

// Baseline security headers applied to every response. These are safe,
// widely-compatible defaults; a Content-Security-Policy is intentionally left
// out here because it needs testing against Next's inline bootstrap scripts and
// is tracked as a follow-up (add as report-only first).
const SECURITY_HEADERS = [
  // Force HTTPS for two years, including subdomains (ignored over plain http).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Don't let browsers MIME-sniff responses into a different content type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking protection — the app is never meant to be framed elsewhere.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send only the origin on cross-origin navigations; full URL stays same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful features the app doesn't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // sharp is a native module — keep it external to the server bundle.
  serverExternalPackages: ["sharp"],
  // The summary image route reads master PNGs from /assets at runtime; make sure
  // they're traced into the serverless function bundle on deploy.
  outputFileTracingIncludes: {
    "/learn/summary/[topicId]/image": [
      "./assets/summaries/**/*",
      "./assets/fonts/**/*",
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
