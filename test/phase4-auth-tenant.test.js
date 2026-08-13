const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const {
  AuthService,
  MemoryAuthStore,
  ROLES,
  digest,
  totpCode,
} = (() => {
  const auth = require("../src/auth/service");
  const policy = require("../src/security/policy");
  return { ...auth, ROLES: policy.ROLES };
})();
const { ExponentialBackoffGuard } = require("../src/security/controls");
const {
  CAPABILITIES,
  hasEntitlement,
  resolveEffectiveEntitlements,
} = require("../src/platform/entitlements");

function makeService({ superadminEmail = "" } = {}) {
  const clock = () => new Date("2026-08-13T12:00:00.000Z");
  const store = new MemoryAuthStore({ clock, superadminEmail });
  const service = new AuthService({
    store,
    sessionSecret: crypto.randomBytes(32).toString("hex"),
    clock,
    superadminEmail,
  });
  return { store, service };
}

test("registration creates a server-owned personal workspace without leaking password hashes", async () => {
  const { service } = makeService();
  const result = await service.register({ email: "owner@example.com", password: "correct horse battery staple" });
  assert.equal(result.workspace.ownerUserId, result.user.id);
  assert.equal(result.user.email, "owner@example.com");
  assert.equal("passwordHash" in result.user, false);
  const context = await service.authenticateRequest({ headers: { cookie: `ca_xray_session=${result.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` } });
  assert.equal(context.kind, "authenticated");
  assert.equal(context.workspaceId, result.workspace.id);
  assert.equal(context.membership.role, ROLES.WORKSPACE_OWNER);
});

