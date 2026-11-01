// AI result cache in D1 (backend mapping_store.get_ai_cache / set_ai_cache). Keys: "<chemId>", "summary:<chemId>".
import { intSetting } from "../config.js";

export async function getCached(env, key) {
  const hours = intSetting(env, "AI_CACHE_TTL_HOURS");
  const row = await env.DB
    .prepare("SELECT result_json FROM ai_cache WHERE cache_key = ? AND datetime(created_at) > datetime('now', ?)")
    .bind(key, `-${hours} hours`)
    .first();
  if (!row) return null;
  try {
    return JSON.parse(row.result_json);
  } catch {
    return null;
  }
}

export async function setCached(env, key, result, model) {
  await env.DB
    .prepare("INSERT OR REPLACE INTO ai_cache (cache_key, result_json, model, created_at) VALUES (?, ?, ?, datetime('now'))")
    .bind(key, JSON.stringify(result), model || "")
    .run();
}
