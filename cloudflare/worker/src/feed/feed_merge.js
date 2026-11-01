// Merge new CSB RSS items into the feed/latest.json body (pure). Every item of another source (the Chem_Eng
// incidents, press headlines exported from the home PC) is kept exactly as it is. csb_rss items: the union of the
// file's items and the new ones, an item already in the file wins (it may carry CAS tags from the home-PC export),
// newest `keep` kept. Order = the exporter's (scripts/static_export/feed_export.py newest_first): date desc, id desc,
// items without a date last.

export function newestFirst(items) {
  return [...items].sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    if (da !== db) return da < db ? 1 : -1;
    return a.id === b.id ? 0 : a.id < b.id ? 1 : -1;
  });
}

export function isFeedBody(body) {
  return Boolean(body) && body.v === 1 && Array.isArray(body.items);
}

// → { body, added, kept } ; body is a new object (the input is not changed). added = new ids that made the cut.
export function mergeFeed(body, rssItems, { sourceId = "csb_rss", keep = 60, now = new Date() } = {}) {
  if (!isFeedBody(body)) throw new Error("not a feed/latest.json body (v 1 with items)");
  const others = body.items.filter((it) => it.source !== sourceId);
  const old = body.items.filter((it) => it.source === sourceId);
  const oldIds = new Set(old.map((it) => it.id));
  const byId = new Map();
  for (const it of rssItems) if (it && it.id && it.source === sourceId) byId.set(it.id, it);
  for (const it of old) byId.set(it.id, it);
  const kept = newestFirst([...byId.values()]).slice(0, keep);
  const added = kept.filter((it) => !oldIds.has(it.id)).length;
  const items = newestFirst([...others, ...kept]);
  const day = now.toISOString().slice(0, 10);
  const sources = { ...(body.sources || {}) };
  if (sources[sourceId]) sources[sourceId] = { ...sources[sourceId], retrieved_at: day };
  return {
    added,
    kept: kept.length,
    body: {
      ...body,
      updated_at: day,
      total: (Number(body.total) || 0) + added,
      count: items.length,
      sources,
      cron: { last_run: now.toISOString(), source: sourceId, fetched: rssItems.length, added },
      items,
    },
  };
}
