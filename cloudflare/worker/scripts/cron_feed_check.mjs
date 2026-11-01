// Tests and dry run for the incident feed cron (src/cron_feed.js). No wrangler, no R2 writes.
//   node cloudflare/worker/scripts/cron_feed_check.mjs
//        unit tests: RSS parsing, merge rules, a full run against an in-memory bucket and a fake fetch
//   node cloudflare/worker/scripts/cron_feed_check.mjs --dry-run [--src <latest.json>] [--out <file>]
//        fetches the real CSB RSS, merges it into a local copy of latest.json (default: the static export
//        E:\dev-cache\chemip-static\out\v1\feed\latest.json) and writes the result to --out (default: none) — R2 untouched
import assert from "node:assert/strict";
import fs from "node:fs";
import { FEED } from "../src/config.js";
import { runFeedCron } from "../src/cron_feed.js";
import { cleanText, parseCsbRss, rssDate } from "../src/feed/csb_rss.js";
import { mergeFeed, newestFirst } from "../src/feed/feed_merge.js";
import { gzipJson, isGzip, readJsonBytes } from "../src/feed/gzip_json.js";

const DEFAULT_SRC = "E:/dev-cache/chemip-static/out/v1/feed/latest.json";

const RSS = `\ufeff<?xml version="1.0" encoding="utf-8"?><rss version="2.0"><channel><title>CSB News</title>
<item><title>CSB Releases Final Report &amp; Video</title><link>http://www.csb.gov/final-report-x/</link>
<description><![CDATA[Final <b>Report</b> ]]></description><pubDate>Mon, 19 Oct 2026 23:59:00 -0500</pubDate></item>
<item><title>Old News</title><link>http://www.csb.gov/old-news/</link><description>Old</description><pubDate>Wed, 30 Sep 2026 13:32:00 GMT</pubDate></item>
<item><title>Bad link</title><link>javascript:alert(1)</link><pubDate>Wed, 30 Sep 2026 13:32:00 GMT</pubDate></item>
<item><title>Dup</title><link>http://www.csb.gov/old-news/</link></item>
</channel></rss>`;

function feedBody() {
  return {
    v: 1, exported_at: "2026-10-31", updated_at: "2026-10-31", total: 3, count: 3,
    sources: { csb_rss: { name: "CSB RSS", n: 1, retrieved_at: "2026-10-30" }, chemeng_csb: { name: "CSB" } },
    items: [
      { id: "csb_rss:old-news", date: "2026-09-30", title: "Old News", url: "https://www.csb.gov/old-news/", source: "csb_rss",
        cas: ["7664-41-7"], names: ["Ammonia"], equipment: [], disciplines: [], country: "US", summary: "Old" },
      { id: "chemeng_csb:a", date: "2025-06-04", title: "A", url: "https://www.csb.gov/a/", source: "chemeng_csb",
        cas: ["71-43-2"], names: ["Benzene"], equipment: ["pump"], disciplines: ["rotating"], country: "US", summary: "s" },
      { id: "chemeng_kosha:b", date: "", title: "B", url: "https://k/", source: "chemeng_kosha",
        cas: [], names: [], equipment: [], disciplines: [], country: "KR", summary: "" },
    ],
  };
}

// In-memory stand-in for an R2 bucket binding: get/put with httpMetadata and onlyIf.etagMatches.
class MemoryBucket {
  constructor() { this.objects = new Map(); this.puts = 0; this.n = 0; }
  seed(key, bytes) { this.objects.set(key, { bytes, etag: `e${++this.n}`, httpMetadata: { contentType: "application/json", contentEncoding: "gzip" } }); }
  async get(key) {
    const o = this.objects.get(key);
    return o ? { etag: o.etag, httpMetadata: o.httpMetadata, arrayBuffer: async () => o.bytes.buffer.slice(o.bytes.byteOffset, o.bytes.byteOffset + o.bytes.byteLength) } : null;
  }
  async put(key, bytes, opts = {}) {
    const cur = this.objects.get(key);
    if (opts.onlyIf?.etagMatches && (!cur || cur.etag !== opts.onlyIf.etagMatches)) return null;
    this.puts += 1;
    this.objects.set(key, { bytes: new Uint8Array(bytes), etag: `e${++this.n}`, httpMetadata: opts.httpMetadata, customMetadata: opts.customMetadata });
    return { key };
  }
}

