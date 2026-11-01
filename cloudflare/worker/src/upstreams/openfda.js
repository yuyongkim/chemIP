// OpenFDA drug label client. Port of backend/api/fda_client.py.
import { UPSTREAMS, intSetting } from "../config.js";
import { errorMessage } from "../lib/adapter.js";
import { fetchWithTimeout, withParams } from "../lib/upstream.js";

export async function searchLabels(env, { searchQuery, limit = 10, skip = 0 }) {
  const url = withParams(UPSTREAMS.OPENFDA_LABEL, { search: searchQuery, limit: Math.max(1, Math.min(limit, 100)), skip: Math.max(0, skip) });
  try {
    const res = await fetchWithTimeout(url, {}, intSetting(env, "UPSTREAM_TIMEOUT_MS"));
    if (!res.ok) throw new Error(`${res.status} Error for url: ${UPSTREAMS.OPENFDA_LABEL}`);
    const payload = await res.json();
    return { status: "success", meta: payload.meta || {}, results: payload.results || [] };
  } catch (e) {
    return { status: "error", message: errorMessage(e), meta: {}, results: [] };
  }
}

export function openfdaTotal(meta, fallback) {
  const total = meta && typeof meta === "object" ? meta.results?.total : undefined;
  const n = parseInt(total ?? fallback, 10);
  return Number.isFinite(n) ? n : fallback;
}
