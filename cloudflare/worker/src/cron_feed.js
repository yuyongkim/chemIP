// Incident feed refresh while the home PC is off — Cloudflare Worker scheduled handler (Cron Trigger).
//   1. fetch the CSB "All News" RSS (public domain)              FEED.RSS_URL
//   2. read v1/feed/latest.json from R2 (gzip bytes)            FEED.LATEST_KEY, bucket binding STATIC_DATA
//   3. merge (feed/feed_merge.js): Chem_Eng incident items and press items stay as exported; csb_rss items updated
//   4. write it back as gzip (contentEncoding "gzip"), only when something new came in, and only if the object is still
//      the one that was read (onlyIf etagMatches) so a fresh upload from the home PC is never overwritten
// feed/by-cas/<CAS>.json is not touched (RSS items carry no CAS; the home-PC export adds CAS tags).
//
// NOT ENABLED: wrangler.toml has no [triggers] and src/index.js exports no scheduled(). To enable, see
// docs/portal/INCIDENT_FEED_v1.md "Worker cron". Dry run and tests: node cloudflare/worker/scripts/cron_feed_check.mjs
import { FEED, STATIC_DATA } from "./config.js";
import { parseCsbRss } from "./feed/csb_rss.js";
import { isFeedBody, mergeFeed } from "./feed/feed_merge.js";
import { gzipJson, readJsonBytes } from "./feed/gzip_json.js";

async function fetchRss(fetchImpl) {
  const r = await fetchImpl(FEED.RSS_URL, {
    headers: { "user-agent": FEED.USER_AGENT, accept: "application/rss+xml, application/xml, */*" },
    signal: AbortSignal.timeout(FEED.TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`rss http ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.length > FEED.MAX_BYTES) throw new Error("rss body too large");
  return new TextDecoder("utf-8").decode(buf);
}

// → { ok, written, reason?, fetched?, added?, kept? }. Never throws (a failed run leaves R2 as it was).
export async function runFeedCron(env, { fetchImpl = fetch, now = new Date() } = {}) {
  try {
    const bucket = env && env[STATIC_DATA.BINDING];
    if (!bucket) return { ok: false, written: false, reason: "no bucket binding" };
    const rss = parseCsbRss(await fetchRss(fetchImpl), { sourceId: FEED.SOURCE_ID, summaryChars: FEED.SUMMARY_CHARS });
    if (!rss.length) return { ok: false, written: false, reason: "rss had no items" };
    const obj = await bucket.get(FEED.LATEST_KEY);
    if (!obj) return { ok: false, written: false, reason: "latest.json not in R2 (upload the static export first)" };
    const body = await readJsonBytes(new Uint8Array(await obj.arrayBuffer()));
    if (!isFeedBody(body)) return { ok: false, written: false, reason: "latest.json has an unknown format" };
    const merged = mergeFeed(body, rss, { sourceId: FEED.SOURCE_ID, keep: FEED.KEEP, now });
    const result = { ok: true, written: false, fetched: rss.length, added: merged.added, kept: merged.kept };
    if (!merged.added) return result;
    const put = await bucket.put(FEED.LATEST_KEY, await gzipJson(merged.body), {
      httpMetadata: { contentType: STATIC_DATA.CONTENT_TYPE, contentEncoding: "gzip" },
      customMetadata: { writer: "cron_feed", updated_at: merged.body.updated_at },
      onlyIf: { etagMatches: obj.etag },
    });
    if (!put) return { ...result, reason: "latest.json changed while merging; next run retries" };
    return { ...result, written: true };
  } catch (e) {
    return { ok: false, written: false, reason: String((e && e.message) || e).slice(0, 200) };
  }
}

// export default { fetch, scheduled } in src/index.js would call this (see the doc).
export function scheduledFeed(controller, env, ctx) {
  ctx.waitUntil(runFeedCron(env).then((r) => console.log(`cron_feed ${JSON.stringify(r)}`)));
}
