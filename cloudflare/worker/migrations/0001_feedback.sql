-- Request board. Mirrors data/feedback.db (backend/feedback/store.py _SCHEMA) column for column.
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    cas TEXT NOT NULL DEFAULT '',
    company_size TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    admin_reply TEXT NOT NULL DEFAULT '',
    reply_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
