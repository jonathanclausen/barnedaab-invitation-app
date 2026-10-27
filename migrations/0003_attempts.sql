-- Tæller forkerte koder og login-forsøg, så man ikke kan gætte sig frem
CREATE TABLE IF NOT EXISTS attempts (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
