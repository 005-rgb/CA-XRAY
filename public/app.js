const landing = document.querySelector("#landing");
const loading = document.querySelector("#scan-loading");
const report = document.querySelector("#report");
const form = document.querySelector("#scan-form");
const addressInput = document.querySelector("#contract-address");
const networkInput = document.querySelector("#network");
const addressError = document.querySelector("#address-error");
const networkError = document.querySelector("#network-error");
const clearAddress = document.querySelector("#clear-address");
const loadingStages = document.querySelector("#loading-stages");
const authPanel = document.querySelector("#auth-panel");
const authForm = document.querySelector("#auth-form");
const authMode = document.querySelector("#auth-mode");
const authTitle = document.querySelector("#auth-title");
const authSubmitLabel = document.querySelector("#auth-submit-label");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authStatus = document.querySelector("#auth-status");
const authSwitch = document.querySelector("#auth-switch");
const recoveryToggle = document.querySelector("#recovery-toggle");
const recoveryForm = document.querySelector("#recovery-form");
const recoveryStatus = document.querySelector("#recovery-status");
const mfaForm = document.querySelector("#mfa-form");
const mfaStatus = document.querySelector("#mfa-status");
const emailVerificationForm = document.querySelector("#email-verification-form");
const emailVerificationStatus = document.querySelector("#email-verification-status");
const workspaceBar = document.querySelector("#workspace-bar");
const workspaceSelector = document.querySelector("#workspace-selector");
const userName = document.querySelector("#user-name");
const publicHeader = document.querySelector("#public-header");
const privateTopbar = document.querySelector("#private-topbar");
const sidebar = document.querySelector("#sidebar");
const authEntry = document.querySelector("#auth-entry");
const scanHistory = document.querySelector("#scan-history");
const scanHistoryList = document.querySelector("#scan-history-list");
const historyStatus = document.querySelector("#history-status");
const historyLoadMore = document.querySelector("#history-load-more");
const cancelScanButton = document.querySelector("#cancel-scan");
const intelligenceDashboard = document.querySelector("#intelligence-dashboard");
const passportList = document.querySelector("#passport-list");
const passportCount = document.querySelector("#passport-count");
const watchlistList = document.querySelector("#watchlist-list");
const watchlistCount = document.querySelector("#watchlist-count");
const alertList = document.querySelector("#alert-list");
const alertCount = document.querySelector("#alert-count");
const watchlistForm = document.querySelector("#watchlist-form");
const watchlistStatus = document.querySelector("#watchlist-status");
const adminPanel = document.querySelector("#admin-panel");
const adminNav = document.querySelector("#admin-nav");
const adminStepupForm = document.querySelector("#admin-stepup-form");
const adminStepupCode = document.querySelector("#admin-stepup-code");
const adminStepupStatus = document.querySelector("#admin-stepup-status");
const adminStatus = document.querySelector("#admin-status");
const adminProviders = document.querySelector("#admin-providers");
const adminFlags = document.querySelector("#admin-flags");
const adminPlans = document.querySelector("#admin-plans");
const adminApprovals = document.querySelector("#admin-approvals");
const adminAudit = document.querySelector("#admin-audit");
const adminProviderCount = document.querySelector("#admin-provider-count");
const adminProviderSummary = document.querySelector("#admin-provider-summary");
const adminScanThroughput = document.querySelector("#admin-scan-throughput");
const adminScanThroughputNote = document.querySelector("#admin-scan-throughput-note");
const adminFailureRate = document.querySelector("#admin-failure-rate");
const adminFailureRateNote = document.querySelector("#admin-failure-rate-note");
const adminQueueDepth = document.querySelector("#admin-queue-depth");
const adminQueueNote = document.querySelector("#admin-queue-note");
const adminWorkspaceCount = document.querySelector("#admin-workspace-count");
const adminWorkspaceSummary = document.querySelector("#admin-workspace-summary");
const adminUserCount = document.querySelector("#admin-user-count");
const adminUserSummary = document.querySelector("#admin-user-summary");
const adminApprovalCount = document.querySelector("#admin-approval-count");
const adminAuditCount = document.querySelector("#admin-audit-count");
const adminSnapshotTime = document.querySelector("#admin-snapshot-time");
const adminHealth = document.querySelector("#admin-health");
const adminUsers = document.querySelector("#admin-users");
const adminWorkspaces = document.querySelector("#admin-workspaces");
const adminSubscriptions = document.querySelector("#admin-subscriptions");
const adminWebhooks = document.querySelector("#admin-webhooks");
const adminNetworks = document.querySelector("#admin-networks");
const adminInventoryDrawer = document.querySelector("#admin-inventory-drawer");
const adminInventoryTitle = document.querySelector("#admin-inventory-title");
const adminInventorySearch = document.querySelector("#admin-inventory-search");
const adminInventoryQuery = document.querySelector("#admin-inventory-query");
const adminInventoryResults = document.querySelector("#admin-inventory-results");
const adminInventoryClose = document.querySelector("#admin-inventory-close");
let authState = null;
let currentScan = null;
let currentJob = null;
let activeScanJobId = null;
let historyCursor = null;
let adminInventoryType = null;
const adminState = { providers: [] };
const pathName = () => window.location.pathname;
const isAuthRoute = () => ["/login", "/register"].includes(pathName());
const isAdminRoute = () => pathName() === "/admin";
const reportRouteMatch = () => pathName().match(/^\/dashboard\/scans\/([^/]+)$/);
const isPrivateRoute = () => pathName() === "/dashboard" || pathName().startsWith("/dashboard/");
const pendingScanStorageKey = "ca_xray_pending_scan";
let authRequested = isAuthRoute() || isAdminRoute();

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || "Request failed.");
  return body;
}

function authMessage(message, target = authStatus) {
  if (target) target.textContent = message || "";
}

function setShell({ privateView = false, authView = false } = {}) {
  publicHeader.hidden = privateView;
  privateTopbar.hidden = !privateView;
  sidebar.hidden = !privateView;
  authPanel.hidden = !authView;
  landing.hidden = authView;
  if (privateView) {
    landing.classList.remove("public-home");
  } else {
    landing.classList.add("public-home");
  }
  document.body.classList.toggle("private-view", privateView);
}

