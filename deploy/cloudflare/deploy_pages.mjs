// Entry: deploy the assembled out/ + Functions to the TEST Pages project (config PAGES), production branch.
//   node deploy/cloudflare/deploy_pages.mjs
// Creates the project on first run. Never touches custom domains, DNS or routes.
import { PAGES } from "./config.mjs";
import { wrangler } from "./lib/wrangler.mjs";
import { stagePagesProject } from "./deploy/pages_project.mjs";

const cwd = stagePagesProject();
const list = wrangler(["pages", "project", "list", "--json"], { cwd, capture: true });
const exists = list.status === 0 && list.stdout.includes(`"${PAGES.project}"`);
if (!exists) {
  const r = wrangler(["pages", "project", "create", PAGES.project, "--production-branch", PAGES.productionBranch], { cwd });
  if (r.status !== 0) process.exit(r.status || 1);
}
const r = wrangler(["pages", "deploy", "--project-name", PAGES.project, "--branch", PAGES.productionBranch, "--commit-dirty=true"], { cwd });
if (r.status !== 0) process.exit(r.status || 1);
console.log(`deployed: ${PAGES.url}`);
