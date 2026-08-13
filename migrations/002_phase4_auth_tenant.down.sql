DROP TABLE IF EXISTS account_recovery_tokens;
DROP TABLE IF EXISTS workspace_invites;
DROP TABLE IF EXISTS auth_sessions;
DROP INDEX IF EXISTS memberships_user_status_idx;
DROP INDEX IF EXISTS memberships_workspace_status_idx;
ALTER TABLE memberships DROP COLUMN IF EXISTS status;
ALTER TABLE workspaces DROP COLUMN IF EXISTS name;
ALTER TABLE users
  DROP COLUMN IF EXISTS mfa_secret_encrypted,
  DROP COLUMN IF EXISTS mfa_enabled,
  DROP COLUMN IF EXISTS platform_role,
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS display_name;
DELETE FROM schema_versions WHERE version = '002_phase4_auth_tenant';