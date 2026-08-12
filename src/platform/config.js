const ARCHITECTURE_TARGETS = Object.freeze({
  monthlyActiveUsers: 100_000,
  concurrentUsers: 2_000,
  scansPerMinute: 300,
  rpoMinutes: 15,
  rtoMinutes: 60,
  availabilitySlo: 0.999,
});

const PLAN_CATALOG = Object.freeze({
  free: {
    id: "free",
    name: "Free",
    workspace: "personal",
    billing: "free",
    scanLimitPerMonth: 25,
    features: ["Personal workspace", "Evidence-backed scan reports"],
    stripePriceEnv: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    workspace: "personal",
    billing: "paid",
    scanLimitPerMonth: 1_000,
    features: ["Personal workspace", "Higher scan limits", "Saved report history"],
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  team: {
    id: "team",
    name: "Team",
    workspace: "team",
    billing: "paid",
    scanLimitPerMonth: 10_000,
    features: ["Shared team workspace", "Member roles", "Shared report history"],
    stripePriceEnv: "STRIPE_PRICE_TEAM",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    workspace: "team",
    billing: "contact",
    scanLimitPerMonth: null,
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
    queue: Object.freeze({
      driver: queueDriver,
      workerConcurrency: positiveInteger(
        env.SCAN_WORKER_CONCURRENCY,
        isProduction ? 64 : 8,
      ),
      maxQueueDepth: positiveInteger(env.SCAN_MAX_QUEUE_DEPTH, 10_000),
    }),
    targets: ARCHITECTURE_TARGETS,
  });
}

function assertProductionRuntime(config) {
  if (config.environment === "production" && config.queue.driver === "memory") {
    throw new Error(
      "SCAN_QUEUE_DRIVER must be configured with a shared durable queue in production; the in-memory driver is development-only.",
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
    auth: {
      provider: "clerk",
      configured: Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY),
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
  PLAN_CATALOG,
  WORKSPACE_POLICIES,
  getRuntimeConfig,
  assertProductionRuntime,
  publicPlatformConfig,
  publicPlanCatalog,
  resolveWorkspacePolicy,
};