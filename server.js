const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  NETWORKS,
  createDemoScan,
  scanLive,
  validateAddress,
} = require("./src/engine");
const {
  assertProductionRuntime,
  getRuntimeConfig,
  publicPlanCatalog,
  publicPlatformConfig,
} = require("./src/platform/config");
const { toPublicScan } = require("./src/engine");
const { createScanJobQueue } = require("./src/jobs/scan-queue");
const {
  KeyedRateLimiter,
  RateLimitError,
  sha256,
} = require("./src/security/controls");
const {
  ACTIONS,
  authorize,
  createVisitorContext,
} = require("./src/security/policy");
const { PLAN_CATALOG } = require("./src/platform/config");
const { createPersistence } = require("./src/persistence");
const { createAuthService } = require("./src/auth/service");

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const runtimeConfig = getRuntimeConfig();
assertProductionRuntime(runtimeConfig);
const persistence = createPersistence({ runtimeConfig });
const persistenceReady = persistence.init();
const authService = createAuthService({
  persistence,
  runtimeConfig,
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
});
const scanQueue = createScanJobQueue({
  processor: scanLive,
  runtimeConfig,
  onStatusChange: (job) => {
    if (job.status === "RUNNING") return persistence.markJobRunning(job);
    if (job.status === "SUCCEEDED") return persistence.markJobSucceeded(job);
    if (job.status === "FAILED") return persistence.markJobFailed(job);
    return undefined;
  },
});
const requestRateLimiter = new KeyedRateLimiter();
const visitorSigningKey = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");

function sendJson(res, status, body, { context = null, headers = {} } = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...(context?.setCookie ? { "Set-Cookie": context.setCookie } : {}),
    ...headers,
  });
  res.end(payload);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
  };
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "NOT_FOUND", message: "Resource not found." });
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self';",
    });
    res.end(data);
  });
}

function safePublicPath(urlPath) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const resolved = path.resolve(PUBLIC_DIR, `.${requested}`);
  return resolved.startsWith(PUBLIC_DIR) ? resolved : null;
}

function parseCookies(header) {
  return String(header || "").split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator < 0) return cookies;
    const key = part.slice(0, separator).trim();
    let value;
    try {
      value = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return cookies;
    }
    if (key) cookies[key] = value;
    return cookies;
  }, {});
}

function signVisitorId(visitorId) {
  return crypto.createHmac("sha256", visitorSigningKey).update(visitorId).digest("base64url");
}

async function requestContext(req) {
  const authenticated = await authService.authenticateRequest(req);
  if (authenticated.kind === "authenticated" || authenticated.kind === "mfa_pending") {
    return {
      ...authenticated,
      ip: req.socket.remoteAddress || "unknown",
      apiClient: typeof req.headers["x-api-client"] === "string"
        ? req.headers["x-api-client"].slice(0, 80)
        : "web",
    };
  }
  const cookies = parseCookies(req.headers.cookie);
  const [visitorId, signature] = String(cookies.ca_xray_visitor || "").split(".");
  const expectedSignature = visitorId ? signVisitorId(visitorId) : "";
  let validCookie = false;
  if (/^[0-9a-f-]{36}$/i.test(visitorId || "") && typeof signature === "string") {
    const received = Buffer.from(signature, "base64url");
    const expected = Buffer.from(expectedSignature, "base64url");
    validCookie = received.length === expected.length
      && crypto.timingSafeEqual(received, expected);
  }
  const context = createVisitorContext({ visitorId: validCookie ? visitorId : crypto.randomUUID() });
  return {
    kind: "visitor",
    ...context,
    ip: req.socket.remoteAddress || "unknown",
    apiClient: typeof req.headers["x-api-client"] === "string"
      ? req.headers["x-api-client"].slice(0, 80)
      : "web",
    setCookie: validCookie
      ? null
      : `ca_xray_visitor=${context.actor.id.slice("visitor_".length)}.${signVisitorId(context.actor.id.slice("visitor_".length))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${runtimeConfig.environment === "production" ? "; Secure" : ""}`,
  };
}

