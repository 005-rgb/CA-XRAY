DROP INDEX IF EXISTS scan_jobs_queue_claim_idx;
ALTER TABLE scan_jobs
  DROP COLUMN IF EXISTS queue_payload,
  DROP COLUMN IF EXISTS lease_owner,
  DROP COLUMN IF EXISTS lease_until,
  DROP COLUMN IF EXISTS last_error;
DROP TABLE IF EXISTS scan_job_dead_letters;