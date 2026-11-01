// Entry: redeploy the Worker from cloudflare/worker.
//   node deploy/cloudflare/deploy_worker.mjs [--dry-run]                 TEST: chemip-api-test, workers.dev only
//   node deploy/cloudflare/deploy_worker.mjs --target prod [--dry-run]   cutover only: wrangler deploy --env production
// The production env (name, routes, ORIGIN) must first be added to wrangler.toml — see README "Production cutover".
import { PATHS, TARGET, WORKER } from "./config.mjs";
import { wrangler } from "./lib/wrangler.mjs";

const args = ["deploy", ...(TARGET === "prod" ? ["--env", "production"] : []), ...(process.argv.includes("--dry-run") ? ["--dry-run"] : [])];
const r = wrangler(args, { cwd: PATHS.worker });
if (r.status !== 0) process.exit(r.status || 1);
console.log(`worker (${TARGET}): ${WORKER.url || WORKER.name}`);
