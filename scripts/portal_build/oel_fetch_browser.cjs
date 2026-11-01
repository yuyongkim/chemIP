// Download the OEL sources behind bot challenges (method "browser" in oel_sources.json: CDC NIOSH Pocket Guide, EUR-Lex)
// with headless Chromium into data/portal_raw/oel/<source_id>/, same manifest format as oel_raw.py.
//
//   node G:\MSDS\scripts\portal_build\oel_fetch_browser.cjs [--only us_niosh_npg,eu_ioelv] [--force]
//
// NIOSH: the CAS index page, then every chemical page it links (npgdNNNN.html → stored as .html.gz). EUR-Lex: one
// HTML text per CELEX id. Resumable: files already in the manifest are skipped unless --force. One page at a time.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { chromium } = require("G:/MSDS/frontend/node_modules/playwright");

const REGISTRY = path.join(__dirname, "oel_sources.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
const GAP_MS = 700;
const MIN_HTML = 20000; // a challenge page is shorter than any real page
const SETTLE_TRIES = 30;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readManifest(dir, sid) {
  const p = path.join(dir, "manifest.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : { source_id: sid, files: {} };
}

function writeManifest(dir, m) {
  const sorted = { ...m, files: Object.fromEntries(Object.keys(m.files).sort().map(k => [k, m.files[k]])) };
  fs.writeFileSync(path.join(dir, "manifest.json.tmp"), JSON.stringify(sorted, null, 1));
  fs.renameSync(path.join(dir, "manifest.json.tmp"), path.join(dir, "manifest.json"));
}

function saveFile(dir, m, name, html, url) {
  const data = Buffer.from(html, "utf8");
  fs.writeFileSync(path.join(dir, name), name.endsWith(".gz") ? zlib.gzipSync(data, { level: 9 }) : data);
  m.files[name] = { url, retrieved_at: today(), sha256: crypto.createHash("sha256").update(data).digest("hex"), bytes: data.length };
}

async function getHtml(page, url) {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  let html = "";
  for (let k = 0; k < SETTLE_TRIES; k++) {
    try { html = await page.content(); } catch { html = ""; }
    if (html.length > MIN_HTML) break;
    await page.waitForTimeout(1000);
  }
  if (html.length <= MIN_HTML) throw new Error(`short page (${html.length}) status ${resp && resp.status()}: ${url}`);
  return html;
}

function nioshPages(indexHtml) {
  const out = new Set();
  for (const m of indexHtml.matchAll(/href="(?:\/niosh\/npg\/)?(npgd\d{4}\.html)"/g)) out.add(m[1]);
  return [...out].sort();
}

async function fetchSource(page, src, rawDir, force) {
  const sid = src.source_id;
  const dir = path.join(rawDir, sid);
  fs.mkdirSync(dir, { recursive: true });
  const m = readManifest(dir, sid);
  const have = name => !force && m.files[name] && fs.existsSync(path.join(dir, name));
  const jobs = [];
  if (src.index) {
    if (!have(src.index.file)) {
      saveFile(dir, m, src.index.file, await getHtml(page, src.index.url), src.index.url);
      writeManifest(dir, m);
    }
    const indexHtml = fs.readFileSync(path.join(dir, src.index.file), "utf8");
    for (const p of nioshPages(indexHtml)) jobs.push({ name: `${p}.gz`, url: src.page_url.replace("{page}", p) });
  }
  for (const f of src.files || []) jobs.push({ name: f.file, url: f.url || src.page_url.replace("{celex}", f.celex) });
  let got = 0, kept = 0, failed = [];
  for (const j of jobs) {
    if (have(j.name)) { kept++; continue; }
    try {
      saveFile(dir, m, j.name, await getHtml(page, j.url), j.url);
      got++;
      if (got % 25 === 0) { writeManifest(dir, m); console.log(`${sid}: ${got} fetched`); }
    } catch (e) {
      failed.push(j.name);
      console.log(`${sid}: FAILED ${j.name} ${String(e.message).slice(0, 120)}`);
    }
    await page.waitForTimeout(GAP_MS);
  }
  writeManifest(dir, m);
  return { source_id: sid, fetched: got, kept, failed };
}

(async () => {
  const args = process.argv.slice(2);
  const onlyArg = args.includes("--only") ? args[args.indexOf("--only") + 1] : "";
  const only = new Set(onlyArg.split(",").filter(Boolean));
  const force = args.includes("--force");
  const reg = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ userAgent: UA, locale: "en-US" })).newPage();
  try {
    for (const src of reg.sources) {
      if (src.method !== "browser" || (only.size && !only.has(src.source_id))) continue;
      console.log(JSON.stringify(await fetchSource(page, src, reg.raw_dir, force)));
    }
  } finally {
    await browser.close();
  }
})();
