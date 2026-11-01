// /api/feedback — same paths, status codes and bodies as backend/api/routes/feedback.py.
import { codeError, json, readJsonObject } from "../lib/http.js";
import { intPath, intQuery, strQuery } from "../lib/query.js";
import * as guard from "../feedback/guard.js";
import * as schema from "../feedback/schema.js";
import * as store from "../feedback/store.js";

const NOT_FOUND = () => codeError(404, "NOT_FOUND", "글을 찾을 수 없습니다.");
const INVALID = (errors) => codeError(400, "INVALID_INPUT", "입력값을 확인해 주십시오.", errors);

async function adminDenied(request, env) {
  if (!guard.adminTokenConfigured(env)) return codeError(503, "ADMIN_DISABLED", "관리자 기능이 설정되지 않았습니다.");
  if (!(await guard.isAdmin(request, env))) return codeError(401, "ADMIN_UNAUTHORIZED", "관리자 토큰이 맞지 않습니다.");
  return null;
}

async function meta() {
  return json(schema.publicMeta());
}

async function adminList({ request, env, url }) {
  const denied = await adminDenied(request, env);
  if (denied) return denied;
  const limit = intQuery(url, "limit", 200, { ge: 1, le: 500 });
  const offset = intQuery(url, "offset", 0, { ge: 0 });
  return json(await store.adminList(env.DB, { limit, offset }), 200, { "cache-control": "no-store" });
}

async function list({ env, url }) {
  const limit = intQuery(url, "limit", 20, { ge: 1, le: 100 });
  const offset = intQuery(url, "offset", 0, { ge: 0 });
  const category = strQuery(url, "category", "", { maxLength: 20 }).trim();
  const status = strQuery(url, "status", "", { maxLength: 20 }).trim();
  const cas = strQuery(url, "cas", "", { maxLength: 20 }).trim();
  return json(await store.listItems(env.DB, { limit, offset, category, status, cas }));
}

async function detail({ env, params }) {
  const item = await store.get(env.DB, intPath(params.id, "item_id"));
  return item ? json(item) : NOT_FOUND();
}

async function create({ request, env }) {
  const payload = await readJsonObject(request);
  if (schema.isHoneypotFilled(payload)) return json({ accepted: true }, 202);
  const { clean, errors } = schema.validateSubmission(payload);
  if (Object.keys(errors).length) return INVALID(errors);
  if (!(await guard.allowPost(request, env))) return codeError(429, "TOO_MANY_POSTS", "잠시 후 다시 등록해 주십시오.");
  return json(await store.create(env.DB, clean), 201);
}

async function adminUpdate({ request, env, params }) {
  const id = intPath(params.id, "item_id");
  const payload = await readJsonObject(request);
  const denied = await adminDenied(request, env);
  if (denied) return denied;
  const { clean, errors } = schema.validateAdminUpdate(payload);
  if (Object.keys(errors).length) return INVALID(errors);
  const item = await store.update(env.DB, id, clean);
  return item ? json(item) : NOT_FOUND();
}

async function adminDelete({ request, env, params }) {
  const id = intPath(params.id, "item_id");
  const denied = await adminDenied(request, env);
  if (denied) return denied;
  if (!(await store.remove(env.DB, id))) return NOT_FOUND();
  return json({ deleted: id });
}

export const routes = [
  { method: "GET", path: "/api/feedback/meta", handler: meta },
  { method: "GET", path: "/api/feedback/admin/list", handler: adminList },
  { method: "GET", path: "/api/feedback", handler: list },
  { method: "GET", path: "/api/feedback/:id", handler: detail },
  { method: "POST", path: "/api/feedback", handler: create },
  { method: "PATCH", path: "/api/feedback/:id", handler: adminUpdate },
  { method: "DELETE", path: "/api/feedback/:id", handler: adminDelete },
];