function pendingScan() {
  try {
    const value = sessionStorage.getItem(pendingScanStorageKey);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function clearPendingScan() {
  sessionStorage.removeItem(pendingScanStorageKey);
}

function safeReturnPath() {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function configureAuthRoute() {
  if (!isAuthRoute()) return;
  const register = pathName() === "/register";
  authMode.value = register ? "register" : "login";
  authTitle.textContent = register ? "Create your CA X-RAY account" : "Sign in to CA X-RAY";
  authSubmitLabel.textContent = register ? "Create account" : "Sign in";
  authSwitch.textContent = register ? "I already have an account" : "Create an account";
  authPassword.autocomplete = register ? "new-password" : "current-password";
}

async function refreshAuth() {
  try {
    authState = await apiJson("/api/auth/me");
    const authenticated = authState.authenticated;
    const pending = authState.mfaPending;
    const emailPending = authState.emailVerificationPending;
    userName.textContent = authenticated ? (authState.user?.displayName || authState.user?.email || "User") : pending ? "Verification required" : "Visitor";
    if (pending) {
      setShell({ authView: true });
      authForm.hidden = true;
      recoveryForm.hidden = true;
      mfaForm.hidden = false;
      authTitle.textContent = "Verify your superadmin session";
      authMessage("Enter the six-digit code from your authenticator.", mfaStatus);
      workspaceBar.hidden = true;
      return;
    }
    if (emailPending) {
      setShell({ authView: true });
      authForm.hidden = true;
      recoveryForm.hidden = true;
      mfaForm.hidden = true;
      emailVerificationForm.hidden = false;
      authTitle.textContent = "Verify your email";
      authMessage("Use the verification link sent to your email.", emailVerificationStatus);
      workspaceBar.hidden = true;
      return;
    }
    workspaceBar.hidden = !authenticated;
    mfaForm.hidden = true;
    emailVerificationForm.hidden = true;
    authForm.hidden = false;
    if (!authenticated) {
      authEntry.textContent = "Sign in →";
      authEntry.href = "/login";
      configureAuthRoute();
      setShell({ authView: authRequested });
      return;
    }
    if (authState.user?.platformRole === "Superadmin") {
      workspaceBar.hidden = true;
      authEntry.textContent = "Platform Ops →";
      authEntry.href = "/admin";
    } else {
      const workspaces = await apiJson("/api/workspaces");
      workspaceSelector.innerHTML = workspaces.workspaces.map((workspace) =>
        `<option value="${escapeHtml(workspace.id)}" ${workspace.id === authState.workspace?.id ? "selected" : ""}>${escapeHtml(workspace.name || workspace.workspaceType)} · ${escapeHtml(workspace.planId)}</option>`).join("");
      authEntry.textContent = "Dashboard →";
      authEntry.href = "/dashboard";
    }
    const queuedScan = pendingScan();
    if (queuedScan) {
      networkInput.value = queuedScan.network;
      addressInput.value = queuedScan.address;
      clearAddress.hidden = !addressInput.value;
      clearPendingScan();
      authRequested = false;
      window.history.replaceState({}, "", "/");
      await scanLive();
      return;
    }
    if (isAuthRoute()) {
      const destination = safeReturnPath();
      authRequested = false;
      window.history.replaceState({}, "", destination);
    }
    if (isAdminRoute()) {
      if (authState.user?.platformRole !== "Superadmin") {
        setShell({ privateView: false });
        showLanding({ privateView: false });
        authMessage("Platform operations are restricted to verified superadmins.");
        return;
      }
      await loadAdminRoute();
      return;
    }
    if (isPrivateRoute()) {
      await loadPrivateRoute();
    } else {
      setShell({ privateView: false });
      showLanding({ privateView: false });
    }
  } catch (error) {
    authMessage(error.message);
  }
}

authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage("");
  const mode = authMode.value;
  try {
    const result = await apiJson(`/api/auth/${mode === "register" ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail.value.trim(), password: authPassword.value }),
    });
    if (result.mfaRequired) {
      authForm.hidden = true;
      mfaForm.hidden = false;
      authMessage("A second factor is required for this platform account.", mfaStatus);
      return;
    }
    if (result.emailVerificationRequired) {
      authMessage(result.verificationToken
        ? `Development verification token: ${result.verificationToken}`
        : "Check your email to verify this account.");
      return;
    }
    authPassword.value = "";
    await refreshAuth();
  } catch (error) {
    authMessage(error.message);
  }
});

authSwitch?.addEventListener("click", () => {
  const register = authMode.value !== "register";
  authMode.value = register ? "register" : "login";
  authTitle.textContent = register ? "Create your CA X-RAY account" : "Sign in to CA X-RAY";
  authSubmitLabel.textContent = register ? "Create account" : "Sign in";
  authSwitch.textContent = register ? "I already have an account" : "Create an account";
  authPassword.autocomplete = register ? "new-password" : "current-password";
  authMessage("");
});

recoveryToggle?.addEventListener("click", () => {
  recoveryForm.hidden = !recoveryForm.hidden;
});

recoveryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiJson("/api/auth/recovery/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: document.querySelector("#recovery-email").value.trim() }),
    });
    recoveryStatus.textContent = result.recoveryToken
      ? `Development recovery token: ${result.recoveryToken}`
      : result.message;
  } catch (error) {
    recoveryStatus.textContent = error.message;
  }
});

mfaForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await apiJson("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: document.querySelector("#mfa-code").value.trim() }),
    });
    await refreshAuth();
  } catch (error) {
    mfaStatus.textContent = error.message;
  }
});

emailVerificationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await apiJson("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: document.querySelector("#email-verification-token").value.trim() }),
    });
    await refreshAuth();
  } catch (error) {
    emailVerificationStatus.textContent = error.message;
  }
});

workspaceSelector?.addEventListener("change", async () => {
  try {
    await apiJson("/api/workspaces/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: workspaceSelector.value }),
    });
    await refreshAuth();
  } catch (error) {
    authMessage(error.message);
  }
});

document.querySelector("#logout-action")?.addEventListener("click", async () => {
  await apiJson("/api/auth/logout", { method: "POST" }).catch(() => {});
  await refreshAuth();
});
document.querySelector(".logout-button")?.addEventListener("click", async () => {
  await apiJson("/api/auth/logout", { method: "POST" }).catch(() => {});
  await refreshAuth();
});

const categoryLabels = {
  contract: "Contract Control",
  trading: "Trading",
  holder: "Holder Concentration",
  liquidity: "Liquidity",
  deployer: "Deployer",
  marketProject: "Market / Project",
};

const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, POSITIVE: 4 };

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function valueOf(dataPoint, fallback = "UNKNOWN") {
  if (!dataPoint || dataPoint.value === null || dataPoint.value === undefined || dataPoint.value === "") return fallback;
  return dataPoint.value;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "UNKNOWN";
  if (typeof value === "boolean") return value ? "DETECTED" : "NOT DETECTED";
  if (typeof value === "number") return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return String(value);
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return "UNKNOWN";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPercent(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}%` : "UNKNOWN";
}

function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "UNKNOWN";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
}

function truncateAddress(value) {
  if (!value || value === "UNKNOWN") return "UNKNOWN";
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
}

function statusClass(status) {
  return String(status || "UNKNOWN").toLowerCase().replaceAll("_", "-");
}

function statusPill(dataPoint, valueOverride = null) {
  const status = dataPoint?.status || "UNKNOWN";
  const label = valueOverride || status.replaceAll("_", " ");
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(label)}</span>`;
}

function pointText(dataPoint, formatter = formatValue) {
  if (!dataPoint || dataPoint.value === null || dataPoint.value === undefined || dataPoint.value === "") {
    return statusPill(dataPoint);
  }
  return `${escapeHtml(formatter(dataPoint.value))} ${statusPill(dataPoint)}`;
}

function pointEvidence(dataPoint) {
  if (!dataPoint) return "UNKNOWN";
  return dataPoint.evidenceId ? `<span class="evidence-id">${escapeHtml(dataPoint.evidenceId)}</span>` : "—";
}

function evidenceLabel(dataPoint) {
  if (!dataPoint || dataPoint.status === "UNKNOWN" || dataPoint.status === "UNAVAILABLE" || dataPoint.status === "ERROR") return "UNKNOWN";
  return currentScan?.mode === "DEMO" ? "Contract Analysis (Demo)" : "Contract Analysis";
}

function showLanding({ privateView = false } = {}) {
  setShell({ privateView });
  if (adminPanel) adminPanel.hidden = true;
  if (adminNav) adminNav.hidden = !authState?.user?.platformRole;
  landing.hidden = false;
  loading.hidden = true;
  report.hidden = true;
  document.querySelector("#dashboard-report").hidden = true;
  document.querySelector("#dashboard-report").innerHTML = "";
  document.querySelector("#landing-title").textContent = privateView
    ? "Scan New Contract"
    : "Analyze a smart contract before you trust it.";
  document.querySelector("#landing-description").textContent = privateView
    ? "Evidence-backed forensic assessment for the selected contract."
    : "Evidence-based contract forensic analysis across supported networks.";
  document.querySelector("#scan-mode-card").hidden = !privateView;
  document.querySelector("#dashboard").classList.toggle("private-heading", privateView);
  document.querySelector("#new-scan").classList.toggle("public-scan-workbench", !privateView);
  document.querySelector("#new-scan").classList.remove("report-route");
  scanHistory.hidden = !privateView;
  if (privateView) {
    loadScanHistory();
    loadIntelligenceDashboard();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAdminShell() {
  setShell({ privateView: true });
  landing.hidden = true;
  loading.hidden = true;
  report.hidden = true;
  workspaceBar.hidden = true;
  adminPanel.hidden = false;
  adminNav.hidden = false;
  document.querySelector("#dashboard-report").hidden = true;
  document.querySelector("#dashboard-report").innerHTML = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function adminMessage(message, tone = "") {
  adminStatus.textContent = message || "";
  adminStatus.className = `admin-status ${tone}`.trim();
}

function adminErrorMessage(error) {
  const message = error.message || "The admin request could not be completed.";
  if (message === "PLATFORM_STEP_UP_REQUIRED") {
    adminStepupStatus.textContent = "Fresh MFA verification is required before platform data can be viewed.";
    return;
  }
  adminMessage(message, "error");
}

function adminApprovalOptions(approvals, action, targetId) {
  const matches = approvals.filter((approval) => approval.action === action
    && approval.targetId === targetId && ["PENDING", "APPROVED"].includes(approval.status));
  return matches.map((approval) => `<option value="${escapeHtml(approval.id)}">${escapeHtml(approval.status)} · ${escapeHtml(approval.id.slice(-12))}</option>`).join("");
}

function adminProviderMarkup(provider, approvals = []) {
  const runtime = provider.runtime || {};
  const errorRate = Number.isFinite(Number(runtime.errorRate)) ? `${(Number(runtime.errorRate) * 100).toFixed(1)}%` : "—";
  const health = provider.killSwitch || provider.state === "DISABLED" ? "DISABLED" : runtime.lastError ? "DEGRADED" : "ACTIVE";
  const providerApprovals = adminApprovalOptions(approvals, provider.killSwitch || provider.state === "DISABLED" ? "provider.kill_switch" : "provider.publish", provider.providerId);
  const draftLabel = provider.draft ? `DRAFT READY · ${escapeHtml(provider.draft.requestedBy || "operator")}` : "NO DRAFT";
  return `<article class="admin-provider-row">
    <div class="admin-provider-main">
      <div><strong>${escapeHtml(provider.source || provider.providerId)}</strong><span>${escapeHtml(provider.providerId)} · adapter ${escapeHtml(provider.adapterVersion || "UNKNOWN")}</span></div>
      <div class="admin-provider-status">${statusPill({ status: health }, health)}<span class="admin-draft-state ${provider.draft ? "ready" : ""}">${draftLabel}</span></div>
    </div>
    <div class="admin-provider-metrics">
      <span><b>CAPABILITY</b>${escapeHtml((provider.capabilities || []).join(", ") || "UNKNOWN")}</span>
      <span><b>LATENCY</b>${runtime.averageLatencyMs === null || runtime.averageLatencyMs === undefined ? "—" : `${runtime.averageLatencyMs} ms avg`}</span>
      <span><b>ERROR RATE</b>${errorRate}</span>
      <span><b>QUOTA</b>${escapeHtml(String(provider.quotaPerMinute))}/min</span>
      <span><b>TIMEOUT</b>${escapeHtml(String(provider.timeoutMs))} ms</span>
      <span><b>PRIORITY</b>${escapeHtml(String(provider.priority ?? 100))}</span>
      <span><b>LAST SUCCESS</b>${formatDate(runtime.lastSuccessfulAt)}</span>
    </div>
    <form class="admin-provider-form" data-provider-id="${escapeHtml(provider.providerId)}">
      <label>Timeout <input name="timeoutMs" type="number" min="100" max="120000" value="${escapeHtml(provider.timeoutMs)}" aria-label="Timeout milliseconds" /></label>
      <label>Retries <input name="retries" type="number" min="0" max="2" value="${escapeHtml(provider.retries)}" aria-label="Retry count" /></label>
      <label>Quota/min <input name="quotaPerMinute" type="number" min="1" max="100000" value="${escapeHtml(provider.quotaPerMinute)}" aria-label="Quota per minute" /></label>
      <label>Priority <input name="priority" type="number" min="1" max="10000" value="${escapeHtml(provider.priority ?? 100)}" aria-label="Provider priority" /></label>
      <label>State <select name="state" aria-label="Provider state"><option value="ACTIVE" ${provider.state === "ACTIVE" ? "selected" : ""}>ACTIVE</option><option value="DISABLED" ${provider.state === "DISABLED" ? "selected" : ""}>DISABLED</option></select></label>
      <label class="admin-check-label"><input name="killSwitch" type="checkbox" ${provider.killSwitch ? "checked" : ""} /> Kill switch</label>
      <input name="reasonCode" pattern="[A-Za-z][A-Za-z0-9_.-]{2,63}" placeholder="REASON_CODE" aria-label="Reason code" required />
      <button class="secondary-button" type="submit">Save draft</button>
    </form>
     <div class="admin-provider-actions">
       <form class="admin-provider-test-form" data-provider-test="${escapeHtml(provider.providerId)}">
        <label>Test network <select name="networkId" aria-label="Test network"><option value="ethereum">Ethereum</option><option value="bsc">BNB Chain</option><option value="base">Base</option><option value="arbitrum">Arbitrum</option><option value="polygon">Polygon</option></select></label>
        <label>Contract address <input name="address" pattern="0x[a-fA-F0-9]{40}" placeholder="0x..." aria-label="Test contract address" required /></label>
        <button class="secondary-button" type="submit">Test connection</button>
      </form>
      ${provider.draft ? `<form class="admin-provider-publish-form" data-provider-publish="${escapeHtml(provider.providerId)}">
        <input name="reasonCode" pattern="[A-Za-z][A-Za-z0-9_.-]{2,63}" placeholder="PUBLISH_REASON" aria-label="Publish reason" required />
        <select name="approvalId" aria-label="Approval reference"><option value="">No approval reference</option>${providerApprovals}</select>
        <button class="secondary-button" type="submit">Publish draft</button>
      </form>` : ""}
      ${provider.hasHistory ? `<form class="admin-provider-rollback-form" data-provider-rollback="${escapeHtml(provider.providerId)}">
        <input name="reasonCode" pattern="[A-Za-z][A-Za-z0-9_.-]{2,63}" placeholder="ROLLBACK_REASON" aria-label="Rollback reason" required />
        <select name="approvalId" aria-label="Rollback approval reference"><option value="">Select approval</option>${adminApprovalOptions(approvals, "provider.publish", provider.providerId)}</select>
        <button class="secondary-button" type="submit">Rollback one version</button>
      </form>` : ""}
    </div>
  </article>`;
}

function renderAdminProviders(providers, approvals = []) {
  adminProviderCount.textContent = providers.length;
  const active = providers.filter((provider) => !provider.killSwitch && provider.state === "ACTIVE").length;
  adminProviderSummary.textContent = `${active} active · ${providers.length - active} needs attention`;
  adminProviders.innerHTML = providers.length
    ? providers.map((provider) => adminProviderMarkup(provider, approvals)).join("")
    : `<div class="unknown-message">No provider adapters are registered.</div>`;
}

function renderAdminFlags(flags, approvals = []) {
  adminFlags.innerHTML = flags.length
    ? flags.map((flag) => `<div class="admin-flag-row">
      <div class="admin-list-row"><div><strong>${escapeHtml(flag.key)}</strong><span>version ${escapeHtml(flag.version)}${flag.draft ? " · draft staged" : ""}</span></div>${statusPill({ status: flag.enabled ? "ACTIVE" : "DISABLED" }, flag.enabled ? "ON" : "OFF")}</div>
      <form class="admin-flag-form" data-flag-key="${escapeHtml(flag.key)}">
        <label class="admin-check-label"><input name="enabled" type="checkbox" ${flag.draft?.enabled ?? flag.enabled ? "checked" : ""} /> Enabled</label>
        <input name="reasonCode" pattern="[A-Za-z][A-Za-z0-9_.-]{2,63}" placeholder="ROLL_OUT_REASON" aria-label="Feature flag reason" required />
        <button class="secondary-button" type="submit">Save draft</button>
      </form>
      ${flag.draft ? `<form class="admin-flag-publish-form" data-flag-publish="${escapeHtml(flag.key)}">
        <input name="reasonCode" pattern="[A-Za-z][A-Za-z0-9_.-]{2,63}" placeholder="PUBLISH_REASON" aria-label="Feature flag publish reason" required />
        <select name="approvalId" aria-label="Feature flag approval reference"><option value="">Select approval</option>${adminApprovalOptions(approvals, "feature_flag.publish", flag.key)}</select>
        <button class="secondary-button" type="submit">Publish flag</button>
      </form>` : ""}
    </div>`).join("")
    : `<div class="unknown-message">No feature flag drafts or published values.</div>`;
}

function renderAdminPlans(plans) {
  adminPlans.innerHTML = plans.map((plan) => `<div class="admin-list-row"><div><strong>${escapeHtml(plan.name)}</strong><span>${escapeHtml(plan.workspace)} · ${plan.scanLimitPerMonth === null ? "unlimited" : escapeHtml(plan.scanLimitPerMonth)} scans/month</span></div><span class="admin-list-value">${plan.priceConfigured ? "PRICE READY" : "CONFIG ONLY"}</span></div>`).join("");
}

function renderAdminApprovals(approvals) {
  const pending = approvals.filter((approval) => approval.status === "PENDING");
  if (adminApprovalCount) adminApprovalCount.textContent = pending.length;
  adminApprovals.innerHTML = approvals.length
    ? approvals.slice(0, 20).map((approval) => `<div class="admin-approval-row"><div class="admin-list-row"><div><strong>${escapeHtml(approval.action)}</strong><span>${escapeHtml(approval.targetId)} · requested by ${escapeHtml(approval.requestedBy)} · ${formatDate(approval.createdAt)}</span></div><div class="admin-approval-action">${statusPill({ status: approval.status }, approval.status)}</div></div>${approval.status === "PENDING" ? `<form class="admin-approval-form" data-approval-id="${escapeHtml(approval.id)}"><input name="reasonCode" pattern="[A-Za-z][A-Za-z0-9_.-]{2,63}" placeholder="REVIEW_REASON" aria-label="Approval reason" required /><button class="secondary-button" type="submit">Grant approval</button></form>` : ""}</div>`).join("")
    : `<div class="unknown-message">No approvals have been requested.</div>`;
}

function renderAdminAudit(audit) {
  if (adminAuditCount) adminAuditCount.textContent = audit.length;
  adminAudit.innerHTML = audit.length
    ? audit.slice(0, 40).map((entry) => `<div class="admin-audit-row"><time>${formatDate(entry.createdAt)}</time><strong>${escapeHtml(entry.action)}</strong><span>${escapeHtml(entry.actorId)}${entry.workspaceId ? ` · ${escapeHtml(entry.workspaceId)}` : ""}</span></div>`).join("")
    : `<div class="unknown-message">No platform events recorded.</div>`;
}

function renderAdminInventoryResults(type, records) {
  if (!records.length) {
    adminInventoryResults.innerHTML = `<div class="unknown-message">No ${type} matched this search.</div>`;
    return;
  }
  adminInventoryResults.innerHTML = records.map((record) => {
    if (type === "users") {
      return `<div class="admin-inventory-row">
        <div><strong>${escapeHtml(record.displayName || record.email || record.id)}</strong><span>${escapeHtml(record.email || "Email unavailable")} · joined ${escapeHtml(formatDate(record.createdAt))}</span></div>
        <div class="admin-inventory-meta">${statusPill({ status: record.mfaEnabled ? "VERIFIED" : "UNKNOWN" }, record.mfaEnabled ? "MFA ON" : "MFA OFF")}<span>${escapeHtml(record.workspaceCount)} workspace${record.workspaceCount === 1 ? "" : "s"} · ${escapeHtml(record.activeSessionCount)} active session${record.activeSessionCount === 1 ? "" : "s"}</span></div>
      </div>`;
    }
    return `<div class="admin-inventory-row">
      <div><strong>${escapeHtml(record.name || record.id)}</strong><span>${escapeHtml(record.workspaceType || "UNKNOWN")} · ${escapeHtml(record.planId || "UNKNOWN PLAN")} · created ${escapeHtml(formatDate(record.createdAt))}</span></div>
      <div class="admin-inventory-meta"><span>${escapeHtml(record.memberCount)} member${record.memberCount === 1 ? "" : "s"}</span><code>${escapeHtml(truncateAddress(record.id))}</code></div>
    </div>`;
  }).join("");
}

async function loadAdminInventory(type) {
  if (!["users", "workspaces"].includes(type)) return;
  adminInventoryType = type;
  adminInventoryDrawer.hidden = false;
  adminInventoryTitle.textContent = type === "users" ? "User inventory" : "Workspace inventory";
  adminInventoryResults.innerHTML = `<div class="unknown-message">Loading ${type}…</div>`;
  const query = adminInventoryQuery.value.trim();
  try {
    const params = new URLSearchParams({ limit: "100" });
    if (query) params.set("q", query);
    const data = await apiJson(`/api/admin/${type}?${params.toString()}`);
    renderAdminInventoryResults(type, data[type] || []);
  } catch (error) {
    adminInventoryResults.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
    adminErrorMessage(error);
  }
}

function renderAdminHealth(data) {
  const platform = data.platform || {};
  const storage = platform.storage || {};
  const auth = platform.auth || {};
  adminHealth.innerHTML = `
    <div class="admin-health-row"><span>Environment</span><strong>${escapeHtml(data.environment || "UNKNOWN")}</strong></div>
    <div class="admin-health-row"><span>Queue driver</span><strong>${escapeHtml(data.queue?.driver || "UNKNOWN")}</strong></div>
    <div class="admin-health-row"><span>Worker concurrency</span><strong>${escapeHtml(data.queue?.concurrency ?? platform.queue?.workerConcurrency ?? "—")}</strong></div>
    <div class="admin-health-row"><span>Primary storage</span><strong>${escapeHtml(storage.primary || "UNKNOWN")} · ${storage.configured ? "configured" : "memory only"}</strong></div>
    <div class="admin-health-row"><span>Identity</span><strong>${escapeHtml(auth.provider || "UNKNOWN")} · ${auth.configured ? "configured" : "not configured"}</strong></div>
    <div class="admin-health-row"><span>Billing</span><strong>${platform.billing?.connected ? "connected" : "not connected"}</strong></div>`;
}

function renderAdminNetworks(networks) {
  const items = networks || [];
  const providerIds = new Set((adminState.providers || []).map((provider) => provider.providerId));
  adminNetworks.innerHTML = items.length
    ? items.map((network) => `<div class="admin-list-row">
        <div><strong>${escapeHtml(network.name)}</strong><span>${escapeHtml(network.id)} · GoPlus ${escapeHtml(network.goplusChainId)} · DexScreener ${escapeHtml(network.dexChainId)}</span></div>
        ${statusPill({ status: providerIds.size ? "ACTIVE" : "UNKNOWN" }, providerIds.size ? "SUPPORTED" : "UNKNOWN")}
      </div>`).join("")
    : `<div class="unknown-message">No supported networks are configured.</div>`;
}

function renderAdminInventory(data) {
  const users = data.recentUsers || [];
  const workspaces = data.recentWorkspaces || [];
  adminUsers.innerHTML = users.length
    ? users.map((user) => `<div class="admin-list-row"><div><strong>${escapeHtml(user.displayName || user.email)}</strong><span>${escapeHtml(user.email)} · ${user.workspaceCount} workspace${user.workspaceCount === 1 ? "" : "s"} · ${user.activeSessionCount} session${user.activeSessionCount === 1 ? "" : "s"}</span></div>${statusPill({ status: user.mfaEnabled ? "VERIFIED" : "UNKNOWN" }, user.mfaEnabled ? "MFA ON" : "MFA OFF")}</div>`).join("")
    : `<div class="unknown-message">No users in the platform inventory.</div>`;
  adminWorkspaces.innerHTML = workspaces.length
    ? workspaces.map((workspace) => `<div class="admin-list-row"><div><strong>${escapeHtml(workspace.name || workspace.id)}</strong><span>${escapeHtml(workspace.workspaceType)} · ${escapeHtml(workspace.planId)} · ${workspace.memberCount} member${workspace.memberCount === 1 ? "" : "s"}</span></div><span class="admin-list-value">${escapeHtml(truncateAddress(workspace.id))}</span></div>`).join("")
    : `<div class="unknown-message">No workspaces in the platform inventory.</div>`;
}

function renderAdminSubscriptions(subscriptions) {
  const items = subscriptions || [];
  adminSubscriptions.innerHTML = items.length
    ? items.slice(0, 8).map((subscription) => `<div class="admin-list-row"><div><strong>${escapeHtml(subscription.planId || "UNKNOWN PLAN")}</strong><span>${escapeHtml(subscription.workspaceId || "workspace unavailable")} · ${escapeHtml(subscription.source || "provider unknown")}</span></div>${statusPill({ status: subscription.status }, subscription.status)}</div>`).join("")
    : `<div class="unknown-message">No subscription overrides recorded.</div>`;
}

function renderAdminWebhooks(webhooks) {
  const items = webhooks || [];
  adminWebhooks.innerHTML = items.length
    ? items.slice(0, 8).map((webhook) => `<div class="admin-list-row"><div><strong>${escapeHtml(webhook.provider)}</strong><span>${escapeHtml(webhook.eventId)} · ${formatDate(webhook.receivedAt)}</span></div>${statusPill({ status: webhook.status }, webhook.status)}</div>`).join("")
    : `<div class="unknown-message">No billing webhook events recorded.</div>`;
}

function renderAdminOverview(data) {
  const stats = data.stats || {};
  const scans = data.scans || {};
  const queue = data.queue || {};
  const terminal = Number(scans.succeeded || 0) + Number(scans.failed || 0) + Number(scans.cancelled || 0);
  const failureRate = terminal ? `${((Number(scans.failed || 0) / terminal) * 100).toFixed(1)}%` : "—";
  adminScanThroughput.textContent = Number(scans.completed24h || 0).toLocaleString("en-US");
  adminScanThroughputNote.textContent = scans.averageDurationMs === null || scans.averageDurationMs === undefined
    ? "No completed-job latency"
    : `avg ${Number(scans.averageDurationMs).toLocaleString("en-US")} ms`;
  adminFailureRate.textContent = failureRate;
  adminFailureRateNote.textContent = `${Number(scans.failed || 0).toLocaleString("en-US")} failed · ${terminal.toLocaleString("en-US")} terminal`;
  adminQueueDepth.textContent = Number(queue.depth || 0).toLocaleString("en-US");
  adminQueueNote.textContent = `${Number(queue.running || 0)} running · ${Number(queue.pending || 0)} pending`;
  adminWorkspaceCount.textContent = Number(stats.workspaces || 0).toLocaleString("en-US");
  adminWorkspaceSummary.textContent = `${Number(stats.teamWorkspaces || 0)} team · ${Number(stats.personalWorkspaces || 0)} personal`;
  adminUserCount.textContent = Number(stats.users || 0).toLocaleString("en-US");
  adminUserSummary.textContent = `${Number(stats.verifiedUsers || 0)} verified · ${Number(stats.activeSessions || 0)} active sessions`;
  adminSnapshotTime.textContent = `Snapshot ${formatDate(data.generatedAt)}`;
  renderAdminHealth(data);
  renderAdminNetworks(data.networks || []);
  renderAdminInventory(data);
  renderAdminProviders(data.providers || [], data.approvals || []);
  renderAdminFlags(data.flags || [], data.approvals || []);
  renderAdminPlans(data.plans?.items || []);
  renderAdminApprovals(data.approvals || []);
  renderAdminSubscriptions(data.subscriptions || []);
  renderAdminWebhooks(data.webhooks || []);
  renderAdminAudit(data.audit || []);
}

async function loadAdminData() {
  try {
    adminMessage("Refreshing platform telemetry…");
    const overview = await apiJson("/api/admin/overview");
    renderAdminOverview(overview);
    adminMessage(`Last refreshed ${new Date().toLocaleTimeString()}.`, "success");
  } catch (error) {
    adminErrorMessage(error);
  }
}

async function loadAdminRoute() {
  showAdminShell();
  adminNav.hidden = false;
  await loadAdminData();
}

adminStepupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  adminStepupStatus.textContent = "";
  try {
    await apiJson("/api/auth/mfa/step-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: adminStepupCode.value.trim() }),
    });
    adminStepupCode.value = "";
    adminStepupStatus.textContent = "Operator session verified for five minutes.";
    await loadAdminData();
  } catch (error) {
    adminStepupStatus.textContent = error.message;
  }
});

document.querySelector("#admin-refresh")?.addEventListener("click", loadAdminData);

adminProviders?.addEventListener("submit", async (event) => {
  const providerForm = event.target.closest(".admin-provider-form");
  if (!providerForm) return;
  event.preventDefault();
  const providerId = providerForm.dataset.providerId;
  const formData = new FormData(providerForm);
  const reasonCode = String(formData.get("reasonCode") || "").trim();
  try {
    const result = await apiJson(`/api/admin/providers/${encodeURIComponent(providerId)}/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          timeoutMs: Number(formData.get("timeoutMs")),
          retries: Number(formData.get("retries")),
          quotaPerMinute: Number(formData.get("quotaPerMinute")),
          priority: Number(formData.get("priority")),
          state: formData.get("state"),
          killSwitch: formData.get("killSwitch") === "on",
        },
        reasonCode,
      }),
    });
    adminMessage(result.approval
      ? `Draft saved. Independent approval required: ${result.approval.id}`
      : "Provider draft saved. Publish it after review.", "success");
    providerForm.reset();
    await loadAdminData();
  } catch (error) {
    adminErrorMessage(error);
  }
});

