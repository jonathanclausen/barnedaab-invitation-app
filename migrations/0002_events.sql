CREATE TABLE IF NOT EXISTS invite_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invite_id TEXT NOT NULL,
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS invite_events_by_invite ON invite_events (invite_id, at);
