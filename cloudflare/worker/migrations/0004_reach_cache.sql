-- On-demand EU REACH registration answers (src/reach/cache.js), one row per CAS. Worker-only (the PC backend keeps
-- its own in-memory cache). expires_at = checked_at + 30 days (registered) or 7 days (not registered / ambiguous);
-- upstream failures are never stored. answer_json = the /api/reach/<CAS> body.
CREATE TABLE IF NOT EXISTS reach_cache (
    cas TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    answer_json TEXT NOT NULL,
    checked_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);
