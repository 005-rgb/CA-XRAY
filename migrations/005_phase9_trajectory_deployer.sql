CREATE TABLE IF NOT EXISTS risk_snapshots (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  network_id TEXT NOT NULL,
  address TEXT NOT NULL CHECK (address ~ '^0x[a-fA-F0-9]{40}$'),
  job_id TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  snapshot_json JSONB NOT NULL,
  trajectory_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, network_id, address, captured_at)
);

CREATE INDEX IF NOT EXISTS risk_snapshots_contract_time_idx
  ON risk_snapshots(workspace_id, network_id, address, captured_at DESC);

INSERT INTO schema_versions (version, engine_version, evidence_schema_version)
VALUES ('005_phase9_trajectory_deployer', '2.0.0', '1.0.0')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();