-- Anonymous usage counts. Mirrors data/usage.db (backend/usage/store.py _SCHEMA). No IP / UA / timestamps.
CREATE TABLE IF NOT EXISTS usage_daily (
    day TEXT NOT NULL,
    metric TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, metric, subject)
);
