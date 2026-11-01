// KOTRA (data.go.kr B410001) client. Port of backend/api/kotra_adapter.py (JSON responses; a non-JSON
// body such as the data.go.kr XML error envelope yields success with no items, as the backend's XML path does).
import { SECRETS, UPSTREAMS, intSetting } from "../config.js";
import { errorMessage } from "../lib/adapter.js";
import { htmlToText, normalizeText } from "../lib/text.js";
import { UpstreamTimeout, fetchWithTimeout, tryParseJson, withParams } from "../lib/upstream.js";

const empty = (message) => ({ status: "error", message, total: 0, data: [] });

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export function extractItems(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [[], 0];
  let items = [];
  let total = 0;
  const response = data.response !== undefined ? data.response : data;
  let body = data;
  if (response && typeof response === "object" && !Array.isArray(response)) {
    const header = response.header;
    if (header && typeof header === "object") {
      const code = String(header.resultCode ?? "");
      if (code && code !== "00") return [[], 0];
    }
    body = response.body !== undefined ? response.body : response;
  }
  if (body && typeof body === "object" && !Array.isArray(body)) {
    if (body.items && typeof body.items === "object" && !Array.isArray(body.items)) {
      if ("item" in body.items) items = body.items.item;
    } else if ("items" in body) items = body.items;
    else if ("itemList" in body) items = body.itemList;
    else if (Array.isArray(body.item)) items = body.item;
    else if (body.item && typeof body.item === "object") items = [body.item];

    if (typeof body.totalCount === "number" || typeof body.totalCount === "string") total = toInt(body.totalCount);
    if (typeof body.totalCnt === "number" || typeof body.totalCnt === "string") total = toInt(body.totalCnt);
  }
  if (items && typeof items === "object" && !Array.isArray(items)) items = items.item || [];
  if (items && typeof items === "object" && !Array.isArray(items)) items = [items];
  if (!Array.isArray(items)) items = [];
  return [items.map(normalizeText), total || items.length];
}

async function request(env, url, params) {
  const key = String(env[SECRETS.KOTRA] || "");
  if (!key) return empty("KOTRA API key is not configured");
  const full = withParams(url, { serviceKey: key, type: "json", ...params });
  try {
    const res = await fetchWithTimeout(full, {}, intSetting(env, "UPSTREAM_TIMEOUT_MS"));
    const s = res.status;
    if (s === 404) return empty(`404 Not Found: ${url}`);
    if (s === 500) return empty("500 Internal Server Error from upstream");
    if (s >= 500) return empty(`Server Error (${s})`);
    if (s !== 200) return empty(`HTTP ${s}`);
    const payload = normalizeText(tryParseJson(await res.text()) || {});
    const [items, total] = extractItems(payload);
    return { status: "success", total, data: items };
  } catch (e) {
    if (e instanceof UpstreamTimeout) return empty("Timeout while calling KOTRA API");
    return empty(`Request failed: ${errorMessage(e)}`);
  }
}

const g = (it, ...keys) => {
  for (const k of keys) if (it[k]) return it[k];
  return "";
};

const mapProductNews = (it) => ({
  newsTitl: g(it, "newsTitl", "sj", "title"),
  cntryNm: g(it, "cntryNm", "natNm"),
  newsWrtDt: g(it, "newsWrtDt", "regDt", "writedate"),
  kotraNewsUrl: g(it, "kotraNewsUrl", "newsUrl", "url"),
  newsBdt: g(it, "newsBdt", "cntntSumar", "summary"),
  cntntSumar: g(it, "cntntSumar", "summary"),
  source: it.source || "KOTRA",
});

const mapStrategy = (it) => ({
  title: g(it, "title", "newsTitl"),
  country: g(it, "country", "cntryNm", "natNm"),
  date: g(it, "date", "newsWrtDt", "regDt"),
  url: g(it, "url", "newsUrl", "kotraNewsUrl"),
  summary: g(it, "summary", "cntntSumar", "newsBdt"),
  source: it.source || "KOTRA",
});

const mapPrice = (it) => ({
  itemName: g(it, "itemName", "itemNm", "cmdltNm"),
  price: g(it, "price", "itemPrc"),
  unit: g(it, "unit", "untNm"),
  country: g(it, "country", "cntryNm", "natNm"),
  currency: g(it, "currency", "mnyUtNm"),
  category: g(it, "category", "ctgryNm"),
  date: g(it, "date", "regDt"),
  url: g(it, "url", "newsUrl"),
  source: it.source || "KOTRA",
});

