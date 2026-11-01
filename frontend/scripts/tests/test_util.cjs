// Shared helpers for the static-data tests: key-order-insensitive deep diff and a gentle live-API client.
"use strict";

const http = require("http");

// First differing path between two JSON values ("" = equal). Object key order is ignored, array order is not.
function firstDiff(a, b, at = "$") {
  if (a === b) return "";
  if (typeof a !== typeof b || a === null || b === null || Array.isArray(a) !== Array.isArray(b)) {
    return `${at}: ${short(a)} != ${short(b)}`;
  }
  if (typeof a !== "object") return Number.isNaN(a) && Number.isNaN(b) ? "" : `${at}: ${short(a)} != ${short(b)}`;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return `${at}.length: ${a.length} != ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${at}[${i}]`);
      if (d) return d;
    }
    return "";
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (!(k in a)) return `${at}.${k}: missing on left`;
    if (!(k in b)) return `${at}.${k}: missing on right`;
    const d = firstDiff(a[k], b[k], `${at}.${k}`);
    if (d) return d;
  }
  return "";
}

function short(v) {
  const s = JSON.stringify(v);
  return s === undefined ? String(v) : s.length > 120 ? `${s.slice(0, 117)}...` : s;
}

// Sequential GETs against the production API, at most `perSecond` request starts per second.
function makeLiveClient(base, perSecond = 2, userAgent = "chemip-static-frontend-test-bot/1") {
  const gap = 1000 / perSecond;
  let last = 0;
  let count = 0;
  async function get(pathAndQuery) {
    const wait = last + gap - Date.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    last = Date.now();
    count += 1;
    return new Promise((resolve, reject) => {
      const req = http.get(`${base}${pathAndQuery}`, { headers: { "User-Agent": userAgent }, timeout: 90000 }, res => {
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          try { resolve({ status: res.statusCode, data: JSON.parse(text) }); }
          catch (e) { resolve({ status: res.statusCode, data: null, text }); }
        });
      });
      req.on("timeout", () => req.destroy(new Error("timeout")));
      req.on("error", reject);
    });
  }
  return { get, count: () => count };
}

module.exports = { firstDiff, makeLiveClient };