adminProviders?.addEventListener("submit", async (event) => {
  const testForm = event.target.closest(".admin-provider-test-form");
  const publishForm = event.target.closest(".admin-provider-publish-form");
  const rollbackForm = event.target.closest(".admin-provider-rollback-form");
  const form = testForm || publishForm || rollbackForm;
  if (!form) return;
  event.preventDefault();
  const formData = new FormData(form);
  const providerId = form.dataset.providerTest || form.dataset.providerPublish || form.dataset.providerRollback;
  const submit = form.querySelector("button[type=submit]");
  if (submit) submit.disabled = true;
  try {
    if (testForm) {
      const result = await apiJson(`/api/admin/providers/${encodeURIComponent(providerId)}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: String(formData.get("address") || "").trim(),
          networkId: formData.get("networkId"),
        }),
      });
      adminMessage(result.test.ok
        ? `Connection reachable in ${result.test.latencyMs} ms. Raw provider payload was not returned.`
        : `Connection test failed: ${result.test.errorCode}.`, result.test.ok ? "success" : "error");
    } else {
      const endpoint = publishForm ? "publish" : "rollback";
      await apiJson(`/api/admin/providers/${encodeURIComponent(providerId)}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reasonCode: String(formData.get("reasonCode") || "").trim(),
          approvalId: String(formData.get("approvalId") || "").trim() || null,
        }),
      });
      adminMessage(`Provider ${endpoint} completed and recorded in the audit trail.`, "success");
    }
    await loadAdminData();
  } catch (error) {
    adminErrorMessage(error);
  } finally {
    if (submit) submit.disabled = false;
  }
});

