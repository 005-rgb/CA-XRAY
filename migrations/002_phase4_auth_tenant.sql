ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS platform_role TEXT,
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT;

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

INSERT INTO schema_versions (version, engine_version, evidence_schema_version)
VALUES ('002_phase4_auth_tenant', '2.0.0', '1.0.0')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();