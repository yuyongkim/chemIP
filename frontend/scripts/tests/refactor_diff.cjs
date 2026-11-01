// Compares two refactor_snapshot.cjs runs: visible text per view (line diff) and screenshot pixel-diff ratio.
//   set NODE_PATH=G:\MSDS\frontend\node_modules
//   node frontend/scripts/tests/refactor_diff.cjs --a <before dir> --b <after dir> [--out report.json] [--expect-text key1,key2]
// --partial: only compare views present in <after> (snapshot run with --only).
// --expect-text: views whose text is allowed to differ (intended fixes). Exit 1 on unexpected text diffs or errors.
"use strict";

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function arg(name, dflt) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : dflt;
}
const A = path.resolve(arg("--a"));
const B = path.resolve(arg("--b"));
const OUT = arg("--out", path.join(B, "diff_report.json"));
const EXPECT = new Set((arg("--expect-text", "") || "").split(",").filter(Boolean));
const CH_TOL = 24; // per-channel tolerance (anti-aliasing / font hinting)

function lineDiff(a, b) {
  const la = a.split("\n"), lb = b.split("\n");
  const out = [];
  let i = 0, j = 0;
  while (i < la.length || j < lb.length) {
    if (la[i] === lb[j]) { i++; j++; continue; }
    // look ahead for resync
    let found = false;
    for (let k = 1; k < 40 && !found; k++) {
      if (j + k < lb.length && la[i] === lb[j + k]) { for (let t = 0; t < k; t++) out.push(`+ ${lb[j + t]}`); j += k; found = true; }
      else if (i + k < la.length && la[i + k] === lb[j]) { for (let t = 0; t < k; t++) out.push(`- ${la[i + t]}`); i += k; found = true; }
    }
    if (!found) { if (i < la.length) out.push(`- ${la[i++]}`); if (j < lb.length) out.push(`+ ${lb[j++]}`); }
  }
  return out;
}

async function pixelRatio(fa, fb) {
  const [ia, ib] = await Promise.all([fa, fb].map(f => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const wa = ia.info.width, ha = ia.info.height, wb = ib.info.width, hb = ib.info.height;
  const W = Math.max(wa, wb), H = Math.max(ha, hb);
  const w = Math.min(wa, wb), h = Math.min(ha, hb);
  let diff = W * H - w * h; // non-overlapping area counts as different
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pa = (y * wa + x) * 4, pb = (y * wb + x) * 4;
      if (Math.abs(ia.data[pa] - ib.data[pb]) > CH_TOL || Math.abs(ia.data[pa + 1] - ib.data[pb + 1]) > CH_TOL || Math.abs(ia.data[pa + 2] - ib.data[pb + 2]) > CH_TOL) diff++;
    }
  }
  return { ratio: diff / (W * H), sizeA: `${wa}x${ha}`, sizeB: `${wb}x${hb}` };
}

async function main() {
  const ma = JSON.parse(fs.readFileSync(path.join(A, "manifest.json"), "utf8"));
  const mb = JSON.parse(fs.readFileSync(path.join(B, "manifest.json"), "utf8"));
  const byId = Object.fromEntries(mb.views.map(v => [v.id, v]));
  const rows = [];
  let bad = 0;
  for (const va of ma.views) {
    const vb = byId[va.id];
    if (!vb && process.argv.includes("--partial")) continue; // run with --only: compare what was taken
    if (!vb) { rows.push({ id: va.id, missing: true }); bad++; console.log(`MISSING ${va.id}`); continue; }
    const ta = fs.readFileSync(path.join(A, `${va.id}.txt`), "utf8");
    const tb = fs.readFileSync(path.join(B, `${va.id}.txt`), "utf8");
    const d = ta === tb ? [] : lineDiff(ta, tb);
    const px = await pixelRatio(path.join(A, `${va.id}.png`), path.join(B, `${va.id}.png`));
    const expected = EXPECT.has(va.key);
    // a view that fakes a 503 on purpose logs the browser's own "Failed to load resource" line — not an app error
    const errs = (vb.errors || []).filter(e => !(va.key.endsWith("_offline") && /Failed to load resource: the server responded with a status of 503/.test(e)));
    const ok = (d.length === 0 || expected) && errs.length === 0;
    if (!ok) bad++;
    rows.push({ id: va.id, textDiffLines: d.length, expected, pixelRatio: Number(px.ratio.toFixed(5)), sizeA: px.sizeA, sizeB: px.sizeB, errors: errs, diff: d.slice(0, 60) });
    console.log(`${ok ? "OK  " : "FAIL"} ${va.id.padEnd(36)} text ${d.length ? `${d.length} lines${expected ? " (expected)" : ""}` : "same"}  px ${(px.ratio * 100).toFixed(3)}%  ${px.sizeA === px.sizeB ? px.sizeA : `${px.sizeA} → ${px.sizeB}`}  errors ${errs.length}`);
    if (d.length) console.log(d.slice(0, 12).map(l => `      ${l.slice(0, 160)}`).join("\n"));
  }
  fs.writeFileSync(OUT, JSON.stringify({ a: A, b: B, rows }, null, 1));
  console.log(`\n${rows.length - bad} / ${rows.length} views OK. Report: ${OUT}`);
  process.exitCode = bad ? 1 : 0;
}

main().catch(e => { console.error(e); process.exitCode = 2; });
