// D1-backed counters. Keys are anonymous hashes (see client_hash.js) or fixed names ("global").

// Sliding window: allow at most `max` events per `windowSec` for (scope, key); records the event if allowed.
export async function allowInWindow(db, scope, key, max, windowSec, nowSec = Math.floor(Date.now() / 1000)) {
  const since = nowSec - windowSec;
  await db.prepare("DELETE FROM rate_events WHERE scope = ? AND ts < ?").bind(scope, since).run();
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM rate_events WHERE scope = ? AND key = ? AND ts >= ?")
    .bind(scope, key, since)
    .first();
  if ((row?.n || 0) >= max) return false;
  await db.prepare("INSERT INTO rate_events (scope, key, ts) VALUES (?, ?, ?)").bind(scope, key, nowSec).run();
  return true;
}

export async function dailyCount(db, day, scope, key) {
  const row = await db
    .prepare("SELECT count FROM daily_counter WHERE day = ? AND scope = ? AND key = ?")
    .bind(day, scope, key)
    .first();
  return row ? row.count : 0;
}

export async function dailyIncrement(db, day, scope, key) {
  await db
    .prepare(
      "INSERT INTO daily_counter (day, scope, key, count) VALUES (?, ?, ?, 1) " +
        "ON CONFLICT(day, scope, key) DO UPDATE SET count = count + 1",
    )
    .bind(day, scope, key)
    .run();
}

export async function purgeOldCounters(db, day) {
  await db.prepare("DELETE FROM daily_counter WHERE day < ?").bind(day).run();
}
