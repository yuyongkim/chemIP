// UI step: run build_chemip.cjs --out <stage/build/dist> (the live public/chemip/dist is never touched), then place
// the page at out/chemip.html with window.CHEMIP_STATIC inlined right after <base>, and app.js under out/chemip/dist/.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PATHS, SITE, UI } from "../config.mjs";
import { writeText } from "../lib/fsx.mjs";

function build() {
  const r = spawnSync(process.execPath, [PATHS.uiBuildScript, "--out", PATHS.uiBuild], { encoding: "utf8", stdio: "inherit" });
  if (r.status !== 0) throw new Error("build_chemip.cjs --out failed");
}

export function staticConfigScript(cfg = SITE.static) {
  return `<script>window.CHEMIP_STATIC = ${JSON.stringify(cfg)};</script>`;
}

export function injectStatic(html) {
  if (!html.includes(UI.baseTag)) throw new Error(`built index.html has no ${UI.baseTag}`);
  if (html.includes("window.CHEMIP_STATIC")) throw new Error("built index.html already sets CHEMIP_STATIC");
  return html.replace(UI.baseTag, `${UI.baseTag}\n${staticConfigScript()}`);
}

export function assembleUi() {
  build();
  const html = fs.readFileSync(path.join(PATHS.uiBuild, "index.html"), "utf8");
  writeText(path.join(PATHS.out, UI.pageFile), injectStatic(html));
  fs.mkdirSync(path.join(PATHS.out, UI.bundleDir), { recursive: true });
  fs.copyFileSync(path.join(PATHS.uiBuild, "app.js"), path.join(PATHS.out, UI.bundleDir, "app.js"));
  return { page: UI.pageFile, bundle: `${UI.bundleDir}/app.js`, static: SITE.static };
}
