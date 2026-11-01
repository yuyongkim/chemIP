// Copy step: runs every COPIES rule of site_rules.mjs into out/. Missing required inputs stop the build.
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../config.mjs";
import { COPIES } from "../site_rules.mjs";
import { copy } from "../lib/fsx.mjs";

function copyGlob({ dir, ext }, to) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(ext));
  for (const f of files) fs.copyFileSync(path.join(dir, f), path.join(PATHS.out, to, f));
  return files.length;
}

export function runCopies({ allowPartial = false } = {}) {
  const report = [];
  for (const rule of COPIES) {
    const dest = path.join(PATHS.out, rule.to);
    fs.mkdirSync(rule.glob ? dest : path.dirname(dest), { recursive: true });
    if (rule.glob) {
      report.push({ to: rule.to, files: copyGlob(rule.glob, rule.to) });
      continue;
    }
    const exists = fs.existsSync(rule.from) && (!fs.statSync(rule.from).isDirectory() || fs.readdirSync(rule.from).length > 0);
    if (!exists) {
      if (rule.optional) { report.push({ to: rule.to, skipped: "missing (optional)" }); continue; }
      throw new Error(`missing input: ${rule.from}`);
    }
    if (rule.required && !fs.existsSync(path.join(rule.from, rule.required))) {
      if (!allowPartial) throw new Error(`${rule.from} has no ${rule.required} (exporter still running?). Use --allow-partial to skip`);
      report.push({ to: rule.to, skipped: `no ${rule.required} (partial)` });
      continue;
    }
    copy(rule.from, dest, rule.exclude);
    report.push({ to: rule.to || "/", from: rule.from });
  }
  return report;
}
