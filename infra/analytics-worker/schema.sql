CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '',
  app TEXT NOT NULL DEFAULT '',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  utm_content TEXT NOT NULL DEFAULT '',
  payload TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS events_occurred_at_idx ON events (occurred_at);
CREATE INDEX IF NOT EXISTS events_session_id_idx ON events (session_id);
CREATE INDEX IF NOT EXISTS events_name_idx ON events (name);
