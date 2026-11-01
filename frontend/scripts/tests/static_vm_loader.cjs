// Loads the browser's static-data modules (public/chemip/static_*.jsx, api_*.jsx) into a Node vm context,
// transpiled with the same vendored Babel and options as scripts/build_chemip.cjs, with a fake `window`
// and a fake `fetch` that serves files from a directory on disk (what Cloudflare would serve).
// layout "contract": diskRoot holds v1/search, v1/p, v1/g as the exporter writes them (p/ and g/ are gzip bytes;
//                   they are served WITHOUT Content-Encoding, so the module's own gunzip path is exercised).
// layout "pilot":   diskRoot is the pilot out/ folder, mapped to the contract paths by pilot_contract_shim.cjs.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { resolvePilot } = require("./pilot_contract_shim.cjs");

const CHEMIP = path.join(__dirname, "..", "..", "public", "chemip");
// lang.jsx first: label files pick the screen language at load (no ?lang= here → Korean, as before).
const MODULES = [
  "lang.jsx", "static_config.jsx", "static_aliases.jsx", "static_search_index.jsx", "static_search.jsx",
  "static_trade_assembly.jsx", "api_labels.jsx", "api_labels_en.jsx", "api_errors.jsx", "api_static.jsx",
  // p/ 뒤 덧붙인 조각(g/intl_add*, g/intl_reg_add*)을 정적 수출입·국가별 규제에 합친다(api_static_intl.jsx)
  "intl_merge.jsx", "intl_reg_add.jsx", "api_static_intl.jsx",
];
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};
const STATIC_ORIGIN = "http://static.test";

let babel = null;
function transpile(rel, code) {
  if (!babel) babel = require(path.join(CHEMIP, "vendor", "babel.min.js"));
  return babel.transform(code, { ...BABEL_OPTIONS, filename: rel }).code;
}

// fake fetch: http://static.test/<rel> -> file under diskRoot. Counts requests.
function makeDiskFetch(diskRoot, layout, stats) {
  return async function fetch(url) {
    const u = new URL(url);
    if (u.origin !== STATIC_ORIGIN) throw new TypeError(`blocked: ${url}`);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "");
    stats.requests += 1;
    let body = null;
    if (layout === "pilot") body = resolvePilot(diskRoot, rel);
    else {
      const file = path.join(diskRoot, ...rel.split("/"));
      body = fs.existsSync(file) ? fs.readFileSync(file) : null;
    }
    if (!body) {
      stats.missing += 1;
      return new Response("not found", { status: 404 });
    }
    stats.bytes += body.length;
    return new Response(body, { status: 200, headers: { "content-type": "application/json" } });
  };
}

// extraModules: more public/chemip files loaded after MODULES (e.g. api_core.jsx, api_origin.jsx), in order.
function loadStaticModules({ diskRoot, layout = "pilot", config = {}, raw = false, extraModules = [] } = {}) {
  const stats = { requests: 0, missing: 0, bytes: 0 };
  const sandbox = {
    console, setTimeout, clearTimeout, AbortController, TextEncoder, TextDecoder, URL, URLSearchParams,
    Blob, Response, DecompressionStream,
    fetch: makeDiskFetch(diskRoot, layout, stats),
  };
  sandbox.window = sandbox;
  sandbox.CHEMIP_STATIC = { base: STATIC_ORIGIN, version: layout === "pilot" ? "" : "v1", ...config };
  const ctx = vm.createContext(sandbox);
  for (const rel of [...new Set([...MODULES, ...extraModules])]) { // a module named in both is loaded once
    const code = fs.readFileSync(path.join(CHEMIP, rel), "utf8");
    vm.runInContext(raw ? code : transpile(rel, code), ctx, { filename: rel });
  }
  return { win: sandbox, stats };
}

module.exports = { loadStaticModules, STATIC_ORIGIN, CHEMIP };
