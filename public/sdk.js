/* JOBEN NETWORK Evidence API v1 — dependency-free browser/Node-compatible client. */
class JobenEvidenceClient {
  constructor({ baseUrl = "", apiKey, fetchImpl = globalThis.fetch } = {}) {
    if (!apiKey) throw new Error("apiKey is required");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.fetch = fetchImpl;
  }
  async request(path, options = {}) {
    const response = await this.fetch(`${this.baseUrl}/api/v1${path}`, {
      ...options, headers: { "content-type": "application/json", "x-api-key": this.apiKey, ...(options.headers || {}) },
    });
    const body = await response.json();
    if (!response.ok) throw Object.assign(new Error(body.message || body.error || "Evidence API request failed"), { code: body.error, status: response.status });
    return body;
  }
  createScan(input) { return this.request("/scans", { method: "POST", body: JSON.stringify(input) }); }
  getScan(jobId) { return this.request(`/scans/${encodeURIComponent(jobId)}`); }
  getEvidenceBundle(jobId) { return this.request(`/scans/${encodeURIComponent(jobId)}/evidence-bundle`); }
  signReport(jobId) { return this.request(`/scans/${encodeURIComponent(jobId)}/signed-report`, { method: "POST" }); }
  usage() { return this.request("/usage"); }
}
if (typeof module !== "undefined") module.exports = { JobenEvidenceClient };