const crypto = require("node:crypto");
const { ROLES } = require("../security/policy");
const { resolveWorkspacePolicy } = require("../platform/config");

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RECOVERY_TTL_MS = 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVE = "active";
const DISABLED = "disabled";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function safeEmail(email) {
  const normalized = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : "";
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function passwordHash(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function verifyPassword(password, encoded) {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltText, hashText] = parts;
  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = crypto.scryptSync(password, Buffer.from(saltText, "base64url"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function base32Encode(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  const output = [];
  for (const char of String(value).replace(/=+$/, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("INVALID_TOTP_SECRET");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function totpCode(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 30_000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hash = crypto.createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest();
  const offset = hash[hash.length - 1] & 15;
  const value = (hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}

function verifyTotp(secret, code, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ""))) return false;
  for (const offset of [-30_000, 0, 30_000]) {
    if (crypto.timingSafeEqual(Buffer.from(totpCode(secret, timestamp + offset)), Buffer.from(String(code)))) {
      return true;
    }
  }
  return false;
}

class MemoryAuthStore {
  constructor({ clock = () => new Date(), superadminEmail = "" } = {}) {
    this.clock = clock;
    this.superadminEmail = normalizeEmail(superadminEmail);
    this.users = new Map();
    this.usersByEmail = new Map();
    this.workspaces = new Map();
    this.memberships = new Map();
    this.sessions = new Map();
    this.invites = new Map();
    this.recovery = new Map();
    this.audit = [];
  }

  now() { return this.clock().toISOString(); }

  async createUser({ email, password, displayName = null }) {
    const normalized = safeEmail(email);
    if (!normalized) throw Object.assign(new Error("INVALID_EMAIL"), { code: "INVALID_EMAIL" });
    if (typeof password !== "string" || password.length < 12 || password.length > 200) {
      throw Object.assign(new Error("WEAK_PASSWORD"), { code: "WEAK_PASSWORD" });
    }
    if (this.usersByEmail.has(normalized)) {
      throw Object.assign(new Error("EMAIL_IN_USE"), { code: "EMAIL_IN_USE" });
    }
    const id = `user_${crypto.randomUUID()}`;
    const workspaceId = `personal_${id}`;
    const isSuperadmin = normalized === this.superadminEmail && Boolean(this.superadminEmail);
    const user = {
      id,
      email: normalized,
      displayName: typeof displayName === "string" ? displayName.trim().slice(0, 120) || null : null,
      passwordHash: passwordHash(password),
      platformRole: isSuperadmin ? ROLES.SUPERADMIN : null,
      mfaEnabled: false,
      mfaSecret: null,
      createdAt: this.now(),
      deletedAt: null,
    };
    const workspace = {
      id: workspaceId,
      ownerUserId: id,
      workspaceType: "personal",
      planId: "free",
      createdAt: this.now(),
      archivedAt: null,
      deletedAt: null,
    };
    this.users.set(id, user);
    this.usersByEmail.set(normalized, id);
    this.workspaces.set(workspaceId, workspace);
    this.memberships.set(`${workspaceId}:${id}`, {
      workspaceId, userId: id, role: ROLES.WORKSPACE_OWNER, status: ACTIVE, createdAt: this.now(),
    });
    return { user: clone(user), workspace: clone(workspace) };
  }

  async getUserByEmail(email) {
    const id = this.usersByEmail.get(normalizeEmail(email));
    return id ? clone(this.users.get(id)) : null;
  }

  async getUser(userId) { return clone(this.users.get(userId) || null); }

  async createWorkspace({ userId, name, workspaceType = "team", planId = "team" }) {
    const user = this.users.get(userId);
    if (!user || user.deletedAt) throw Object.assign(new Error("UNAUTHORIZED"), { code: "UNAUTHORIZED" });
    const policy = resolveWorkspacePolicy({ workspaceType, planId });
    if (!policy.valid) throw Object.assign(new Error(policy.code), { code: policy.code });
    const id = `workspace_${crypto.randomUUID()}`;
    const workspace = {
      id, name: String(name || "Untitled workspace").trim().slice(0, 120) || "Untitled workspace",
      ownerUserId: userId, workspaceType, planId, createdAt: this.now(), archivedAt: null, deletedAt: null,
    };
    this.workspaces.set(id, workspace);
    this.memberships.set(`${id}:${userId}`, {
      workspaceId: id, userId, role: ROLES.WORKSPACE_OWNER, status: ACTIVE, createdAt: this.now(),
    });
    return clone(workspace);
  }

  async getWorkspace(workspaceId) { return clone(this.workspaces.get(workspaceId) || null); }

  async listWorkspaces(userId) {
    return [...this.memberships.values()]
      .filter((membership) => membership.userId === userId && membership.status === ACTIVE)
      .map((membership) => ({ ...this.workspaces.get(membership.workspaceId), role: membership.role }))
      .filter((workspace) => workspace && !workspace.deletedAt)
      .map(clone);
  }

  async getMembership(userId, workspaceId) {
    const membership = this.memberships.get(`${workspaceId}:${userId}`);
    return membership && membership.status === ACTIVE ? clone(membership) : null;
  }

  async listMemberships(workspaceId) {
    return [...this.memberships.values()]
      .filter((membership) => membership.workspaceId === workspaceId && membership.status !== "deleted")
      .map((membership) => ({ ...membership, user: this.users.get(membership.userId) }))
      .filter((item) => item.user && !item.user.deletedAt)
      .map((item) => ({ ...item, user: publicUser(item.user) }))
      .map(clone);
  }

  async createSession({ userId, workspaceId, mfaVerified = true, userAgent = null, ip = null }) {
    const id = randomToken();
    const session = {
      id, userId, workspaceId, mfaVerified, userAgent: String(userAgent || "").slice(0, 200) || null,
      ip: String(ip || "").slice(0, 64) || null, createdAt: this.now(),
      lastSeenAt: this.now(), expiresAt: new Date(this.clock().getTime() + SESSION_TTL_MS).toISOString(),
      revokedAt: null,
    };
    this.sessions.set(id, session);
    return clone(session);
  }

  async getSession(id) {
    const session = this.sessions.get(id);
    if (!session || session.revokedAt || new Date(session.expiresAt) <= this.clock()) return null;
    session.lastSeenAt = this.now();
    return clone(session);
  }

  async listSessions(userId) {
    return [...this.sessions.values()].filter((session) => session.userId === userId && !session.revokedAt)
      .map(clone);
  }

  async revokeSession(userId, sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) return false;
    session.revokedAt = this.now();
    return true;
  }

  async confirmMfa(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.revokedAt) return false;
    session.mfaVerified = true;
    return true;
  }

  async createInvite(input) {
    const token = randomToken();
    const invite = {
      id: `invite_${crypto.randomUUID()}`, workspaceId: input.workspaceId, email: normalizeEmail(input.email),
      role: input.role, tokenHash: digest(token), invitedBy: input.invitedBy, createdAt: this.now(),
      expiresAt: new Date(this.clock().getTime() + INVITE_TTL_MS).toISOString(), acceptedAt: null, revokedAt: null,
    };
    this.invites.set(invite.tokenHash, invite);
    return { invite: clone(invite), token };
  }

  async getInviteByToken(token) {
    const invite = this.invites.get(digest(token));
    if (!invite || invite.revokedAt || invite.acceptedAt || new Date(invite.expiresAt) <= this.clock()) return null;
    return clone(invite);
  }

  async acceptInvite({ tokenHash, userId }) {
    const invite = this.invites.get(tokenHash);
    if (!invite || invite.revokedAt || invite.acceptedAt || new Date(invite.expiresAt) <= this.clock()) {
      throw Object.assign(new Error("INVITE_INVALID_OR_EXPIRED"), { code: "INVITE_INVALID_OR_EXPIRED" });
    }
    const user = this.users.get(userId);
    if (!user || user.email !== invite.email) {
      throw Object.assign(new Error("INVITE_EMAIL_MISMATCH"), { code: "INVITE_EMAIL_MISMATCH" });
    }
    const workspace = this.workspaces.get(invite.workspaceId);
    if (!workspace || workspace.deletedAt) throw Object.assign(new Error("WORKSPACE_NOT_FOUND"), { code: "WORKSPACE_NOT_FOUND" });
    const activeCount = [...this.memberships.values()].filter((m) => m.workspaceId === workspace.id && m.status === ACTIVE).length;
    const policy = resolveWorkspacePolicy(workspace);
    if (policy.maxMembers !== null && activeCount >= policy.maxMembers) {
      throw Object.assign(new Error("WORKSPACE_MEMBER_LIMIT"), { code: "WORKSPACE_MEMBER_LIMIT" });
    }
    this.memberships.set(`${workspace.id}:${userId}`, {
      workspaceId: workspace.id, userId, role: invite.role, status: ACTIVE, createdAt: this.now(),
    });
    invite.acceptedAt = this.now();
    return clone(this.memberships.get(`${workspace.id}:${userId}`));
  }

  async updateMembership({ workspaceId, userId, role, status }) {
    const membership = this.memberships.get(`${workspaceId}:${userId}`);
    if (!membership || membership.status === "deleted") throw Object.assign(new Error("MEMBER_NOT_FOUND"), { code: "MEMBER_NOT_FOUND" });
    if (status && ![ACTIVE, DISABLED].includes(status)) throw Object.assign(new Error("INVALID_MEMBER_STATUS"), { code: "INVALID_MEMBER_STATUS" });
    membership.role = role || membership.role;
    membership.status = status || membership.status;
    return clone(membership);
  }

  async transferOwnership({ workspaceId, currentOwnerId, nextOwnerId }) {
    const workspace = this.workspaces.get(workspaceId);
    const current = this.memberships.get(`${workspaceId}:${currentOwnerId}`);
    const next = this.memberships.get(`${workspaceId}:${nextOwnerId}`);
    if (!workspace || !current || current.role !== ROLES.WORKSPACE_OWNER || current.status !== ACTIVE) {
      throw Object.assign(new Error("OWNER_REQUIRED"), { code: "OWNER_REQUIRED" });
    }
    if (!next || next.status !== ACTIVE) throw Object.assign(new Error("TARGET_MEMBER_REQUIRED"), { code: "TARGET_MEMBER_REQUIRED" });
    current.role = ROLES.WORKSPACE_MEMBER;
    next.role = ROLES.WORKSPACE_OWNER;
    workspace.ownerUserId = nextOwnerId;
    return clone(workspace);
  }

  async createRecoveryToken({ userId }) {
    const token = randomToken();
    const record = {
      tokenHash: digest(token), userId, createdAt: this.now(),
      expiresAt: new Date(this.clock().getTime() + RECOVERY_TTL_MS).toISOString(), usedAt: null,
    };
    this.recovery.set(record.tokenHash, record);
    return { record: clone(record), token };
  }

  async consumeRecoveryToken({ tokenHash, password }) {
    const record = this.recovery.get(tokenHash);
    if (!record || record.usedAt || new Date(record.expiresAt) <= this.clock()) {
      throw Object.assign(new Error("RECOVERY_TOKEN_INVALID"), { code: "RECOVERY_TOKEN_INVALID" });
    }
    const user = this.users.get(record.userId);
    if (!user || user.deletedAt) throw Object.assign(new Error("RECOVERY_TOKEN_INVALID"), { code: "RECOVERY_TOKEN_INVALID" });
    user.passwordHash = passwordHash(password);
    record.usedAt = this.now();
    for (const session of this.sessions.values()) if (session.userId === user.id) session.revokedAt = this.now();
    return clone(user);
  }

  async setMfa(userId, encryptedSecret, enabled) {
    const user = this.users.get(userId);
    if (!user || user.platformRole !== ROLES.SUPERADMIN) throw Object.assign(new Error("SUPERADMIN_REQUIRED"), { code: "SUPERADMIN_REQUIRED" });
    user.mfaSecret = encryptedSecret;
    user.mfaEnabled = enabled;
    return clone(user);
  }

  async appendAudit({ action, actorId = "system", workspaceId = null, metadata = {} }) {
    const entry = { id: `audit_${crypto.randomUUID()}`, action, actorId, workspaceId, metadata: clone(metadata), createdAt: this.now() };
    this.audit.push(entry);
    return clone(entry);
  }

  async listAudit(workspaceId) {
    return this.audit.filter((entry) => entry.workspaceId === workspaceId).map(clone);
  }
}

class PostgresAuthStore {
  constructor({ pool, clock = () => new Date(), superadminEmail = "" }) {
    this.pool = pool;
    this.clock = clock;
    this.superadminEmail = normalizeEmail(superadminEmail);
  }

  async createUser({ email, password, displayName = null }) {
    const normalized = safeEmail(email);
    if (!normalized) throw Object.assign(new Error("INVALID_EMAIL"), { code: "INVALID_EMAIL" });
    if (typeof password !== "string" || password.length < 12 || password.length > 200) {
      throw Object.assign(new Error("WEAK_PASSWORD"), { code: "WEAK_PASSWORD" });
    }
    const client = await this.pool.connect();
    const id = `user_${crypto.randomUUID()}`;
    const workspaceId = `personal_${id}`;
    const platformRole = normalized === this.superadminEmail && this.superadminEmail ? ROLES.SUPERADMIN : null;
    try {
      await client.query("BEGIN");
      const userResult = await client.query(
        `INSERT INTO users (id, email, display_name, password_hash, platform_role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, display_name, password_hash, platform_role, mfa_enabled, mfa_secret_encrypted, created_at, deleted_at`,
        [id, normalized, String(displayName || "").trim().slice(0, 120) || null, passwordHash(password), platformRole],
      );
      await client.query(
        `INSERT INTO workspaces (id, owner_user_id, workspace_type, plan_id) VALUES ($1, $2, 'personal', 'free')`,
        [workspaceId, id],
      );
      await client.query(
        `INSERT INTO memberships (workspace_id, user_id, role_id, status) VALUES ($1, $2, 'workspace_owner', 'active')`,
        [workspaceId, id],
      );
      await client.query("COMMIT");
      return {
        user: rowUser(userResult.rows[0]),
        workspace: { id: workspaceId, ownerUserId: id, workspaceType: "personal", planId: "free" },
      };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      if (error.code === "23505") throw Object.assign(new Error("EMAIL_IN_USE"), { code: "EMAIL_IN_USE" });
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserByEmail(email) {
    const result = await this.pool.query(
      `SELECT id, email, display_name, password_hash, platform_role, mfa_enabled, mfa_secret_encrypted, created_at, deleted_at
         FROM users WHERE lower(email) = lower($1) LIMIT 1`, [normalizeEmail(email)],
    );
    return result.rows[0] ? rowUser(result.rows[0], true) : null;
  }

  async getUser(userId) {
    const result = await this.pool.query(
      `SELECT id, email, display_name, password_hash, platform_role, mfa_enabled, mfa_secret_encrypted, created_at, deleted_at
         FROM users WHERE id = $1`, [userId],
    );
    return result.rows[0] ? rowUser(result.rows[0], true) : null;
  }

  async createWorkspace({ userId, name, workspaceType = "team", planId = "team" }) {
    const policy = resolveWorkspacePolicy({ workspaceType, planId });
    if (!policy.valid) throw Object.assign(new Error(policy.code), { code: policy.code });
    const id = `workspace_${crypto.randomUUID()}`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO workspaces (id, owner_user_id, workspace_type, plan_id, name) VALUES ($1, $2, $3, $4, $5)",
        [id, userId, workspaceType, planId, String(name || "Untitled workspace").trim().slice(0, 120)],
      );
      await client.query(
        "INSERT INTO memberships (workspace_id, user_id, role_id, status) VALUES ($1, $2, 'workspace_owner', 'active')",
        [id, userId],
      );
      await client.query("COMMIT");
      return { id, name: String(name || "Untitled workspace").trim().slice(0, 120), ownerUserId: userId, workspaceType, planId };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally { client.release(); }
  }

  async getWorkspace(workspaceId) {
    const result = await this.pool.query(
      "SELECT id, name, owner_user_id, workspace_type, plan_id, created_at, archived_at, deleted_at FROM workspaces WHERE id = $1",
      [workspaceId],
    );
    return result.rows[0] ? rowWorkspace(result.rows[0]) : null;
  }

  async listWorkspaces(userId) {
    const result = await this.pool.query(
      `SELECT w.id, w.name, w.owner_user_id, w.workspace_type, w.plan_id, w.created_at, w.archived_at, w.deleted_at,
              m.role_id, r.name AS role_name
         FROM workspaces w JOIN memberships m ON m.workspace_id = w.id
         JOIN roles r ON r.id = m.role_id
        WHERE m.user_id = $1 AND m.status = 'active' AND m.deleted_at IS NULL AND w.deleted_at IS NULL
        ORDER BY w.created_at`, [userId],
    );
    return result.rows.map((row) => ({ ...rowWorkspace(row), role: row.role_name }));
  }

  async getMembership(userId, workspaceId) {
    const result = await this.pool.query(
      `SELECT m.workspace_id, m.user_id, r.name AS role, m.status, m.created_at
         FROM memberships m JOIN roles r ON r.id = m.role_id
        WHERE m.user_id = $1 AND m.workspace_id = $2 AND m.status = 'active' AND m.deleted_at IS NULL`,
      [userId, workspaceId],
    );
    return result.rows[0] ? rowMembership(result.rows[0]) : null;
  }

  async listMemberships(workspaceId) {
    const result = await this.pool.query(
      `SELECT m.workspace_id, m.user_id, r.name AS role, m.status, m.created_at,
              u.email, u.display_name
         FROM memberships m JOIN roles r ON r.id = m.role_id JOIN users u ON u.id = m.user_id
        WHERE m.workspace_id = $1 AND m.status <> 'deleted' AND m.deleted_at IS NULL AND u.deleted_at IS NULL
        ORDER BY m.created_at`, [workspaceId],
    );
    return result.rows.map((row) => ({ ...rowMembership(row), user: { id: row.user_id, email: row.email, displayName: row.display_name } }));
  }

  async createSession({ userId, workspaceId, mfaVerified = true, userAgent = null, ip = null }) {
    const id = randomToken();
    const result = await this.pool.query(
      `INSERT INTO auth_sessions (id, user_id, workspace_id, mfa_verified, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '30 days')
       RETURNING id, user_id, workspace_id, mfa_verified, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at`,
      [id, userId, workspaceId, mfaVerified, String(userAgent || "").slice(0, 200) || null, String(ip || "").slice(0, 64) || null],
    );
    return rowSession(result.rows[0]);
  }

  async getSession(id) {
    const result = await this.pool.query(
      `UPDATE auth_sessions SET last_seen_at = NOW()
        WHERE id = $1 AND revoked_at IS NULL AND expires_at > NOW()
        RETURNING id, user_id, workspace_id, mfa_verified, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at`, [id],
    );
    return result.rows[0] ? rowSession(result.rows[0]) : null;
  }

  async listSessions(userId) {
    const result = await this.pool.query(
      `SELECT id, user_id, workspace_id, mfa_verified, user_agent, ip_address, created_at, last_seen_at, expires_at, revoked_at
         FROM auth_sessions WHERE user_id = $1 AND revoked_at IS NULL ORDER BY last_seen_at DESC`, [userId],
    );
    return result.rows.map(rowSession);
  }

  async revokeSession(userId, sessionId) {
    const result = await this.pool.query(
      "UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
      [sessionId, userId],
    );
    return Boolean(result.rowCount);
  }

  async confirmMfa(sessionId) {
    const result = await this.pool.query("UPDATE auth_sessions SET mfa_verified = TRUE WHERE id = $1 AND revoked_at IS NULL", [sessionId]);
    return Boolean(result.rowCount);
  }

  async createInvite(input) {
    const token = randomToken();
    const result = await this.pool.query(
      `INSERT INTO workspace_invites (id, workspace_id, email, role_id, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days')
       RETURNING id, workspace_id, email, token_hash, invited_by, created_at, expires_at, accepted_at, revoked_at`,
      [`invite_${crypto.randomUUID()}`, input.workspaceId, normalizeEmail(input.email),
        input.role === ROLES.WORKSPACE_OWNER ? "workspace_owner" : "workspace_member", digest(token), input.invitedBy],
    );
    return { invite: { ...rowInvite(result.rows[0]), role: input.role }, token };
  }

  async getInviteByToken(token) {
    const result = await this.pool.query(
      `SELECT i.id, i.workspace_id, i.email, r.name AS role, i.token_hash, i.invited_by, i.created_at, i.expires_at, i.accepted_at, i.revoked_at
         FROM workspace_invites i JOIN roles r ON r.id = i.role_id
        WHERE i.token_hash = $1 AND i.revoked_at IS NULL AND i.accepted_at IS NULL AND i.expires_at > NOW()`, [digest(token)],
    );
    return result.rows[0] ? rowInvite(result.rows[0]) : null;
  }

  async acceptInvite({ tokenHash, userId }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const invite = await client.query(
        `SELECT i.*, r.name AS role, w.workspace_type, w.plan_id
           FROM workspace_invites i JOIN roles r ON r.id = i.role_id JOIN workspaces w ON w.id = i.workspace_id
          WHERE i.token_hash = $1 AND i.revoked_at IS NULL AND i.accepted_at IS NULL AND i.expires_at > NOW() FOR UPDATE`, [tokenHash],
      );
      if (!invite.rowCount) throw Object.assign(new Error("INVITE_INVALID_OR_EXPIRED"), { code: "INVITE_INVALID_OR_EXPIRED" });
      const row = invite.rows[0];
      const user = await client.query("SELECT email FROM users WHERE id = $1 AND deleted_at IS NULL", [userId]);
      if (!user.rowCount || normalizeEmail(user.rows[0].email) !== normalizeEmail(row.email)) {
        throw Object.assign(new Error("INVITE_EMAIL_MISMATCH"), { code: "INVITE_EMAIL_MISMATCH" });
      }
      await client.query(
        `INSERT INTO memberships (workspace_id, user_id, role_id, status)
         VALUES ($1, $2, $3, 'active')
         ON CONFLICT (workspace_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, status = 'active', deleted_at = NULL`,
        [row.workspace_id, userId, row.role_id],
      );
      await client.query("UPDATE workspace_invites SET accepted_at = NOW() WHERE id = $1", [row.id]);
      await client.query("COMMIT");
      return { workspaceId: row.workspace_id, userId, role: row.role };
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally { client.release(); }
  }

  async updateMembership({ workspaceId, userId, role, status }) {
    const values = [];
    const sets = [];
    if (role) { sets.push(`role_id = $${values.length + 1}`); values.push(role === ROLES.WORKSPACE_OWNER ? "workspace_owner" : "workspace_member"); }
    if (status) { sets.push(`status = $${values.length + 1}`); values.push(status); }
    values.push(workspaceId, userId);
    const result = await this.pool.query(
      `UPDATE memberships SET ${sets.join(", ")}, deleted_at = CASE WHEN $${values.length - 1} = 'disabled' THEN NULL ELSE deleted_at END
        WHERE workspace_id = $${values.length - 1} AND user_id = $${values.length} AND deleted_at IS NULL
        RETURNING workspace_id, user_id, status, created_at`, values,
    );
    if (!result.rowCount) throw Object.assign(new Error("MEMBER_NOT_FOUND"), { code: "MEMBER_NOT_FOUND" });
    return this.getMembership(userId, workspaceId);
  }

  async transferOwnership({ workspaceId, currentOwnerId, nextOwnerId }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query(
        "SELECT 1 FROM memberships WHERE workspace_id = $1 AND user_id = $2 AND role_id = 'workspace_owner' AND status = 'active' FOR UPDATE",
        [workspaceId, currentOwnerId],
      );
      const next = await client.query(
        "SELECT 1 FROM memberships WHERE workspace_id = $1 AND user_id = $2 AND status = 'active' FOR UPDATE",
        [workspaceId, nextOwnerId],
      );
      if (!current.rowCount) throw Object.assign(new Error("OWNER_REQUIRED"), { code: "OWNER_REQUIRED" });
      if (!next.rowCount) throw Object.assign(new Error("TARGET_MEMBER_REQUIRED"), { code: "TARGET_MEMBER_REQUIRED" });
      await client.query("UPDATE memberships SET role_id = 'workspace_member' WHERE workspace_id = $1 AND user_id = $2", [workspaceId, currentOwnerId]);
      await client.query("UPDATE memberships SET role_id = 'workspace_owner' WHERE workspace_id = $1 AND user_id = $2", [workspaceId, nextOwnerId]);
      await client.query("UPDATE workspaces SET owner_user_id = $2 WHERE id = $1", [workspaceId, nextOwnerId]);
      await client.query("COMMIT");
      return this.getWorkspace(workspaceId);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally { client.release(); }
  }

  async createRecoveryToken({ userId }) {
    const token = randomToken();
    const result = await this.pool.query(
      `INSERT INTO account_recovery_tokens (token_hash, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')
       RETURNING token_hash, user_id, created_at, expires_at, used_at`, [digest(token), userId],
    );
    return { record: rowRecovery(result.rows[0]), token };
  }

  async consumeRecoveryToken({ tokenHash, password }) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "SELECT * FROM account_recovery_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() FOR UPDATE", [tokenHash],
      );
      if (!result.rowCount) throw Object.assign(new Error("RECOVERY_TOKEN_INVALID"), { code: "RECOVERY_TOKEN_INVALID" });
      await client.query("UPDATE users SET password_hash = $2 WHERE id = $1 AND deleted_at IS NULL", [result.rows[0].user_id, passwordHash(password)]);
      await client.query("UPDATE account_recovery_tokens SET used_at = NOW() WHERE token_hash = $1", [tokenHash]);
      await client.query("UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1", [result.rows[0].user_id]);
      await client.query("COMMIT");
      return this.getUser(result.rows[0].user_id);
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      throw error;
    } finally { client.release(); }
  }

  async setMfa(userId, encryptedSecret, enabled) {
    const result = await this.pool.query(
      `UPDATE users SET mfa_secret_encrypted = $2, mfa_enabled = $3
        WHERE id = $1 AND platform_role = $4
        RETURNING id, email, display_name, platform_role, mfa_enabled, mfa_secret_encrypted, created_at, deleted_at`,
      [userId, encryptedSecret, enabled, ROLES.SUPERADMIN],
    );
    if (!result.rowCount) throw Object.assign(new Error("SUPERADMIN_REQUIRED"), { code: "SUPERADMIN_REQUIRED" });
    return rowUser(result.rows[0]);
  }

  async appendAudit({ action, actorId = "system", workspaceId = null, metadata = {} }) {
    const result = await this.pool.query(
      `INSERT INTO audit_logs (action, actor_id, workspace_id, metadata) VALUES ($1, $2, $3, $4::jsonb)
       RETURNING id, action, actor_id, workspace_id, metadata, created_at`,
      [action, actorId, workspaceId, JSON.stringify(metadata)],
    );
    return rowAudit(result.rows[0]);
  }

  async listAudit(workspaceId) {
    const result = await this.pool.query(
      "SELECT id, action, actor_id, workspace_id, metadata, created_at FROM audit_logs WHERE workspace_id = $1 ORDER BY created_at DESC LIMIT 200",
      [workspaceId],
    );
    return result.rows.map(rowAudit);
  }
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id, email: user.email, displayName: user.displayName,
    platformRole: user.platformRole || null, mfaEnabled: Boolean(user.mfaEnabled), createdAt: user.createdAt,
  };
}