const fakeFetch = (body, status = 200) => async () => new Response(body, { status });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test("rss parse: entities, CDATA, https, UTC day, bad links and duplicates dropped", () => {
  const items = parseCsbRss(RSS);
  assert.deepEqual(items.map((i) => i.id), ["csb_rss:final-report-x", "csb_rss:old-news"]);
  assert.equal(items[0].title, "CSB Releases Final Report & Video");
  assert.equal(items[0].url, "https://www.csb.gov/final-report-x/");
  assert.equal(items[0].summary, "Final Report");
  assert.equal(items[0].date, "2026-10-20");
  assert.equal(items[0].country, "US");
  assert.deepEqual(Object.keys(items[0]).sort(), ["cas", "country", "date", "disciplines", "equipment", "id", "names", "source", "summary", "title", "url"]);
  assert.equal(rssDate("nonsense"), "");
  assert.equal(cleanText("&lt;a href=&quot;x&quot;&gt;Hi&lt;/a&gt; &#8211; &#x41;"), "Hi – A");
  assert.throws(() => parseCsbRss('<!DOCTYPE x [<!ENTITY a "b">]><rss></rss>'));
});

test("merge: other sources untouched, existing csb item wins, order, keep cap", () => {
  const body = feedBody();
  const before = JSON.stringify(body);
  const { body: out, added } = mergeFeed(body, parseCsbRss(RSS), { keep: 60, now: new Date("2026-10-31T01:00:00Z") });
  assert.equal(JSON.stringify(body), before, "input not changed");
  assert.equal(added, 1);
  assert.deepEqual(out.items.map((i) => i.id), ["csb_rss:final-report-x", "csb_rss:old-news", "chemeng_csb:a", "chemeng_kosha:b"]);
  assert.deepEqual(out.items[1].cas, ["7664-41-7"], "the exported item (with CAS tags) is kept");
  assert.deepEqual(out.items[2], body.items[1]);
  assert.equal(out.count, 4);
  assert.equal(out.total, 4);
  assert.equal(out.updated_at, "2026-10-31");
  assert.equal(out.sources.csb_rss.retrieved_at, "2026-10-31");
  assert.equal(out.cron.added, 1);
  const capped = mergeFeed(body, parseCsbRss(RSS), { keep: 1 }).body;
  assert.deepEqual(capped.items.filter((i) => i.source === "csb_rss").map((i) => i.id), ["csb_rss:final-report-x"]);
  assert.throws(() => mergeFeed({ v: 2, items: [] }, []));
  assert.deepEqual(newestFirst([{ id: "a", date: "" }, { id: "b", date: "2020" }, { id: "c", date: "2020" }]).map((i) => i.id), ["c", "b", "a"]);
});

test("gzip round trip", async () => {
  const gz = await gzipJson({ a: "한글" });
  assert.ok(isGzip(gz));
  assert.deepEqual(await readJsonBytes(gz), { a: "한글" });
  assert.deepEqual(await readJsonBytes(new TextEncoder().encode('{"b":1}')), { b: 1 });
});

test("run: writes merged gzip once, then no write when nothing is new", async () => {
  const bucket = new MemoryBucket();
  bucket.seed(FEED.LATEST_KEY, await gzipJson(feedBody()));
  const env = { STATIC_DATA: bucket };
  const r1 = await runFeedCron(env, { fetchImpl: fakeFetch(RSS), now: new Date("2026-10-31T01:00:00Z") });
  assert.deepEqual(r1, { ok: true, written: true, fetched: 2, added: 1, kept: 2 });
  const stored = bucket.objects.get(FEED.LATEST_KEY);
  assert.ok(isGzip(stored.bytes));
  assert.equal(stored.httpMetadata.contentEncoding, "gzip");
  assert.equal(stored.httpMetadata.contentType, "application/json");
  const body = await readJsonBytes(stored.bytes);
  assert.equal(body.items[0].id, "csb_rss:final-report-x");
  const r2 = await runFeedCron(env, { fetchImpl: fakeFetch(RSS) });
  assert.equal(r2.written, false);
  assert.equal(r2.added, 0);
  assert.equal(bucket.puts, 1);
});

