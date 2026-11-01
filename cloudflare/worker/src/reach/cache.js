// REACH answer cache, two levels: the Cache API of the serving colo (fast, no cost; a no-op on workers.dev) and
// D1 table reach_cache (shared by all colos; migrations/0004_reach_cache.sql). Lifetimes: lookup.js reachTtl.
// Both are best-effort: any cache error is logged and treated as a miss, never as a failed request.
import { REACH } from "../config.js";
import { reachTtl } from "./lookup.js";

function cacheKey(cas) {
  return new Request(REACH.CACHE_KEY_BASE + encodeURIComponent(cas));
}

function edgeCache() {
  return typeof caches !== "undefined" && caches.default ? caches.default : null;
}

async function edgeGet(cas) {
  const c = edgeCache();
  if (!c) return null;
  const hit = await c.match(cacheKey(cas));
  return hit ? hit.json() : null;
}

async function edgePut(cas, answer, ttl) {
  const c = edgeCache();
  if (!c) return;
  const body = JSON.stringify(answer);
  await c.put(cacheKey(cas), new Response(body, { headers: { "content-type": "application/json", "cache-control": `public, max-age=${ttl}` } }));
}

async function dbGet(env, cas, nowSec) {
  if (!env || !env.DB) return null;
  const row = await env.DB.prepare("SELECT answer_json, expires_at FROM reach_cache WHERE cas = ?").bind(cas).first();
  if (!row || row.expires_at <= nowSec) return null;
  return { answer: JSON.parse(row.answer_json), left: row.expires_at - nowSec };
}

async function dbPut(env, cas, answer, ttl, nowSec) {
  if (!env || !env.DB) return;
  await env.DB.prepare("INSERT OR REPLACE INTO reach_cache (cas, status, answer_json, checked_at, expires_at) VALUES (?, ?, ?, ?, ?)")
    .bind(cas, answer.status, JSON.stringify(answer), nowSec, nowSec + ttl).run();
}

async function quiet(what, fn) {
  try {
    return await fn();
  } catch (e) {
    console.error(`reach cache ${what}: ${e && e.message}`);
    return null;
  }
}

// → { answer, level: "edge" | "d1" } or null
export async function reachCacheGet(env, cas, nowSec = Math.floor(Date.now() / 1000)) {
  const edge = await quiet("edge get", () => edgeGet(cas));
  if (edge) return { answer: edge, level: "edge" };
  const db = await quiet("d1 get", () => dbGet(env, cas, nowSec));
  if (!db) return null;
  await quiet("edge refill", () => edgePut(cas, db.answer, db.left)); // this colo keeps it for the rest of its lifetime
  return { answer: db.answer, level: "d1" };
}

export async function reachCachePut(env, cas, answer, nowSec = Math.floor(Date.now() / 1000)) {
  const ttl = reachTtl(answer);
  if (!ttl) return;
  await quiet("edge put", () => edgePut(cas, answer, ttl));
  await quiet("d1 put", () => dbPut(env, cas, answer, ttl, nowSec));
}