adminFlags?.addEventListener("submit", async (event) => {
  const draftForm = event.target.closest(".admin-flag-form");
  const publishForm = event.target.closest(".admin-flag-publish-form");
  const form = draftForm || publishForm;
  if (!form) return;
  event.preventDefault();
  const formData = new FormData(form);
  const flagKey = form.dataset.flagKey || form.dataset.flagPublish;
  const submit = form.querySelector("button[type=submit]");
  if (submit) submit.disabled = true;
  try {
    const endpoint = publishForm ? "publish" : "draft";
    const body = {
      reasonCode: String(formData.get("reasonCode") || "").trim(),
    };
    if (draftForm) body.enabled = formData.get("enabled") === "on";
    if (publishForm) body.approvalId = String(formData.get("approvalId") || "").trim() || null;
    await apiJson(`/api/admin/feature-flags/${encodeURIComponent(flagKey)}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    adminMessage(`Feature flag ${endpoint} completed and recorded in the audit trail.`, "success");
    await loadAdminData();
  } catch (error) {
    adminErrorMessage(error);
  } finally {
    if (submit) submit.disabled = false;
  }
});

adminApprovals?.addEventListener("submit", async (event) => {
  const form = event.target.closest(".admin-approval-form");
  if (!form) return;
  event.preventDefault();
  const reasonCode = String(new FormData(form).get("reasonCode") || "").trim();
  const submit = form.querySelector("button[type=submit]");
  if (!reasonCode) return;
  submit.disabled = true;
  try {
    await apiJson(`/api/admin/approvals/${encodeURIComponent(form.dataset.approvalId)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reasonCode }),
    });
    adminMessage("Approval granted and recorded.", "success");
    await loadAdminData();
  } catch (error) {
    adminErrorMessage(error);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector("#admin-users-link")?.addEventListener("click", () => loadAdminInventory("users"));
document.querySelector("#admin-workspaces-link")?.addEventListener("click", () => loadAdminInventory("workspaces"));
adminInventorySearch?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadAdminInventory(adminInventoryType);
});
adminInventoryClose?.addEventListener("click", () => {
  adminInventoryDrawer.hidden = true;
  adminInventoryType = null;
});

function showLoading(stages = []) {
  setShell({ privateView: true });
  landing.hidden = true;
  report.hidden = true;
  loading.hidden = false;
  loadingStages.innerHTML = (stages.length ? stages : ["VALIDATING", "FETCHING DATA"]).map((stage, index) => `<span class="stage ${index === 0 ? "active" : ""}">${escapeHtml(stage)}</span>`).join("");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateLoading(scan) {
  if (!scan?.stages) return;
  loadingStages.innerHTML = scan.stages.map((stage, index) => `<span class="stage ${index === scan.stages.length - 1 ? "active" : "done"}">${escapeHtml(stage)}</span>`).join("");
}

function validateForm() {
  const address = addressInput.value.trim();
  let valid = true;
  addressError.textContent = "";
  networkError.textContent = "";
  if (!address) {
    addressError.textContent = "Paste a contract address to begin.";
    valid = false;
  } else if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    addressError.textContent = "Enter a valid 42-character EVM contract address.";
    valid = false;
  }
  if (!networkInput.value) {
    networkError.textContent = "Select a supported network for a live scan.";
    valid = false;
  }
  return valid;
}

async function waitForScan(jobId) {
  let job = null;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const jobResponse = await fetch(`/api/scan/${encodeURIComponent(jobId)}`);
    const jobBody = await jobResponse.json().catch(() => ({}));
    if (!jobResponse.ok) throw new Error(jobBody.message || "The scan job could not be read.");
    job = jobBody.job;
    if (job.status === "SUCCEEDED") return job;
    if (job.status === "FAILED") throw new Error(job.error?.message || "The scan failed.");
    if (job.status === "CANCELLED") throw new Error(job.error?.message || "The scan was cancelled.");
    updateLoading({ stages: job.status === "RUNNING"
      ? ["VALIDATING", "FETCHING DATA", "ANALYZING CONTRACT"]
      : ["VALIDATING", "QUEUED"] });
  }
  throw new Error("The scan timed out while waiting for the worker.");
}

async function loadScanHistory({ reset = true } = {}) {
  if (!authState?.authenticated || !scanHistoryList) return;
  try {
    if (reset) {
      historyCursor = null;
      scanHistoryList.innerHTML = "";
    }
    const params = new URLSearchParams({ limit: "25" });
    if (historyCursor) params.set("cursor", historyCursor);
    if (historyStatus?.value) params.set("status", historyStatus.value);
    const body = await apiJson(`/api/scans?${params.toString()}`);
    const scans = body.scans || [];
    const rows = scans.length
      ? scans.map((scan) => {
        const status = statusClass(scan.status);
        const label = scan.status === "SUCCEEDED" ? "Open report" : scan.status.replaceAll("_", " ");
        const target = scan.status === "SUCCEEDED"
          ? `<a class="history-link" href="/dashboard/scans/${encodeURIComponent(scan.id)}">${label} →</a>`
          : ["QUEUED", "RUNNING"].includes(scan.status)
            ? `<button type="button" class="history-cancel" data-cancel-job="${escapeHtml(scan.id)}">Cancel</button>`
          : `<span class="history-state ${status}">${escapeHtml(label)}</span>`;
        const address = scan.address ? truncateAddress(scan.address) : "Address unavailable";
        return `<div class="history-row"><div><strong>${escapeHtml(address)}</strong><span>${escapeHtml(scan.networkId || "Unknown network")} · ${escapeHtml(formatDate(scan.createdAt))}</span></div><div class="history-row-action"><span class="history-state ${status}">${escapeHtml(label)}</span>${target}</div></div>`;
      }).join("")
      : reset ? `<div class="unknown-message">NO SCANS MATCH THIS FILTER</div>` : "";
    if (reset) scanHistoryList.innerHTML = rows;
    else scanHistoryList.insertAdjacentHTML("beforeend", rows);
    historyCursor = body.pagination?.nextCursor || null;
    if (historyLoadMore) historyLoadMore.hidden = !body.pagination?.hasMore;
    scanHistoryList.querySelectorAll("[data-cancel-job]").forEach((button) => {
      button.addEventListener("click", () => cancelScan(button.dataset.cancelJob));
    });
  } catch (error) {
    if (reset) scanHistoryList.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
  }
}

function renderPassportList(passports) {
  passportCount.textContent = `${passports.length} PASSPORT${passports.length === 1 ? "" : "S"}`;
  passportList.innerHTML = passports.length ? passports.map((passport) => {
    const current = passport.current || {};
    const score = current.risk?.score;
    return `<div class="intelligence-row">
      <div><strong>${escapeHtml(truncateAddress(passport.address))}</strong><span>${escapeHtml(passport.networkId)} · ${escapeHtml(formatDate(current.capturedAt))}</span></div>
      <div class="intelligence-row-value"><b class="${scoreTone(score)}">${escapeHtml(score ?? "UNKNOWN")}</b><span>${escapeHtml(current.risk?.level || "UNKNOWN")} · ${passport.snapshotCount} snapshot${passport.snapshotCount === 1 ? "" : "s"}</span></div>
    </div>`;
  }).join("") : `<div class="unknown-message">NO RISK PASSPORTS YET. A completed live scan will create one.</div>`;
}

