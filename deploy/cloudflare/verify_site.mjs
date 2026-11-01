// Entry: verify a deployed site. HTTP checks → browser checks → load-time comparison with production.
//   set NODE_PATH=G:\MSDS\frontend\node_modules
//   node deploy/cloudflare/verify_site.mjs [--base https://chemip-test.pages.dev] [--skip-browser] [--skip-timing] [--skip-board] [--chem 001008,71-43-2]
// Substances are picked from reports/r2_p_keys.json (run verify/r2_list.mjs first). Report: reports/verify/.
import fs from "node:fs";
import path from "node:path";
import { PAGES, PATHS, PRODUCTION } from "./config.mjs";
import { writeText } from "./lib/fsx.mjs";
import { MAX_CHEMS, PREFERRED_CHEMS } from "./verify/cases.mjs";
import { bundlePath, runHttpChecks } from "./verify/http_checks.mjs";
import { runBrowserChecks } from "./verify/browser_checks.mjs";
import { measure } from "./verify/timing.mjs";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : dflt; };
const flag = (name) => process.argv.includes(name);
const base = arg("--base", PAGES.url).replace(/\/+$/, "");
const outDir = path.join(PATHS.reports, "verify");

function r2Chems() {
  const file = path.join(PATHS.reports, "r2_p_keys.json");
  if (!fs.existsSync(file)) return [];
  const ids = JSON.parse(fs.readFileSync(file, "utf8")).map((k) => k.replace(/^v\d+\/p\//, "").replace(/\.json$/, ""));
  const have = new Set(ids);
  const preferred = PREFERRED_CHEMS.filter((c) => have.has(c));
  const casLike = ids.filter((c) => /^\d{2,7}-\d{2}-\d$/.test(c) && !preferred.includes(c));
  return [...preferred, ...casLike].slice(0, MAX_CHEMS);
}

// --chem a,b: open these instead (the from-R2 assertion is then skipped; the UI may use its /api fallback)
const forced = arg("--chem", "");
const chems = forced ? forced.split(",").filter(Boolean) : r2Chems();
const vars = { chem: chems[0], bundle: await bundlePath(base) };
const report = { base, at: new Date().toISOString(), chems };

console.log(`== HTTP checks on ${base}`);
report.http = await runHttpChecks(base, vars, { isTestHost: base.includes(".pages.dev") });
for (const r of report.http) console.log(`${r.ok === true ? "PASS" : r.ok === null ? "SKIP" : "FAIL"} ${r.name}${r.note ? ` — ${r.note}` : ""}`);

if (!flag("--skip-browser")) {
  console.log("== browser checks");
  report.browser = await runBrowserChecks(base, chems, path.join(outDir, "screens"), { board: !flag("--skip-board"), requireR2: !forced });
}
if (!flag("--skip-timing")) {
  console.log("== load times (median of cold runs)");
  const prodBase = new URL(PRODUCTION.url).origin;
  report.timing = await measure([{ label: "test", base }, { label: "production", base: prodBase }], vars);
}

writeText(path.join(outDir, "verify.json"), JSON.stringify(report, null, 1));
const all = [...report.http, ...(report.browser?.results || [])];
const failed = all.filter((r) => r.ok === false).length;
console.log(`\n${all.length - failed}/${all.length} checks not failing (SKIP counted as not failing). Report: ${outDir}`);
if (report.browser?.postId) console.log(`TEST board post id: ${report.browser.postId}`);
process.exitCode = failed ? 1 : 0;
