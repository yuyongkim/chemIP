// /api/regulations/kotra/reach — KOTRA REACH Q&A search (backend/api/routes/regulations.py kotra_reach_qna).
// All other /api/regulations/* routes need backend data and fall through to ORIGIN.
import { toResponse } from "../lib/adapter.js";
import { intQuery, strQuery } from "../lib/query.js";
import { marketNews } from "../upstreams/kotra.js";

async function reach({ env, url }) {
  const q = strQuery(url, "q", "");
  const page = intQuery(url, "page", 1, { ge: 1 });
  const limit = intQuery(url, "limit", 10, { ge: 1, le: 50 });
  const term = q.trim() ? `REACH ${q}`.trim() : "REACH";
  return toResponse(await marketNews(env, { keyword: term, pageNo: page, numOfRows: limit }));
}

export const routes = [{ method: "GET", path: "/api/regulations/kotra/reach", handler: reach }];
