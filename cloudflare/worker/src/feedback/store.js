// Request-board storage in D1. Port of backend/feedback/store.py; validation lives in schema.js.
// contact is stored but only returned by adminList (adminView); never logged.
import { DEFAULT_STATUS } from "./schema.js";
import { nowIsoUtc } from "../lib/time.js";

const PUBLIC_FIELDS = ["id", "created_at", "category", "title", "body", "cas", "company_size", "status", "admin_reply", "reply_at"];
const ADMIN_FIELDS = [...PUBLIC_FIELDS, "contact"];

function pick(row, fields) {
  if (!row) return null;
  const out = {};
  for (const f of fields) out[f] = row[f];
  return out;
}

export const publicView = (row) => pick(row, PUBLIC_FIELDS);
export const adminView = (row) => pick(row, ADMIN_FIELDS);

export async function create(db, entry) {
  const row = await db
    .prepare(
      "INSERT INTO feedback (created_at, category, title, body, cas, company_size, contact, status) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    )
    .bind(nowIsoUtc(), entry.category, entry.title, entry.body, entry.cas || "", entry.company_size || "", entry.contact || "", DEFAULT_STATUS)
    .first();
  return publicView(row);
}

export async function get(db, id) {
  return publicView(await db.prepare("SELECT * FROM feedback WHERE id = ?").bind(id).first());
}

export async function listItems(db, { limit = 20, offset = 0, category = "", status = "", cas = "" } = {}) {
  const where = [];
  const params = [];
  for (const [col, val] of [["category", category], ["status", status], ["cas", cas]]) {
    if (val) {
      where.push(`${col} = ?`);
      params.push(val);
    }
  }
  const clause = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const totalRow = await db.prepare(`SELECT COUNT(*) AS n FROM feedback${clause}`).bind(...params).first();
  const rows = await db.prepare(`SELECT * FROM feedback${clause} ORDER BY id DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all();
  return { total: totalRow.n, limit, offset, items: rows.results.map(publicView) };
}

export async function adminList(db, { limit = 200, offset = 0 } = {}) {
  const totalRow = await db.prepare("SELECT COUNT(*) AS n FROM feedback").first();
  const rows = await db.prepare("SELECT * FROM feedback ORDER BY id DESC LIMIT ? OFFSET ?").bind(limit, offset).all();
  return { total: totalRow.n, limit, offset, items: rows.results.map(adminView) };
}

export async function update(db, id, changes) {
  const sets = [];
  const params = [];
  if ("status" in changes) {
    sets.push("status = ?");
    params.push(changes.status);
  }
  if ("admin_reply" in changes) {
    sets.push("admin_reply = ?", "reply_at = ?");
    params.push(changes.admin_reply, changes.admin_reply ? nowIsoUtc() : "");
  }
  if (!sets.length) return get(db, id);
  const res = await db.prepare(`UPDATE feedback SET ${sets.join(", ")} WHERE id = ?`).bind(...params, id).run();
  if (!res.meta.changes) return null;
  return get(db, id);
}

export async function remove(db, id) {
  const res = await db.prepare("DELETE FROM feedback WHERE id = ?").bind(id).run();
  return res.meta.changes > 0;
}
