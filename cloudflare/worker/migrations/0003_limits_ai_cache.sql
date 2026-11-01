-- Worker-only tables (no backend equivalent).

-- One random salt per KST day for anonymous client hashes; rows older than today are purged.
CREATE TABLE IF NOT EXISTS daily_salt (
    day TEXT PRIMARY KEY,
    salt TEXT NOT NULL
);

-- Sliding-window events (feedback post limit). key = salted hash, never an IP.
CREATE TABLE IF NOT EXISTS rate_events (
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_events ON rate_events(scope, key, ts);

-- Daily counters (AI per-client limit and global cap). key = salted hash or 'global'.
CREATE TABLE IF NOT EXISTS daily_counter (
    day TEXT NOT NULL,
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, scope, key)
);

-- AI result cache, one row per cache key ("<chemId>" for analyze, "summary:<chemId>" for summarize),
-- same keys as backend TerminologyDB.get_ai_cache / set_ai_cache.
CREATE TABLE IF NOT EXISTS ai_cache (
    cache_key TEXT PRIMARY KEY,
    result_json TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
