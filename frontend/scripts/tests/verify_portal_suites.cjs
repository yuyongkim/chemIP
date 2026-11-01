// Existing test suites run by verify_portal_local.cjs --suites (fast) / --suites all (adds the slow trade suite).
// Each suite runs as a child process; the result is its exit code plus the last lines of output and the FAIL lines.
"use strict";

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..", "..");
const PY = [path.join(REPO, ".venv", "Scripts", "python.exe"), path.join(REPO, ".venv", "bin", "python")].find(p => fs.existsSync(p)) || "python";
const T = name => path.join(__dirname, name);

const SUITES = [
  { key: "compile_check", cmd: process.execPath, args: [T("compile_check.cjs")], timeoutMs: 300000 },
  { key: "test_lang", cmd: process.execPath, args: [T("test_lang.cjs")], timeoutMs: 300000 },
  { key: "test_unified_search", cmd: process.execPath, args: [T("test_unified_search.cjs")], timeoutMs: 300000 },
  { key: "test_calculators", cmd: process.execPath, args: [T("test_calculators.cjs")], timeoutMs: 300000 },
  { key: "test_fire_explosion", cmd: process.execPath, args: [T("test_fire_explosion.cjs")], timeoutMs: 300000 },
  { key: "test_static_extras", cmd: process.execPath, args: [T("test_static_extras.cjs")], timeoutMs: 300000 },
  { key: "test_static_search", cmd: process.execPath, args: [T("test_static_search.cjs")], timeoutMs: 600000 },
  { key: "pytest", cmd: PY, args: ["-m", "pytest", "-q", "-p", "no:cacheprovider"], timeoutMs: 900000 },
  // 실제 내보낸 자료(R2 와 같은 out/)로 비교한다 — pilot 표본에는 g/intl_add*·intl_reg_add* 부속 파일이 없어 새 목록이 빠진다(2026-11-01).
  { key: "test_static_trade", cmd: process.execPath, args: [T("test_static_trade.cjs"), "--layout", "contract", "--data", "E:/dev-cache/chemip-static/out"], timeoutMs: 1800000, slow: true },
];

function runSuite(s) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const child = spawn(s.cmd, s.args, { cwd: REPO, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" }, windowsHide: true });
    let out = "";
    child.stdout.on("data", d => { out += d; });
    child.stderr.on("data", d => { out += d; });
    const timer = setTimeout(() => { out += "\n[timeout]"; child.kill(); }, s.timeoutMs);
    child.on("close", code => {
      clearTimeout(timer);
      const lines = out.split(/\r?\n/).filter(Boolean);
      resolve({
        key: s.key, ok: code === 0, code, secs: Math.round((Date.now() - t0) / 1000),
        fails: lines.filter(l => /\bFAIL|Error|failed|error:/.test(l)).slice(0, 30),
        tail: lines.slice(-6),
      });
    });
  });
}

async function runSuites({ slow = false, only = null } = {}) {
  const list = SUITES.filter(s => (slow || !s.slow) && (!only || only.includes(s.key)));
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const s = list[next++];
      const r = await runSuite(s);
      console.log(`  ${r.ok ? "PASS" : "FAIL"} ${r.key} (${r.secs}s)${r.ok ? "" : ` — ${r.fails.slice(0, 3).join(" | ") || r.tail.slice(-2).join(" | ")}`}`);
      results.push(r);
    }
  };
  // one at a time: pytest and test_static_search both open terminology.db (parallel runs gave "unable to open database file")
  await worker();
  return results.sort((a, b) => list.findIndex(s => s.key === a.key) - list.findIndex(s => s.key === b.key));
}

module.exports = { runSuites, SUITES };
