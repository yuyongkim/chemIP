// Entry: count R2 objects per prefix and write the p/ keys that exist (used to pick substance pages to test).
//   node deploy/cloudflare/verify/r2_list.mjs [--limit 5000]
import path from "node:path";
import { PATHS, SITE, WORKER } from "../config.mjs";
import { writeText } from "../lib/fsx.mjs";
import { listR2 } from "../lib/cf_api.mjs";

const i = process.argv.indexOf("--limit");
const limit = i >= 0 ? Number(process.argv[i + 1]) : 5000;
const v = SITE.static.version;
const out = {};
for (const area of ["g", "p", "search"]) {
  const keys = await listR2(WORKER.r2Bucket, `${v}/${area}/`, limit);
  out[area] = { count: keys.length, capped: keys.length >= limit, sample: keys.slice(0, 5) };
  if (area === "p") writeText(path.join(PATHS.reports, "r2_p_keys.json"), JSON.stringify(keys.map((k) => k.key)));
}
writeText(path.join(PATHS.reports, "r2_list.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
