import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a minimal, self-contained Node.js server in `.next/standalone`.
  // This is what the production Docker image runs.
  output: "standalone",

  // better-sqlite3 is a native Node.js module compiled to .node binary.
  // It must NOT be bundled by webpack — Next.js needs to require() it at
  // runtime instead of inlining it. This list tells Next.js to skip it.
  serverExternalPackages: ["better-sqlite3"],

  // Allow the preview tool (which connects from 127.0.0.1) to access
  // Next.js dev resources (HMR websocket, fonts, etc.).
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
