// fetch() with a timeout. Never throws for HTTP status; throws only on network error / timeout.

export class UpstreamTimeout extends Error {}

export async function fetchWithTimeout(url, init = {}, ms = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e && e.name === "AbortError") throw new UpstreamTimeout(`timeout after ${ms}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function withParams(base, params) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export function tryParseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}
