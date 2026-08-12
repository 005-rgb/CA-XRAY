const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
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
const { createScanJobQueue } = require("./src/jobs/scan-queue");

const PORT = Number(process.env.PORT || 5000);
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const runtimeConfig = getRuntimeConfig();
assertProductionRuntime(runtimeConfig);
const scanQueue = createScanJobQueue({ processor: scanLive, runtimeConfig });

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
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

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 12_000) throw new Error("REQUEST_TOO_LARGE");
  }
  return body ? JSON.parse(body) : {};
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/platform") {
    sendJson(res, 200, publicPlatformConfig(runtimeConfig));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/plans") {
    sendJson(res, 200, { plans: publicPlanCatalog() });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/networks") {
    sendJson(res, 200, { networks: NETWORKS });
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/demo") {
    const scenario = url.searchParams.get("scenario") || "high";
    if (!["high", "moderate", "low"].includes(scenario)) {
      sendJson(res, 400, { error: "INVALID_DEMO", message: "Unknown demo scenario." });
      return true;
    }
    sendJson(res, 200, { scan: createDemoScan(scenario) });
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
        });
        return true;
      }
      if (!NETWORKS.some((network) => network.id === networkId)) {
        sendJson(res, 400, {
          error: "UNSUPPORTED_NETWORK",
          message: "Select one of the supported networks before a live scan.",
        });
        return true;
      }
      const job = scanQueue.enqueue({ address, networkId });
      sendJson(res, 202, {
        job: {
          id: job.id,
          status: job.status,
          statusUrl: `/api/scan/${job.id}`,
          createdAt: job.createdAt,
        },
      });
    } catch (error) {
      if (error.code === "SCAN_QUEUE_FULL") {
        sendJson(res, 429, {
          error: error.code,
          message: "The scan queue is at capacity. Retry after a short delay.",
        });
        return true;
      }
      const known = error && error.message === "REQUEST_TOO_LARGE";
      sendJson(res, known ? 413 : 500, {
        error: known ? "REQUEST_TOO_LARGE" : "SCAN_FAILED",
        message: known
          ? "The request was too large."
          : "The scan could not be queued.",
      });
    }
    return true;
  }

  const jobMatch = url.pathname.match(/^\/api\/scan\/([^/]+)$/);
  if (req.method === "GET" && jobMatch) {
    const job = scanQueue.get(jobMatch[1]);
    if (!job) {
      sendJson(res, 404, { error: "JOB_NOT_FOUND", message: "Scan job not found." });
      return true;
    }
    sendJson(res, 200, { job });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/healthz") {
    sendJson(res, 200, { status: "ok" });
    return;
  }
  if (req.method === "GET" && url.pathname === "/readyz") {
    sendJson(res, 200, { status: "ready", queue: runtimeConfig.queue.driver });
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    const handled = await handleApi(req, res, url);
    if (!handled) sendJson(res, 404, { error: "NOT_FOUND", message: "API route not found." });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendJson(res, 405, { error: "METHOD_NOT_ALLOWED", message: "Method not allowed." });
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