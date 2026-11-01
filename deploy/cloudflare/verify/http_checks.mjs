// HTTP checks (no browser): status, Location, Content-Type, body and headers of each HTTP_CASES entry.
import { HTTP_CASES } from "./cases.mjs";

function fill(path, vars) {
  return path.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

async function one(base, c, vars) {
  const path = fill(c.path, vars);
  if (/\{\w+\}/.test(path)) return { name: c.name, ok: null, note: `skipped: no value for ${path}` };
  const res = await fetch(base + path, { redirect: "manual", headers: { "accept-encoding": "gzip" } });
  const body = res.status < 300 || res.status >= 400 ? await res.text() : "";
  const type = res.headers.get("content-type") || "";
  const problems = [];
  if (c.status !== undefined && res.status !== c.status) problems.push(`status ${res.status} != ${c.status}`);
  if (c.location && !(res.headers.get("location") || "").includes(c.location)) problems.push(`location "${res.headers.get("location")}"`);
  if (c.type && !type.includes(c.type)) problems.push(`content-type "${type}"`);
  if (c.body && !body.includes(c.body)) problems.push(`body lacks "${c.body}"`);
  for (const [h, re] of Object.entries(c.headers || {})) {
    if (!re.test(res.headers.get(h) || "")) problems.push(`${h}: "${res.headers.get(h) || ""}"`);
  }
  const ok = problems.length === 0 ? true : c.optional ? null : false;
  return { name: c.name, path, ok, status: res.status, note: problems.join("; ") };
}

// vars: {chem, bundle}. isTestHost: run testHostOnly cases.
export async function runHttpChecks(base, vars, { isTestHost = true } = {}) {
  const out = [];
  for (const c of HTTP_CASES) {
    if (c.testHostOnly && !isTestHost) continue;
    try { out.push(await one(base, c, vars)); } catch (e) { out.push({ name: c.name, ok: false, note: String(e.message || e) }); }
  }
  return out;
}

// The bundle URL from the served page (dist/app.js?v=<hash> under <base href="/chemip/">).
export async function bundlePath(base) {
  const html = await (await fetch(`${base}/chemip`)).text();
  const m = html.match(/src="(dist\/app\.js\?v=[0-9a-f]+)"/);
  return m ? `/chemip/${m[1]}` : undefined;
}
