/**
 * Avvia il server di produzione prodotto da `output: "standalone"`.
 *
 * `next start` non è compatibile con l'output standalone e lo dice con un warning a ogni avvio:
 * il server da eseguire è `.next/standalone/server.js`, lo stesso che usa l'immagine Docker.
 * Quel server però si aspetta accanto a sé gli asset statici e `public/`, che `next build` non
 * copia (in Docker li copia il Dockerfile). Questo script fa la stessa copia in locale, così
 * `pnpm start` esegue esattamente ciò che gira in produzione.
 */

import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const server = path.join(standalone, "server.js");

if (!existsSync(server)) {
  console.error("Build standalone assente: esegui prima `pnpm build`.");
  process.exit(1);
}

// Asset statici e file pubblici accanto al server, come fa il Dockerfile.
mkdirSync(path.join(standalone, ".next"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
}

// Il server standalone gira con cwd dentro `.next/standalone`: senza un percorso esplicito
// creerebbe un database nuovo lì dentro invece di usare quello del repository.
const env = { ...process.env };
env.POLIPLANNER_DB_PATH ??= path.join(root, "db", "lesson_tracker.db");

const child = spawn(process.execPath, [server], { cwd: standalone, env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
