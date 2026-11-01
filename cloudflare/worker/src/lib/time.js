// Time helpers shared by stores. Formats match the Python backend.
import { KST_OFFSET_MS } from "../config.js";

// datetime.now(timezone.utc).replace(microsecond=0).isoformat() -> "2026-10-27T09:00:00+00:00"
export function nowIsoUtc(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

// Calendar day in Korea time, "YYYY-MM-DD" (backend usage/store.py today_kst).
export function todayKst(date = new Date()) {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
