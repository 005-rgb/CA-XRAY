CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'cancelled', 'completed'))
);

CREATE INDEX IF NOT EXISTS account_deletion_due_idx
  ON account_deletion_requests(status, scheduled_for);