function requestMeta(req) {
  return {
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
    ip: req.socket.remoteAddress || "unknown",
  };
}

function requireAuthenticated(context) {
  if (context.kind !== "authenticated") {
    throw Object.assign(new Error("UNAUTHORIZED"), { code: "UNAUTHORIZED" });
  }
  return context;
}

function publicSession(session, currentId) {
  return {
    id: session.id,
    workspaceId: session.workspaceId,
    userAgent: session.userAgent,
    ip: session.ip,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
    expiresAt: session.expiresAt,
    current: session.id === currentId,
  };
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > runtimeConfig.security.requestBodyBytes) throw new Error("REQUEST_TOO_LARGE");
  }
  return body ? JSON.parse(body) : {};
}

function enforceScanProtection(req, context, networkId) {
  authorize({ actor: context.actor, workspaceId: context.workspaceId, action: ACTIONS.SCAN_CREATE });
  const limits = runtimeConfig.security;
  requestRateLimiter.enforce("ip", context.ip, limits.ipRequestsPerMinute, 60_000);
  requestRateLimiter.enforce("user", context.actor.id, limits.userRequestsPerMinute, 60_000);
  requestRateLimiter.enforce("workspace", context.workspaceId, limits.workspaceRequestsPerMinute, 60_000);
  requestRateLimiter.enforce("api-client", context.apiClient, limits.apiClientRequestsPerMinute, 60_000);
  const plan = PLAN_CATALOG[context.planId];
  if (!plan) throw new Error("UNKNOWN_PLAN");
  if (scanQueue.activeForWorkspace(context.workspaceId) >= plan.maxConcurrentScans) {
    throw Object.assign(new Error("CONCURRENT_SCAN_LIMIT"), { code: "CONCURRENT_SCAN_LIMIT" });
  }
  return { plan, networkId };
}

