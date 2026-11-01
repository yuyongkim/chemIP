// Anonymous client key: SHA-256(daily random salt + CF-Connecting-IP). The salt is random per KST day,
// kept in D1 only for that day and deleted afterwards, so stored hashes cannot be reversed or linked
// across days. The IP itself is never stored or logged.
import { todayKst } from "./time.js";

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function dailySalt(db, day) {
  const fresh = hex(crypto.getRandomValues(new Uint8Array(16)));
  await db.prepare("INSERT OR IGNORE INTO daily_salt (day, salt) VALUES (?, ?)").bind(day, fresh).run();
  const row = await db.prepare("SELECT salt FROM daily_salt WHERE day = ?").bind(day).first();
  return row ? row.salt : fresh;
}

export function clientIp(request) {
  return (request.headers.get("cf-connecting-ip") || "").trim() || "unknown";
}

export async function clientHash(request, env, day = todayKst()) {
  const salt = await dailySalt(env.DB, day);
  const data = new TextEncoder().encode(`${salt}|${clientIp(request)}`);
  return hex(await crypto.subtle.digest("SHA-256", data));
}

export async function purgeOldSalts(db, day = todayKst()) {
  await db.prepare("DELETE FROM daily_salt WHERE day < ?").bind(day).run();
}
