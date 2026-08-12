const { randomUUID } = require("node:crypto");

const JOB_STATUS = Object.freeze({
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
});

function snapshot(job) {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
    scan: job.scan,
  };
}

class InMemoryScanJobQueue {
  constructor({
    processor,
    concurrency = 8,
    maxQueueDepth = 10_000,
    clock = () => new Date(),
    onStatusChange = null,
  }) {
    if (typeof processor !== "function") throw new TypeError("A scan job processor is required.");
    this.processor = processor;
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.maxQueueDepth = Math.max(1, Number(maxQueueDepth) || 1);
    this.clock = clock;
    this.onStatusChange = typeof onStatusChange === "function" ? onStatusChange : null;
    this.jobs = new Map();
    this.pending = [];
    this.running = 0;
  }

  enqueue(payload) {
    if (this.pending.length + this.running >= this.maxQueueDepth) {
      const error = new Error("SCAN_QUEUE_FULL");
      error.code = "SCAN_QUEUE_FULL";
      throw error;
    }
    const now = this.clock().toISOString();
    const job = {
      id: payload && payload.jobId ? payload.jobId : `scan_${randomUUID()}`,
      type: "contract-scan",
      payload,
      workspaceId: payload && payload.workspaceId ? payload.workspaceId : null,
      status: JOB_STATUS.QUEUED,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      error: null,
      scan: null,
    };
    this.jobs.set(job.id, job);
    this.pending.push(job.id);
    this.#drain();
    return snapshot(job);
  }

  get(jobId) {
    const job = this.jobs.get(jobId);
    return job ? snapshot(job) : null;
  }

  getForWorkspace(jobId, workspaceId) {
    const job = this.jobs.get(jobId);
    if (!job || job.workspaceId !== workspaceId) return null;
    return snapshot(job);
  }

  activeForWorkspace(workspaceId) {
    return [...this.jobs.values()].filter(
      (job) => job.workspaceId === workspaceId && ["QUEUED", "RUNNING"].includes(job.status),
    ).length;
  }

  #drain() {
    while (this.running < this.concurrency && this.pending.length) {
      const jobId = this.pending.shift();
      const job = this.jobs.get(jobId);
      if (!job) continue;
      this.running += 1;
      job.status = JOB_STATUS.RUNNING;
      job.startedAt = this.clock().toISOString();
      this.#notify(job);
      Promise.resolve()
        .then(() => this.processor(job.payload))
        .then((scan) => {
          job.status = JOB_STATUS.SUCCEEDED;
          job.scan = scan;
        })
        .catch((error) => {
          job.status = JOB_STATUS.FAILED;
          job.error = {
            code: error.code || "SCAN_FAILED",
            message: error.message || "The scan could not be completed.",
          };
        })
        .finally(() => {
          job.completedAt = this.clock().toISOString();
          this.#notify(job);
          this.running -= 1;
          this.#drain();
        });
    }
  }

  #notify(job) {
    if (!this.onStatusChange) return;
    Promise.resolve(this.onStatusChange(snapshot(job))).catch((error) => {
      console.error(`Scan persistence update failed for ${job.id}: ${error.message}`);
    });
  }
}

function createScanJobQueue({ processor, runtimeConfig, onStatusChange = null }) {
  if (runtimeConfig.environment === "production" && runtimeConfig.queue.driver === "memory") {
    throw new Error("The in-memory scan queue cannot be used in production.");
  }
  if (runtimeConfig.queue.driver !== "memory") {
    throw new Error(
      `Queue driver "${runtimeConfig.queue.driver}" is not installed. Configure the shared queue adapter before production deployment.`,
    );
  }
  return new InMemoryScanJobQueue({
    processor,
    concurrency: runtimeConfig.queue.workerConcurrency,
    maxQueueDepth: runtimeConfig.queue.maxQueueDepth,
    onStatusChange,
  });
}

module.exports = { JOB_STATUS, InMemoryScanJobQueue, createScanJobQueue };