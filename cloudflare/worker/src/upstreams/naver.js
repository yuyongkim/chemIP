// NAVER news search client. Port of backend/api/naver_adapter.py.
// Terms (검색 API 2.1~2.4): fields passed through unmodified, every item labelled source="naver", and
// nothing is stored — the Worker keeps no cache of NAVER responses at all. AI routes never import this.
import { NAVER, SECRETS, UPSTREAMS, intSetting } from "../config.js";
import { errorMessage } from "../lib/adapter.js";
import { fetchWithTimeout, withParams } from "../lib/upstream.js";

const empty = (status, message) => ({ status, data: [], total: 0, message, source: NAVER.SOURCE, source_label: NAVER.SOURCE_LABEL });

export function toNaverItem(raw) {
  const item = {};
  for (const k of NAVER.PASS_THROUGH_FIELDS) item[k] = raw[k] ?? "";
  item.source = NAVER.SOURCE;
  item.source_label = NAVER.SOURCE_LABEL;
  return item;
}

export async function searchNews(env, { keyword, start = 1, display = 10, sort = "date" }) {
  const id = String(env[SECRETS.NAVER_ID] || "");
  const secret = String(env[SECRETS.NAVER_SECRET] || "");
  if (!id || !secret) return empty("disabled", "NAVER API key is not configured");
  const url = withParams(UPSTREAMS.NAVER_NEWS, {
    query: keyword,
    display: Math.max(1, Math.min(display, 100)),
    start: Math.max(1, start),
    sort: sort === "sim" || sort === "date" ? sort : "date",
  });
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret }, cf: { cacheTtl: 0, cacheEverything: false } },
      intSetting(env, "UPSTREAM_TIMEOUT_MS"),
    );
    if (res.status !== 200) return empty("error", `Naver API HTTP ${res.status}`);
    const data = await res.json();
    const items = data && Array.isArray(data.items) ? data.items : [];
    const mapped = items.filter((it) => it && typeof it === "object").map(toNaverItem);
    return {
      status: "success",
      data: mapped,
      total: data?.total ?? mapped.length,
      source: NAVER.SOURCE,
      source_label: NAVER.SOURCE_LABEL,
      provider_url: NAVER.PROVIDER_URL,
    };
  } catch (e) {
    return empty("error", errorMessage(e));
  }
}

// NAVER results as a self-contained, labelled block (never mixed with KOTRA). backend routes/trade.py naver_block.
export function naverBlock(result) {
  const ok = result.status === "success";
  return {
    source: NAVER.SOURCE,
    source_label: NAVER.SOURCE_LABEL,
    status: result.status,
    items: ok ? result.data || [] : [],
    total: ok ? result.total || 0 : 0,
    message: result.message ?? null,
  };
}
