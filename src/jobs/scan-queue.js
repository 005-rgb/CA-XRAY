const { randomUUID } = require("node:crypto");

const JOB_STATUS = Object.freeze({
  QUEUED: "QUEUED",
  RUNNING: "RUNNING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
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
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    cancelRequested: Boolean(job.cancelRequested),
  };
}

class InMemoryScanJobQueue {
  constructor({
    processor,
    concurrency = 8,
    maxQueueDepth = 10_000,
    maxAttempts = 2,
    timeoutMs = 30_000,
    clock = () => new Date(),
    onStatusChange = null,
  }) {
    if (typeof processor !== "function") throw new TypeError("A scan job processor is required.");
    this.processor = processor;
    this.concurrency = Math.max(1, Number(concurrency) || 1);
    this.maxQueueDepth = Math.max(1, Number(maxQueueDepth) || 1);
    this.maxAttempts = Math.max(1, Number(maxAttempts) || 1);
    this.timeoutMs = Math.max(1_000, Number(timeoutMs) || 30_000);
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
      attempts: 0,
      maxAttempts: this.maxAttempts,
      cancelRequested: false,
      controller: null,
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

  cancel(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if ([JOB_STATUS.SUCCEEDED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED].includes(job.status)) {
      return snapshot(job);
    }
    job.cancelRequested = true;
    if (job.status === JOB_STATUS.QUEUED) {
      job.status = JOB_STATUS.CANCELLED;
      job.completedAt = this.clock().toISOString();
      job.error = { code: "SCAN_CANCELLED", message: "The scan was cancelled before processing started." };
      this.pending = this.pending.filter((pendingId) => pendingId !== job.id);
      this.#notify(job);
    } else if (job.controller) {
      job.controller.abort();
    }
    return snapshot(job);
  }

  #drain() {
    while (this.running < this.concurrency && this.pending.length) {
      const jobId = this.pending.shift();
      const job = this.jobs.get(jobId);
      if (!job) continue;
      this.running += 1;
      job.status = JOB_STATUS.RUNNING;
      job.startedAt = this.clock().toISOString();
      job.attempts += 1;
      job.controller = new AbortController();
      this.#notify(job);
      const timeout = new Promise((_, reject) => {
        const timer = setTimeout(() => {
          job.controller?.abort();
          reject(Object.assign(new Error("SCAN_TIMEOUT"), { code: "SCAN_TIMEOUT" }));
        }, this.timeoutMs);
        timer.unref?.();
      });
      Promise.race([
        Promise.resolve().then(() => this.processor(job.payload, {
          signal: job.controller.signal,
          attempt: job.attempts,
          jobId: job.id,
        })),
        timeout,
      ])
        .then((scan) => {
          if (job.cancelRequested || job.status === JOB_STATUS.CANCELLED) return;
          job.status = JOB_STATUS.SUCCEEDED;
          job.scan = scan;
          job.error = null;
        })
        .catch((error) => {
          if (job.cancelRequested || job.status === JOB_STATUS.CANCELLED) return;
          if (job.attempts < job.maxAttempts && error.code !== "SCAN_CANCELLED") {
            job.status = JOB_STATUS.QUEUED;
            job.error = {
              code: error.code || "SCAN_RETRY",
              message: error.message || "The scan attempt failed and will be retried.",
            };
            this.pending.push(job.id);
            return;
          }
          job.status = JOB_STATUS.FAILED;
          job.error = {
            code: error.code || "SCAN_FAILED",
            message: error.message || "The scan could not be completed.",
          };
        })
        .finally(() => {
          if (job.status !== JOB_STATUS.QUEUED) {
            if (job.cancelRequested && job.status === JOB_STATUS.RUNNING) {
              job.status = JOB_STATUS.CANCELLED;
              job.error = { code: "SCAN_CANCELLED", message: "The scan was cancelled." };
            }
            job.completedAt = job.completedAt || this.clock().toISOString();
            this.#notify(job);
          } else {
            this.#notify(job);
          }
          job.controller = null;
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

function createScanJobQueue({
  processor,
  runtimeConfig,
  onStatusChange = null,
  maxAttempts = runtimeConfig.queue.maxAttempts,
  timeoutMs = runtimeConfig.queue.timeoutMs,
} = {}) {
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
    maxAttempts,
    timeoutMs,
    onStatusChange,
  });
}

module.exports = { JOB_STATUS, InMemoryScanJobQueue, createScanJobQueue };