function labeled(text, labels) {
  for (const label of labels) {
    const m = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:：]?\\s*([^\\n]+)`).exec(text);
    if (m) return m[1].trim();
  }
  return "";
}

const FRAUD_RULES = [
  ["비자/초청", ["비자", "초청장", "불법 체류"]],
  ["결제/송금", ["송금", "결제", "T/T", "입금"]],
  ["물류/선적", ["선적", "물류비", "운송", "배송"]],
  ["사칭/위장 바이어", ["사칭", "위장", "가짜", "악용"]],
];

function fraudCategory(text) {
  if (!text) return "";
  for (const [label, terms] of FRAUD_RULES) if (terms.some((t) => text.includes(t))) return label;
  return "기타";
}

function mapFraud(it) {
  const plain = htmlToText(g(it, "bdtCntnt", "cntntSumar", "content"));
  const country = it.cntryNm || labeled(plain, ["발생국가", "국가"]);
  const period = it.regDt || labeled(plain, ["발생시기", "시기"]);
  return {
    title: g(it, "title", "newsTitl") || "무역 사기 사례",
    content: g(it, "bdtCntnt", "cntntSumar"),
    plainText: plain,
    date: period,
    incidentPeriod: period,
    country,
    amount: labeled(plain, ["피해금액", "금액"]),
    category: it.ctgryNm || fraudCategory(plain),
    url: g(it, "kotraNewsUrl", "newsUrl", "url"),
    source: it.source || "KOTRA",
  };
}

const mapCountryInfo = (it) => ({
  countryCode: g(it, "isoWd2CntCd", "nat2CntCd"),
  countryName: g(it, "natnNm", "countryName"),
  title: g(it, "subject", "title"),
  summary: g(it, "overview", "content"),
  source: "KOTRA National Info",
});

const mapImportItem = (it) => ({
  hsCode: g(it, "hscd", "HSCD"),
  productName: g(it, "cmdltName", "productName"),
  regulation: g(it, "reglCn", "regulation"),
  country: g(it, "probeTgtNatName", "HQURT_NAME"),
  startDate: g(it, "regStrDe", "REGL_STR_DE"),
  endDate: g(it, "regEndDe", "REGL_END_DE"),
  source: "KOTRA Import Regulation",
});

const mapEnterpriseSuccess = (it) => ({
  title: g(it, "titl", "title"),
  country: g(it, "natnNm", "country"),
  summary: g(it, "cn", "summary"),
  industry: g(it, "indust", "industry"),
  company: g(it, "entpNm", "company"),
  date: g(it, "regDt", "date"),
  source: "KOTRA Enterprise Success",
});

function mapped(result, fn) {
  if (result.status === "success") result.data = result.data.map(fn);
  return result;
}

export async function marketNews(env, { keyword = "", country = "", industry = "", pageNo = 1, numOfRows = 10 }) {
  const r = await request(env, UPSTREAMS.KOTRA_MARKET_NEWS, { search1: country, search2: keyword, search5: industry, pageNo, numOfRows });
  return mapped(r, mapProductNews);
}

export async function entryStrategy(env, { country = "", pageNo = 1, numOfRows = 10 }) {
  return mapped(await request(env, UPSTREAMS.KOTRA_ENTRY_STRATEGY, { search1: country, pageNo, numOfRows }), mapStrategy);
}

export async function priceInfo(env, { country = "", pageNo = 1, numOfRows = 10 }) {
  return mapped(await request(env, UPSTREAMS.KOTRA_PRICE_INFO, { search1: country, pageNo, numOfRows }), mapPrice);
}

export async function fraudCases(env, { pageNo = 1, numOfRows = 10 }) {
  return mapped(await request(env, UPSTREAMS.KOTRA_FRAUD_CASE, { pageNo, numOfRows }), mapFraud);
}

export async function nationalInfo(env, { isoCountryCode, pageNo = 1, numOfRows = 10 }) {
  if (!isoCountryCode) return empty("iso_country_code required");
  return mapped(await request(env, UPSTREAMS.KOTRA_NATIONAL_INFO, { isoWd2CntCd: isoCountryCode, pageNo, numOfRows }), mapCountryInfo);
}

export async function importRestrictions(env, { keyword = "", countryCode = "", pageNo = 1, numOfRows = 10 }) {
  const params = { pageNo, numOfRows, search1: keyword, isoWd2CntCd: countryCode };
  return mapped(await request(env, UPSTREAMS.KOTRA_IMPORT_RESTRICTION, params), mapImportItem);
}

export async function enterpriseSuccess(env, { keyword = "", country = "", pageNo = 1, numOfRows = 10 }) {
  const params = { pageNo, numOfRows, search1: keyword, search2: country };
  return mapped(await request(env, UPSTREAMS.KOTRA_ENTERPRISE_SUCCESS, params), mapEnterpriseSuccess);
}
