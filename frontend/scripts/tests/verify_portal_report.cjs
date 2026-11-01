// Status rules and output of verify_portal_local.cjs: per-service PASS / FAIL / PARTIAL / NOT YET, the console table
// and the JSON report. Pure functions over the results the other modules return.
"use strict";

const fs = require("fs");
const path = require("path");

// mode status from page results: PASS | FAIL | STALE (PC-on failed, but the live dist is older than the service files) | SKIP
function modeStatus(results, { stale = false, skipped = false } = {}) {
  if (skipped) return "SKIP";
  if (!results.length) return "-";
  if (results.every(r => r.ok)) return "PASS";
  return stale ? "STALE" : "FAIL";
}

function deployStatus(svc, areaChecks, dataChecks, listingProblems, missingRequired) {
  const notes = [];
  let status = "OK";
  const bump = s => { if (s === "FAIL" || status === "FAIL") status = "FAIL"; else if (s === "NO DATA") status = "NO DATA"; };
  if (missingRequired.length) { bump("FAIL"); notes.push(`missing: ${missingRequired.join(", ")}`); }
  if (listingProblems.length) { bump("FAIL"); notes.push(...listingProblems); }
  for (const a of (svc.areas || []).map(k => areaChecks[k]).filter(Boolean)) {
    if (a.status === "MISSING") { bump("NO DATA"); notes.push(`area ${a.key}/ not exported`); }
    else if (a.status === "FAIL") { bump("FAIL"); notes.push(...a.problems.map(p => `${a.key}/: ${p}`)); }
  }
  for (const d of dataChecks) {
    if (d.status === "MISSING") { bump("NO DATA"); notes.push(`${d.file} not exported`); }
    else if (d.status === "FAIL") { bump("FAIL"); notes.push(...d.problems.map(p => `${d.file}: ${p}`)); }
  }
  return { status, notes };
}

function overall(row) {
  if (!row.detected) return "NOT YET";
  // PC-off + deploy readiness gate. PC-on is reported but does not gate: new /data areas need a full `next build`
  // + restart of the PC site (next.config.ts rewrites are compiled at build time).
  if (row.off === "FAIL" || row.deploy.status === "FAIL") return "FAIL";
  if (row.deploy.status === "NO DATA") return "PARTIAL";
  return "PASS";
}

function failNotes(results) {
  const out = [];
  for (const r of results.filter(x => !x.ok)) {
    for (const c of r.checks.filter(x => !x.ok)) {
      out.push(`[${r.mode} ${r.lang} ${r.width} ${r.url || "/"}] ${c.name}${c.note ? `: ${c.note}` : ""}`);
    }
  }
  return [...new Set(out)];
}

function pad(s, n) { s = String(s); return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length); }

function printTable(rows, modeInfo = {}) {
  const head = `${pad("service", 30)} ${pad("PC-off", 7)} ${pad("PC-on", 7)} ${pad("deploy", 8)} overall`;
  console.log(`\n${head}\n${"-".repeat(head.length + 4)}`);
  for (const r of rows) console.log(`${pad(`${r.key} (${r.name})`, 30)} ${pad(r.off, 7)} ${pad(r.on, 7)} ${pad(r.detected ? r.deploy.status : "-", 8)} ${r.overall}`);
  for (const r of rows.filter(x => x.overall === "FAIL" || x.overall === "PARTIAL")) {
    console.log(`\n${r.key}: ${r.overall}`);
    for (const n of [...r.deploy.notes, ...r.notes].slice(0, 12)) console.log(`  - ${n}`);
  }
  const pend = rows.filter(r => r.pending && r.pending.length);
  if (pend.length) {
    console.log("\nPC-off requests production would not serve yet (owner's deploy column shows why):");
    for (const r of pend) console.log(`  ${r.key}: ${r.pending.slice(0, 6).join(", ")}`);
  }
  const restart = [...new Set(rows.flatMap(r => r.pcRestart || []).map(x => x.replace(/^pc-restart /, "")))];
  if (restart.length) console.log(`\nPC-on: 404s for files/routes that exist in source (PC processes need a restart, not a code fix): ${restart.slice(0, 12).join(", ")}`);
  const off = modeInfo.off || {};
  if (off.buildFailed) console.log(`\nscratch build FAILED:\n  ${off.buildFailed.join("\n  ")}`);
  if (off.unrouted && off.unrouted.length) console.log(`\nunrouted /data paths (exported, but no Worker area / Pages route): ${off.unrouted.slice(0, 10).join(", ")}`);
}

function writeReport(outDir, report) {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = report.startedAt.replace(/[-:]/g, "").replace(/\..*$/, "");
  const file = path.join(outDir, `portal_report_${stamp}.json`);
  const latest = path.join(outDir, "portal_report_latest.json");
  const body = JSON.stringify(report, (k, v) => (v instanceof RegExp ? String(v) : v), 1);
  fs.writeFileSync(file, body);
  fs.writeFileSync(latest, body);
  return file;
}

module.exports = { modeStatus, deployStatus, overall, failNotes, printTable, writeReport };
