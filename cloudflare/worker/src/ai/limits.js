// AI spend limits, checked only when a NEW model call is about to be made (cache hits are free):
//   per-client daily limit (salted IP hash, AI_CLIENT_DAILY_LIMIT) and global daily cap (AI_GLOBAL_DAILY_CAP).
import { intSetting } from "../config.js";
import { clientHash, purgeOldSalts } from "../lib/client_hash.js";
import { dailyCount, dailyIncrement, purgeOldCounters } from "../lib/ratelimit.js";
import { todayKst } from "../lib/time.js";

const SCOPE_CLIENT = "ai_client";
const SCOPE_GLOBAL = "ai_global";
const GLOBAL_KEY = "global";

export const LIMIT_MESSAGES = {
  client: "오늘 AI 분석 이용 한도에 도달했습니다. 근거 기반 요약을 대신 보여 드립니다.",
  global: "오늘 전체 AI 분석 한도에 도달했습니다. 근거 기반 요약을 대신 보여 드립니다.",
};

// Returns {allowed: true, commit} or {allowed: false, reason}. Call commit() after a successful model call.
export async function reserve(request, env) {
  const day = todayKst();
  const key = await clientHash(request, env, day);
  const [mine, all] = await Promise.all([
    dailyCount(env.DB, day, SCOPE_CLIENT, key),
    dailyCount(env.DB, day, SCOPE_GLOBAL, GLOBAL_KEY),
  ]);
  if (all >= intSetting(env, "AI_GLOBAL_DAILY_CAP")) return { allowed: false, reason: "global" };
  if (mine >= intSetting(env, "AI_CLIENT_DAILY_LIMIT")) return { allowed: false, reason: "client" };
  return {
    allowed: true,
    commit: async () => {
      await dailyIncrement(env.DB, day, SCOPE_CLIENT, key);
      await dailyIncrement(env.DB, day, SCOPE_GLOBAL, GLOBAL_KEY);
      await purgeOldCounters(env.DB, day);
      await purgeOldSalts(env.DB, day);
    },
  };
}
