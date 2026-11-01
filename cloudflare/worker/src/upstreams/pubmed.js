// PubMed E-utilities client (esearch + esummary). Port of backend/api/pubmed_client.py.
import { SECRETS, UPSTREAMS, intSetting } from "../config.js";
import { errorMessage } from "../lib/adapter.js";
import { fetchWithTimeout, withParams } from "../lib/upstream.js";

function baseParams(env) {
  const p = { db: "pubmed", retmode: "json" };
  const key = String(env[SECRETS.PUBMED] || "");
  if (key) p.api_key = key;
  return p;
}

async function getJson(env, url) {
  const res = await fetchWithTimeout(url, {}, intSetting(env, "UPSTREAM_TIMEOUT_MS"));
  if (!res.ok) throw new Error(`${res.status} Error from PubMed`);
  return res.json();
}

export async function search(env, { term, retmax = 10 }) {
  try {
    const sp = await getJson(env, withParams(UPSTREAMS.PUBMED_ESEARCH, { ...baseParams(env), term, retmax: Math.max(1, Math.min(retmax, 100)) }));
    const sr = sp.esearchresult || {};
    const ids = sr.idlist || [];
    if (!ids.length) return { status: "success", count: 0, ids: [], articles: [] };
    const summary = (await getJson(env, withParams(UPSTREAMS.PUBMED_ESUMMARY, { ...baseParams(env), id: ids.join(",") }))).result || {};
    const articles = [];
    for (const pmid of ids) {
      const row = summary[String(pmid)];
      if (row && Object.keys(row).length) {
        articles.push({
          pmid: row.uid ?? String(pmid),
          title: row.title ?? "",
          pubdate: row.pubdate ?? "",
          source: row.source ?? "",
          authors: (row.authors || []).map((a) => a.name).filter(Boolean),
        });
      }
    }
    const count = parseInt(sr.count ?? ids.length, 10);
    return { status: "success", count: Number.isFinite(count) ? count : ids.length, ids, articles };
  } catch (e) {
    return { status: "error", message: errorMessage(e), count: 0, ids: [], articles: [] };
  }
}
