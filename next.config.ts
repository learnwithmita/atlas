import type { NextConfig } from "next";

// The Supabase project origin the browser talks to (REST + realtime + public
// storage). Derived from env so it isn't hard-coded.
const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();
const SUPABASE_HTTPS = SUPABASE_HOST ? `https://${SUPABASE_HOST}` : "";
const SUPABASE_WSS = SUPABASE_HOST ? `wss://${SUPABASE_HOST}` : "";

// Content-Security-Policy shipped in REPORT-ONLY mode first: browsers report
// violations (dev console) without blocking, so we can tune it against real
// traffic before enforcing. 'unsafe-inline' for scripts covers Next's inline
// bootstrap; a nonce-based enforcing policy is the planned follow-up.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${SUPABASE_HTTPS}`.trim(),
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  `connect-src 'self' ${SUPABASE_HTTPS} ${SUPABASE_WSS} https://api.stripe.com`.replace(/\s+/g, " ").trim(),
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
].join("; ");

// Baseline security headers applied to every response. These are safe,
// widely-compatible defaults.
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy-Report-Only",
    value: CSP_REPORT_ONLY,
  },
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