function renderWatchlistList(watchlists) {
  const active = watchlists.filter((item) => item.status === "active").length;
  watchlistCount.textContent = `${active} ACTIVE`;
  watchlistList.innerHTML = watchlists.length ? watchlists.map((item) => `
    <div class="intelligence-row">
      <div><strong>${escapeHtml(item.label || truncateAddress(item.address))}</strong><span>${escapeHtml(item.networkId)} · every ${escapeHtml(item.intervalHours)}h</span></div>
      <div class="intelligence-row-action"><span class="watch-status ${statusClass(item.status)}">${escapeHtml(item.status)}</span><span>Next ${escapeHtml(formatDate(item.nextCheckAt))}</span>
        <button type="button" class="text-button" data-watch-toggle="${escapeHtml(item.id)}" data-watch-next="${item.status === "active" ? "paused" : "active"}">${item.status === "active" ? "Pause" : "Resume"}</button>
        <button type="button" class="text-button danger-text" data-watch-delete="${escapeHtml(item.id)}">Remove</button>
      </div>
    </div>`).join("") : `<div class="unknown-message">WATCHTOWER IS EMPTY. Add a contract to begin scheduled checks.</div>`;
  watchlistList.querySelectorAll("[data-watch-toggle]").forEach((button) => button.addEventListener("click", async () => {
    await apiJson(`/api/watchlists/${encodeURIComponent(button.dataset.watchToggle)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: button.dataset.watchNext }),
    });
    await loadIntelligenceDashboard();
  }));
  watchlistList.querySelectorAll("[data-watch-delete]").forEach((button) => button.addEventListener("click", async () => {
    await apiJson(`/api/watchlists/${encodeURIComponent(button.dataset.watchDelete)}`, { method: "DELETE" });
    await loadIntelligenceDashboard();
  }));
}

function renderAlertList(events) {
  const open = events.filter((event) => event.status !== "ACKNOWLEDGED").length;
  alertCount.textContent = `${open} OPEN`;
  alertList.innerHTML = events.length ? events.map((event) => `
    <div class="intelligence-row">
      <div><strong>${escapeHtml(event.message)}</strong><span>${escapeHtml(event.networkId)} · ${escapeHtml(formatDate(event.createdAt))}</span></div>
      <div class="intelligence-row-action"><span class="watch-status ${statusClass(event.status)}">${escapeHtml(event.status)}</span>
        ${event.status !== "ACKNOWLEDGED" ? `<button type="button" class="text-button" data-alert-ack="${escapeHtml(event.id)}">Acknowledge</button>` : `<span>${escapeHtml(formatDate(event.acknowledgedAt))}</span>`}
      </div>
    </div>`).join("") : `<div class="unknown-message">NO ALERTS. Watchtower changes will appear here for review.</div>`;
  alertList.querySelectorAll("[data-alert-ack]").forEach((button) => button.addEventListener("click", async () => {
    await apiJson(`/api/alerts/${encodeURIComponent(button.dataset.alertAck)}/acknowledge`, { method: "POST" });
    await loadIntelligenceDashboard();
  }));
}

async function loadIntelligenceDashboard() {
  if (!authState?.authenticated || !intelligenceDashboard) return;
  intelligenceDashboard.hidden = false;
  try {
    const [passports, watchlists, alerts] = await Promise.all([
      apiJson("/api/risk-passports"),
      apiJson("/api/watchlists"),
      apiJson("/api/alerts"),
    ]);
    renderPassportList(passports.passports || []);
    renderWatchlistList(watchlists.watchlists || []);
    renderAlertList(alerts.events || []);
  } catch (error) {
    passportList.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
  }
}

watchlistForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  watchlistStatus.textContent = "";
  try {
    await apiJson("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network: document.querySelector("#watch-network").value,
        address: document.querySelector("#watch-address").value.trim(),
        intervalHours: Number(document.querySelector("#watch-interval").value),
      }),
    });
    document.querySelector("#watch-address").value = "";
    await loadIntelligenceDashboard();
  } catch (error) {
    watchlistStatus.textContent = error.message;
  }
});

document.querySelector("#watchtower-tick")?.addEventListener("click", async (event) => {
  event.currentTarget.disabled = true;
  try {
    await apiJson("/api/watchtower/tick", { method: "POST" });
    await loadIntelligenceDashboard();
  } catch (error) {
    watchlistStatus.textContent = error.message;
  } finally {
    event.currentTarget.disabled = false;
  }
});

async function scanLive() {
  if (!validateForm()) return;
  if (!authState?.authenticated) {
    sessionStorage.setItem(pendingScanStorageKey, JSON.stringify({
      network: networkInput.value,
      address: addressInput.value.trim(),
    }));
    authRequested = true;
    window.location.assign(`/login?returnTo=${encodeURIComponent("/")}`);
    return;
  }
  showLoading(["VALIDATING", "FETCHING DATA"]);
  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressInput.value.trim(), network: networkInput.value }),
    });
    const body = await response.json();
    if (response.status === 401) {
      sessionStorage.setItem(pendingScanStorageKey, JSON.stringify({
        network: networkInput.value,
        address: addressInput.value.trim(),
      }));
      authRequested = true;
      window.location.assign(`/login?returnTo=${encodeURIComponent("/")}`);
      return;
    }
    if (!response.ok) throw new Error(body.message || "The scan failed.");
    if (!body.job?.id) throw new Error("The scan job could not be created.");
    activeScanJobId = body.job.id;
    const job = await waitForScan(body.job.id);
    currentJob = job;
    currentScan = job.scan;
    updateLoading(currentScan);
    window.history.pushState({}, "", `/dashboard/scans/${encodeURIComponent(body.job.id)}`);
    renderReport(currentScan);
  } catch (error) {
    showLanding({ privateView: true });
    addressError.textContent = error.message;
  } finally {
    activeScanJobId = null;
    if (cancelScanButton) cancelScanButton.disabled = false;
  }
}

async function loadPrivateRoute() {
  const match = reportRouteMatch();
  if (!match) {
    showLanding({ privateView: true });
    return;
  }
  const scanId = decodeURIComponent(match[1]);
  if (scanId.startsWith("demo-")) {
    showLanding({ privateView: true });
    await scanDemo(scanId.slice("demo-".length));
    return;
  }
  showLoading(["LOADING REPORT"]);
  try {
    const job = await waitForScan(scanId);
    currentJob = job;
    currentScan = job.scan;
    updateLoading(currentScan);
    renderReport(currentScan);
  } catch (error) {
    showLanding({ privateView: true });
    addressError.textContent = error.message;
  }
}

async function scanDemo(scenario) {
  if (!authState?.authenticated) {
    authRequested = true;
    window.location.assign("/login?returnTo=%2Fdashboard");
    return;
  }
  showLoading(["BUILDING REPORT"]);
  try {
    const response = await fetch(`/api/demo?scenario=${encodeURIComponent(scenario)}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "The demo could not be loaded.");
    currentScan = body.scan;
    currentJob = null;
    updateLoading(currentScan);
    window.history.pushState({}, "", `/dashboard/scans/demo-${encodeURIComponent(scenario)}`);
    renderReport(currentScan);
  } catch (error) {
    showLanding({ privateView: true });
    addressError.textContent = error.message;
  }
}

function scoreTone(score) {
  if (score === null || score === undefined) return "";
  if (score >= 61) return "risk-high";
  if (score >= 41) return "risk-medium";
  return "risk-low";
}

function dataCoverage(scan) {
  if (scan.mode === "DEMO") return "DEMO FIXTURE";
  if (scan.intelligence?.dataCoverage) return `${scan.intelligence.dataCoverage.overall}%`;
  const values = Object.values(scan.risk?.categories || {});
  if (!values.length) return "UNKNOWN";
  return `${Math.round(values.reduce((total, category) => total + category.coverage, 0) / values.length)}%`;
}

function scanConfidence(scan) {
  return scan.risk?.confidence || "UNKNOWN";
}

function coverageClass(coverage) {
  return Math.min(100, Math.max(0, Math.round(Number(coverage || 0) / 10) * 10));
}

function summaryParagraph(scan) {
  if (!scan.risk || scan.risk.finalScore === null) {
    return "The available evidence does not support a reliable final risk score. Missing categories and data limitations are shown below; UNKNOWN is not treated as a healthy result.";
  }
  const risks = scan.findings.filter((finding) => !finding.positive).slice(0, 2).map((finding) => finding.title.toLowerCase());
  const limitation = scan.risk.partialData ? "The assessment is partial because some categories are not sufficiently covered." : "The available evidence covers the six risk categories for this snapshot.";
  return `The observed evidence maps to a ${scan.risk.level.toLowerCase()} risk level. ${risks.length ? `The most material signals are ${risks.join(" and ")}.` : "No material negative finding was generated from the available evidence."} ${limitation} This is an assessment based on available data at scan time, not financial advice.`;
}

function metaValue(dataPoint, formatter = formatValue) {
  return `<div class="data-value">${pointText(dataPoint, formatter)}</div>`;
}

function renderHero(scan) {
  const name = escapeHtml(valueOf(scan.token.name, "Token identity unavailable"));
  const symbol = escapeHtml(valueOf(scan.token.symbol, ""));
  const score = scan.risk?.finalScore;
  const scoreMarkup = score === null || score === undefined
    ? `<div class="score-number insufficient">INSUFFICIENT DATA<br />FOR RELIABLE SCORE</div>`
    : `<div class="score-number ${scoreTone(score)}">${Math.round(score)}<small>/100</small></div>`;
  const levelMarkup = scan.risk?.level ? `<div class="score-level ${scoreTone(score)}">${escapeHtml(scan.risk.level)}</div>` : `<div class="score-level">SCORE BLOCKED</div>`;
  return `
    <div class="report-topbar">
      <button class="back-button" id="back-home">← BACK TO ANALYZER</button>
      <div class="report-meta"><span>${escapeHtml(scan.scanId)}</span><span class="mode-badge ${scan.mode === "DEMO" ? "demo" : ""}">${escapeHtml(scan.mode)} SCAN</span></div>
    </div>
    ${scan.mode === "DEMO" ? `<div class="demo-banner">DEMO DATA — NOT LIVE BLOCKCHAIN DATA &nbsp; / &nbsp; ENGINE REPRODUCIBILITY: HIGH &nbsp; / &nbsp; LIVE EVIDENCE: NOT APPLICABLE</div>` : ""}
    ${scan.errors.length ? `<div class="error-banner"><strong>PARTIAL DATA:</strong> Some evidence was unavailable for this scan. Missing fields remain UNKNOWN and were not replaced.</div>` : ""}
    <div class="report-hero">
      <div class="report-identity">
        <p class="eyebrow">CA X-RAY / FORENSIC REPORT</p>
        <h1>${name}${symbol ? ` <span class="symbol">/ ${symbol}</span>` : ""}</h1>
        <p>${escapeHtml(summaryParagraph(scan))}</p>
        <div class="identity-grid">
          <div><div class="data-label">NETWORK</div><div class="data-value">${escapeHtml(scan.network.name)}</div></div>
          <div><div class="data-label">SCAN MODE</div><div class="data-value">${statusPill({ status: scan.mode === "DEMO" ? "DEMO" : "VERIFIED" }, scan.mode)}</div></div>
          <div><div class="data-label">DATA COVERAGE</div><div class="data-value">${escapeHtml(dataCoverage(scan))}</div></div>
          <div class="identity-address"><div class="data-label">CONTRACT</div><div class="address-row"><span class="data-value address-text">${escapeHtml(truncateAddress(scan.contract.address))}</span><button class="copy-button" data-copy="${escapeHtml(scan.contract.address)}">COPY</button></div></div>
          <div><div class="data-label">SCAN TIME</div><div class="data-value">${escapeHtml(formatDate(scan.timestamp))}</div></div>
          <div><div class="data-label">IDENTITY</div><div class="data-value">${statusPill({ status: scan.contract.validated && scan.network.validated ? "VERIFIED" : "UNKNOWN" }, scan.contract.validated ? "VALIDATED" : "UNKNOWN")}</div></div>
        </div>
      </div>
      <div class="score-panel">
        <div class="score-label">OVERALL RISK</div>
        ${scoreMarkup}
        ${levelMarkup}
        <div class="score-facts">
          <div><div class="data-label">RELIABILITY</div><div class="data-value">${scan.reliability ? `${Math.round(scan.reliability.score)} / 100` : "UNKNOWN"}</div></div>
          <div><div class="data-label">CONFIDENCE</div><div class="data-value">${escapeHtml(scanConfidence(scan))}</div></div>
        </div>
      </div>
    </div>`;
}

function sectionHeading(number, title, kicker = "") {
  return `<div class="section-heading"><h2>${escapeHtml(title)}</h2><span class="section-number">${escapeHtml(kicker || number)}</span></div>`;
}

function renderExecutiveSummary(scan) {
  const risks = scan.findings.filter((finding) => !finding.positive).slice(0, 3);
  const positives = scan.findings.filter((finding) => finding.positive).slice(0, 3);
  const limitations = scan.limitations.length ? scan.limitations : ["No additional limitations were generated for this snapshot."];
  return `<section class="report-section full">${sectionHeading("01", "EXECUTIVE SUMMARY", "01 / 08")}
    <div class="summary-grid">
      <div>
        <p class="section-intro">${escapeHtml(summaryParagraph(scan))}</p>
        <div class="signal-columns">
          <div><div class="data-label">TOP 3 RISKS</div><ul class="signal-list">${(risks.length ? risks : [{ title: "No evidence-backed risk finding", severity: "UNKNOWN" }]).map((finding) => `<li><span class="signal-severity ${finding.severity === "UNKNOWN" ? "" : "risk-high"}">${escapeHtml(finding.severity)}</span>${escapeHtml(finding.title)}</li>`).join("")}</ul></div>
          <div><div class="data-label">TOP 3 POSITIVE SIGNALS</div><ul class="signal-list">${(positives.length ? positives : [{ title: "No positive signal was established", severity: "UNKNOWN" }]).map((finding) => `<li><span class="signal-severity positive-text">${escapeHtml(finding.severity)}</span>${escapeHtml(finding.title)}</li>`).join("")}</ul></div>
        </div>
      </div>
      <div><div class="data-label">IMPORTANT LIMITATIONS</div><ul class="limitation-list">${limitations.map((limitation) => `<li>${escapeHtml(limitation)}</li>`).join("")}</ul></div>
    </div>
  </section>`;
}

function renderRiskBreakdown(scan) {
  const categories = scan.risk?.categories || {};
  const rows = Object.entries(categoryLabels).map(([key, label]) => {
    const category = categories[key] || {};
    const score = category.score === null || category.score === undefined ? "UNKNOWN" : `${Math.round(category.score)} / 100`;
    const applied = category.score === null || category.score === undefined ? "EXCLUDED" : `${(category.appliedWeight * 100).toFixed(2)}%`;
    return `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(score)}</td><td>${(category.originalWeight * 100).toFixed(0)}%</td><td>${escapeHtml(applied)}</td><td>${statusPill({ status: category.status }, category.status)}</td><td><div class="risk-bar coverage-${coverageClass(category.coverage)}"><span></span></div><small>${category.coverage || 0}%</small></td></tr>`;
  }).join("");
  const calculations = scan.risk?.calculation || [];
  const calcLines = calculations.map((item) => `<div><strong>${escapeHtml(categoryLabels[item.name])}:</strong> ${Math.round(item.score)} × ${(item.originalWeight * 100).toFixed(0)}% = ${(item.contribution).toFixed(2)} <span>→ applied ${(item.appliedWeight * 100).toFixed(2)}%</span></div>`).join("");
  const finalLine = scan.risk?.finalScore === null ? "Final: INSUFFICIENT DATA FOR RELIABLE SCORE" : `Final: ${calculations.reduce((sum, item) => sum + item.contribution, 0).toFixed(2)} ÷ ${(scan.risk.availableWeight * 100).toFixed(2)}% = ${scan.risk.finalScore.toFixed(2)}`;
  const r = scan.reliability?.components || {};
  return `<section class="report-section full">${sectionHeading("02", "RISK BREAKDOWN", "02 / 08")}
    <div class="table-wrap"><table><thead><tr><th>CATEGORY</th><th>SCORE</th><th>ORIGINAL WEIGHT</th><th>APPLIED WEIGHT</th><th>STATUS</th><th>COVERAGE</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="breakdown-note">${scan.risk?.partialData ? "This report is marked PARTIAL DATA. UNKNOWN and UNAVAILABLE categories are omitted from the numerator; their original weights are redistributed only across eligible categories." : "All original category weights are applied because each category has sufficient evidence in this snapshot."}</p>
    <div class="calculation"><div><strong>HOW THE SCORE WAS CALCULATED</strong></div>${calcLines || "<div>Category scores are not eligible for a final calculation.</div>"}<div class="calc-total">${escapeHtml(finalLine)}</div></div>
    <div class="calculation"><div><strong>RELIABILITY CALCULATION</strong></div><div>E: ${r.E ?? 0} × 35%</div><div>S: ${r.S ?? 0} × 20%</div><div>F: ${r.F ?? 0} × 15%</div><div>C: ${r.C ?? 0} × 15%</div><div>R: ${r.R ?? 0} × 10%</div><div>I: ${r.I ?? 0} × 5%</div><div class="calc-total">Reliability: ${scan.reliability ? Math.round(scan.reliability.score) : "UNKNOWN"} / 100</div></div>
  </section>`;
}

function capabilityRow(label, dataPoint, impact) {
  const state = dataPoint?.status || "UNKNOWN";
  const isDetected = dataPoint?.value === true;
  const isNegative = isDetected || (label === "Source verification" && dataPoint?.value === false);
  return `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${pointText(dataPoint)}</td><td class="impact">${isNegative ? escapeHtml(impact) : "No observed addition"}</td><td>${pointEvidence(dataPoint)}</td><td>${escapeHtml(evidenceLabel(dataPoint))}</td><td>${statusPill(dataPoint, dataPoint?.confidence || "UNKNOWN")}</td></tr>`;
}

function tradingRow(label, dataPoint, formatter = formatValue, impact = "—") {
  return `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${pointText(dataPoint, formatter)}</td><td class="impact">${escapeHtml(impact)}</td><td>${pointEvidence(dataPoint)}</td><td>${escapeHtml(evidenceLabel(dataPoint))}</td><td>${statusPill(dataPoint, dataPoint?.confidence || "UNKNOWN")}</td></tr>`;
}

function renderForensics(scan) {
  const s = scan.security || {};
  const t = scan.trading || {};
  return `<section class="report-section full">${sectionHeading("03", "CONTRACT & TRADING FORENSICS", "03 / 08")}
     <div class="forensic-grid">
       <div><h3 class="subheading">CONTRACT CAPABILITIES</h3><div class="table-wrap"><table><thead><tr><th>CAPABILITY</th><th>STATUS</th><th>IMPACT</th><th>EVIDENCE</th><th>EVIDENCE TYPE</th><th>CONFIDENCE</th></tr></thead><tbody>
        ${capabilityRow("Mint additional tokens", s.canMint, "+30")}
        ${capabilityRow("Blacklist addresses", s.canBlacklist, "+20")}
        ${capabilityRow("Whitelist restrictions", s.canWhitelist, "+10")}
        ${capabilityRow("Pause transfers", s.canPause, "+15")}
        ${capabilityRow("Modify transaction tax", s.canChangeTax, "+20")}
        ${capabilityRow("Upgradeable / proxy", s.isUpgradeable, "+15")}
        ${capabilityRow("Withdraw funds", s.canWithdraw, "+15")}
        ${capabilityRow("Source verification", s.sourceVerified, "Unverified +10")}
      </tbody></table></div></div>
       <div><h3 class="subheading">TRADING SIGNALS</h3><div class="table-wrap"><table><thead><tr><th>SIGNAL</th><th>VALUE / STATUS</th><th>IMPACT</th><th>EVIDENCE</th><th>EVIDENCE TYPE</th><th>CONFIDENCE</th></tr></thead><tbody>
        ${tradingRow("Buy tax", t.buyTax, formatPercent, "≥15% adds +15")}
        ${tradingRow("Sell tax", t.sellTax, formatPercent, "≥20% adds +20")}
        ${tradingRow("Transfer tax", t.transferTax, formatPercent)}
        ${tradingRow("Sell restriction", t.sellRestriction, formatValue, "+30")}
        ${tradingRow("Buy restriction", t.buyRestriction, formatValue, "+20")}
        ${tradingRow("Malicious-trading signal", t.maliciousTradingSignal, formatValue, "+50")}
        ${tradingRow("Max wallet / transaction", t.maxWalletRestriction, formatValue, "+10")}
        ${tradingRow("Trading pause", t.tradingPause, formatValue, "+10")}
      </tbody></table></div></div>
    </div>
  </section>`;
}

function metric(label, dataPoint, formatter = formatValue) {
  return `<div class="metric"><div class="data-label">${escapeHtml(label)}</div>${metaValue(dataPoint, formatter)}</div>`;
}

function renderHolderLiquidity(scan) {
  const h = scan.holders || {};
  const l = scan.liquidity || {};
  const holderFields = [h.totalHolders, h.top1Percent, h.top5Percent, h.top10Percent, h.deployerPercent, h.ownerPercent, h.burnPercent, h.liquidityRelatedAddresses];
  const holderUnavailable = holderFields.every((field) => !field || field.status === "UNKNOWN" || field.status === "UNAVAILABLE" || field.status === "ERROR");
  return `<section class="report-section full">${sectionHeading("04", "HOLDER & LIQUIDITY ANALYSIS", "04 / 08")}
    <div class="forensic-grid">
      <div><h3 class="subheading">HOLDER SUMMARY</h3>${holderUnavailable ? `<div class="unknown-message">HOLDER DATA UNAVAILABLE</div>` : `<div class="metric-grid">
        ${metric("Total holders", h.totalHolders)}
        ${metric("Top 1%", h.top1Percent, formatPercent)}
        ${metric("Top 5%", h.top5Percent, formatPercent)}
        ${metric("Top 10%", h.top10Percent, formatPercent)}
        ${metric("Deployer", h.deployerPercent, formatPercent)}
        ${metric("Owner", h.ownerPercent, formatPercent)}
        ${metric("Burn", h.burnPercent, formatPercent)}
        ${metric("Liquidity-related", h.liquidityRelatedAddresses)}
      </div>`}</div>
      <div><h3 class="subheading">PRIMARY LIQUIDITY PAIR</h3>${!l.pair || l.pair.status === "UNKNOWN" ? `<div class="unknown-message">LIQUIDITY DATA UNKNOWN</div>` : `<div class="metric-grid">
        ${metric("Liquidity", l.liquidityUsd, formatCurrency)}
        ${metric("24h volume", l.volume24h, formatCurrency)}
        ${metric("Pair", l.pair, truncateAddress)}
        ${metric("DEX", l.dex)}
        ${metric("Price", l.price, (value) => `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 8 })}`)}
        ${metric("24h change", l.change24h, formatPercent)}
      </div><p class="pair-note">Primary pair rule: ${escapeHtml(l.primaryPairRule || "Highest-evidence pair selection rule.")} Liquidity lock status is not claimed because no reliable lock source is configured.</p>`}</div>
    </div>
  </section>`;
}

function renderMarketDeployer(scan) {
  const m = scan.market || {};
  const d = scan.deployer || {};
  const p = scan.project || {};
  return `<section class="report-section full">${sectionHeading("05", "MARKET & DEPLOYER SIGNALS", "05 / 08")}
    <div class="forensic-grid">
      <div><h3 class="subheading">MARKET & PROJECT</h3><div class="metric-grid">
        ${metric("Price", m.price, (value) => `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 8 })}`)}
        ${metric("24h volume", m.volume24h, formatCurrency)}
        ${metric("Liquidity", m.liquidityUsd, formatCurrency)}
        ${metric("FDV", m.fdv, formatCurrency)}
        ${metric("24h change", m.change24h, formatPercent)}
        ${metric("7d change", m.change7d, formatPercent)}
        ${metric("Website", p.website)}
        ${metric("Address consistency", p.addressConsistency)}
        ${metric("Audit claim", p.auditClaim)}
      </div></div>
      <div><h3 class="subheading">DEPLOYER</h3><div class="metric-grid">
        ${metric("Address", d.address, truncateAddress)}
        ${metric("Deployment date", d.deploymentDate)}
        ${metric("Suspicious behavior", d.suspiciousBehavior)}
        ${metric("Related contracts", d.relatedContracts)}
        ${metric("Recent deployment", d.veryRecentDeployment)}
        ${metric("Token concentration", d.tokenConcentration, formatPercent)}
        ${metric("Malicious association", d.maliciousAssociation)}
      </div></div>
    </div>
  </section>`;
}

