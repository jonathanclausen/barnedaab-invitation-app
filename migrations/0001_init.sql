CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  greeting TEXT NOT NULL DEFAULT '',
  guests TEXT NOT NULL DEFAULT '[]',
  rsvp TEXT NOT NULL DEFAULT '{}',
  note TEXT NOT NULL DEFAULT '',
  responded_at TEXT,
  open_count INTEGER NOT NULL DEFAULT 0,
  first_opened_at TEXT,
  last_opened_at TEXT,
  link_visits INTEGER NOT NULL DEFAULT 0,
  last_visit_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
