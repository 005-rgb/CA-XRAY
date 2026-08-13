const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = 5100 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}`;
let serverProcess;

function cookieFrom(response) {
  const value = response.headers.get("set-cookie") || "";
  return value.split(";")[0] || "";
}

function makeClient() {
  let cookie = "";
  return {
    async request(pathname, options = {}) {
      const headers = new Headers(options.headers || {});
      if (cookie) headers.set("cookie", cookie);
      const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers, redirect: "manual" });
      const nextCookie = cookieFrom(response);
      if (nextCookie) cookie = nextCookie;
      return response;
    },
    get cookie() { return cookie; },
    set cookie(value) { cookie = value; },
  };
}

async function json(response) {
  return response.json();
}

async function waitForServer() {
  let output = "";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server did not start. Output: ${output}`)), 10_000);
    const onData = (chunk) => {
      output += chunk.toString();
      if (output.includes("CA X-RAY listening")) {
        clearTimeout(timeout);
        resolve();
      }
    };
    serverProcess.stdout.on("data", onData);
    serverProcess.stderr.on("data", (chunk) => { output += chunk.toString(); });
    serverProcess.once("error", reject);
    serverProcess.once("exit", (code) => {
      if (code !== null) reject(new Error(`Server exited with ${code}. Output: ${output}`));
    });
  });
}

function base32Decode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let buffer = 0;
  const output = [];
  for (const char of String(value).replace(/=+$/, "").toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid TOTP secret");
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

test.before(async () => {
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: "development",
      DATA_STORE_DRIVER: "memory",
      SCAN_QUEUE_DRIVER: "memory",
      SESSION_SECRET: "phase4-e2e-session-secret-32-bytes-minimum",
      SUPERADMIN_EMAIL: "root@example.com",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();
});

test.after(() => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill("SIGTERM");
});

test("Phase 4 HTTP authorization matrix", async () => {
  const visitor = makeClient();
  const homepage = await visitor.request("/");
  assert.equal(homepage.status, 200);
  const homepageHtml = await homepage.text();
  assert.match(homepageHtml, /CA X-RAY/);

  const privateRedirect = await visitor.request("/dashboard");
  assert.equal(privateRedirect.status, 302);
  assert.match(privateRedirect.headers.get("location"), /^\/login\?returnTo=/);

  const visitorScan = await visitor.request("/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      network: "ethereum",
      address: `0x${"1".repeat(40)}`,
    }),
  });
  assert.equal(visitorScan.status, 401);

  const demoWithoutAuth = await visitor.request("/api/demo?scenario=high");
  assert.equal(demoWithoutAuth.status, 401);

  const userA = makeClient();
  const registerA = await userA.request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "a@example.com", password: "correct horse battery staple" }),
  });
  assert.equal(registerA.status, 201);
  const accountA = await json(registerA);
  const ownAudit = await userA.request(`/api/workspaces/${accountA.workspace.id}/audit`);
  assert.equal(ownAudit.status, 200);
  assert.ok((await json(ownAudit)).audit.some((entry) => entry.action === "AUTH_REGISTERED"));

  const scanResponse = await userA.request("/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ network: "ethereum", address: `0x${"1".repeat(40)}` }),
  });
  assert.equal(scanResponse.status, 202);
  const scanBody = await json(scanResponse);
  const scanId = scanBody.job.id;

  const ownJob = await userA.request(`/api/scan/${encodeURIComponent(scanId)}`);
  assert.equal(ownJob.status, 200);

  const demoWithAuth = await userA.request("/api/demo?scenario=high");
  assert.equal(demoWithAuth.status, 200);

  const userB = makeClient();
  const registerB = await userB.request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "b@example.com", password: "correct horse battery staple" }),
  });
  assert.equal(registerB.status, 201);

  const crossTenantJob = await userB.request(`/api/scan/${encodeURIComponent(scanId)}`);
  assert.equal(crossTenantJob.status, 404);
  const crossTenantHistory = await userB.request("/api/scans");
  assert.equal(crossTenantHistory.status, 200);
  assert.deepEqual((await json(crossTenantHistory)).scans, []);

  const invalidSession = makeClient();
  invalidSession.cookie = "ca_xray_session=invalid.invalid";
  const deniedInvalidSession = await invalidSession.request("/api/scans");
  assert.equal(deniedInvalidSession.status, 401);

  const revokedSession = makeClient();
  const registerRevoked = await revokedSession.request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "revoked@example.com", password: "correct horse battery staple" }),
  });
  assert.equal(registerRevoked.status, 201);
  const logout = await revokedSession.request("/api/auth/logout", { method: "POST" });
  assert.equal(logout.status, 200);
  assert.equal((await revokedSession.request("/api/scans")).status, 401);

  const superadmin = makeClient();
  const registerAdmin = await superadmin.request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "root@example.com", password: "correct horse battery staple" }),
  });
  assert.equal(registerAdmin.status, 201);

  const enrollmentResponse = await superadmin.request("/api/auth/mfa/enroll", { method: "POST" });
  assert.equal(enrollmentResponse.status, 200);
  const enrollment = await json(enrollmentResponse);
  const code = totpCode(enrollment.secret);
  const confirm = await superadmin.request("/api/auth/mfa/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  assert.equal(confirm.status, 200);

  await superadmin.request("/api/auth/logout", { method: "POST" });
  const adminLogin = await superadmin.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "root@example.com", password: "correct horse battery staple" }),
  });
  assert.equal(adminLogin.status, 202);
  assert.equal((await superadmin.request("/api/workspaces")).status, 401);

  const verify = await superadmin.request("/api/auth/mfa/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: totpCode(enrollment.secret) }),
  });
  assert.equal(verify.status, 200);
  assert.equal((await superadmin.request("/api/workspaces")).status, 403);
});