function findingRow(finding) {
  return `<tr><td>${statusPill({ status: finding.severity }, finding.severity)}</td><td><div class="finding-title">${escapeHtml(finding.title)}</div><div class="finding-why">${escapeHtml(finding.why)}</div></td><td>${escapeHtml(finding.confidence)}</td><td>${escapeHtml(finding.evidence)}</td></tr>`;
}

function renderFindings(scan) {
  const findings = scan.findings || [];
  const top = findings.slice(0, 5);
  const all = findings.slice(5);
  return `<section class="report-section full">${sectionHeading("06", "KEY FINDINGS", "06 / 08")}
    <p class="section-intro">Findings are generated only when the normalized snapshot contains supporting evidence. They are ordered by severity, risk contribution, confidence, and stable finding ID.</p>
    <div class="table-wrap"><table class="finding-table"><thead><tr><th>SEVERITY</th><th>FINDING / WHY IT MATTERS</th><th>CONFIDENCE</th><th>EVIDENCE</th></tr></thead><tbody>${top.length ? top.map(findingRow).join("") : `<tr><td colspan="4">No evidence-backed findings were generated.</td></tr>`}</tbody></table></div>
    ${all.length ? `<button class="view-all" id="view-all-findings">VIEW ALL FINDINGS (${all.length})</button><div id="all-findings" class="additional-findings" hidden><div class="table-wrap"><table class="finding-table"><tbody>${all.map(findingRow).join("")}</tbody></table></div></div>` : ""}
  </section>`;
}

