const ARCHITECTURE_TARGETS = Object.freeze({
  monthlyActiveUsers: 100_000,
  concurrentUsers: 2_000,
  scansPerMinute: 300,
  rpoMinutes: 15,
  rtoMinutes: 60,
  availabilitySlo: 0.999,
});

const SECURITY_LIMITS = Object.freeze({
  requestBodyBytes: 12_000,
  ipRequestsPerMinute: 60,
  userRequestsPerMinute: 60,
  workspaceRequestsPerMinute: 30,
  apiClientRequestsPerMinute: 120,
  maxConcurrentScansPerWorkspace: 2,
  providerTimeoutMs: 12_000,
  providerRetries: 1,
});

const PLAN_CATALOG = Object.freeze({
  free: {
    id: "free",
    name: "Free",
    workspace: "personal",
    billing: "free",
    scanLimitPerMonth: 25,
    maxConcurrentScans: 2,
    capabilities: ["workspace.read", "scan.create", "scan.read"],
    features: ["Personal workspace", "Evidence-backed scan reports"],
    stripePriceEnv: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    workspace: "personal",
    billing: "paid",
    scanLimitPerMonth: 1_000,
    maxConcurrentScans: 8,
    capabilities: ["workspace.read", "scan.create", "scan.read", "scan.export"],
    features: ["Personal workspace", "Higher scan limits", "Saved report history"],
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  team: {
    id: "team",
    name: "Team",
    workspace: "team",
    billing: "paid",
    scanLimitPerMonth: 10_000,
    maxConcurrentScans: 32,
    capabilities: ["workspace.read", "scan.create", "scan.read", "scan.export", "membership.manage", "billing.manage"],
    features: ["Shared team workspace", "Member roles", "Shared report history"],
    stripePriceEnv: "STRIPE_PRICE_TEAM",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    workspace: "team",
    billing: "contact",
    scanLimitPerMonth: null,
    maxConcurrentScans: 64,
    capabilities: ["workspace.read", "scan.create", "scan.read", "scan.export", "membership.manage", "billing.manage"],
    features: ["Dedicated limits", "Enterprise authorization", "RPO/RTO support plan"],
    stripePriceEnv: "STRIPE_PRICE_ENTERPRISE",
  },
});

const WORKSPACE_POLICIES = Object.freeze({
  personal: Object.freeze({
    allowedPlans: ["free", "pro"],
    maxMembers: 1,
  }),
  team: Object.freeze({
    allowedPlans: ["team", "enterprise"],
    maxMembers: null,
  }),
});

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getRuntimeConfig(env = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const queueDriver = env.SCAN_QUEUE_DRIVER || "memory";
  return Object.freeze({
    environment: isProduction ? "production" : "development",
    auth: Object.freeze({
      provider: env.AUTH_PROVIDER || "local",
      emailProvider: env.EMAIL_PROVIDER || (isProduction ? "" : "development-outbox"),
    }),
    queue: Object.freeze({
      driver: queueDriver,
      workerConcurrency: positiveInteger(
        env.SCAN_WORKER_CONCURRENCY,
        isProduction ? 64 : 8,
      ),
      maxQueueDepth: positiveInteger(env.SCAN_MAX_QUEUE_DEPTH, 10_000),
    }),
    dataStore: Object.freeze({
      driver: env.DATA_STORE_DRIVER || "memory",
      primary: "postgresql",
    }),
    targets: ARCHITECTURE_TARGETS,
    security: SECURITY_LIMITS,
  });
}

function assertProductionRuntime(config) {
  if (!["local", "clerk"].includes(config.auth.provider)) {
    throw new Error("AUTH_PROVIDER must be either local or clerk.");
  }
  if (config.environment === "production" && config.auth.provider === "clerk"
      && !(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY)) {
    throw new Error("Clerk is selected as the production identity authority but its keys are not configured.");
  }
  if (config.environment === "production" && !config.auth.emailProvider) {
    throw new Error("EMAIL_PROVIDER must be configured in production.");
  }
  if (config.environment === "production" && config.queue.driver === "memory") {
    throw new Error(
      "SCAN_QUEUE_DRIVER must be configured with a shared durable queue in production; the in-memory driver is development-only.",
    );
  }
  if (config.environment === "production" && config.security.providerRetries > 2) {
    throw new Error("Provider retry budget cannot exceed two retries.");
  }
  if (config.environment === "production" && config.dataStore.driver === "memory") {
    throw new Error(
      "DATA_STORE_DRIVER must be configured with PostgreSQL in production; in-memory records are development-only.",
    );
  }
}

function publicPlatformConfig(config = getRuntimeConfig()) {
  return {
    architectureTargets: config.targets,
    queue: {
      driver: config.queue.driver,
      workerConcurrency: config.queue.workerConcurrency,
    },
    storage: {
      primary: config.dataStore.primary,
      configured: config.dataStore.driver !== "memory",
    },
    auth: {
      provider: config.auth.provider,
      configured: config.auth.provider === "local"
        || Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY),
      emailProvider: config.auth.emailProvider,
    },
    billing: {
      provider: "stripe",
      connected: false,
      note: "Stripe connection is required before enabling paid checkout or webhook sync.",
    },
  };
}

function publicPlanCatalog() {
  return Object.values(PLAN_CATALOG).map(({ stripePriceEnv, ...plan }) => ({
    ...plan,
    priceConfigured: Boolean(stripePriceEnv && process.env[stripePriceEnv]),
  }));
}

function resolveWorkspacePolicy({ workspaceType = "personal", planId = "free" } = {}) {
  const policy = WORKSPACE_POLICIES[workspaceType];
  const plan = PLAN_CATALOG[planId];
  if (!policy) return { valid: false, code: "UNKNOWN_WORKSPACE_TYPE" };
  if (!plan) return { valid: false, code: "UNKNOWN_PLAN" };
  if (!policy.allowedPlans.includes(plan.id)) {
    return { valid: false, code: "PLAN_NOT_ALLOWED_FOR_WORKSPACE" };
  }
  return {
    valid: true,
    workspaceType,
    plan: plan.id,
    maxMembers: policy.maxMembers,
    scanLimitPerMonth: plan.scanLimitPerMonth,
  };
}

module.exports = {
  ARCHITECTURE_TARGETS,
  SECURITY_LIMITS,
  PLAN_CATALOG,
  WORKSPACE_POLICIES,
  getRuntimeConfig,
  assertProductionRuntime,
  publicPlatformConfig,
  publicPlanCatalog,
  resolveWorkspacePolicy,
};