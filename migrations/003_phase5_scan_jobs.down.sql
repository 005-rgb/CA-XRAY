DROP TRIGGER IF EXISTS ca_xray_scan_report_immutable ON scan_jobs;
DROP FUNCTION IF EXISTS ca_xray_report_is_immutable();
DROP INDEX IF EXISTS scan_jobs_workspace_network_created_idx;
DROP INDEX IF EXISTS scan_jobs_workspace_status_created_idx;

ALTER TABLE scans
  DROP COLUMN IF EXISTS evidence_schema_version,
  DROP COLUMN IF EXISTS report_version;

ALTER TABLE scan_jobs DROP CONSTRAINT IF EXISTS scan_jobs_status_check;
ALTER TABLE scan_jobs
  ADD CONSTRAINT scan_jobs_status_check
  CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED'));

ALTER TABLE scan_jobs
  DROP COLUMN IF EXISTS cancellation_reason,
  DROP COLUMN IF EXISTS evidence_schema_version,
  DROP COLUMN IF EXISTS report_hash,
  DROP COLUMN IF EXISTS report_version,
  DROP COLUMN IF EXISTS max_attempts,
  DROP COLUMN IF EXISTS attempts,
  DROP COLUMN IF EXISTS correlation_id;