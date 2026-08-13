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