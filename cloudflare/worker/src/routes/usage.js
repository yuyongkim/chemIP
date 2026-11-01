// /api/usage — GET /summary is identical to backend/api/routes/usage.py.
// POST /hit is Worker-only: lets a static (offline) frontend count a view, since static files never pass
// through the counting middleware. Body {path: "/api/chemicals/<id>"}; same matcher rules apply.
import { json, readJsonObject } from "../lib/http.js";
import { intQuery } from "../lib/query.js";
import { countIfMatched } from "../usage/counter.js";
import { summary } from "../usage/store.js";

async function getSummary({ env, url }) {
  const days = intQuery(url, "days", 30, { ge: 1, le: 366 });
  const top = intQuery(url, "top", 10, { ge: 0, le: 50 });
  return json(await summary(env.DB, { days, top }));
}

async function hit({ request, env, ctx }) {
  const body = await readJsonObject(request);
  const path = typeof body.path === "string" ? body.path.split("?")[0] : "";
  const asGet = new Request(request.url, { method: "GET", headers: request.headers });
  countIfMatched(asGet, env, ctx, path, 200);
  return json({ accepted: true }, 202);
}

export const routes = [
  { method: "GET", path: "/api/usage/summary", handler: getSummary },
  { method: "POST", path: "/api/usage/hit", handler: hit },
];
