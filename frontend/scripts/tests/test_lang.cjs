// Language (ko | en) check for the no-build chemip screen. Generic: covers every label file, no screen-specific code.
// (a) label pairs: every `const X_KO` with a matching `const X_EN` (found in any public/chemip .jsx) is loaded in a vm
//     (lang.jsx + the KO file + the EN file, unknown globals stubbed) and every KO key path that carries text
//     must exist in EN with the same kind: a Hangul string needs a value, a function must stay a function,
//     an object/array must stay an object/array. EN strings that still contain Hangul are listed as warnings.
//     X_KO without X_EN is reported (warning). --strict also requires non-Hangul leaves (numbers, URLs, ...).
// (b) Hangul scan of non-label .jsx files: string literals, template text and JSX text (comments ignored).
//     Skipped: the first argument of tr("한국어", "English"). Label files = *_labels.jsx, *_en.jsx, and any file
//     that declares a top-level `const X_KO` (Korean reference data). Per-file counts are printed.
//     Justified exceptions: frontend/scripts/tests/lang_allowlist.json
//       { "files":   { "data.jsx": "why the whole file is exempt" },
//         "strings": { "x.jsx": { "exact literal": "why", "re:^정규식$": "why" } } }
//
//   node frontend/scripts/tests/test_lang.cjs [--only app,landing_,about_] [--strict] [--verbose] [--root DIR]
//   --only: comma-separated file-name prefixes; limits (a) to pairs whose files match and (b) to matching files.
//   Exit code 1 when (a) has missing paths / kind changes / load errors, or (b) finds non-allowlisted Hangul.
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const ROOT = path.resolve(arg("--root", path.join(__dirname, "..", "..", "public", "chemip")));
const ALLOW_FILE = path.join(__dirname, "lang_allowlist.json");
const ONLY = (arg("--only", "") || "").split(",").map(s => s.trim()).filter(Boolean);
const STRICT = process.argv.includes("--strict");
const VERBOSE = process.argv.includes("--verbose");
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/;
const BABEL_OPTIONS = {
  presets: ["react", "env"],
  plugins: ["transform-class-properties", "transform-object-rest-spread", "transform-flow-strip-types"],
  targets: { browsers: undefined },
  compact: false,
  comments: false,
};

const Babel = require(path.join(ROOT, "vendor", "babel.min.js"));

function listJsx(dir, rel = "") {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (!["vendor", "dist", "data"].includes(e.name) && !e.name.startsWith("_legacy")) out.push(...listJsx(dir, r)); }
    else if (e.name.endsWith(".jsx")) out.push(r);
  }
  return out.sort();
}

const read = rel => fs.readFileSync(path.join(ROOT, rel), "utf8");
const base = rel => rel.split("/").pop();
const inScope = rel => !ONLY.length || ONLY.some(p => base(rel).startsWith(p) || rel.startsWith(p));

// ---------- (a) label pairs ----------

function declaredSuffix(code, suffix) {
  const re = new RegExp(`^(?:const|let|var)\\s+([A-Z][A-Z0-9_]*)_${suffix}\\s*=`, "gm");
  return [...code.matchAll(re)].map(m => m[1]);
}

// A function/object that absorbs any use, for globals a label file mentions but this check does not load.
function makeStub(name) {
  const fn = function () { return stub; };
  const stub = new Proxy(fn, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => `[${name}]` : k === "toString" ? () => `[${name}]` : stub),
    apply: () => stub,
    construct: () => stub,
  });
  return stub;
}

