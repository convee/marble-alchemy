CREATE TABLE IF NOT EXISTS paddle_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idempotency_key TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT '',
  received_at TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS paddle_webhook_events_type_idx
  ON paddle_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS paddle_webhook_events_received_idx
  ON paddle_webhook_events (received_at);