function renderEvidence(scan) {
  return `<section class="report-section full">${sectionHeading("07", "EVIDENCE REGISTER", "07 / 08")}
    <p class="section-intro">Expand an item for WHAT, WHY, EVIDENCE, timestamp, status, confidence, and limitations.</p>
    ${scan.evidence?.length ? `<div class="table-wrap"><table><thead><tr><th>ID</th><th>FINDING</th><th>EVIDENCE TYPE</th><th>RETRIEVED AT</th><th>CONFIDENCE</th></tr></thead><tbody>${scan.evidence.map((evidence) => `<tr><td><span class="evidence-id">${escapeHtml(evidence.id)}</span></td><td>${escapeHtml(evidence.finding)}<details class="evidence-detail"><summary>VIEW EVIDENCE DETAIL</summary><div class="detail-grid"><strong>WHAT</strong><span>${escapeHtml(evidence.what)}</span><strong>WHY</strong><span>${escapeHtml(evidence.why)}</span><strong>EVIDENCE</strong><span>${escapeHtml(evidence.evidence)}</span><strong>EVIDENCE TYPE</strong><span>${escapeHtml(evidenceLabel(evidence))}</span><strong>RETRIEVED AT</strong><span>${escapeHtml(formatDate(evidence.retrievedAt))}</span><strong>STATUS</strong><span>${statusPill(evidence, evidence.status)}</span><strong>CONFIDENCE</strong><span>${escapeHtml(evidence.confidence)}</span>${evidence.limitations ? `<strong>LIMITATIONS</strong><span>${escapeHtml(evidence.limitations)}</span>` : ""}</div></details></td><td>${escapeHtml(evidenceLabel(evidence))}</td><td>${escapeHtml(formatDate(evidence.retrievedAt))}</td><td>${escapeHtml(evidence.confidence)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="unknown-message">NO MATERIAL EVIDENCE REGISTERED</div>`}
  </section>`;
}

function renderFinalAssessment(scan) {
  const risk = scan.risk || {};
  const primaryRisks = (scan.findings || []).filter((finding) => !finding.positive).slice(0, 3);
  const positives = (scan.findings || []).filter((finding) => finding.positive).slice(0, 3);
  return `<section class="report-section full">${sectionHeading("08", "FINAL ASSESSMENT", "08 / 08")}
    <div class="summary-grid">
      <div><div class="metric-grid">
        ${metric("Overall risk", risk.finalScore === null ? { status: "UNKNOWN", value: null } : { status: "VERIFIED", value: `${Math.round(risk.finalScore)} / 100` })}
        ${metric("Risk level", { status: risk.level ? "VERIFIED" : "UNKNOWN", value: risk.level || null })}
        ${metric("Reliability", { status: "VERIFIED", value: scan.reliability ? `${Math.round(scan.reliability.score)} / 100` : null })}
        ${metric("Confidence", { status: scanConfidence(scan) === "UNKNOWN" ? "UNKNOWN" : "VERIFIED", value: scanConfidence(scan) })}
        ${metric("Data coverage", { status: "VERIFIED", value: dataCoverage(scan) })}
      </div></div>
      <div><div class="data-label">PRIMARY RISKS</div><ul class="limitation-list">${(primaryRisks.length ? primaryRisks : [{ title: "No primary risk finding established." }]).map((finding) => `<li>${escapeHtml(finding.title)}</li>`).join("")}</ul><div class="data-label positive-block">POSITIVE SIGNALS</div><ul class="limitation-list">${(positives.length ? positives : [{ title: "No positive signal established." }]).map((finding) => `<li>${escapeHtml(finding.title)}</li>`).join("")}</ul></div>
    </div>
    <h3 class="subheading verify-heading">WHAT TO VERIFY BEFORE TRUSTING THIS TOKEN</h3>
    <div class="checklist"><div>Verify contract address</div><div>Review owner permissions</div><div>Review holder concentration</div><div>Review liquidity</div><div>Review trading restrictions</div><div>Review audit claims</div><div>Review deployer activity</div></div>
    <p class="disclaimer">This is not financial advice. This assessment does not guarantee safety and does not establish that a token is a scam. CA X-RAY does not provide BUY, SELL, LONG, or SHORT recommendations.</p>
  </section>`;
}

function dashboardValue(dataPoint, formatter = formatValue) {
  if (!dataPoint || dataPoint.value === null || dataPoint.value === undefined || dataPoint.value === "") {
    return dataPoint?.status === "UNAVAILABLE" ? "Unavailable" : "Unknown";
  }
  return formatter(dataPoint.value);
}

function dashboardStatus(dataPoint, label = null) {
  const status = dataPoint?.status || "UNKNOWN";
  const statusLabel = label || (status === "DEMO" ? "Valid" : status.replaceAll("_", " "));
  return `<span class="dashboard-status ${statusClass(status)}">${escapeHtml(statusLabel)}</span>`;
}

function dashboardCategoryBar(label, score, tone = "red") {
  const numericScore = Number.isFinite(Number(score)) ? Math.round(Number(score)) : null;
  const width = numericScore === null ? 0 : Math.max(0, Math.min(100, numericScore));
  return `<div class="category-row"><span>${escapeHtml(label)}</span><div class="category-track ${tone} coverage-${coverageClass(width)}"><span></span></div><strong>${numericScore === null ? "—" : `${numericScore} / 100`}</strong></div>`;
}

function renderDashboardReport(scan) {
  const risk = scan.risk || {};
  const score = risk.finalScore;
  const scoreLabel = score === null || score === undefined ? "INSUFFICIENT DATA" : Math.round(score);
  const findings = scan.findings || [];
  const risks = findings.filter((finding) => !finding.positive).slice(0, 4);
  const categories = risk.categories || {};
  const securityScore = categories.contract?.score;
  const tradingScore = categories.trading?.score;
  const reliabilityScore = scan.reliability?.score;
  const marketScore = categories.marketProject?.score;
  const sourceCount = scan.evidence?.length || 0;
  const partialCount = scan.errors?.length || 0;
  const tokenName = dashboardValue(scan.token?.name);
  const tokenSymbol = dashboardValue(scan.token?.symbol);
  const totalSupply = dashboardValue(scan.token?.totalSupply, (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? (numeric / 10 ** Number(dashboardValue(scan.token?.decimals, formatValue))).toLocaleString("en-US", { maximumFractionDigits: 0 }) : formatValue(value);
  });
  const contractAddress = scan.contract?.address || "UNKNOWN";
  const statusPoint = (point) => point || { status: scan.mode === "DEMO" ? "DEMO" : "VERIFIED", value: true };
  const topRiskRows = risks.length ? risks : [{ title: "No evidence-backed risk finding", severity: "UNKNOWN", why: "No material risk was established.", category: "—" }];
  const dataRows = [
    ["On-Chain Data", statusPoint(scan.network)],
    ["Contract Code", statusPoint(scan.security?.sourceVerified)],
    ["Liquidity Data", statusPoint(scan.liquidity?.liquidityUsd)],
    ["Holder Data", statusPoint(scan.holders?.totalHolders)],
    ["Market Data", statusPoint(scan.market?.price)],
    ["Social Data", { status: "UNAVAILABLE", value: null }],
  ];
  return `
    <div class="dashboard-report">
      <div class="report-heading">
        <div>
          <h2>Scan Report</h2>
          <p class="report-subtitle">Evidence-backed forensic assessment for the selected contract.</p>
        </div>
        <button type="button" class="download-button" id="download-report">⇩ <span>Download Report</span></button>
      </div>
      <div class="report-contract-row">
        <div><span>Contract</span><button type="button" class="contract-link" data-copy="${escapeHtml(contractAddress)}">${escapeHtml(truncateAddress(contractAddress))} <small>▣</small></button></div>
        <div><span>Network</span><strong class="inline-network">◆ ${escapeHtml(scan.network?.name || "Unknown")}</strong></div>
        <div><span>Scan Mode</span>${dashboardStatus({ status: scan.mode === "DEMO" ? "DEMO" : "VERIFIED" }, scan.mode === "DEMO" ? "Demo" : "Live")}</div>
        <div><span>Scan ID</span><strong>${escapeHtml(scan.scanId || "UNKNOWN")}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(formatDate(scan.timestamp))}</strong></div>
      </div>
      ${scan.mode === "DEMO" ? `<div class="dashboard-demo-note">Demo report shown with fixed sample data. Run a live scan to replace it with provider evidence.</div>` : ""}
      <div class="dashboard-report-grid">
        <section class="overview-card">
          <div class="overview-risk">
            <span class="card-kicker">OVERALL RISK</span>
            <div class="dashboard-score ${scoreTone(score)}">${escapeHtml(String(scoreLabel))}<small>/ 100</small></div>
            <span class="risk-badge ${scoreTone(score)}">${escapeHtml(risk.level || "UNKNOWN")}</span>
            <div class="score-meter"><span class="${scoreTone(score)} coverage-${coverageClass(score)}"></span></div>
            <div class="overview-metric"><span>Risk Score</span><strong>${score === null || score === undefined ? "Unknown" : `${Math.round(score)} / 100`}</strong></div>
            <div class="overview-metric reliability"><span>Reliability Score</span><strong>${scan.reliability ? `${Math.round(scan.reliability.score)} / 100` : "Unknown"}</strong></div>
            <div class="overview-metric"><span>Confidence</span><strong>${escapeHtml(scan.risk?.confidence || "Unknown")}</strong></div>
            <div class="overview-metric"><span>Scan Mode</span><strong>${scan.mode === "DEMO" ? "Demo Data" : "Live Data"}</strong></div>
          </div>
          <div class="why-score">
            <div class="card-kicker">WHY THIS SCORE?</div>
            <p class="why-intro">This score is primarily influenced by the contract's control surface, trading conditions, and available evidence quality.</p>
            <ul class="reason-list">${(risks.length ? risks : [{ title: "No material risk finding established.", severity: "POSITIVE", positive: true }]).map((finding) => `<li><span class="reason-icon ${finding.positive ? "positive" : "negative"}">${finding.positive ? "✓" : "!"}</span><span>${escapeHtml(finding.title)}</span><em class="${finding.positive ? "positive" : "negative"}">${finding.positive ? "Positive" : "High Impact"}</em></li>`).join("")}</ul>
            <button type="button" class="outline-button" id="open-full-analysis">View Full Analysis <span>→</span></button>
          </div>
        </section>
        <aside class="report-side-column">
          <section class="side-card"><div class="card-kicker">QUICK SUMMARY</div>
            <div class="summary-row"><span>Token Name</span><strong>${escapeHtml(tokenName)}</strong></div>
            <div class="summary-row"><span>Symbol</span><strong>${escapeHtml(tokenSymbol)}</strong></div>
            <div class="summary-row"><span>Decimals</span><strong>${escapeHtml(dashboardValue(scan.token?.decimals))}</strong></div>
            <div class="summary-row"><span>Total Supply</span><strong>${escapeHtml(totalSupply)}</strong></div>
            <div class="summary-row"><span>Holders</span><strong>${escapeHtml(dashboardValue(scan.holders?.totalHolders))}</strong></div>
            <div class="summary-row"><span>Contract Age</span><strong>${escapeHtml(dashboardValue(scan.deployer?.deploymentDate))}</strong></div>
          </section>
          <section class="side-card"><div class="card-kicker">RISK BREAKDOWN</div>
            ${dashboardCategoryBar("Security", securityScore, "red")}
            ${dashboardCategoryBar("Trading Safety", tradingScore, "orange")}
            ${dashboardCategoryBar("Reliability", reliabilityScore, "yellow")}
            ${dashboardCategoryBar("Market", marketScore, "yellow")}
            <button type="button" class="side-link" id="open-risk-breakdown">View All Categories <span>→</span></button>
          </section>
        </aside>
      </div>
      <div class="report-tabs" role="tablist" aria-label="Report sections">
        <button class="active" type="button">Overview</button><button type="button">Contract Forensics</button><button type="button">Trading Safety</button><button type="button">Liquidity</button><button type="button">Holder Analysis</button><button type="button">Market</button><button type="button">Evidence</button>
      </div>
      <div class="dashboard-lower-grid">
        <section class="report-table-card">
          <div class="card-heading"><div class="card-kicker">TOP RISKS</div><button type="button" class="side-link" id="open-findings">View All Findings <span>→</span></button></div>
          <div class="responsive-table"><table><thead><tr><th>RISK</th><th>CATEGORY</th><th>SEVERITY</th><th>IMPACT</th><th>STATUS</th></tr></thead><tbody>${topRiskRows.map((finding) => `<tr><td><strong>${escapeHtml(finding.title)}</strong></td><td>${escapeHtml(categoryLabels[finding.category] || finding.category || "Security")}</td><td><span class="severity-chip ${statusClass(finding.severity)}">${escapeHtml(finding.severity || "UNKNOWN")}</span></td><td>${escapeHtml(finding.impact ? `+${finding.impact}` : finding.severity === "UNKNOWN" ? "—" : "High")}</td><td><span class="detected-chip">${finding.severity === "UNKNOWN" ? "Unknown" : "Detected"}</span></td></tr>`).join("")}</tbody></table></div>
        </section>
        <div class="report-side-column lower-side">
          <section class="side-card"><div class="card-kicker">DATA STATUS</div>${dataRows.map(([label, point]) => `<div class="status-row"><span>${label}</span>${dashboardStatus(point, point.status === "UNAVAILABLE" ? "Unavailable" : point.status === "DEMO" ? "Valid" : "Valid")}</div>`).join("")}</section>
          <section class="side-card"><div class="card-kicker">EVIDENCE SOURCES</div><div class="evidence-count"><strong>${sourceCount}</strong><span>Total Sources</span></div><div class="evidence-breakdown"><span><b class="green-text">${Math.max(0, sourceCount - partialCount)}</b> Successful</span><span><b class="orange-text">${partialCount}</b> Partial</span><span><b class="red-text">0</b> Failed</span></div><button type="button" class="side-link" id="open-evidence">View Evidence <span>→</span></button></section>
        </div>
      </div>
      <div id="dashboard-deep" class="dashboard-deep" hidden>${renderUserImpacts(scan)}${renderRiskBreakdown(scan)}${renderForensics(scan)}${renderHolderLiquidity(scan)}${renderMarketDeployer(scan)}${renderFindings(scan)}${renderEvidence(scan)}${renderFinalAssessment(scan)}</div>
    </div>`;
}

function renderRiskProfile(scan) {
  const profile = scan.intelligence?.riskProfile || [];
  return `<section class="report-section full intelligence-section">${sectionHeading("02", "RISK PROFILE", "02 / 16")}
    <p class="section-intro">Explanatory dimensions derived from the canonical overall risk score. UNKNOWN means the available evidence is not sufficient for a category conclusion.</p>
    <div class="profile-grid">${profile.map((item) => `<article class="profile-card">
      <div class="profile-card-top"><div class="data-label">${escapeHtml(item.label)}</div><span class="profile-score">${item.score === null ? "UNKNOWN" : `${Math.round(item.score)} / 100`}</span></div>
      ${statusPill({ status: item.level }, item.level)}
      <p>${escapeHtml(item.reason)}</p>
      <div class="coverage-line"><span>DATA COVERAGE</span><strong>${escapeHtml(String(item.coverage))}%</strong></div>
    </article>`).join("")}</div>
  </section>`;
}

function renderCapabilities(scan) {
  const intelligence = scan.intelligence || {};
  const capabilities = intelligence.capabilities || [];
  return `<section class="report-section full intelligence-section">${sectionHeading("03", "WHAT CAN THIS CONTRACT DO?", "03 / 16")}
    <p class="section-intro">Technical permissions are translated into potential user impact. A detected capability is a risk signal, not proof of malicious behavior.</p>
    <div class="capability-grid">${capabilities.map((capability) => `<article class="capability-card ${capability.detected ? "detected" : ""}">
      <div class="capability-head"><h3>${escapeHtml(capability.label)}</h3>${statusPill({ status: capability.status }, capability.status)}</div>
      <div class="data-label">MEANING</div><p>${escapeHtml(capability.detected ? capability.meaning : capability.status === "UNKNOWN" ? "Not enough evidence to determine this capability." : "The capability was not detected in available evidence.")}</p>
      <div class="capability-meta"><div><span class="data-label">POTENTIAL IMPACT</span><strong>${escapeHtml(capability.impact)}</strong></div><div><span class="data-label">CONTROL</span><strong>${escapeHtml(capability.control)}</strong></div></div>
      <div class="capability-foot"><span>EVIDENCE: ${escapeHtml(capability.detected || capability.status === "NOT_DETECTED" ? evidenceLabel({ status: capability.status }) : "UNKNOWN")}</span><span>CONFIDENCE: ${escapeHtml(capability.confidence)}</span></div>
    </article>`).join("")}</div>
  </section>`;
}

function renderPowerMap(scan) {
  const map = scan.intelligence?.powerMap || {};
  const capabilities = map.capabilities || [];
  return `<section class="report-section full intelligence-section">${sectionHeading("04", "CONTRACT POWER MAP", "04 / 16")}
    <div class="power-map">
      <div class="power-node"><span class="data-label">OWNER / ADMIN</span><strong class="address-text">${escapeHtml(map.owner || "UNKNOWN")}</strong><span class="status-note">${escapeHtml(map.control || "UNKNOWN")}</span></div>
      <div class="power-arrow">↓</div>
      <div class="power-node"><span class="data-label">CAN CONTROL</span><div class="power-tags">${(capabilities.length ? capabilities : ["UNKNOWN"]).map((item) => `<span class="power-tag">${escapeHtml(item)}</span>`).join("")}</div></div>
      <div class="power-arrow">↓</div>
      <div class="power-node"><span class="data-label">POTENTIAL USER IMPACT</span><ul class="compact-list">${((map.impacts || []).length ? map.impacts : ["Insufficient evidence available."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </div>
  </section>`;
}

function renderExitability(scan) {
  const exit = scan.intelligence?.exitability || {};
  return `<section class="report-section full intelligence-section">${sectionHeading("05", "CAN I EXIT?", "05 / 16")}
    <p class="section-intro">Technical exitability assessment only. This is not investment advice and does not guarantee execution or safety.</p>
    <div class="exit-grid"><div class="exit-summary"><div class="data-label">EXITABILITY</div><div class="exit-level ${statusClass(exit.level)}">${escapeHtml(exit.level || "UNKNOWN")}</div><p>${escapeHtml(exit.explanation || "Insufficient evidence is available to assess practical exit conditions.")}</p></div>
      <div class="exit-signals">${(exit.signals || []).map((signal) => `<div class="exit-signal"><span class="data-label">${escapeHtml(signal.label)}</span><strong>${escapeHtml(signal.value)}</strong></div>`).join("")}</div>
    </div>
  </section>`;
}

function renderUserImpacts(scan) {
  const impacts = scan.intelligence?.impacts || [];
  return `<section class="report-section full intelligence-section">${sectionHeading("06", "USER IMPACT", "06 / 16")}
    <p class="section-intro">Each material finding is expressed as capability or signal → potential user impact → control → evidence confidence.</p>
    <div class="impact-grid">${(impacts.length ? impacts : [{ title: "No evidence-backed impact finding", what: "No material negative finding was generated.", why: "Available evidence did not establish one.", impact: "No conclusion beyond available evidence.", control: "UNKNOWN", evidence: "Contract Analysis", confidence: "UNKNOWN" }]).map((item) => `<article class="impact-card">
      <div class="impact-card-head"><h3>${escapeHtml(item.title)}</h3><span class="evidence-id">${escapeHtml(item.confidence)}</span></div>
      <div class="impact-detail"><strong>WHAT</strong><span>${escapeHtml(item.what)}</span><strong>WHY</strong><span>${escapeHtml(item.why)}</span><strong>POTENTIAL IMPACT</strong><span>${escapeHtml(item.impact)}</span><strong>CONTROL</strong><span>${escapeHtml(item.control)}</span><strong>EVIDENCE</strong><span>${escapeHtml(item.evidence)} · CONFIDENCE ${escapeHtml(item.confidence)}</span></div>
    </article>`).join("")}</div>
  </section>`;
}

function renderScoreExplanation(scan) {
  const explanation = scan.intelligence?.scoreExplanation || {};
  const items = explanation.items || [];
  const total = Number.isFinite(Number(explanation.total)) ? Number(explanation.total).toFixed(2) : "UNKNOWN";
  const final = explanation.final === null || explanation.final === undefined ? "INSUFFICIENT DATA" : `${Number(explanation.final).toFixed(2)} / 100`;
  return `<section class="report-section full intelligence-section">${sectionHeading("08", "WHY THIS SCORE?", "08 / 16")}
    <p class="section-intro">The canonical score is unchanged. Contributions below use each eligible category's original weight, then normalize by the available weight when evidence is partial.</p>
    <div class="score-explanation">${items.length ? items.map((item) => `<div class="score-line"><strong>${escapeHtml(item.label)}</strong><span>${Number(item.score).toFixed(2)} × ${(item.weight * 100).toFixed(0)}%</span><b>= ${Number(item.contribution).toFixed(2)}</b></div>`).join("") : `<div class="unknown-message">No eligible category contribution is available.</div>`}
      <div class="score-total"><span>TOTAL EVIDENCED CONTRIBUTION</span><strong>${escapeHtml(total)}</strong></div><div class="score-total"><span>FINAL CANONICAL SCORE</span><strong>${escapeHtml(final)}</strong></div>
    </div><p class="main-driver"><span class="data-label">MAIN SCORE DRIVER</span>${escapeHtml(explanation.mainDriver || "No score driver established.")}</p>
  </section>`;
}

function renderCompoundRisk(scan) {
  const compounds = scan.intelligence?.compoundRisks || [];
  return `<section class="report-section full intelligence-section">${sectionHeading("12", "COMPOUND RISK", "12 / 16")}
    <p class="section-intro">Compound findings trigger only when each underlying signal is supported by available evidence. They do not replace the canonical score.</p>
    ${compounds.length ? `<div class="compound-grid">${compounds.map((compound) => `<article class="compound-card"><div class="capability-head"><h3>${escapeHtml(compound.title)}</h3>${statusPill({ status: compound.level }, compound.level)}</div><p>${escapeHtml(compound.explanation)}</p><div class="data-label">SUPPORTING SIGNALS</div><div class="power-tags">${compound.signals.map((signal) => `<span class="power-tag">${escapeHtml(signal)}</span>`).join("")}</div></article>`).join("")}</div>` : `<div class="unknown-message">NO COMPOUND RISK CONDITION ESTABLISHED FROM AVAILABLE EVIDENCE</div>`}
  </section>`;
}

function renderSignalContext(scan) {
  const risks = (scan.findings || []).filter((finding) => !finding.positive).slice(0, 6);
  return `<section class="report-section full intelligence-section">${sectionHeading("13", "SIGNAL CONTEXT", "13 / 16")}
    <p class="section-intro">A detected signal is not, by itself, proof of malicious behavior. The report separates what the evidence establishes from what still requires independent verification.</p>
    <div class="context-grid">${(risks.length ? risks : [{ title: "No material signal established", what: "No evidence-backed negative finding was generated.", confidence: "UNKNOWN" }]).map((finding) => `<article class="context-card"><div class="context-card-head"><strong>${escapeHtml(finding.title)}</strong><span>${escapeHtml(finding.confidence)}</span></div><div><span class="data-label">SIGNAL STATUS</span><b>SIGNAL DETECTED</b></div><p>${escapeHtml(finding.what)}</p><div><span class="data-label">NOT ESTABLISHED BY THIS SIGNAL</span><p>Unauthorized or malicious behavior is not established by this finding alone.</p></div></article>`).join("")}</div>
  </section>`;
}

function renderCoverage(scan) {
  const coverage = scan.intelligence?.dataCoverage;
  const categories = coverage?.categories || [];
  const timeline = scan.intelligence?.timeline;
  const relationships = scan.intelligence?.addressRelationships || [];
  return `<section class="report-section full intelligence-section">${sectionHeading("15", "DATA COVERAGE & LIMITATIONS", "15 / 16")}
    <div class="coverage-summary"><div><div class="data-label">OVERALL EVIDENCE COVERAGE</div><strong>${scan.mode === "DEMO" ? "DEMO FIXTURE" : `${coverage?.overall ?? "UNKNOWN"}%`}</strong></div><div><div class="data-label">SCAN LIMITATION</div><p>${scan.errors?.length ? "Some evidence was unavailable for this scan." : "Coverage reflects fields returned in the normalized snapshot."}</p></div></div>
    <div class="coverage-cards">${categories.map((category) => `<div><span class="data-label">${escapeHtml(category.label)}</span><strong>${escapeHtml(String(category.coverage))}%</strong><span class="coverage-status">${escapeHtml(category.status)}</span></div>`).join("")}</div>
    <div class="coverage-lower"><div><h3 class="subheading">TOKEN TIMELINE</h3>${timeline?.items?.length ? `<div class="timeline">${timeline.items.map((item) => `<div class="timeline-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(truncateAddress(String(item.value)))}</strong></div>`).join("")}</div>` : `<div class="unknown-message">TIMELINE LIMITED EVIDENCE</div>`}</div><div><h3 class="subheading">ADDRESS RELATIONSHIPS</h3>${relationships.length ? `<div class="relationship-list">${relationships.map((item) => `<div><span>${escapeHtml(item.label)}</span><strong class="address-text">${escapeHtml(truncateAddress(String(item.value)))}</strong></div>`).join("")}</div>` : `<div class="unknown-message">NO VERIFIED RELATIONSHIP FOUND</div>`}</div></div>
    <div class="history-card"><div><span class="data-label">WHAT CHANGED?</span><strong>NO PREVIOUS SCAN</strong></div><p>Historical comparison is not available because no prior scan is stored in this application.</p></div>
  </section>`;
}

function renderReport(scan) {
  updateLoading(scan);
  setShell({ privateView: true });
  landing.hidden = false;
  loading.hidden = true;
  report.hidden = true;
  const dashboardReport = document.querySelector("#dashboard-report");
  dashboardReport.hidden = false;
  dashboardReport.innerHTML = renderDashboardReport(scan);
  document.querySelector("#landing-title").textContent = "Private Scan Report";
  document.querySelector("#landing-description").textContent = "Your forensic report is available inside the authenticated workspace.";
  document.querySelector("#scan-mode-card").hidden = true;
  scanHistory.hidden = true;
  document.querySelector("#new-scan").classList.add("report-route");
  document.querySelector("#dashboard").classList.add("private-heading");
  document.querySelector("#download-report")?.addEventListener("click", () => window.print());
  document.querySelector("#back-home")?.addEventListener("click", () => {
    window.history.pushState({}, "", "/dashboard");
    showLanding({ privateView: true });
  });
  const deep = document.querySelector("#dashboard-deep");
  const openDeep = () => {
    if (!deep) return;
    deep.hidden = false;
    deep.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  document.querySelector("#open-full-analysis")?.addEventListener("click", openDeep);
  document.querySelector("#open-risk-breakdown")?.addEventListener("click", openDeep);
  document.querySelector("#open-findings")?.addEventListener("click", openDeep);
  document.querySelector("#open-evidence")?.addEventListener("click", openDeep);
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        const original = button.textContent;
        button.textContent = "COPIED";
        setTimeout(() => { button.textContent = original; }, 1200);
      } catch {
        button.textContent = "COPY FAILED";
      }
    });
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  scanLive();
});
addressInput.addEventListener("input", () => {
  clearAddress.hidden = !addressInput.value;
  addressError.textContent = "";
});
clearAddress.addEventListener("click", () => {
  addressInput.value = "";
  clearAddress.hidden = true;
  addressInput.focus();
});
networkInput.addEventListener("change", () => { networkError.textContent = ""; });
document.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => scanDemo(button.dataset.demo)));
document.querySelector("#mobile-menu")?.addEventListener("click", (event) => {
  const open = sidebar.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

window.addEventListener("popstate", () => {
  authRequested = isAuthRoute();
  if (authState?.authenticated && isPrivateRoute()) loadPrivateRoute();
  else if (!authState?.authenticated) {
    configureAuthRoute();
    setShell({ authView: authRequested });
  } else {
    showLanding({ privateView: false });
  }
});

configureAuthRoute();
setShell({ authView: authRequested });
refreshAuth();