CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  ts          BIGINT NOT NULL,
  data        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);