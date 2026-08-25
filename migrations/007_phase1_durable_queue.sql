ALTER TABLE scan_jobs
  ADD COLUMN IF NOT EXISTS queue_payload JSONB,
  ADD COLUMN IF NOT EXISTS lease_owner TEXT,
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error JSONB;

ALTER TABLE scan_jobs DROP CONSTRAINT IF EXISTS scan_jobs_status_check;
ALTER TABLE scan_jobs
  ADD CONSTRAINT scan_jobs_status_check
  CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS scan_jobs_queue_claim_idx
  ON scan_jobs(status, lease_until, created_at)
  WHERE status IN ('QUEUED', 'RUNNING');

CREATE TABLE IF NOT EXISTS scan_job_dead_letters (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES scan_jobs(id),
  worker_id TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_job_dead_letters_job_idx
  ON scan_job_dead_letters(job_id, created_at DESC);

INSERT INTO schema_versions (version, engine_version, evidence_schema_version)
VALUES ('007_phase1_durable_queue', '2.3.0', '1.3.0')
ON CONFLICT (version) DO UPDATE
SET engine_version = EXCLUDED.engine_version,
    evidence_schema_version = EXCLUDED.evidence_schema_version,
    applied_at = NOW();