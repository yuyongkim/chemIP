// Test-only: serves the PILOT output (E:\dev-cache\chemip-static-pilot\out) under the CONTRACT v1 paths, so the
// browser modules (which follow scripts/static_export/CONTRACT.md) can be checked against the pilot data.
//   search/<rel>      -> out/search/<rel>                       (same format)
//   g/<name>.json     -> out/substances/global/<name>.json      (trade_catalog.json does not exist in the pilot -> 404)
//   p/<chem_id>.json  -> built from out/substances/full/d/<chem_id>.json + full/c/<cas>.json + facts/c/<cas>.json
"use strict";

const fs = require("fs");
const path = require("path");

const CAS_RE = /^\d{2,7}-\d{2}-\d$/;
const FACT_KEYS = ["ncis", "controlled", "kr_law", "intl_lists", "hs", "hsk10_candidates"];

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

function pilotPage(out, chemId) {
  const sub = path.join(out, "substances");
  const detail = readJson(path.join(sub, "full", "d", `${chemId}.json`));
  const cas = CAS_RE.test(chemId) ? chemId : (detail && CAS_RE.test(detail.cas_no || "") ? detail.cas_no : null);
  const facts = cas ? readJson(path.join(sub, "facts", "c", `${cas}.json`)) : null;
  const full = cas ? readJson(path.join(sub, "full", "c", `${cas}.json`)) : null;
  if (!detail && !facts) return null;
  const page = {
    v: 1, chem_id: chemId, kind: /^\d{6}$/.test(chemId) ? "kosha" : "cas", cas: facts ? cas : null,
    detail_status: detail ? 200 : 404, detail,
    trade: full ? full.trade : null, intl: full ? full.intl : null, permit_context: full ? full.permit_context : null,
  };
  FACT_KEYS.forEach(k => { page[k] = facts ? facts[k] : null; });
  return page;
}

// rel: path below the (versionless) root, e.g. "p/001008.json". Returns a Buffer or null.
function resolvePilot(out, rel) {
  const parts = rel.split("/");
  if (parts[0] === "search") {
    const file = path.join(out, ...parts);
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  }
  if (parts[0] === "g" && parts.length === 2) {
    const file = path.join(out, "substances", "global", parts[1]);
    return fs.existsSync(file) ? fs.readFileSync(file) : null;
  }
  if (parts[0] === "p" && parts.length === 2) {
    const page = pilotPage(out, parts[1].replace(/\.json$/, ""));
    return page ? Buffer.from(JSON.stringify(page)) : null;
  }
  return null;
}

module.exports = { resolvePilot, pilotPage };
