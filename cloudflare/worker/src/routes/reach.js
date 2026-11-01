// GET /api/reach/<CAS> — EU REACH registration status of one substance, looked up on ECHA CHEM when a user opens
// that substance (individual lookup, not bulk collection) and cached (src/reach/cache.js). The answer always carries
// "Source: European Chemicals Agency, https://echa.europa.eu/" and ECHA's values unchanged. Same route on the PC:
// backend/api/routes/reach.py. Shape: src/reach/lookup.js.
import { REACH } from "../config.js";
import { casIsValid, normalizeCas } from "../lib/cas.js";
import { ValidationError, json } from "../lib/http.js";
import { reachCacheGet, reachCachePut } from "../reach/cache.js";
import { reachAllowed } from "../reach/limits.js";
import { lookupReach, reachAnswer } from "../reach/lookup.js";

function respond(answer, extra = {}, status = 200) {
  return json({ ...answer, ...extra }, status, { "cache-control": REACH.BROWSER_CACHE[answer.status] || "no-store" });
}

export async function reach({ request, env, ctx, params }) {
  const cas = normalizeCas(params.cas);
  if (!casIsValid(cas)) {
    throw new ValidationError([{ type: "value_error", loc: ["path", "cas"], msg: "Value error, invalid CAS number", input: params.cas }]);
  }
  const hit = await reachCacheGet(env, cas);
  if (hit) return respond(hit.answer, { cached: true });
  if (!(await reachAllowed(request, env))) {
    return json({ ...reachAnswer(cas, "unknown", { reason: "rate_limited" }), cached: false }, 429, { "cache-control": "no-store", "retry-after": "60" });
  }
  const answer = await lookupReach(cas);
  const put = reachCachePut(env, cas, answer);
  if (ctx && ctx.waitUntil) ctx.waitUntil(put);
  else await put;
  return respond(answer, { cached: false });
}

export const routes = [{ method: "GET", path: "/api/reach/:cas", handler: reach }];