async function handleApiUnsafe(req, res, url, context) {
  await persistenceReady;
  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readBody(req);
    const result = await authService.register({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    }, requestMeta(req));
    sendJson(res, 201, {
      user: result.user,
      workspace: result.workspace,
    }, { context: { ...context, setCookie: result.setCookie } });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(req);
    const result = await authService.login({
      email: body.email,
      password: body.password,
    }, requestMeta(req));
    sendJson(res, result.mfaRequired ? 202 : 200, {
      user: result.user,
      ...(result.mfaRequired ? { mfaRequired: true } : {}),
    }, { context: { ...context, setCookie: result.setCookie } });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/recovery/request") {
    const body = await readBody(req);
    const result = await authService.requestRecovery(body.email);
    sendJson(res, 202, {
      accepted: true,
      message: "If the account exists, recovery instructions have been issued.",
      ...(result.recoveryToken ? { recoveryToken: result.recoveryToken } : {}),
    }, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/recovery/reset") {
    const body = await readBody(req);
    const result = await authService.resetPassword(body.token, body.password);
    sendJson(res, 200, result, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/mfa/verify") {
    const body = await readBody(req);
    const result = await authService.verifyPendingMfa(context, body.code);
    sendJson(res, 200, { user: result.user }, { context: { ...context, setCookie: result.setCookie } });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    sendJson(res, 200, {
      authenticated: context.kind === "authenticated",
      ...(context.kind === "authenticated"
        ? { user: context.user, workspace: context.workspace || null, membership: context.membership || null }
        : context.kind === "mfa_pending" ? { mfaPending: true, user: context.user } : {}),
    }, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const result = await authService.logout(context);
    sendJson(res, 200, { signedOut: true }, { context: { ...context, setCookie: result.setCookie } });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/sessions") {
    const authenticated = requireAuthenticated(context);
    const sessions = await authService.store.listSessions(authenticated.user.id);
    sendJson(res, 200, { sessions: sessions.map((session) => publicSession(session, context.sessionId)) }, { context });
    return true;
  }

  const revokeSessionMatch = url.pathname.match(/^\/api\/auth\/sessions\/([^/]+)$/);
  if (req.method === "DELETE" && revokeSessionMatch) {
    const authenticated = requireAuthenticated(context);
    const revoked = await authService.store.revokeSession(authenticated.user.id, revokeSessionMatch[1]);
    if (!revoked) {
      sendJson(res, 404, { error: "SESSION_NOT_FOUND", message: "Session not found." }, { context });
      return true;
    }
    await authService.audit("SESSION_REVOKED", authenticated.user.id, null, { sessionId: revokeSessionMatch[1] });
    sendJson(res, 200, { revoked: true }, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/mfa/enroll") {
    const authenticated = requireAuthenticated(context);
    const result = await authService.enrollMfa(authenticated);
    sendJson(res, 200, result, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/mfa/confirm") {
    const body = await readBody(req);
    const result = await authService.confirmMfa(requireAuthenticated(context), body.code);
    sendJson(res, 200, result, { context });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/workspaces") {
    const authenticated = requireAuthenticated(context);
    if (authenticated.user.platformRole === "Superadmin") {
      throw Object.assign(new Error("WORKSPACE_PATH_FORBIDDEN"), { code: "WORKSPACE_PATH_FORBIDDEN" });
    }
    const workspaces = await authService.store.listWorkspaces(authenticated.user.id);
    sendJson(res, 200, { workspaces }, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/workspaces") {
    const authenticated = requireAuthenticated(context);
    if (authenticated.user.platformRole === "Superadmin") {
      throw Object.assign(new Error("WORKSPACE_PATH_FORBIDDEN"), { code: "WORKSPACE_PATH_FORBIDDEN" });
    }
    const body = await readBody(req);
    const workspace = await authService.store.createWorkspace({
      userId: authenticated.user.id,
      name: body.name,
      workspaceType: body.workspaceType,
      planId: body.planId,
    });
    await authService.audit("WORKSPACE_CREATED", authenticated.user.id, workspace.id, {
      workspaceType: workspace.workspaceType, planId: workspace.planId,
    });
    sendJson(res, 201, { workspace }, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/workspaces/select") {
    const body = await readBody(req);
    const result = await authService.selectWorkspace(requireAuthenticated(context), body.workspaceId);
    sendJson(res, 200, result, { context });
    return true;
  }

  const workspaceMembersMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/members$/);
  if (req.method === "GET" && workspaceMembersMatch) {
    const authenticated = requireAuthenticated(context);
    await authService.requireWorkspace(authenticated, workspaceMembersMatch[1]);
    const members = await authService.store.listMemberships(workspaceMembersMatch[1]);
    sendJson(res, 200, { members }, { context });
    return true;
  }

  const inviteMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/invites$/);
  if (req.method === "POST" && inviteMatch) {
    const body = await readBody(req);
    const result = await authService.createInvite(requireAuthenticated(context), {
      workspaceId: inviteMatch[1], email: body.email, role: body.role,
    });
    sendJson(res, 201, result, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/invites/accept") {
    const body = await readBody(req);
    const result = await authService.acceptInvite(requireAuthenticated(context), body.token);
    sendJson(res, 200, { membership: result }, { context });
    return true;
  }

  const memberMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/members\/([^/]+)$/);
  if (["PATCH", "POST"].includes(req.method) && memberMatch) {
    const body = await readBody(req);
    const result = await authService.updateMember(requireAuthenticated(context), memberMatch[1], memberMatch[2], {
      role: body.role,
      status: body.status || (body.disabled === true ? "disabled" : body.disabled === false ? "active" : undefined),
    });
    sendJson(res, 200, { membership: result }, { context });
    return true;
  }

  const transferMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/ownership-transfer$/);
  if (req.method === "POST" && transferMatch) {
    const body = await readBody(req);
    const workspace = await authService.transferOwnership(
      requireAuthenticated(context), transferMatch[1], body.nextOwnerId,
    );
    sendJson(res, 200, { workspace }, { context });
    return true;
  }

  const auditMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/audit$/);
  if (req.method === "GET" && auditMatch) {
    const authenticated = requireAuthenticated(context);
    await authService.requireWorkspace(authenticated, auditMatch[1], { owner: true });
    const audit = await authService.store.listAudit(auditMatch[1]);
    sendJson(res, 200, { audit }, { context });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/platform") {
    sendJson(res, 200, publicPlatformConfig(runtimeConfig), { context });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/plans") {
    sendJson(res, 200, { plans: publicPlanCatalog() }, { context });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/networks") {
    sendJson(res, 200, { networks: NETWORKS }, { context });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/demo") {
    const scenario = url.searchParams.get("scenario") || "high";
    if (!["high", "moderate", "low"].includes(scenario)) {
      sendJson(res, 400, { error: "INVALID_DEMO", message: "Unknown demo scenario." }, { context });
      return true;
    }
    sendJson(res, 200, { scan: toPublicScan(createDemoScan(scenario)) }, { context });
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/scan") {
    try {
      const body = await readBody(req);
      const address = typeof body.address === "string" ? body.address.trim() : "";
      const networkId = typeof body.network === "string" ? body.network : "";
      const validation = validateAddress(address);
      if (!validation.valid) {
        sendJson(res, 400, {
          error: validation.code,
          message: validation.message,
        }, { context });
        return true;
      }
      if (!NETWORKS.some((network) => network.id === networkId)) {
        sendJson(res, 400, {
          error: "UNSUPPORTED_NETWORK",
          message: "Select one of the supported networks before a live scan.",
        }, { context });
        return true;
      }
      enforceScanProtection(req, context, networkId);
      const headerKey = req.headers["idempotency-key"];
      if (headerKey !== undefined && (typeof headerKey !== "string" || !/^[\x21-\x7e]{1,128}$/.test(headerKey))) {
        sendJson(res, 400, {
          error: "INVALID_IDEMPOTENCY_KEY",
          message: "Idempotency-Key must be 1-128 printable characters.",
        }, { context });
        return true;
      }
      const idempotencyKey = headerKey || `scan:${sha256(`${address.toLowerCase()}:${networkId}`)}`;
      const existing = await persistence.getIdempotency(context.workspaceId, idempotencyKey);
      if (existing) {
        sendJson(res, 202, existing, { context });
        return true;
      }
      const plan = PLAN_CATALOG[context.planId];
      const created = await persistence.createScanRequest({
        workspaceId: context.workspaceId,
        actorId: context.actor.id,
        planId: context.planId,
        limit: plan.scanLimitPerMonth,
        idempotencyKey,
        address,
        networkId,
        engineVersion: "2.0.0",
      });
      if (created.duplicate) {
        sendJson(res, 202, created.response, { context });
        return true;
      }
      try {
        scanQueue.enqueue({
          jobId: created.job.id,
          address,
          networkId,
          workspaceId: context.workspaceId,
          actorId: context.actor.id,
        });
      } catch (queueError) {
        await persistence.markJobFailed({
          id: created.job.id,
          completedAt: new Date().toISOString(),
          error: {
            code: queueError.code || "SCAN_QUEUE_FAILED",
            message: queueError.message || "The scan could not be queued.",
          },
        });
        throw queueError;
      }
      const response = created.response;
      sendJson(res, 202, response, { context });
    } catch (error) {
      if (error.code === "MONTHLY_SCAN_QUOTA_EXCEEDED") {
        sendJson(res, 429, {
          error: error.code,
          message: "This workspace has reached its monthly scan limit.",
        }, { context, headers: { "Retry-After": "3600" } });
        return true;
      }
      if (error.code === "IDEMPOTENCY_REQUEST_IN_PROGRESS") {
        sendJson(res, 409, {
          error: error.code,
          message: "An identical scan request is already being created. Retry shortly.",
        }, { context, headers: { "Retry-After": "1" } });
        return true;
      }
      if (error.code === "SCAN_QUEUE_FULL") {
        sendJson(res, 429, {
          error: error.code,
          message: "The scan queue is at capacity. Retry after a short delay.",
        }, { context });
        return true;
      }
      if (error instanceof RateLimitError || error.code === "CONCURRENT_SCAN_LIMIT") {
        sendJson(res, 429, {
          error: error.code,
          message: "Scan request protection is active. Retry after a short delay.",
        }, { context, headers: { "Retry-After": String(Math.ceil((error.retryAfterMs || 1000) / 1000)) } });
        return true;
      }
      const known = error && error.message === "REQUEST_TOO_LARGE";
      sendJson(res, known ? 413 : 500, {
        error: known ? "REQUEST_TOO_LARGE" : "SCAN_FAILED",
        message: known
          ? "The request was too large."
          : "The scan could not be queued.",
      }, { context });
    }
    return true;
  }

  const jobMatch = url.pathname.match(/^\/api\/scan\/([^/]+)$/);
  if (req.method === "GET" && jobMatch) {
    const scopedJob = await persistence.getScanJob(jobMatch[1], context.workspaceId);
    if (!scopedJob) {
      sendJson(res, 404, { error: "JOB_NOT_FOUND", message: "Scan job not found." }, { context });
      return true;
    }
    sendJson(res, 200, {
      job: scopedJob && scopedJob.scan
        ? { ...scopedJob, scan: toPublicScan(scopedJob.scan) }
        : scopedJob,
    }, { context });
    return true;
  }

  return false;
}

async function handleApi(req, res, url, context) {
  try {
    return await handleApiUnsafe(req, res, url, context);
  } catch (error) {
    const status = {
      UNAUTHORIZED: 401,
      INVALID_CREDENTIALS: 401,
      FORBIDDEN: 403,
      SUPERADMIN_REQUIRED: 403,
      WORKSPACE_PATH_FORBIDDEN: 403,
      NOT_FOUND: 404,
      WORKSPACE_NOT_FOUND: 404,
      MEMBER_NOT_FOUND: 404,
      SESSION_NOT_FOUND: 404,
      INVITE_INVALID_OR_EXPIRED: 400,
      INVITE_EMAIL_MISMATCH: 403,
      WEAK_PASSWORD: 400,
      INVALID_EMAIL: 400,
      EMAIL_IN_USE: 409,
      INVALID_INVITE: 400,
      INVALID_MEMBER_STATUS: 400,
      LAST_OWNER_PROTECTED: 409,
      CANNOT_DISABLE_SELF: 400,
      OWNER_REQUIRED: 403,
      TARGET_MEMBER_REQUIRED: 400,
      WORKSPACE_MEMBER_LIMIT: 409,
      INVALID_MFA_CODE: 401,
      MFA_SESSION_REQUIRED: 401,
      MFA_REQUIRED: 401,
      RECOVERY_TOKEN_INVALID: 400,
      SESSION_REVOKED: 401,
      WORKSPACE_SCOPE_MISMATCH: 404,
    }[error.code] || (error.message === "REQUEST_TOO_LARGE" ? 413 : 500);
    sendJson(res, status, {
      error: error.code || "INTERNAL_ERROR",
      message: status >= 500 ? "The request could not be completed." : error.message,
    }, { context });
    return true;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  await persistenceReady;
  const context = await requestContext(req);
  if (req.method === "GET" && url.pathname === "/healthz") {
    sendJson(res, 200, { status: "ok" }, { context });
    return;
  }
  if (req.method === "GET" && url.pathname === "/readyz") {
    sendJson(res, 200, { status: "ready", queue: runtimeConfig.queue.driver }, { context });
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    const handled = await handleApi(req, res, url, context);
    if (!handled) sendJson(res, 404, { error: "NOT_FOUND", message: "API route not found." }, { context });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "METHOD_NOT_ALLOWED", message: "Method not allowed." }, { context });
    return;
  }
  const filePath = safePublicPath(url.pathname);
  if (!filePath) {
    sendJson(res, 403, { error: "FORBIDDEN", message: "Forbidden." });
    return;
  }
  sendFile(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`CA X-RAY listening on http://${HOST}:${PORT}`);
});