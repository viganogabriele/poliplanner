/**
 * Misura il peso del primo caricamento di /piano e i tempi di risposta locali.
 *
 * Uso: avvia il server di produzione, poi `node src/scripts/measure-piano.mjs [baseUrl] [path]`.
 * Non tocca il database: fa solo richieste HTTP di lettura.
 */

import { performance } from "node:perf_hooks";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3000";
const routePath = process.argv[3] ?? "/piano";

async function timedGet(url) {
  const started = performance.now();
  const response = await fetch(url);
  const body = await response.text();
  return { ms: performance.now() - started, status: response.status, body };
}

/**
 * Distingue ciò che il browser scarica davvero al primo caricamento (tag `script` e
 * `link rel=preload`) da ciò che compare solo nel payload RSC come chunk di un componente
 * client: quest'ultimo viene richiesto solo quando il componente entra in idratazione,
 * quindi contarlo nel "primo caricamento" sovrastimerebbe il peso.
 */
function scriptUrls(html) {
  const eager = new Set();
  for (const match of html.matchAll(/<script[^>]+src="([^"]+)"/g)) eager.add(match[1]);
  for (const match of html.matchAll(/<link[^>]+rel="preload"[^>]+(?:as="script")?[^>]*href="([^"]+\.js)"/g)) eager.add(match[1]);
  for (const match of html.matchAll(/<link[^>]+href="([^"]+\.js)"[^>]+as="script"/g)) eager.add(match[1]);

  const referenced = new Set();
  for (const match of html.matchAll(/"(\/_next\/static\/chunks\/[^"\\]+\.js)"/g)) {
    if (!eager.has(match[1])) referenced.add(match[1]);
  }
  return {
    eager: [...eager].filter((url) => url.endsWith(".js")),
    referenced: [...referenced],
  };
}

/**
 * Next/Turbopack registra ogni `next/dynamic` nel react-loadable manifest della route. Il payload
 * HTML non contiene necessariamente questi URL (sono caricati soltanto quando il pannello si
 * apre), perciò ricavarli dal manifest è l'unico modo affidabile per non riportare `lazyAssets: 0`.
 */
function lazyUrlsFromBuildManifest(route) {
  const appRoot = path.join(process.cwd(), ".next", "server", "app");
  if (!existsSync(appRoot)) return [];
  const routeParts = route.split("?")[0].split("/").filter(Boolean);
  const manifests = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name === "react-loadable-manifest.json") manifests.push(file);
    }
  };
  visit(appRoot);
  const matching = manifests.filter((file) => routeParts.every((part) => file.includes(path.sep + part + path.sep)));
  const selected = matching.length > 0 ? matching : manifests;
  const urls = new Set();
  for (const manifest of selected) {
    const entries = JSON.parse(readFileSync(manifest, "utf8"));
    for (const entry of Object.values(entries)) {
      for (const file of entry.files ?? []) {
        if (typeof file === "string" && file.endsWith(".js")) urls.add(`/_next/${file.replace(/^\//, "")}`);
      }
    }
  }
  return [...urls];
}

async function weigh(baseUrl, urls) {
  let total = 0;
  let gzipTotal = 0;
  const rows = [];
  for (const url of urls) {
    const absolute = url.startsWith("http") ? url : `${baseUrl}${url}`;
    const response = await fetch(absolute);
    if (!response.ok) continue;
    const buffer = Buffer.from(await response.arrayBuffer());
    total += buffer.byteLength;
    gzipTotal += gzipSync(buffer).byteLength;
    rows.push({ url, kb: +(buffer.byteLength / 1024).toFixed(1), gzipKb: +(gzipSync(buffer).byteLength / 1024).toFixed(1) });
  }
  rows.sort((a, b) => b.kb - a.kb);
  return { rows, kb: +(total / 1024).toFixed(1), gzipKb: +(gzipTotal / 1024).toFixed(1) };
}

const cold = await timedGet(`${baseUrl}${routePath}`);
const warm1 = await timedGet(`${baseUrl}${routePath}`);
const warm2 = await timedGet(`${baseUrl}${routePath}`);
const warm3 = await timedGet(`${baseUrl}${routePath}`);

const urls = scriptUrls(cold.body);
const eager = await weigh(baseUrl, urls.eager);
const lazyCandidates = new Set([...urls.referenced, ...lazyUrlsFromBuildManifest(routePath)]);
for (const url of urls.eager) lazyCandidates.delete(url);
const lazy = await weigh(baseUrl, [...lazyCandidates]);
const warm = [warm1, warm2, warm3].map((item) => +item.ms.toFixed(0));

console.log(JSON.stringify({
  route: routePath,
  htmlStatus: cold.status,
  htmlKb: +(Buffer.byteLength(cold.body) / 1024).toFixed(1),
  eagerAssets: eager.rows.length,
  eagerKbUncompressed: eager.kb,
  eagerKbGzip: eager.gzipKb,
  lazyAssets: lazy.rows.length,
  lazyKbUncompressed: lazy.kb,
  lazyManifestAssets: lazyCandidates.size,
  totalKbUncompressed: +(eager.kb + lazy.kb).toFixed(1),
  coldMs: +cold.ms.toFixed(0),
  warmMs: warm,
  warmAvgMs: +(warm.reduce((a, b) => a + b, 0) / warm.length).toFixed(0),
  eagerAssetList: eager.rows,
  lazyAssetList: lazy.rows,
}, null, 2));
