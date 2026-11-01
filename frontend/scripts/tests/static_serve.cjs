// Tiny static file server for local checks (no proxy, no /api).
//   node static_serve.cjs --root <dir> --port <n> [--prefix /chemip] [--cors] [--pilot-shim]
// --pilot-shim serves the pilot out/ folder under the CONTRACT v1 paths (pilot_contract_shim.cjs), version-less.
// --cors adds Access-Control-Allow-Origin: * (the static data lives on another origin, like Cloudflare R2/Pages).
// A file whose bytes start with the gzip magic is sent with Content-Encoding: gzip (how R2 objects would be served).
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { resolvePilot } = require("./pilot_contract_shim.cjs");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const ROOT = path.resolve(arg("--root", "."));
const PORT = Number(arg("--port", 0));
const PREFIX = arg("--prefix", "").replace(/\/+$/, "");
const CORS = process.argv.includes("--cors");
const PILOT_SHIM = process.argv.includes("--pilot-shim");
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".jsx": "text/babel; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".svg": "image/svg+xml", ".csv": "text/csv; charset=utf-8", ".woff2": "font/woff2",
};

const server = http.createServer((req, res) => {
  const headers = CORS ? { "Access-Control-Allow-Origin": "*" } : {};
  if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }
  const url = new URL(req.url, "http://x");
  let rel = decodeURIComponent(url.pathname);
  if (PREFIX) {
    if (!rel.startsWith(`${PREFIX}/`)) { res.writeHead(404, headers); res.end("not found"); return; }
    rel = rel.slice(PREFIX.length);
  }
  if (PILOT_SHIM) {
    const shimmed = resolvePilot(ROOT, rel.replace(/^\/+/, ""));
    if (!shimmed) { res.writeHead(404, headers); res.end("not found"); return; }
    res.writeHead(200, { ...headers, "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
    res.end(shimmed);
    return;
  }
  const file = path.join(ROOT,path.normalize(rel).replace(/^([/\\])+/, ""));
  if (!file.startsWith(ROOT)) { res.writeHead(403, headers); res.end(); return; }
  let target = file;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  if (!fs.existsSync(target)) { res.writeHead(404, headers); res.end("not found"); return; }
  const body = fs.readFileSync(target);
  const h = { ...headers, "Content-Type": TYPES[path.extname(target)] || "application/octet-stream", "Cache-Control": "no-store" };
  if (body[0] === 0x1f && body[1] === 0x8b) h["Content-Encoding"] = "gzip";
  res.writeHead(200, h);
  res.end(body);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`serving ${ROOT} at http://127.0.0.1:${server.address().port}${PREFIX}/`);
});
