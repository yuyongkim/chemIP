// One CAS → REACH registration answer (asks ECHA CHEM; no cache here — see cache.js and routes/reach.js).
//   status "registered"      entry = same shape as EU_REACH_REGISTERED.json entries
//   status "not_registered"  ECHA has no substance for this CAS, or the substance has no active REACH registration
//   status "unknown"         ECHA failed / timed out, the CAS matches several ECHA substances, or we were rate-limited
import { REACH } from "../config.js";
import { errorMessage } from "../lib/adapter.js";
import { activeDossiers, getSubstance, searchSubstance, substancePageUrl } from "../upstreams/echa.js";
import { isRegistered, pickSubstance, reachEntry } from "./summary.js";

export function reachAnswer(cas, status, { entry = null, reason = "", echaId = "", checked = new Date() } = {}) {
  return {
    cas, list_id: REACH.LIST_ID, status,
    registered: status === "registered" ? true : status === "not_registered" ? false : null,
    reason, entry, echa_url: echaId ? substancePageUrl(echaId) : "",
    checked: checked.toISOString().slice(0, 10),
    attribution: REACH.ATTRIBUTION, schema: REACH.SCHEMA,
  };
}

export async function lookupReach(cas, now = new Date()) {
  try {
    const found = await searchSubstance(cas);
    const items = (found && found.items) || [];
    if (!items.length) return reachAnswer(cas, "not_registered", { reason: "no_substance", checked: now });
    const { sub: subIdx, how, ambiguous } = pickSubstance(cas, items);
    if (!subIdx && ambiguous) return reachAnswer(cas, "unknown", { reason: `ambiguous: ${how}`, checked: now });
    if (!subIdx) return reachAnswer(cas, "not_registered", { reason: "no_substance", checked: now }); // hits only mention it
    const rml = subIdx.rmlId || "";
    const [sub, dossiers] = await Promise.all([getSubstance(rml), activeDossiers(rml)]);
    if (!isRegistered(sub || {}, dossiers.items)) {
      return reachAnswer(cas, "not_registered", { reason: "no_active_registration", echaId: rml, checked: now });
    }
    const entry = reachEntry(cas, subIdx, sub || {}, how, dossiers.items, dossiers.total);
    return reachAnswer(cas, "registered", { entry, echaId: rml, checked: now });
  } catch (e) {
    return reachAnswer(cas, "unknown", { reason: `upstream: ${errorMessage(e)}`, checked: now });
  }
}

// Cache lifetime for an answer (seconds); 0 = do not cache. Ambiguous matches are stable, so they keep like "none".
export function reachTtl(answer) {
  if (answer.status === "registered") return REACH.TTL_FOUND_S;
  if (answer.status === "not_registered" || String(answer.reason).startsWith("ambiguous")) return REACH.TTL_NONE_S;
  return 0;
}
