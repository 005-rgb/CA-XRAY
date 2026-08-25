const crypto = require("node:crypto");
const { URL } = require("node:url");
const net = require("node:net");

const DELIVERY_STATUS = Object.freeze(["QUEUED", "SENT", "ACKNOWLEDGED", "FAILED", "DEAD_LETTERED"]);
function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function validateWebhookUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw Object.assign(new Error("WEBHOOK_URL_INVALID"), { code: "WEBHOOK_URL_INVALID" }); }
  if (parsed.protocol !== "https:") throw Object.assign(new Error("WEBHOOK_HTTPS_REQUIRED"), { code: "WEBHOOK_HTTPS_REQUIRED" });
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || net.isIP(host) && (net.isIPv4(host) ? /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) : host === "::1" || host.startsWith("fc") || host.startsWith("fd"))) {
    throw Object.assign(new Error("WEBHOOK_PRIVATE_HOST_FORBIDDEN"), { code: "WEBHOOK_PRIVATE_HOST_FORBIDDEN" });
  }
  return parsed.toString();
}
function signPayload(secret, body) { return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`; }
function retryable(status, error) { return Boolean(error) || status === 408 || status === 429 || status >= 500; }

class DeliveryOutbox {
  constructor({ clock = () => new Date(), maxAttempts = 3, retryBaseMs = 1_000, payloadLimit = 64_000 } = {}) {
    this.clock = clock; this.maxAttempts = maxAttempts; this.retryBaseMs = retryBaseMs; this.payloadLimit = payloadLimit; this.jobs = new Map();
  }
  enqueue({ alertId, workspaceId, channels = [], payload, consent = true }) {
    const body = JSON.stringify(payload || {});
    if (Buffer.byteLength(body) > this.payloadLimit) throw Object.assign(new Error("DELIVERY_PAYLOAD_TOO_LARGE"), { code: "DELIVERY_PAYLOAD_TOO_LARGE" });
    const created = [];
    for (const channel of channels) {
      if (channel.type === "email" && !consent) continue;
      if (channel.type === "webhook") validateWebhookUrl(channel.url);
      const key = `${alertId}:${channel.type}:${channel.id || channel.url || channel.recipient}`;
      if (this.jobs.has(key)) { created.push(clone(this.jobs.get(key))); continue; }
      const job = { id: `delivery_${crypto.randomUUID()}`, key, alertId, workspaceId, channel: channel.type, destination: channel.type === "webhook" ? channel.url : channel.recipient || null, status: "QUEUED", attempt: 0, maxAttempts: this.maxAttempts, createdAt: this.clock().toISOString(), nextAttemptAt: this.clock().toISOString(), lastError: null };
      this.jobs.set(key, { ...job, payload: payload || {}, secret: channel.secret || null }); created.push(clone(job));
    }
    return created;
  }
  list({ workspaceId, alertId } = {}) { return [...this.jobs.values()].filter((job) => (!workspaceId || job.workspaceId === workspaceId) && (!alertId || job.alertId === alertId)).map(({ payload, secret, ...safe }) => clone(safe)); }
  async process({ sender, now = this.clock() } = {}) {
    if (typeof sender !== "function") throw new TypeError("DELIVERY_SENDER_REQUIRED");
    const results = [];
    for (const job of this.jobs.values()) {
      if (job.status !== "QUEUED" || Date.parse(job.nextAttemptAt) > new Date(now).getTime()) continue;
      job.attempt += 1;
      const body = JSON.stringify(job.payload); const signature = job.secret ? signPayload(job.secret, body) : null;
      try {
        const response = await sender({ channel: job.channel, destination: job.destination, body, signature, attempt: job.attempt });
        const status = Number(response?.status || 200);
        if (status >= 200 && status < 300) { job.status = response.acknowledged ? "ACKNOWLEDGED" : "SENT"; job.sentAt = new Date(now).toISOString(); }
        else throw Object.assign(new Error(`DELIVERY_HTTP_${status}`), { status });
      } catch (error) {
        const canRetry = retryable(error.status, error) && job.attempt < job.maxAttempts;
        job.lastError = { code: error.code || "DELIVERY_FAILED", status: error.status || null, message: error.message || "Delivery failed." };
        job.status = canRetry ? "QUEUED" : "DEAD_LETTERED";
        if (canRetry) job.nextAttemptAt = new Date(new Date(now).getTime() + this.retryBaseMs * (2 ** (job.attempt - 1))).toISOString();
      }
      const { payload, secret, ...safe } = job; results.push(clone(safe));
    }
    return results;
  }
  replay(id) { const job = [...this.jobs.values()].find((item) => item.id === id); if (!job || job.status !== "DEAD_LETTERED") return null; job.status = "QUEUED"; job.nextAttemptAt = this.clock().toISOString(); job.lastError = null; return clone(job); }
}

module.exports = { DELIVERY_STATUS, DeliveryOutbox, signPayload, validateWebhookUrl };