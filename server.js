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
  AppendOnlyAuditLog,
  IdempotencyStore,
  KeyedRateLimiter,
  QuotaLedger,
  RateLimitError,
  sha256,
} = require("./src/security/controls");
const {
  ACTIONS,
  authorize,
  createVisitorContext,
} = require("./src/security/policy");
const { PLAN_CATALOG } = require("./src/platform/config");

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const runtimeConfig = getRuntimeConfig();
assertProductionRuntime(runtimeConfig);
const scanQueue = createScanJobQueue({ processor: scanLive, runtimeConfig });
const requestRateLimiter = new KeyedRateLimiter();
const quotaLedger = new QuotaLedger();
const idempotencyStore = new IdempotencyStore();
const auditLog = new AppendOnlyAuditLog();
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

function requestContext(req) {
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

async function handleApi(req, res, url, context) {
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
      const existing = idempotencyStore.get(context.workspaceId, idempotencyKey);
      if (existing) {
        sendJson(res, 202, existing, { context });
        return true;
      }
      const plan = PLAN_CATALOG[context.planId];
      const quota = quotaLedger.consume({
        workspaceId: context.workspaceId,
        planId: context.planId,
        limit: plan.scanLimitPerMonth,
      });
      if (!quota.allowed) {
        sendJson(res, 429, {
          error: "MONTHLY_SCAN_QUOTA_EXCEEDED",
          message: "This workspace has reached its monthly scan limit.",
        }, { context, headers: { "Retry-After": "3600" } });
        return true;
      }
      const job = scanQueue.enqueue({
        address,
        networkId,
        workspaceId: context.workspaceId,
        actorId: context.actor.id,
      });
      const response = {
        job: {
          id: job.id,
          status: job.status,
          statusUrl: `/api/scan/${job.id}`,
          createdAt: job.createdAt,
        },
      };
      idempotencyStore.set(context.workspaceId, idempotencyKey, response);
      auditLog.append({
        action: "SCAN_CREATED",
        actorId: context.actor.id,
        workspaceId: context.workspaceId,
        metadata: { networkId, address: address.toLowerCase(), jobId: job.id },
      });
      sendJson(res, 202, response, { context });
    } catch (error) {
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
    const scopedJob = scanQueue.getForWorkspace(jobMatch[1], context.workspaceId);
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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const context = requestContext(req);
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