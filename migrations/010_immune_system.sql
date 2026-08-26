CREATE TABLE IF NOT EXISTS immune_decisions (
  decision_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  actor_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  decision_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS immune_decisions_workspace_created_idx
  ON immune_decisions(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS immune_passports (
  passport_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  decision_id TEXT NOT NULL,
  passport_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS immune_passports_workspace_idx
  ON immune_passports(workspace_id, created_at DESC);