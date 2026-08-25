const crypto = require("node:crypto");

function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function keyId() { return `key_${crypto.randomUUID()}`; }

class DeveloperApi {
  constructor({ secret = crypto.randomBytes(32).toString("hex"), clock = () => new Date() } = {}) {
    this.secret = secret;
    this.clock = clock;
    this.keys = new Map();
    this.usage = new Map();
  }

  issue({ workspaceId, actorId, name = "Developer key", scopes = ["scan:create", "scan:read", "evidence:read"], expiresAt = null }) {
    const raw = `jn_live_${crypto.randomBytes(24).toString("base64url")}`;
    const record = { id: keyId(), workspaceId, actorId, name: String(name).trim().slice(0, 100) || "Developer key", scopes, hash: hash(raw), createdAt: this.clock().toISOString(), expiresAt, revokedAt: null, lastUsedAt: null };
    this.keys.set(record.hash, record);
    return { id: record.id, key: raw, name: record.name, scopes: record.scopes, createdAt: record.createdAt, expiresAt };
  }

  authenticate(raw) {
    const record = this.keys.get(hash(String(raw || "")));
    if (!record || record.revokedAt || (record.expiresAt && new Date(record.expiresAt).getTime() <= this.clock().getTime())) return null;
    record.lastUsedAt = this.clock().toISOString();
    return clone(record);
  }

  list(workspaceId) {
    return [...this.keys.values()].filter((item) => item.workspaceId === workspaceId).map(({ hash: ignored, ...item }) => clone(item));
  }

  revoke(workspaceId, id) {
    const record = [...this.keys.values()].find((item) => item.workspaceId === workspaceId && item.id === id);
    if (!record) return false;
    record.revokedAt = this.clock().toISOString();
    return true;
  }

  consume(workspaceId, operation) {
    const month = this.clock().toISOString().slice(0, 7);
    const key = `${workspaceId}:${month}`;
    const record = this.usage.get(key) || { workspaceId, month, requests: 0, scans: 0, bundles: 0, signedReports: 0 };
    record.requests += 1;
    if (operation === "scan") record.scans += 1;
    if (operation === "bundle") record.bundles += 1;
    if (operation === "signed-report") record.signedReports += 1;
    this.usage.set(key, record);
    return clone(record);
  }

  usageFor(workspaceId) { return clone(this.usage.get(`${workspaceId}:${this.clock().toISOString().slice(0, 7)}`) || { workspaceId, month: this.clock().toISOString().slice(0, 7), requests: 0, scans: 0, bundles: 0, signedReports: 0 }); }

  sign(payload) {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return { algorithm: "HMAC-SHA256", payload: encoded, signature: crypto.createHmac("sha256", this.secret).update(encoded).digest("base64url") };
  }

  uncertaintyContract(scan) {
    const statuses = new Set();
    const walk = (value) => {
      if (!value || typeof value !== "object") return;
      if (typeof value.status === "string") statuses.add(value.status);
      Object.values(value).forEach(walk);
    };
    walk(scan);
    return { states: [...statuses].filter((state) => ["UNKNOWN", "UNAVAILABLE", "UNVERIFIED", "CONFLICT", "VERIFIED"].includes(state)), rule: "Unknown or unavailable evidence is not interpreted as safe; conflicts remain excluded from silent scoring." };
  }
}

module.exports = { DeveloperApi };