ALTER TABLE scan_jobs
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 2 CHECK (max_attempts > 0),
  ADD COLUMN IF NOT EXISTS report_version INTEGER,
  ADD COLUMN IF NOT EXISTS report_hash TEXT,
  ADD COLUMN IF NOT EXISTS evidence_schema_version TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE scan_jobs DROP CONSTRAINT IF EXISTS scan_jobs_status_check;
ALTER TABLE scan_jobs
  ADD CONSTRAINT scan_jobs_status_check
  CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED'));

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS report_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS evidence_schema_version TEXT;

CREATE INDEX IF NOT EXISTS scan_jobs_workspace_status_created_idx
  ON scan_jobs(workspace_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS scan_jobs_workspace_network_created_idx
  ON scan_jobs(workspace_id, network_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION ca_xray_report_is_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'SUCCEEDED' AND (
    NEW.report_json IS DISTINCT FROM OLD.report_json
    OR NEW.report_hash IS DISTINCT FROM OLD.report_hash
    OR NEW.report_version IS DISTINCT FROM OLD.report_version
    OR NEW.engine_version IS DISTINCT FROM OLD.engine_version
    OR NEW.evidence_schema_version IS DISTINCT FROM OLD.evidence_schema_version
  ) THEN
    RAISE EXCEPTION 'scan_report_immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ca_xray_scan_report_immutable ON scan_jobs;
CREATE TRIGGER ca_xray_scan_report_immutable
BEFORE UPDATE ON scan_jobs
FOR EACH ROW EXECUTE FUNCTION ca_xray_report_is_immutable();