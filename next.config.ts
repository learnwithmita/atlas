import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native module — keep it external to the server bundle.
  serverExternalPackages: ["sharp"],
  // The summary image route reads master PNGs from /assets at runtime; make sure
  // they're traced into the serverless function bundle on deploy.
  outputFileTracingIncludes: {
    "/learn/summary/[topicId]/image": ["./assets/summaries/**/*"],
  },
};

export default nextConfig;
