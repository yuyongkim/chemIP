// /api/trade — KOTRA and NAVER live proxies, same shapes as backend/api/routes/trade.py.
// Tourism routes (/tourism-kr, /tourism-en) are not used by the frontend and fall through to ORIGIN.
import { json } from "../lib/http.js";
import { toResponse } from "../lib/adapter.js";
import { intQuery, strQuery } from "../lib/query.js";
import * as kotra from "../upstreams/kotra.js";
import { naverBlock, searchNews } from "../upstreams/naver.js";

const page = (url) => intQuery(url, "page", 1, { ge: 1 });
const limit = (url, le = 50) => intQuery(url, "limit", 10, { ge: 1, le });

async function news({ env, url }) {
  const q = strQuery(url, "q", "", { required: true });
  const country = strQuery(url, "country", "");
  const p = page(url);
  const l = limit(url);
  const result = await kotra.marketNews(env, { keyword: q, country, pageNo: p, numOfRows: l });
  if (result.status === "success") return toResponse(result);
  // KOTRA unavailable: empty KOTRA list plus a separate NAVER block (never merged into `data`).
  const naver = await searchNews(env, { keyword: q, start: (p - 1) * l + 1, display: l, sort: "date" });
  return json({ status: "success", data: [], total: 0, fallback: "naver-news", upstream_error: result.message ?? null, naver: naverBlock(naver) });
}

async function overseasNews({ env, url }) {
  const q = strQuery(url, "q", "");
  const country = strQuery(url, "country", "");
  return toResponse(await kotra.marketNews(env, { keyword: q, country, pageNo: page(url), numOfRows: limit(url) }));
}

async function nationalInfo({ env, url }) {
  const code = strQuery(url, "country_code", "", { required: true });
  return toResponse(await kotra.nationalInfo(env, { isoCountryCode: code, pageNo: page(url), numOfRows: limit(url) }));
}

async function importRegulations({ env, url }) {
  const countryCode = strQuery(url, "country_code", "");
  const keyword = strQuery(url, "keyword", "");
  return toResponse(await kotra.importRestrictions(env, { keyword, countryCode, pageNo: page(url), numOfRows: limit(url) }));
}

async function enterpriseSuccess({ env, url }) {
  const keyword = strQuery(url, "keyword", "");
  const country = strQuery(url, "country", "");
  return toResponse(await kotra.enterpriseSuccess(env, { keyword, country, pageNo: page(url), numOfRows: limit(url) }));
}

async function strategy({ env, url }) {
  return toResponse(await kotra.entryStrategy(env, { country: strQuery(url, "country", ""), pageNo: page(url), numOfRows: limit(url) }));
}

async function prices({ env, url }) {
  return toResponse(await kotra.priceInfo(env, { country: strQuery(url, "country", ""), pageNo: page(url), numOfRows: limit(url) }));
}

async function fraud({ env, url }) {
  return toResponse(await kotra.fraudCases(env, { pageNo: page(url), numOfRows: limit(url) }));
}

async function naverNews({ env, url }) {
  const q = strQuery(url, "q", "", { required: true });
  const p = page(url);
  const l = limit(url, 30);
  return toResponse(await searchNews(env, { keyword: q, start: (p - 1) * l + 1, display: l, sort: "date" }));
}

export const routes = [
  { method: "GET", path: "/api/trade/news", handler: news },
  { method: "GET", path: "/api/trade/overseas-market-news", handler: overseasNews },
  { method: "GET", path: "/api/trade/national-info", handler: nationalInfo },
  { method: "GET", path: "/api/trade/import-regulations", handler: importRegulations },
  { method: "GET", path: "/api/trade/enterprise-success", handler: enterpriseSuccess },
  { method: "GET", path: "/api/trade/strategy", handler: strategy },
  { method: "GET", path: "/api/trade/prices", handler: prices },
  { method: "GET", path: "/api/trade/fraud", handler: fraud },
  { method: "GET", path: "/api/trade/naver-news", handler: naverNews },
];
