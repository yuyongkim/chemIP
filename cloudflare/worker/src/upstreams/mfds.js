// MFDS drug clients (data.go.kr 1471000). Port of backend/api/mfds_client.py.
import { SECRETS, UPSTREAMS, intSetting } from "../config.js";
import { errorMessage } from "../lib/adapter.js";
import { fetchWithTimeout, withParams } from "../lib/upstream.js";

const HEAVY_SUFFIX = "_DOC_DATA";

function normalizeItems(raw) {
  let items = raw;
  if (items && typeof items === "object" && !Array.isArray(items) && "item" in items) items = items.item;
  if (items && typeof items === "object" && !Array.isArray(items)) items = [items];
  if (!Array.isArray(items)) return [];
  return items.filter((it) => it && typeof it === "object" && !Array.isArray(it));
}

const slim = (items) => items.map((it) => Object.fromEntries(Object.entries(it).filter(([k]) => !k.endsWith(HEAVY_SUFFIX))));

async function getJson(env, url) {
  const res = await fetchWithTimeout(url, {}, intSetting(env, "UPSTREAM_TIMEOUT_MS"));
  if (!res.ok) throw new Error(`${res.status} Error for url: ${new URL(url).pathname}`);
  return res.json();
}

const key = (env) => String(env[SECRETS.DRUG] || "");

export async function searchApproval(env, { itemName, page = 1, numOfRows = 10 }) {
  const params = { serviceKey: key(env), item_name: itemName, numOfRows: Math.max(1, Math.min(numOfRows, 100)), pageNo: Math.max(1, page), type: "json" };
  let firstEmpty = null;
  const errors = [];
  for (const url of UPSTREAMS.MFDS_APPROVAL) {
    try {
      const payload = await getJson(env, withParams(url, params));
      const header = payload?.header || {};
      if (header && Object.keys(header).length && String(header.resultCode ?? "00") !== "00") {
        throw new Error(`resultCode ${header.resultCode}: ${header.resultMsg || ""}`);
      }
      const body = payload?.body || {};
      const items = slim(normalizeItems(body.items || []));
      const result = { status: "success", total: body.totalCount || 0, items, route: url.split("/").slice(-2)[0] };
      if (items.length) return result;
      firstEmpty = firstEmpty || result;
    } catch (e) {
      errors.push(`${url.split("/").pop()}: ${errorMessage(e)}`.slice(0, 200));
    }
  }
  if (firstEmpty) return firstEmpty;
  return { status: "error", message: errors.join("; ") || "no MFDS route", total: 0, items: [] };
}

export async function searchEasyInfo(env, { itemName, page = 1, numOfRows = 10 }) {
  const params = { serviceKey: key(env), itemName, numOfRows: Math.max(1, Math.min(numOfRows, 100)), pageNo: Math.max(1, page), type: "json" };
  try {
    const payload = await getJson(env, withParams(UPSTREAMS.MFDS_EASY_INFO, params));
    const body = payload?.body || {};
    return { status: "success", total: body.totalCount || 0, items: normalizeItems(body.items || []) };
  } catch (e) {
    return { status: "error", message: errorMessage(e), total: 0, items: [] };
  }
}