test("run: failures leave R2 as it was", async () => {
  const bucket = new MemoryBucket();
  bucket.seed(FEED.LATEST_KEY, await gzipJson(feedBody()));
  const env = { STATIC_DATA: bucket };
  assert.equal((await runFeedCron(env, { fetchImpl: fakeFetch("down", 503) })).reason, "rss http 503");
  assert.equal((await runFeedCron(env, { fetchImpl: fakeFetch("<rss></rss>") })).reason, "rss had no items");
  assert.equal((await runFeedCron(env, { fetchImpl: async () => { throw new Error("dns"); } })).reason, "dns");
  assert.match((await runFeedCron({ STATIC_DATA: new MemoryBucket() }, { fetchImpl: fakeFetch(RSS) })).reason, /not in R2/);
  assert.equal((await runFeedCron({}, { fetchImpl: fakeFetch(RSS) })).reason, "no bucket binding");
  const bad = new MemoryBucket();
  bad.seed(FEED.LATEST_KEY, await gzipJson({ v: 9 }));
  assert.match((await runFeedCron({ STATIC_DATA: bad }, { fetchImpl: fakeFetch(RSS) })).reason, /unknown format/);
  assert.equal(bucket.puts, 0);
});

test("run: a concurrent upload (etag changed) is not overwritten", async () => {
  const bucket = new MemoryBucket();
  bucket.seed(FEED.LATEST_KEY, await gzipJson(feedBody()));
  const realGet = bucket.get.bind(bucket);
  bucket.get = async (key) => {
    const o = await realGet(key);
    bucket.seed(key, await gzipJson(feedBody())); // home-PC upload lands between read and write
    return o;
  };
  const r = await runFeedCron({ STATIC_DATA: bucket }, { fetchImpl: fakeFetch(RSS) });
  assert.equal(r.written, false);
  assert.match(r.reason, /changed while merging/);
  assert.equal(bucket.puts, 0);
});

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}

async function dryRun() {
  const src = arg("--src", DEFAULT_SRC);
  const out = arg("--out", "");
  const bucket = new MemoryBucket();
  bucket.seed(FEED.LATEST_KEY, new Uint8Array(fs.readFileSync(src)));
  const before = await readJsonBytes(bucket.objects.get(FEED.LATEST_KEY).bytes);
  const result = await runFeedCron({ STATIC_DATA: bucket });
  const after = await readJsonBytes(bucket.objects.get(FEED.LATEST_KEY).bytes);
  const csb = after.items.filter((i) => i.source === FEED.SOURCE_ID);
  console.log(JSON.stringify({ src, result, items_before: before.items.length, items_after: after.items.length,
    other_sources_unchanged: JSON.stringify(before.items.filter((i) => i.source !== FEED.SOURCE_ID)) === JSON.stringify(after.items.filter((i) => i.source !== FEED.SOURCE_ID)),
    csb_rss_newest: csb.slice(0, 3).map((i) => `${i.date} ${i.title}`) }, null, 1));
  if (out) {
    fs.writeFileSync(out, bucket.objects.get(FEED.LATEST_KEY).bytes);
    console.log(`wrote ${out}`);
  }
  if (!result.ok) process.exitCode = 1;
}

async function main() {
  if (process.argv.includes("--dry-run")) return dryRun();
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok   ${name}`);
    } catch (e) {
      failed += 1;
      console.log(`FAIL ${name}\n     ${e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n     ") : e}`);
    }
  }
  console.log(`${tests.length - failed}/${tests.length} passed`);
  if (failed) process.exitCode = 1;
}

main();
