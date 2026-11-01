// ECHA CHEM JSON API client for the on-demand REACH lookup (one CAS). No key; identifies ChemIP in the user agent.
// Throws on HTTP errors and timeouts — src/reach/lookup.js turns that into an "unknown" answer.
import { REACH } from "../config.js";
import { fetchWithTimeout, withParams } from "../lib/upstream.js";

async function getJson(url) {
  const res = await fetchWithTimeout(url, { headers: { accept: "application/json", "user-agent": REACH.USER_AGENT } }, REACH.TIMEOUT_MS);
  if (!res.ok) throw new Error(`ECHA ${res.status}`);
  return res.json();
}

export function searchSubstance(cas) {
  return getJson(withParams(REACH.BASE + REACH.SEARCH, { searchText: cas, pageIndex: 1, pageSize: REACH.SEARCH_PAGE_SIZE }));
}

export function getSubstance(rmlId) {
  return getJson(REACH.BASE + REACH.SUBSTANCE + encodeURIComponent(rmlId));
}

// Active REACH dossiers of one substance → { items, total } (all pages up to DOSSIER_MAX_PAGES).
export async function activeDossiers(rmlId) {
  const items = [];
  let total = 0;
  for (let page = 1; page <= REACH.DOSSIER_MAX_PAGES; page++) {
    const data = await getJson(withParams(REACH.BASE + REACH.DOSSIERS, {
      rmlId, legislation: "REACH", registrationStatuses: "Active", pageIndex: page, pageSize: REACH.DOSSIER_PAGE_SIZE,
    }));
    const got = (data && data.items) || [];
    items.push(...got);
    total = parseInt((data && data.state && data.state.totalItems) || 0, 10) || 0;
    if (items.length >= total || !got.length) break;
  }
  return { items, total };
}

export function substancePageUrl(rmlId) {
  return `${REACH.BASE}/${rmlId}`;
}
