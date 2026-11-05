// Liefert die gebaute App aus und leitet /api an das Backend weiter. Keine Abhängigkeiten.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.WEB_ROOT ?? "dist");
const API = new URL(process.env.API_URL ?? "http://localhost:8787");
const PORT = Number(process.env.PORT ?? 8080);
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json", ".woff2": "font/woff2" };

function weiterleiten(req, res) {
  const p = http.request({ hostname: API.hostname, port: API.port || 80, path: req.url, method: req.method, headers: { ...req.headers, host: API.host } }, (r) => {
    res.writeHead(r.statusCode ?? 502, r.headers);
    r.pipe(res);
  });
  p.on("error", () => { res.writeHead(502, { "content-type": "application/json" }); res.end('{"fehler":"Backend nicht erreichbar"}'); });
  req.pipe(p);
}

function datei(req, res) {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let f = path.join(ROOT, url);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(ROOT, "index.html");
  const ext = path.extname(f);
  res.writeHead(200, {
    "content-type": TYPEN[ext] ?? "application/octet-stream",
    "cache-control": url.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  });
  fs.createReadStream(f).pipe(res);
}

http.createServer((req, res) => (req.url?.startsWith("/api") ? weiterleiten(req, res) : datei(req, res)))
  .listen(PORT, () => console.log(`Frontend auf http://localhost:${PORT}, API: ${API.origin}`));
