CREATE TABLE IF NOT EXISTS watchtower_runs (
  run_id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  window_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED','CLAIMED','RUNNING','SUCCEEDED','FAILED','CANCELLED','DEAD_LETTERED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  lease_owner TEXT,
  lease_until TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (target_id, window_key)
);

CREATE INDEX IF NOT EXISTS watchtower_runs_claim_idx
  ON watchtower_runs(status, next_attempt_at, lease_until, created_at)
  WHERE status IN ('QUEUED','CLAIMED','RUNNING');

CREATE TABLE IF NOT EXISTS watchtower_dead_letters (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES watchtower_runs(run_id),
  workspace_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_versions (version, engine_version, evidence_schema_version)
VALUES ('009_watchtower_durable', '2.4.0', '1.4.0')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();