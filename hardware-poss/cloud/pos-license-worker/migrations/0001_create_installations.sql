CREATE TABLE IF NOT EXISTS installations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  client_name TEXT NOT NULL,

  activation_code_hash TEXT NOT NULL UNIQUE,

  device_id TEXT UNIQUE,

  device_token_hash TEXT,

  enabled INTEGER NOT NULL DEFAULT 1
    CHECK (enabled IN (0, 1)),

  activated_at TEXT,

  last_seen_at TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_installations_device_id
ON installations(device_id);

CREATE INDEX IF NOT EXISTS idx_installations_enabled
ON installations(enabled);