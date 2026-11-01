// GET/HEAD /data/<version>/p/<chem_id>.json, /data/<version>/g/<name>.json /data/<version>/tx/<CAS>.json and /data/<version>/pv/<CAS>.json — per-substance and shared static
// files from the R2 bucket bound as STATIC_DATA (format: scripts/static_export/CONTRACT.md).
// GET/HEAD /data/<version>/pat/<CAS>/{index,<JUR>}.json — substance → patent mapping
// (format: scripts/patent_export/README.md); key "<version>/pat/<CAS>/<file>".
// The object key is "<version>/<area>/<decoded file name>" (the client URL-encodes chem_id; the key is raw).
// Objects are stored as gzip bytes with httpMetadata contentEncoding "gzip" (pat/ index.json: plain JSON);
// they are passed through as-is (encodeBody "manual"), so the browser decompresses them.
// ETag / If-None-Match → 304. Missing → 404 JSON.
import { STATIC_DATA } from "../config.js";
import { json } from "../lib/http.js";

function objectKey(params) {
  const { version, file } = params;
  if (!STATIC_DATA.VERSION_RE.test(version) || !STATIC_DATA.FILE_RE.test(file || "")) return null;
  return `${version}/${params.area}/${file}`;
}

function patentKey(params) {
  const { version, cas, file } = params;
  if (!STATIC_DATA.VERSION_RE.test(version) || !STATIC_DATA.PATENT_CAS_RE.test(cas || "")) return null;
  if (!STATIC_DATA.PATENT_FILE_RE.test(file || "")) return null;
  return `${version}/${STATIC_DATA.PATENT_AREA}/${cas}/${file}`;
}

function notFound() {
  return json({ detail: "Not Found" }, 404, { "cache-control": STATIC_DATA.MISS_CACHE_CONTROL });
}

function headersFor(obj, area) {
  const headers = new Headers();
  obj.writeHttpMetadata(headers); // content-type, content-encoding (gzip) from the upload metadata
  if (!headers.get("content-type")) headers.set("content-type", STATIC_DATA.CONTENT_TYPE);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", (STATIC_DATA.AREA_CACHE_CONTROL || {})[area] || STATIC_DATA.HIT_CACHE_CONTROL);
  headers.set("x-chemip-source", "r2");
  return headers;
}

async function serve({ request, env, params }, keyFor = objectKey) {
  const bucket = env[STATIC_DATA.BINDING];
  if (!bucket) return json({ detail: "static data bucket is not bound" }, 503, { "cache-control": "no-store" });
  const key = keyFor(params);
  if (!key) return notFound();

  // onlyIf with the request headers: a matching If-None-Match returns the object without a body.
  const obj = request.method === "HEAD" ? await bucket.head(key) : await bucket.get(key, { onlyIf: request.headers });
  if (!obj) return notFound();
  const headers = headersFor(obj, params.area);
  if (request.method === "GET" && !("body" in obj)) return new Response(null, { status: 304, headers });
  const body = request.method === "HEAD" ? null : obj.body;
  return new Response(body, { status: 200, headers, encodeBody: "manual" });
}

const withArea = (area) => (ctx) => serve({ ...ctx, params: { ...ctx.params, area } });

const servePatent = (ctx) => serve(ctx, patentKey);
const METHODS = ["GET", "HEAD"];

export const routes = [
  ...STATIC_DATA.AREAS.flatMap((area) =>
    METHODS.map((method) => ({ method, path: `/data/:version/${area}/:file`, handler: withArea(area) })),
  ),
  ...METHODS.map((method) => ({
    method,
    path: `/data/:version/${STATIC_DATA.PATENT_AREA}/:cas/:file`,
    handler: servePatent,
  })),
];
