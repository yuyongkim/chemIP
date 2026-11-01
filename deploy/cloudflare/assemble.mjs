// Entry: assemble the Pages output dir (config PATHS.out). Steps: clean → UI build → copies → rules → limits.
//   node deploy/cloudflare/assemble.mjs [--allow-partial]
import path from "node:path";
import { PATHS } from "./config.mjs";
import { cleanDir, writeText } from "./lib/fsx.mjs";
import { assembleUi } from "./assemble/ui.mjs";
import { runCopies } from "./assemble/copies.mjs";
import { writeRules } from "./assemble/rules.mjs";
import { checkLimits } from "./assemble/limits.mjs";

const allowPartial = process.argv.includes("--allow-partial");
cleanDir(PATHS.out);
const report = { ui: assembleUi(), copies: runCopies({ allowPartial }), rules: writeRules(), limits: checkLimits() };
writeText(path.join(PATHS.reports, "assemble.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ ...report.rules, limits: { ...report.limits, byTop: undefined } }, null, 1));
console.log(`out: ${PATHS.out} — ${report.limits.files} files, ${(report.limits.bytes / 1048576).toFixed(1)} MiB`);
if (!report.limits.ok) {
  console.error("Pages limits exceeded:", report.limits.tooBig.slice(0, 5), report.limits.files);
  process.exit(1);
}
