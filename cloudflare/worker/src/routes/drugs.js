// /api/drugs — MFDS / OpenFDA / PubMed live proxies, same shapes as backend/api/routes/drugs.py.
import { json } from "../lib/http.js";
import { adapterError, toResponse } from "../lib/adapter.js";
import { intQuery, strQuery } from "../lib/query.js";
import { searchApproval, searchEasyInfo } from "../upstreams/mfds.js";
import { openfdaTotal, searchLabels } from "../upstreams/openfda.js";
import { search as pubmedSearch } from "../upstreams/pubmed.js";

const pageArgs = (url) => ({
  q: strQuery(url, "q", "", { required: true }),
  page: intQuery(url, "page", 1, { ge: 1 }),
  limit: intQuery(url, "limit", 10, { ge: 1, le: 50 }),
});

async function searchBoth({ env, url }) {
  const { q, page, limit } = pageArgs(url);
  const [approval, easy] = await Promise.all([
    searchApproval(env, { itemName: q, page, numOfRows: limit }),
    searchEasyInfo(env, { itemName: q, page, numOfRows: limit }),
  ]);
  const err = adapterError(approval) || adapterError(easy);
  if (err) return err;
  return json({
    query: q,
    approval: { total: approval.total || 0, items: approval.items || [] },
    easyInfo: { total: easy.total || 0, items: easy.items || [] },
  });
}

async function approval({ env, url }) {
  const { q, page, limit } = pageArgs(url);
  return toResponse(await searchApproval(env, { itemName: q, page, numOfRows: limit }));
}

async function easy({ env, url }) {
  const { q, page, limit } = pageArgs(url);
  return toResponse(await searchEasyInfo(env, { itemName: q, page, numOfRows: limit }));
}

async function openfda({ env, url }) {
  const q = strQuery(url, "q", "", { required: true, minLength: 1 });
  const limit = intQuery(url, "limit", 10, { ge: 1, le: 50 });
  const skip = intQuery(url, "skip", 0, { ge: 0 });
  const candidates = [`openfda.brand_name:"${q}"`, `openfda.generic_name:"${q}"`, `openfda.substance_name:"${q}"`];
  let final = null;
  let used = candidates[0];
  for (const c of candidates) {
    used = c;
    const r = await searchLabels(env, { searchQuery: c, limit, skip });
    final = r;
    if (r.status !== "success") continue;
    if (openfdaTotal(r.meta, (r.results || []).length) > 0) break;
  }
  const payload = final || { status: "error", message: "OpenFDA response is empty" };
  const err = adapterError(payload);
  if (err) return err;
  const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : {};
  const results = payload.results || [];
  return json({ query: q, query_used: used, total: openfdaTotal(meta, results.length), items: results, meta });
}

async function pubmed({ env, url }) {
  const q = strQuery(url, "q", "", { required: true, minLength: 1 });
  const limit = intQuery(url, "limit", 10, { ge: 1, le: 50 });
  const r = await pubmedSearch(env, { term: q, retmax: limit });
  const err = adapterError(r);
  if (err) return err;
  return json({ query: q, count: r.count || 0, ids: r.ids || [], articles: r.articles || [] });
}

async function unified({ env, url }) {
  const q = strQuery(url, "q", "", { required: true, minLength: 1 });
  const limit = intQuery(url, "limit", 20, { ge: 1, le: 100 });

  const mfds = async () => {
    const r = await searchEasyInfo(env, { itemName: q, numOfRows: Math.min(limit, 50) });
    return r.status === "success" ? { total: r.total || 0, items: r.items || [] } : { total: 0, items: [] };
  };
  const fda = async () => {
    const all = [];
    const seen = new Set();
    let total = 0;
    for (const field of ["substance_name", "generic_name", "brand_name"]) {
      const r = await searchLabels(env, { searchQuery: `openfda.${field}:"${q}"`, limit: Math.min(limit, 100) });
      if (r.status !== "success") continue;
      total = Math.max(total, openfdaTotal(r.meta, (r.results || []).length));
      for (const it of r.results || []) {
        const id = it.id || "";
        if (id && seen.has(id)) continue;
        seen.add(id);
        all.push(it);
      }
    }
    return { total, items: all };
  };
  const pm = async () => {
    const r = await pubmedSearch(env, { term: q, retmax: Math.min(limit, 50) });
    return r.status === "success" ? { count: r.count || 0, articles: r.articles || [] } : { count: 0, articles: [] };
  };
  const [m, f, p] = await Promise.all([mfds(), fda(), pm()]);
  return json({ query: q, mfds: m, openfda: f, pubmed: p });
}

export const routes = [
  { method: "GET", path: "/api/drugs/search", handler: searchBoth },
  { method: "GET", path: "/api/drugs/approval", handler: approval },
  { method: "GET", path: "/api/drugs/easy", handler: easy },
  { method: "GET", path: "/api/drugs/openfda", handler: openfda },
  { method: "GET", path: "/api/drugs/pubmed", handler: pubmed },
  { method: "GET", path: "/api/drugs/unified", handler: unified },
];
