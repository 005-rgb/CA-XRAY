ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS platform_role TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_ci_unique_idx
  ON users (lower(email))
  WHERE deleted_at IS NULL AND email IS NOT NULL;

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE memberships
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled', 'deleted'));

CREATE INDEX IF NOT EXISTS memberships_user_status_idx ON memberships(user_id, status);
CREATE INDEX IF NOT EXISTS memberships_workspace_status_idx ON memberships(workspace_id, status);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT REFERENCES workspaces(id),
  mfa_verified BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_active_idx
  ON auth_sessions(user_id, last_seen_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
  ON auth_sessions(expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS workspace_invites_workspace_idx
  ON workspace_invites(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS account_recovery_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS account_recovery_user_idx
  ON account_recovery_tokens(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS email_verification_user_idx
  ON email_verification_tokens(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS mfa_recovery_codes_active_unique_idx
  ON mfa_recovery_codes(user_id, code_hash)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS mfa_recovery_codes_user_idx
  ON mfa_recovery_codes(user_id, used_at);

CREATE TABLE IF NOT EXISTS email_delivery_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL CHECK (job_type IN ('EMAIL_VERIFICATION', 'ACCOUNT_RECOVERY', 'NEW_LOGIN', 'WORKSPACE_INVITE')),
  recipient TEXT NOT NULL,
  template_version TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD_LETTER')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS email_delivery_pending_idx
  ON email_delivery_jobs(status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS email_delivery_recipient_idx
  ON email_delivery_jobs(recipient, created_at DESC);

-- Deferred ownership invariant: a workspace must always settle with one active
-- owner membership after a transaction commits. This permits atomic transfers
-- and the initial workspace/member inserts in the same transaction.
CREATE OR REPLACE FUNCTION ca_xray_assert_workspace_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_workspace TEXT;
  owner_user TEXT;
BEGIN
  target_workspace := COALESCE(NEW.workspace_id, OLD.workspace_id);
  SELECT owner_user_id INTO owner_user FROM workspaces WHERE id = target_workspace;
  IF owner_user IS NULL OR NOT EXISTS (
    SELECT 1
      FROM memberships
     WHERE workspace_id = target_workspace
       AND user_id = owner_user
       AND role_id = 'workspace_owner'
       AND status = 'active'
       AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'workspace_owner_membership_required';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ca_xray_workspace_owner_membership ON memberships;
CREATE CONSTRAINT TRIGGER ca_xray_workspace_owner_membership
AFTER INSERT OR UPDATE OR DELETE ON memberships
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ca_xray_assert_workspace_owner();

DROP TRIGGER IF EXISTS ca_xray_workspace_owner_record ON workspaces;
CREATE CONSTRAINT TRIGGER ca_xray_workspace_owner_record
AFTER INSERT OR UPDATE ON workspaces
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ca_xray_assert_workspace_owner();

CREATE INDEX IF NOT EXISTS entitlements_workspace_capability_idx
  ON entitlements(workspace_id, capability, status, effective_at, expires_at);

INSERT INTO schema_versions (version, engine_version, evidence_schema_version)
VALUES ('002_phase4_auth_tenant', '2.0.0', '1.0.0')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();