function loadPair(files, names) {
  const stubs = {};
  for (let attempt = 0; attempt < 60; attempt++) {
    const sandbox = {
      console, URL, URLSearchParams, setTimeout, clearTimeout,
      location: { search: "?lang=ko", href: "http://lang.test/chemip?lang=ko" },
      localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      document: { documentElement: {}, querySelector: () => null, title: "" },
      navigator: { language: "ko" },
      React: makeStub("React"),
      ...stubs,
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    const ctx = vm.createContext(sandbox);
    try {
      for (const rel of ["lang.jsx", ...files]) {
        vm.runInContext(Babel.transform(read(rel), { ...BABEL_OPTIONS, filename: rel }).code, ctx, { filename: rel });
      }
      const out = {};
      for (const n of names) out[n] = vm.runInContext(`typeof ${n} === "undefined" ? undefined : ${n}`, ctx);
      return { values: out };
    } catch (e) {
      const m = /^(\w+) is not defined/.exec(e && e.message);
      if (e instanceof Error || (e && e.name === "ReferenceError") || m) {
        if (m && !stubs[m[1]]) { stubs[m[1]] = makeStub(m[1]); continue; }
      }
      return { error: String(e && e.message || e).split("\n")[0] };
    }
  }
  return { error: "too many unknown globals" };
}

function kind(v) {
  if (typeof v === "function") return "function";
  if (Array.isArray(v)) return "array";
  if (v !== null && typeof v === "object") return "object";
  return typeof v;
}

function hasText(v, seen = new Set()) {
  if (typeof v === "string") return HANGUL.test(v);
  if (typeof v === "function") return true;
  if (v && typeof v === "object") {
    if (seen.has(v)) return false;
    seen.add(v);
    return Object.values(v).some(x => hasText(x, seen));
  }
  return false;
}

function comparePaths(ko, en, at, out) {
  const kk = kind(ko);
  const need = STRICT || hasText(ko);
  if (en === undefined) { if (need) out.missing.push(at); return; }
  const ek = kind(en);
  if (kk === "function" || ek === "function" || kk === "object" || kk === "array") {
    if (kk !== ek) { out.kind.push(`${at}: KO ${kk}, EN ${ek}`); return; }
  }
  if (kk === "object") for (const k of Object.keys(ko)) comparePaths(ko[k], en[k], `${at}.${k}`, out);
  else if (kk === "array") {
    if (ko.length !== en.length) out.warn.push(`${at}: array length KO ${ko.length}, EN ${en.length}`);
    const n = Math.min(ko.length, en.length);
    for (let i = 0; i < n; i++) comparePaths(ko[i], en[i], `${at}[${i}]`, out);
  } else if (typeof en === "string" && HANGUL.test(en) && !/^https?:\/\//.test(en)) out.warn.push(`${at}: EN still has Hangul: ${JSON.stringify(en.slice(0, 60))}`);
}

function checkPairs(files) {
  const ko = {}, en = {};
  for (const rel of files) {
    const code = read(rel);
    for (const n of declaredSuffix(code, "KO")) ko[n] = rel;
    for (const n of declaredSuffix(code, "EN")) en[n] = rel;
  }
  const fails = [];
  const warns = [];
  let pairs = 0;
  for (const name of Object.keys(ko).sort()) {
    if (!en[name]) {
      if (inScope(ko[name])) warns.push(`${name}_KO (${ko[name]}) has no ${name}_EN`);
      continue;
    }
    if (!inScope(ko[name]) && !inScope(en[name])) continue;
    pairs += 1;
    const files2 = [...new Set([ko[name], en[name]])];
    const r = loadPair(files2, [`${name}_KO`, `${name}_EN`]);
    const tag = `${name} (${files2.join(" + ")})`;
    if (r.error) { fails.push(`${tag}: load error: ${r.error}`); continue; }
    const out = { missing: [], kind: [], warn: [] };
    comparePaths(r.values[`${name}_KO`], r.values[`${name}_EN`], name, out);
    for (const p of out.missing) fails.push(`${tag}: missing in EN: ${p}`);
    for (const p of out.kind) fails.push(`${tag}: kind changed: ${p}`);
    for (const p of out.warn) warns.push(`${tag}: ${p}`);
  }
  for (const name of Object.keys(en)) if (!ko[name] && inScope(en[name])) fails.push(`${name}_EN (${en[name]}) has no ${name}_KO`);
  return { pairs, fails, warns };
}

// ---------- (b) Hangul scan ----------

function isLabelFile(rel, code) {
  return /_labels\.jsx$/.test(rel) || /_en\.jsx$/.test(rel) || declaredSuffix(code, "KO").length > 0;
}

function loadAllow() {
  if (!fs.existsSync(ALLOW_FILE)) return { files: {}, strings: {} };
  const j = JSON.parse(fs.readFileSync(ALLOW_FILE, "utf8"));
  return { files: j.files || {}, strings: j.strings || {} };
}

function allowed(allow, rel, text) {
  const t = text.trim();
  for (const key of Object.keys(allow.strings[rel] || {})) {
    if (key.startsWith("re:") ? new RegExp(key.slice(3)).test(t) : key === t) return true;
  }
  return false;
}

// Literal text nodes with Hangul. `skip` holds nodes that are tr()'s Korean argument.
function hangulLiterals(ast) {
  const found = [];
  const skip = new Set();
  (function walk(node, parent) {
    if (!node || typeof node.type !== "string") return;
    if (node.type === "CallExpression" && node.callee && node.callee.type === "Identifier" && node.callee.name === "tr" && node.arguments[0]) {
      skip.add(node.arguments[0]);
    }
    if (skip.has(node)) return; // tr()'s Korean argument: skip the whole subtree (template literal pieces too)
    {
      let text = null;
      if (node.type === "StringLiteral" || node.type === "JSXText") text = node.value;
      else if (node.type === "TemplateElement") text = node.value.cooked != null ? node.value.cooked : node.value.raw;
      else if (node.type === "DirectiveLiteral") text = node.value;
      if (text != null && HANGUL.test(text)) found.push({ text, line: node.loc ? node.loc.start.line : 0, key: parent && parent.type === "ObjectProperty" && parent.key === node });
    }
    for (const k of Object.keys(node)) {
      if (k === "loc" || k === "leadingComments" || k === "trailingComments" || k === "innerComments" || k === "extra") continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach(c => c && typeof c === "object" && walk(c, node));
      else if (v && typeof v === "object" && typeof v.type === "string") walk(v, node);
    }
  })(ast.program, null);
  return found;
}

function scanFiles(files) {
  const allow = loadAllow();
  const rows = [];
  let total = 0;
  for (const rel of files) {
    if (!inScope(rel)) continue;
    const code = read(rel);
    if (isLabelFile(rel, code)) continue;
    if (allow.files[rel]) continue;
    let ast;
    try { ast = Babel.transform(code, { presets: [], plugins: ["syntax-jsx"], filename: rel, ast: true, code: false }).ast; }
    catch { ast = Babel.transform(code, { presets: ["react"], filename: rel, ast: true, code: false }).ast; }
    const hits = hangulLiterals(ast).filter(h => !allowed(allow, rel, h.text));
    if (hits.length) { rows.push({ rel, hits }); total += hits.length; }
  }
  return { rows, total };
}

function main() {
  const files = listJsx(ROOT);
  const a = checkPairs(files);
  console.log(`(a) label pairs checked: ${a.pairs}${STRICT ? " (strict)" : ""}`);
  for (const w of a.warns) console.log(`  warn ${w}`);
  for (const f of a.fails) console.log(`  FAIL ${f}`);
  console.log(a.fails.length ? `FAIL (a) ${a.fails.length} problem(s)` : "PASS (a) every KO text path exists in EN");

  const b = scanFiles(files);
  console.log(`\n(b) Hangul in non-label .jsx${ONLY.length ? ` (only ${ONLY.join(",")})` : ""}: ${b.total} literal(s) in ${b.rows.length} file(s)`);
  for (const r of b.rows.sort((x, y) => y.hits.length - x.hits.length)) {
    console.log(`  ${String(r.hits.length).padStart(4)}  ${r.rel}`);
    const show = VERBOSE ? r.hits : r.hits.slice(0, 3);
    for (const h of show) console.log(`          L${h.line}${h.key ? " (key)" : ""}: ${JSON.stringify(h.text.trim().slice(0, 70))}`);
    if (!VERBOSE && r.hits.length > 3) console.log(`          ... (--verbose for all)`);
  }
  console.log(b.total ? `FAIL (b) Hangul literals outside label files` : "PASS (b) no Hangul outside label files");
  if (a.fails.length || b.total) process.exitCode = 1;
}

main();
