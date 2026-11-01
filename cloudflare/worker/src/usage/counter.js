// Counting hook (backend/usage/middleware.py): count a 200 response for a matched path, never for bots.
// Runs in ctx.waitUntil so it never delays or breaks the response.
import { isBot, match } from "./matcher.js";
import { increment } from "./store.js";

export function countIfMatched(request, env, ctx, pathname, status) {
  const hit = match(request.method, pathname);
  if (!hit || status !== 200 || isBot(request.headers.get("user-agent"))) return;
  ctx.waitUntil(increment(env.DB, hit[0], hit[1]).catch(() => console.warn(`usage counter failed for metric=${hit[0]}`)));
}
