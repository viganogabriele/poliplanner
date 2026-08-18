import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Radice esplicita del progetto. Senza questa, Turbopack la inferisce risalendo l'albero delle
  // directory e il tracciamento delle dipendenze del server può allargarsi fuori dal repository.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
  // Produce a minimal, self-contained Node.js server in `.next/standalone`.
  // This is what the production Docker image runs.
  output: "standalone",
  // Il database dell'utente e i suoi file WAL non sono dipendenze del build.
  outputFileTracingRoot: path.resolve(import.meta.dirname),
  outputFileTracingExcludes: {
    "*": ["./db/**/*", "db/**/*", "**/*.db", "**/*.db-wal", "**/*.db-shm"],
  },
  // Next 16.3/Turbopack traces only the CommonJS helpers from this transitive package under
  // pnpm; the standalone server also resolves the ESM helper files at runtime.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.pnpm/@swc+helpers@*/node_modules/@swc/helpers/**/*"],
  },

  // better-sqlite3 is a native Node.js module compiled to .node binary.
  // It must NOT be bundled by webpack — Next.js needs to require() it at
  // runtime instead of inlining it. This list tells Next.js to skip it.
  serverExternalPackages: ["better-sqlite3"],

  // Allow the preview tool (which connects from 127.0.0.1) to access
  // Next.js dev resources (HMR websocket, fonts, etc.).
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
