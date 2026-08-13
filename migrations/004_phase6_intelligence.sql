CREATE TABLE IF NOT EXISTS intelligence_state (
  id TEXT PRIMARY KEY,
  state_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_versions (version, engine_version, evidence_schema_version)
VALUES ('004_phase6_intelligence', '2.0.0', '1.0.0')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();