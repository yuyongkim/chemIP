// GET /diag — egress reachability check from Cloudflare to each upstream (status + latency only).
// Requests carry NO API keys (data.go.kr/NAVER/Anthropic answer 401/4xx, which still proves reachability).
// Enabled only when env DIAG_ENABLED="true" (the test deployment); otherwise 404.
import { UPSTREAMS, setting } from "../config.js";
import { json } from "../lib/http.js";
import { fetchWithTimeout } from "../lib/upstream.js";

const TIMEOUT_MS = 8000;

function targets(env) {
  const list = [
    ["KOTRA market news (data.go.kr)", `${UPSTREAMS.KOTRA_MARKET_NEWS}?type=json&numOfRows=1&pageNo=1`],
    ["KOTRA import restriction (data.go.kr)", `${UPSTREAMS.KOTRA_IMPORT_RESTRICTION}?type=json&numOfRows=1&pageNo=1`],
    ["MFDS easy drug info (data.go.kr)", `${UPSTREAMS.MFDS_EASY_INFO}?type=json&numOfRows=1&pageNo=1`],
    ["MFDS approval 08 (data.go.kr)", `${UPSTREAMS.MFDS_APPROVAL[0]}?type=json&numOfRows=1&pageNo=1`],
    ["KOSHA MSDS (msds.kosha.or.kr)", "https://msds.kosha.or.kr/openapi/service/msdschem/chemlist?searchWrd=benzene&searchCnd=0&numOfRows=1&pageNo=1"],
    ["KOSHA MSDS fallback (data.go.kr)", "https://apis.data.go.kr/B552468/msdschem/getChemList?searchWrd=benzene&searchCnd=0&numOfRows=1&pageNo=1"],
    ["openFDA drug label", `${UPSTREAMS.OPENFDA_LABEL}?search=${encodeURIComponent('openfda.generic_name:"aspirin"')}&limit=1`],
    ["PubMed esearch", `${UPSTREAMS.PUBMED_ESEARCH}?db=pubmed&retmode=json&term=benzene&retmax=1`],
    ["NAVER news search", `${UPSTREAMS.NAVER_NEWS}?query=test&display=1`],
    ["Anthropic API", "https://api.anthropic.com/v1/models"],
  ];
  const origin = String(setting(env, "ORIGIN") || "").replace(/\/+$/, "");
  if (origin) list.push(["ORIGIN /api/feedback/meta (home PC tunnel)", `${origin}/api/feedback/meta`]);
  const sb = String(setting(env, "STATIC_BASE") || "").replace(/\/+$/, "");
  if (sb) list.push(["STATIC_BASE", `${sb}/`]);
  return list;
}

async function probe([name, url]) {
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(url, { headers: { "user-agent": "chemip-api-diag/1" } }, TIMEOUT_MS);
    const text = await res.text();
    return {
      name,
      host: new URL(url).host,
      reachable: true,
      status: res.status,
      latency_ms: Date.now() - started,
      content_type: res.headers.get("content-type") || "",
      body_head: text.slice(0, 160).replace(/\s+/g, " "),
    };
  } catch (e) {
    return { name, host: new URL(url).host, reachable: false, status: null, latency_ms: Date.now() - started, error: String(e && e.message ? e.message : e).slice(0, 160) };
  }
}

async function diag({ request, env }) {
  if (String(env.DIAG_ENABLED || "").toLowerCase() !== "true") return json({ detail: "Not Found" }, 404);
  const results = await Promise.all(targets(env).map(probe));
  return json({
    colo: request.cf?.colo || null,
    country: request.cf?.country || null,
    timeout_ms: TIMEOUT_MS,
    note: "No API keys are sent. 4xx from a keyed API still means the host is reachable; 'reachable:false' = network/TLS/timeout failure.",
    results,
  });
}

export const routes = [{ method: "GET", path: "/diag", handler: diag }];
