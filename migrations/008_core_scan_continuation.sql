ALTER TABLE scan_jobs DROP CONSTRAINT IF EXISTS scan_jobs_status_check;
ALTER TABLE scan_jobs
  ADD CONSTRAINT scan_jobs_status_check
  CHECK (status IN ('QUEUED', 'RUNNING', 'PARTIAL', 'SUCCEEDED', 'FAILED', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS scan_jobs_partial_continuation_idx
  ON scan_jobs(status, created_at)
  WHERE status = 'PARTIAL';

-- Continuation pages are re-claimed by the same durable queue as initial scans.
-- The queue payload contains the last merged snapshot and its next cursors.