function rowUser(row, includeSensitive = false) {
  const user = {
    id: row.id, email: row.email, displayName: row.display_name,
    platformRole: row.platform_role || null, mfaEnabled: Boolean(row.mfa_enabled),
    mfaSecret: row.mfa_secret_encrypted || null, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  };
  if (includeSensitive) user.passwordHash = row.password_hash;
  return user;
}

function rowWorkspace(row) {
  return {
    id: row.id, name: row.name || null, ownerUserId: row.owner_user_id,
    workspaceType: row.workspace_type, planId: row.plan_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    archivedAt: row.archived_at, deletedAt: row.deleted_at,
  };
}

function rowMembership(row) {
  return {
    workspaceId: row.workspace_id, userId: row.user_id, role: row.role || row.role_name,
    status: row.status, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function rowSession(row) {
  return {
    id: row.id, userId: row.user_id, workspaceId: row.workspace_id, mfaVerified: row.mfa_verified,
    userAgent: row.user_agent, ip: row.ip_address,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    lastSeenAt: row.last_seen_at instanceof Date ? row.last_seen_at.toISOString() : row.last_seen_at,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    revokedAt: row.revoked_at,
  };
}

function rowInvite(row) {
  return {
    id: row.id, workspaceId: row.workspace_id, email: row.email, role: row.role || row.role_name,
    tokenHash: row.token_hash, invitedBy: row.invited_by,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    acceptedAt: row.accepted_at, revokedAt: row.revoked_at,
  };
}

function rowRecovery(row) {
  return {
    tokenHash: row.token_hash, userId: row.user_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    usedAt: row.used_at,
  };
}

function rowAudit(row) {
  return {
    id: row.id, action: row.action, actorId: row.actor_id, workspaceId: row.workspace_id,
    metadata: row.metadata, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

class AuthService {
  constructor({ store, sessionSecret, environment = "development", superadminEmail = "", clock = () => new Date() }) {
    this.store = store;
    this.sessionSecret = sessionSecret;
    this.environment = environment;
    this.clock = clock;
    this.superadminEmail = normalizeEmail(superadminEmail);
    if (!sessionSecret || String(sessionSecret).length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  }

  sign(value) {
    return crypto.createHmac("sha256", this.sessionSecret).update(value).digest("base64url");
  }

  verifySigned(value) {
    const [id, signature] = String(value || "").split(".");
    if (!id || !signature) return null;
    const expected = Buffer.from(this.sign(id));
    const received = Buffer.from(signature);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received) ? id : null;
  }

  cookie(sessionId, { clear = false } = {}) {
    const value = clear ? "" : `${sessionId}.${this.sign(sessionId)}`;
    return `ca_xray_session=${value}; HttpOnly; SameSite=Lax; Path=/; ${clear ? "Max-Age=0" : `Max-Age=${SESSION_TTL_MS / 1000}`}${this.environment === "production" ? "; Secure" : ""}`;
  }

  async authenticateRequest(req) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionId = this.verifySigned(cookies.ca_xray_session);
    if (!sessionId) return { kind: "visitor", setCookie: null };
    const session = await this.store.getSession(sessionId);
    if (!session) return { kind: "visitor", setCookie: this.cookie("", { clear: true }) };
    const user = await this.store.getUser(session.userId);
    if (!user || user.deletedAt || !session.mfaVerified) {
      return { kind: "mfa_pending", sessionId, user: user ? publicUser(user) : null, setCookie: null };
    }
    if (user.platformRole === ROLES.SUPERADMIN) {
      return {
        kind: "authenticated", sessionId, user: publicUser(user),
        actor: { id: user.id, userId: user.id, role: ROLES.SUPERADMIN, authenticated: true, workspaceId: null },
        workspaceId: null, workspaceType: null, planId: null, setCookie: null,
      };
    }
    const membership = await this.store.getMembership(user.id, session.workspaceId);
    if (!membership) return { kind: "visitor", setCookie: this.cookie("", { clear: true }) };
    const workspace = await this.store.getWorkspace(session.workspaceId);
    if (!workspace || workspace.deletedAt || workspace.archivedAt) return { kind: "visitor", setCookie: this.cookie("", { clear: true }) };
    return {
      kind: "authenticated", sessionId, user: publicUser(user), membership, workspace,
      actor: { id: user.id, userId: user.id, role: membership.role, authenticated: true, workspaceId: workspace.id },
      workspaceId: workspace.id, workspaceType: workspace.workspaceType, planId: workspace.planId, setCookie: null,
    };
  }

  async register(input, requestMeta = {}) {
    const result = await this.store.createUser(input);
    await this.audit("AUTH_REGISTERED", result.user.id, result.workspace.id, {});
    const session = await this.store.createSession({
      userId: result.user.id, workspaceId: result.workspace.id, userAgent: requestMeta.userAgent, ip: requestMeta.ip,
    });
    await this.audit("LOGIN_SUCCEEDED", result.user.id, result.workspace.id, { method: "password" });
    return { user: publicUser(result.user), workspace: result.workspace, session, setCookie: this.cookie(session.id) };
  }

  async login({ email, password }, requestMeta = {}) {
    const user = await this.store.getUserByEmail(email);
    if (!user || user.deletedAt || !verifyPassword(password, user.passwordHash)) {
      await this.audit("LOGIN_FAILED", "anonymous", null, { reason: "invalid_credentials" });
      throw Object.assign(new Error("INVALID_CREDENTIALS"), { code: "INVALID_CREDENTIALS" });
    }
    const workspaces = await this.store.listWorkspaces(user.id);
    const workspaceId = workspaces[0]?.id || null;
    const mfaVerified = user.platformRole !== ROLES.SUPERADMIN || !user.mfaEnabled;
    const session = await this.store.createSession({
      userId: user.id, workspaceId, mfaVerified, userAgent: requestMeta.userAgent, ip: requestMeta.ip,
    });
    if (!mfaVerified) {
      await this.audit("LOGIN_MFA_REQUIRED", user.id, null, {});
      return { user: publicUser(user), session, mfaRequired: true, setCookie: this.cookie(session.id) };
    }
    await this.audit("LOGIN_SUCCEEDED", user.id, workspaceId, { method: "password" });
    return { user: publicUser(user), session, setCookie: this.cookie(session.id) };
  }

  async logout(context) {
    if (context.sessionId) await this.store.revokeSession(context.user.id, context.sessionId);
    await this.audit("LOGOUT", context.user?.id || "anonymous", context.workspaceId, {});
    return { setCookie: this.cookie("", { clear: true }) };
  }

  async currentUser(context) {
    if (!context.user || context.kind !== "authenticated") return null;
    return publicUser(context.user);
  }

  async selectWorkspace(context, workspaceId) {
    if (context.kind !== "authenticated" || context.user.platformRole === ROLES.SUPERADMIN) {
      throw Object.assign(new Error("FORBIDDEN"), { code: "FORBIDDEN" });
    }
    const membership = await this.store.getMembership(context.user.id, workspaceId);
    if (!membership) throw Object.assign(new Error("WORKSPACE_NOT_FOUND"), { code: "WORKSPACE_NOT_FOUND" });
    const workspace = await this.store.getWorkspace(workspaceId);
    const sessions = await this.store.getSession(context.sessionId);
    if (!sessions) throw Object.assign(new Error("SESSION_REVOKED"), { code: "SESSION_REVOKED" });
    if (this.store instanceof MemoryAuthStore) this.store.sessions.get(context.sessionId).workspaceId = workspaceId;
    else await this.store.pool.query("UPDATE auth_sessions SET workspace_id = $2 WHERE id = $1", [context.sessionId, workspaceId]);
    await this.audit("WORKSPACE_SELECTED", context.user.id, workspaceId, {});
    return { workspace, membership };
  }

  async requireWorkspace(context, workspaceId, { owner = false } = {}) {
    if (context.kind !== "authenticated" || context.user.platformRole === ROLES.SUPERADMIN) {
      throw Object.assign(new Error("FORBIDDEN"), { code: "FORBIDDEN" });
    }
    if (context.workspaceId !== workspaceId) {
      await this.audit("AUTHORIZATION_DENIED", context.user.id, workspaceId, { reason: "workspace_scope_mismatch" });
      throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
    }
    if (owner && context.membership.role !== ROLES.WORKSPACE_OWNER) {
      await this.audit("PRIVILEGE_ESCALATION_BLOCKED", context.user.id, workspaceId, { reason: "owner_required" });
      throw Object.assign(new Error("FORBIDDEN"), { code: "FORBIDDEN" });
    }
    return true;
  }

  async createInvite(context, input) {
    await this.requireWorkspace(context, input.workspaceId, { owner: true });
    const email = safeEmail(input.email);
    const role = input.role || ROLES.WORKSPACE_MEMBER;
    if (!email || ![ROLES.WORKSPACE_MEMBER, ROLES.WORKSPACE_OWNER].includes(role)) {
      throw Object.assign(new Error("INVALID_INVITE"), { code: "INVALID_INVITE" });
    }
    const result = await this.store.createInvite({ workspaceId: input.workspaceId, email, role, invitedBy: context.user.id });
    await this.audit("INVITE_CREATED", context.user.id, input.workspaceId, { email, role });
    return { id: result.invite.id, email, role, expiresAt: result.invite.expiresAt, inviteToken: result.token };
  }

  async acceptInvite(context, token) {
    if (context.kind !== "authenticated") throw Object.assign(new Error("UNAUTHORIZED"), { code: "UNAUTHORIZED" });
    const invite = await this.store.getInviteByToken(token);
    if (!invite) throw Object.assign(new Error("INVITE_INVALID_OR_EXPIRED"), { code: "INVITE_INVALID_OR_EXPIRED" });
    const membership = await this.store.acceptInvite({ tokenHash: invite.tokenHash, userId: context.user.id });
    await this.audit("INVITE_ACCEPTED", context.user.id, membership.workspaceId, { inviteId: invite.id });
    return membership;
  }

  async updateMember(context, workspaceId, userId, input) {
    await this.requireWorkspace(context, workspaceId, { owner: true });
    if (userId === context.user.id && input.status === DISABLED) {
      throw Object.assign(new Error("CANNOT_DISABLE_SELF"), { code: "CANNOT_DISABLE_SELF" });
    }
    const existing = await this.store.getMembership(userId, workspaceId);
    if (!existing) throw Object.assign(new Error("MEMBER_NOT_FOUND"), { code: "MEMBER_NOT_FOUND" });
    if (existing.role === ROLES.WORKSPACE_OWNER && input.role === ROLES.WORKSPACE_MEMBER) {
      const members = await this.store.listMemberships(workspaceId);
      if (members.filter((member) => member.role === ROLES.WORKSPACE_OWNER && member.status === ACTIVE).length <= 1) {
        throw Object.assign(new Error("LAST_OWNER_PROTECTED"), { code: "LAST_OWNER_PROTECTED" });
      }
    }
    const result = await this.store.updateMembership({ workspaceId, userId, role: input.role, status: input.status });
    await this.audit(input.role ? "ROLE_CHANGED" : "MEMBER_STATUS_CHANGED", context.user.id, workspaceId, { targetUserId: userId, role: input.role, status: input.status });
    return result;
  }

  async transferOwnership(context, workspaceId, nextOwnerId) {
    await this.requireWorkspace(context, workspaceId, { owner: true });
    const result = await this.store.transferOwnership({ workspaceId, currentOwnerId: context.user.id, nextOwnerId });
    await this.audit("OWNERSHIP_TRANSFERRED", context.user.id, workspaceId, { targetUserId: nextOwnerId });
    return result;
  }

  async requestRecovery(email) {
    const user = await this.store.getUserByEmail(email);
    if (!user || user.deletedAt) {
      await this.audit("RECOVERY_REQUESTED", "anonymous", null, { result: "accepted" });
      return { accepted: true };
    }
    const result = await this.store.createRecoveryToken({ userId: user.id });
    await this.audit("RECOVERY_REQUESTED", user.id, null, { result: "accepted" });
    return {
      accepted: true,
      ...(this.environment === "development" ? { recoveryToken: result.token } : {}),
    };
  }

  async resetPassword(token, password) {
    if (typeof password !== "string" || password.length < 12 || password.length > 200) {
      throw Object.assign(new Error("WEAK_PASSWORD"), { code: "WEAK_PASSWORD" });
    }
    const user = await this.store.consumeRecoveryToken({ tokenHash: digest(token), password });
    await this.audit("ACCOUNT_RECOVERED", user.id, null, {});
    return { accepted: true };
  }

  encryptSecret(secret) {
    const key = crypto.createHash("sha256").update(this.sessionSecret).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
  }

  decryptSecret(encoded) {
    const [, ivText, tagText, dataText] = String(encoded || "").split(".");
    const key = crypto.createHash("sha256").update(this.sessionSecret).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(dataText, "base64url")), decipher.final()]).toString("utf8");
  }

  async enrollMfa(context) {
    if (context.kind !== "authenticated" || context.user.platformRole !== ROLES.SUPERADMIN) {
      throw Object.assign(new Error("SUPERADMIN_REQUIRED"), { code: "SUPERADMIN_REQUIRED" });
    }
    const secret = base32Encode(crypto.randomBytes(20));
    await this.store.setMfa(context.user.id, this.encryptSecret(secret), false);
    await this.audit("MFA_ENROLLED", context.user.id, null, {});
    return {
      secret,
      otpauthUrl: `otpauth://totp/CA-XRAY:${encodeURIComponent(context.user.email)}?secret=${secret}&issuer=CA-XRAY`,
    };
  }

  async confirmMfa(context, code) {
    if (context.kind !== "authenticated" || context.user.platformRole !== ROLES.SUPERADMIN) {
      throw Object.assign(new Error("SUPERADMIN_REQUIRED"), { code: "SUPERADMIN_REQUIRED" });
    }
    const user = await this.store.getUser(context.user.id);
    if (!user.mfaSecret || !verifyTotp(this.decryptSecret(user.mfaSecret), code, this.clock().getTime())) {
      throw Object.assign(new Error("INVALID_MFA_CODE"), { code: "INVALID_MFA_CODE" });
    }
    await this.store.setMfa(context.user.id, user.mfaSecret, true);
    await this.audit("MFA_ENABLED", context.user.id, null, {});
    return { enabled: true };
  }

  async verifyPendingMfa(context, code) {
    if (context.kind !== "mfa_pending" || !context.sessionId || !context.user) {
      throw Object.assign(new Error("MFA_SESSION_REQUIRED"), { code: "MFA_SESSION_REQUIRED" });
    }
    const user = await this.store.getUser(context.user.id);
    if (user.platformRole !== ROLES.SUPERADMIN || !user.mfaSecret || !verifyTotp(this.decryptSecret(user.mfaSecret), code, this.clock().getTime())) {
      await this.audit("MFA_FAILED", user.id, null, {});
      throw Object.assign(new Error("INVALID_MFA_CODE"), { code: "INVALID_MFA_CODE" });
    }
    await this.store.confirmMfa(context.sessionId);
    await this.audit("LOGIN_SUCCEEDED", user.id, null, { method: "password+mfa" });
    return { user: publicUser(user), setCookie: this.cookie(context.sessionId) };
  }

  async audit(action, actorId, workspaceId, metadata) {
    return this.store.appendAudit({ action, actorId, workspaceId, metadata });
  }
}

function parseCookies(header) {
  return String(header || "").split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    if (key) cookies[key] = decodeURIComponent(part.slice(separator + 1).trim());
    return cookies;
  }, {});
}

function createAuthService({ persistence, runtimeConfig, sessionSecret, superadminEmail = process.env.SUPERADMIN_EMAIL || "" }) {
  const store = persistence.pool
    ? new PostgresAuthStore({ pool: persistence.pool, superadminEmail })
    : new MemoryAuthStore({ superadminEmail });
  return new AuthService({
    store,
    sessionSecret,
    environment: runtimeConfig.environment,
    superadminEmail,
  });
}

module.exports = {
  ACTIVE,
  DISABLED,
  AuthService,
  MemoryAuthStore,
  PostgresAuthStore,
  createAuthService,
  digest,
  passwordHash,
  verifyPassword,
  totpCode,
  verifyTotp,
};