test("workspace selection and private scope reject cross-tenant access", async () => {
  const { service } = makeService();
  const one = await service.register({ email: "one@example.com", password: "correct horse battery staple" });
  const two = await service.register({ email: "two@example.com", password: "correct horse battery staple" });
  const team = await service.store.createWorkspace({
    userId: one.user.id, name: "Forensics", workspaceType: "team", planId: "team",
  });
  const context = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${one.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  await assert.rejects(
    () => service.requireWorkspace(context, two.workspace.id),
    (error) => error.code === "NOT_FOUND",
  );
  await assert.rejects(
    () => service.selectWorkspace(context, two.workspace.id),
    (error) => error.code === "WORKSPACE_NOT_FOUND",
  );
  const selected = await service.selectWorkspace(context, team.id);
  assert.equal(selected.workspace.id, team.id);
});

test("invite is one-time, email-bound, and role changes protect the last owner", async () => {
  const { service } = makeService();
  const owner = await service.register({ email: "owner@example.com", password: "correct horse battery staple" });
  const member = await service.register({ email: "member@example.com", password: "correct horse battery staple" });
  const workspace = await service.store.createWorkspace({
    userId: owner.user.id, name: "Team", workspaceType: "team", planId: "team",
  });
  const ownerContext = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${owner.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  await service.selectWorkspace(ownerContext, workspace.id);
  const selectedOwnerContext = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${owner.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  const invite = await service.createInvite(selectedOwnerContext, {
    workspaceId: workspace.id, email: member.user.email, role: ROLES.WORKSPACE_MEMBER,
  });
  const memberContext = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${member.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  await service.acceptInvite(memberContext, invite.inviteToken);
  await assert.rejects(
    () => service.acceptInvite(memberContext, invite.inviteToken),
    (error) => error.code === "INVITE_INVALID_OR_EXPIRED",
  );
  await assert.rejects(
    () => service.updateMember(selectedOwnerContext, workspace.id, owner.user.id, { role: ROLES.WORKSPACE_MEMBER }),
    (error) => error.code === "LAST_OWNER_PROTECTED",
  );
});

test("recovery revokes sessions and is single-use", async () => {
  const { service } = makeService();
  const registered = await service.register({ email: "recover@example.com", password: "correct horse battery staple" });
  const recovery = await service.requestRecovery(registered.user.email);
  assert.ok(recovery.recoveryToken);
  await service.resetPassword(recovery.recoveryToken, "another correct password");
  await assert.rejects(
    () => service.resetPassword(recovery.recoveryToken, "third correct password"),
    (error) => error.code === "RECOVERY_TOKEN_INVALID",
  );
  const context = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${registered.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  assert.equal(context.kind, "visitor");
  const login = await service.login({ email: registered.user.email, password: "another correct password" });
  assert.equal(login.mfaRequired, undefined);
});

test("expired sessions are rejected server-side", async () => {
  let now = new Date("2026-08-13T12:00:00.000Z");
  const { service } = (() => {
    const store = new MemoryAuthStore({ clock: () => now });
    const service = new AuthService({
      store,
      sessionSecret: crypto.randomBytes(32).toString("hex"),
      clock: () => now,
    });
    return { store, service };
  })();
  const registered = await service.register({
    email: "expired@example.com",
    password: "correct horse battery staple",
  });
  const cookie = registered.setCookie.match(/ca_xray_session=([^;]+)/)[1];
  now = new Date(new Date(registered.session.expiresAt).getTime() + 1);
  const context = await service.authenticateRequest({ headers: { cookie: `ca_xray_session=${cookie}` } });
  assert.equal(context.kind, "visitor");
  assert.match(context.setCookie, /Max-Age=0/);
});

test("superadmin sessions require TOTP and never gain workspace scope", async () => {
  const { service } = makeService({ superadminEmail: "root@example.com" });
  const registered = await service.register({ email: "root@example.com", password: "correct horse battery staple" });
  const context = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${registered.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  const enrollment = await service.enrollMfa(context);
  const code = totpCode(enrollment.secret, new Date("2026-08-13T12:00:00.000Z").getTime());
  await service.confirmMfa(context, code);
  const login = await service.login({ email: "root@example.com", password: "correct horse battery staple" });
  assert.equal(login.mfaRequired, true);
  const pending = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${login.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  await service.verifyPendingMfa(pending, code);
  const authenticated = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${login.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  assert.equal(authenticated.actor.role, ROLES.SUPERADMIN);
  assert.equal(authenticated.workspaceId, null);
  await assert.rejects(() => service.requireWorkspace(authenticated, "workspace_any"), (error) => error.code === "FORBIDDEN");
});

test("production registration requires email verification before a session is issued", async () => {
  const clock = () => new Date("2026-08-13T12:00:00.000Z");
  const store = new MemoryAuthStore({ clock });
  const service = new AuthService({
    store,
    sessionSecret: crypto.randomBytes(32).toString("hex"),
    clock,
    environment: "production",
  });
  const registered = await service.register({
    email: "verify@example.com",
    password: "correct horse battery staple",
  });
  assert.equal(registered.emailVerificationRequired, true);
  assert.equal(registered.setCookie, undefined);
  assert.equal((await store.listSessions(registered.user.id)).length, 0);
  assert.ok(registered.verificationToken === undefined);
  const verification = await store.createEmailVerificationToken({ userId: registered.user.id });
  const verified = await service.verifyEmail(verification.token, { ip: "127.0.0.1" });
  assert.equal(verified.user.emailVerified, true);
  assert.ok(verified.setCookie.includes("ca_xray_session="));
  await assert.rejects(
    () => service.verifyEmail(verification.token),
    (error) => error.code === "EMAIL_VERIFICATION_INVALID",
  );
});

test("recovery codes are returned once and consumed atomically", async () => {
  const { service } = makeService({ superadminEmail: "root@example.com" });
  const registered = await service.register({
    email: "root@example.com",
    password: "correct horse battery staple",
  });
  const context = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${registered.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  const enrollment = await service.enrollMfa(context);
  const confirmation = await service.confirmMfa(context, totpCode(enrollment.secret, Date.parse("2026-08-13T12:00:00.000Z")));
  assert.equal(confirmation.recoveryCodes.length, 10);
  const login = await service.login({ email: "root@example.com", password: "correct horse battery staple" });
  const pending = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${login.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  await service.verifyPendingMfa(pending, confirmation.recoveryCodes[0]);
  const secondLogin = await service.login({ email: "root@example.com", password: "correct horse battery staple" });
  const secondPending = await service.authenticateRequest({
    headers: { cookie: `ca_xray_session=${secondLogin.setCookie.match(/ca_xray_session=([^;]+)/)[1]}` },
  });
  await assert.rejects(
    () => service.verifyPendingMfa(secondPending, confirmation.recoveryCodes[0]),
    (error) => error.code === "INVALID_MFA_CODE",
  );
});

test("backoff guard blocks after repeated failures and resets on success", () => {
  let now = 0;
  const guard = new ExponentialBackoffGuard({
    clock: () => now,
    maxFailures: 2,
    baseLockMs: 100,
    maxLockMs: 1_000,
  });
  guard.failure("ip:one");
  guard.failure("ip:one");
  assert.equal(guard.check("ip:one").allowed, false);
  now = 101;
  assert.equal(guard.check("ip:one").allowed, true);
  guard.success("ip:one");
  assert.equal(guard.snapshot("ip:one"), null);
});

test("entitlement grants override plan defaults with explicit lifecycle metadata", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");
  const entitlements = resolveEffectiveEntitlements({
    plan: { id: "free", name: "Free", capabilities: [CAPABILITIES.SCAN_CREATE, CAPABILITIES.SCAN_READ] },
    now,
    grants: [{
      capability: CAPABILITIES.SCAN_CREATE,
      status: "revoked",
      source: "manual",
      effectiveAt: now.toISOString(),
      reason: "Abuse protection",
    }],
  });
  assert.equal(hasEntitlement(entitlements, CAPABILITIES.SCAN_CREATE, now), false);
  assert.equal(hasEntitlement(entitlements, CAPABILITIES.SCAN_READ, now), true);
  assert.equal(entitlements.find((item) => item.capability === CAPABILITIES.SCAN_CREATE).reason, "Abuse protection");
});