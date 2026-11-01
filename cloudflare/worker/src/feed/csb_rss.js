// CSB "All News" RSS body → incident feed items (pure; no DOMParser in Workers, so a small tag reader).
// Item shape = one entry of feed/latest.json "items" (scripts/static_export/CONTRACT.md "feed/"), same as the
// Python collector's csb_rss rows (scripts/portal_build/feed_fetch.py rss_to_csb): id "csb_rss:<url slug>",
// https link, date from pubDate (UTC day), country US, summary = the item's short description.
// The body is untrusted: only <item> text is read, tags are stripped, entities decoded, links must be http(s).

const ITEM_RE = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s) {
  return String(s || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function cleanText(s) {
  const noCdata = String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodeEntities(noCdata.replace(/<[^>]+>/g, " ")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function tag(block, name) {
  const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "i").exec(block);
  return m ? m[1] : "";
}

export function truncate(s, n) {
  return s.length <= n ? s : `${s.slice(0, n - 1).trimEnd()}…`;
}

export function rssDate(pubDate) {
  const t = Date.parse(String(pubDate || "").trim());
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : "";
}

export function httpsUrl(url) {
  return url.startsWith("http://www.csb.gov/") ? `https://${url.slice("http://".length)}` : url;
}

export function urlSlug(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "";
  } catch {
    return "";
  }
}

export function parseCsbRss(xml, { sourceId = "csb_rss", summaryChars = 280 } = {}) {
  const text = String(xml || "");
  if (/<!DOCTYPE|<!ENTITY/i.test(text.slice(0, 5000))) throw new Error("RSS with a DTD is not accepted");
  const out = [];
  const seen = new Set();
  for (const m of text.matchAll(ITEM_RE)) {
    const block = m[1];
    const title = cleanText(tag(block, "title"));
    const link = httpsUrl(cleanText(tag(block, "link")));
    if (!title || !/^https?:\/\//.test(link)) continue;
    const slug = urlSlug(link);
    if (!slug) continue;
    const id = `${sourceId}:${slug}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id, date: rssDate(cleanText(tag(block, "pubDate"))), title, url: link, source: sourceId,
      cas: [], names: [], equipment: [], disciplines: [], country: "US",
      summary: truncate(cleanText(tag(block, "description")), summaryChars),
    });
  }
  return out;
}
