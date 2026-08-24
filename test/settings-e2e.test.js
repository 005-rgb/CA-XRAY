const test = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = 5600 + (process.pid % 200);
const baseUrl = `http://127.0.0.1:${port}`;
let serverProcess;

function client() {
  let cookie = "";
  return {
    async request(pathname, options = {}) {
      const headers = new Headers(options.headers || {});
      if (cookie) headers.set("cookie", cookie);
      const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers });
      const next = response.headers.get("set-cookie");
      if (next) cookie = next.split(";")[0];
      return response;
    },
  };
}

async function body(response) { return response.json(); }

test.before(async () => {
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), NODE_ENV: "development", DATA_STORE_DRIVER: "memory",
      SCAN_QUEUE_DRIVER: "memory", SESSION_SECRET: "settings-e2e-session-secret-32-bytes" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`Server did not start: ${output}`)), 10000);
    serverProcess.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.includes("CA X-RAY listening")) { clearTimeout(timer); resolve(); }
    });
    serverProcess.once("error", reject);
  });
});

test.after(() => serverProcess?.kill("SIGTERM"));

test("Settings account, team access, preferences, and retention flow", async () => {
  const owner = client();
  const register = await owner.request("/api/auth/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `settings-${process.pid}@example.com`, password: "correct horse battery staple" }),
  });
  assert.equal(register.status, 201);
  const account = await body(register);

  let response = await owner.request("/api/auth/profile", {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ displayName: "Forensic Owner" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await body(response)).user.displayName, "Forensic Owner");

  response = await owner.request("/api/auth/preferences", {
    method: "PUT", headers: { "content-type": "application/json" },
    body: JSON.stringify({ network: "base", timezone: "Asia/Jakarta", confirmLive: false }),
  });
  assert.equal(response.status, 200);
  response = await owner.request("/api/auth/preferences");
  assert.equal((await body(response)).preferences.network, "base");

  response = await owner.request("/api/workspaces", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Research Team", workspaceType: "team", planId: "team" }),
  });
  assert.equal(response.status, 201);
  const team = await body(response);
  response = await owner.request("/api/workspaces/select", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId: team.workspace.id }),
  });
  assert.equal(response.status, 200);
  response = await owner.request(`/api/workspaces/${team.workspace.id}`, {
    method: "PATCH", headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Contract Research Team" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await body(response)).workspace.name, "Contract Research Team");

  response = await owner.request("/api/auth/deletion-request", { method: "POST" });
  assert.equal(response.status, 409);
  assert.equal((await body(response)).error, "TEAM_OWNERSHIP_REQUIRED");

  response = await owner.request("/api/workspaces/select", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ workspaceId: account.workspace.id }),
  });
  assert.equal(response.status, 200);
  response = await owner.request(`/api/workspaces/${account.workspace.id}/members`);
  assert.equal(response.status, 200);
  assert.equal((await body(response)).members.length, 1);
  response = await owner.request("/api/auth/sessions/revoke-others", { method: "POST" });
  assert.equal(response.status, 200);
});

test("Personal account deletion can be scheduled and cancelled", async () => {
  const user = client();
  const register = await user.request("/api/auth/register", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `retention-${process.pid}@example.com`, password: "correct horse battery staple" }),
  });
  assert.equal(register.status, 201);
  let response = await user.request("/api/auth/deletion-request", { method: "POST" });
  assert.equal(response.status, 202);
  const scheduled = await body(response);
  assert.equal(scheduled.retentionDays, 30);
  assert.equal(new Date(scheduled.scheduledFor).getTime() > Date.now(), true);
  response = await user.request("/api/auth/deletion-request", { method: "DELETE" });
  assert.equal(response.status, 200);
  assert.equal((await body(response)).status, "cancelled");
});