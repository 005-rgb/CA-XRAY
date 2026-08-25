const landing = document.querySelector("#landing");
const loading = document.querySelector("#scan-loading");
const report = document.querySelector("#report");
const form = document.querySelector("#scan-form");
const addressInput = document.querySelector("#contract-address");
const networkInput = document.querySelector("#network");
const addressError = document.querySelector("#address-error");
const networkError = document.querySelector("#network-error");
const networkCapabilityHint = document.querySelector("#network-capability-hint");
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
const themeToggle = document.querySelector("#theme-toggle");
const scanHistory = document.querySelector("#scan-history");
const scanHistoryList = document.querySelector("#scan-history-list");
const historyStatus = document.querySelector("#history-status");
const historyLoadMore = document.querySelector("#history-load-more");
const cancelScanButton = document.querySelector("#cancel-scan");
const intelligenceDashboard = document.querySelector("#intelligence-dashboard");
const passportList = document.querySelector("#passport-list");
const passportCount = document.querySelector("#passport-count");
const passportWorkspace = document.querySelector("#passport-workspace");
const passportSelector = document.querySelector("#passport-selector");
const passportAreaContent = document.querySelector("#passport-area-content");
const passportWorkspaceTitle = document.querySelector("#passport-workspace-title");
const passportWorkspaceMeta = document.querySelector("#passport-workspace-meta");
const watchlistList = document.querySelector("#watchlist-list");
const watchlistCount = document.querySelector("#watchlist-count");
const alertList = document.querySelector("#alert-list");
const caseForm = document.querySelector("#case-form");
const caseList = document.querySelector("#case-list");
const caseCount = document.querySelector("#case-count");
const caseStatus = document.querySelector("#case-status");
const alertCount = document.querySelector("#alert-count");
const watchlistForm = document.querySelector("#watchlist-form");
const watchlistStatus = document.querySelector("#watchlist-status");
const comparisonPanel = document.querySelector("#comparison");
const comparisonForm = document.querySelector("#comparison-form");
const comparisonInputs = document.querySelector("#comparison-inputs");
const comparisonResult = document.querySelector("#comparison-result");
const comparisonStatus = document.querySelector("#comparison-status");
const reportsPanel = document.querySelector("#reports");
const reportsList = document.querySelector("#reports-list");
const reportStatus = document.querySelector("#report-status");
const communityPanel = document.querySelector("#community");
const communityProfileForm = document.querySelector("#community-profile-form");
const communityAnnotationForm = document.querySelector("#community-annotation-form");
const communityAnnotationList = document.querySelector("#community-annotation-list");
const communityReputation = document.querySelector("#community-reputation");
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
const adminSectionTabs = document.querySelectorAll("[data-admin-target]");
const adminOpsPulse = document.querySelector("#admin-ops-pulse");
const adminSystemState = document.querySelector("#admin-system-state");
const adminSystemNote = document.querySelector("#admin-system-note");
const adminCoverage = document.querySelector("#admin-coverage");
const adminReviewQueue = document.querySelector("#admin-review-queue");
const adminLastEvent = document.querySelector("#admin-last-event");
const settingsPanel = document.querySelector("#settings");
const profileForm = document.querySelector("#profile-form");
const passwordForm = document.querySelector("#password-form");
const sessionsList = document.querySelector("#sessions-list");
const membersList = document.querySelector("#members-list");
const workspaceForm = document.querySelector("#workspace-form");
const inviteForm = document.querySelector("#invite-form");
const settingsNavLinks = document.querySelectorAll(".settings-nav a");
let authState = null;
let currentScan = null;
let currentJob = null;
let activeScanJobId = null;
let historyCursor = null;
let adminInventoryType = null;
const adminState = { providers: [] };
let lastSignalStage = "";
const pathName = () => window.location.pathname;
const isAuthRoute = () => ["/login", "/register"].includes(pathName());
const isAdminRoute = () => pathName() === "/admin";
const reportRouteMatch = () => pathName().match(/^\/dashboard\/scans\/([^/]+)$/);
const isPrivateRoute = () => pathName() === "/dashboard" || /^\/dashboard\/(?:new-scan|history|passport|watchtower|compare|reports|api-access|community|settings)$/.test(pathName()) || pathName().startsWith("/dashboard/scans/");
const privatePage = () => {
  if (pathName() === "/dashboard/new-scan") return "new-scan";
  if (pathName() === "/dashboard/history") return "history";
  if (pathName() === "/dashboard/passport") return "passport";
  if (pathName() === "/dashboard/watchtower") return "watchtower";
  if (pathName() === "/dashboard/compare") return "compare";
  if (pathName() === "/dashboard/reports") return "reports";
  if (pathName() === "/dashboard/api-access") return "api-access";
  if (pathName() === "/dashboard/community") return "community";
  if (pathName() === "/dashboard/settings") return "settings";
  return "dashboard";
};
const pendingScanStorageKey = "ca_xray_pending_scan";
let authRequested = isAuthRoute() || isAdminRoute();

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || "Request failed.");
  return body;
}

let networkCapabilityCatalog = new Map();

function renderNetworkCapabilityHint() {
  if (!networkCapabilityHint) return;
  const network = networkCapabilityCatalog.get(networkInput?.value);
  if (!network?.capabilityMatrix) {
    networkCapabilityHint.textContent = "";
    return;
  }
  const matrix = network.capabilityMatrix;
  const unsupported = matrix.capabilities.filter((item) => item.support === "not_supported").length;
  networkCapabilityHint.textContent = uiText("Coverage") + `: ${matrix.supportedCount}/${matrix.totalCount} ${uiText("capabilities available")} · ${uiText(matrix.networkClass)}` +
    (unsupported ? ` · ${unsupported} ${uiText("not available on this network")}` : "");
}

async function loadNetworkCapabilityCatalog() {
  try {
    const body = await apiJson("/api/networks");
    networkCapabilityCatalog = new Map((body.networks || []).map((network) => [network.id, network]));
    renderNetworkCapabilityHint();
  } catch {
    if (networkCapabilityHint) networkCapabilityHint.textContent = uiText("Network capability details are unavailable.");
  }
}

function authMessage(message, target = authStatus) {
  if (target) target.textContent = message ? JobenI18n.t(message) : "";
}

function uiText(value) {
  return JobenI18n.t(String(value ?? ""));
}

function pushSignal(title, message, tone = "cyan", replace = false) {
  const region = document.querySelector("#signal-toast-region");
  if (!region || !title) return;
  const key = `${title}:${message}`;
  if (replace && lastSignalStage === key) return;
  lastSignalStage = key;
  const toast = document.createElement("div");
  toast.className = `signal-toast ${tone}`;
  toast.innerHTML = `<span class="toast-pulse"></span><div><strong>${escapeHtml(uiText(title))}</strong><p>${escapeHtml(uiText(message))}</p></div><button type="button" aria-label="${escapeHtml(uiText("Dismiss notification"))}">×</button>`;
  toast.querySelector("button").addEventListener("click", () => toast.remove());
  region.appendChild(toast);
  window.setTimeout(() => toast.remove(), tone === "danger" ? 7200 : 5200);
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

function navigateAppRoute(destination) {
  const next = new URL(destination, window.location.origin);
  if (next.origin !== window.location.origin) return;
  const target = `${next.pathname}${next.search}${next.hash}`;
  if (next.pathname.startsWith("/dashboard") && !authState?.authenticated) {
    authRequested = true;
    window.location.assign(`/login?lang=${encodeURIComponent(JobenI18n.locale)}&returnTo=${encodeURIComponent(target)}`);
    return;
  }
  window.history.pushState({}, "", target);
  authRequested = isAuthRoute();
  if (authState?.authenticated && isPrivateRoute()) {
    loadPrivateRoute();
  } else if (!authState?.authenticated) {
    configureAuthRoute();
    setShell({ authView: authRequested });
  } else {
    showLanding({ privateView: false });
  }
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
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function configureAuthRoute() {
  if (!isAuthRoute()) return;
  const register = pathName() === "/register";
  authMode.value = register ? "register" : "login";
  authTitle.textContent = JobenI18n.t(register ? "Create your JOBEN NETWORK account" : "Sign in to JOBEN NETWORK");
  authSubmitLabel.textContent = JobenI18n.t(register ? "Create account" : "Sign in");
  authSwitch.textContent = JobenI18n.t(register ? "I already have an account" : "Create an account");
  authPassword.autocomplete = register ? "new-password" : "current-password";
}

async function refreshAuth() {
  try {
    authState = await apiJson("/api/auth/me");
    const authenticated = authState.authenticated;
    const pending = authState.mfaPending;
    const emailPending = authState.emailVerificationPending;
    userName.textContent = authenticated ? (authState.user?.displayName || authState.user?.email || uiText("User")) : pending ? uiText("Verification required") : uiText("Visitor");
    if (pending) {
      setShell({ authView: true });
      authForm.hidden = true;
      recoveryForm.hidden = true;
      mfaForm.hidden = false;
      authTitle.textContent = JobenI18n.t("Verify your superadmin session");
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
      authTitle.textContent = JobenI18n.t("Verify your email");
      authMessage("Use the verification link sent to your email.", emailVerificationStatus);
      workspaceBar.hidden = true;
      return;
    }
    workspaceBar.hidden = !authenticated;
    mfaForm.hidden = true;
    emailVerificationForm.hidden = true;
    authForm.hidden = false;
    if (!authenticated) {
      authEntry.textContent = JobenI18n.t("Sign in →");
      authEntry.href = "/login";
      configureAuthRoute();
      setShell({ authView: authRequested });
      return;
    }
    if (authState.user?.platformRole === "Superadmin") {
      workspaceBar.hidden = true;
      authEntry.textContent = JobenI18n.t("Platform Ops →");
      authEntry.href = "/admin";
    } else {
      const workspaces = await apiJson("/api/workspaces");
      workspaceSelector.innerHTML = workspaces.workspaces.map((workspace) =>
        `<option value="${escapeHtml(workspace.id)}" ${workspace.id === authState.workspace?.id ? "selected" : ""}>${escapeHtml(workspace.name || workspace.workspaceType)} · ${escapeHtml(workspace.planId)}</option>`).join("");
      authEntry.textContent = JobenI18n.t("Dashboard →");
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
  } finally {
    document.body.classList.remove("app-booting");
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
  authTitle.textContent = uiText(register ? "Create your JOBEN NETWORK account" : "Sign in to JOBEN NETWORK");
  authSubmitLabel.textContent = uiText(register ? "Create account" : "Sign in");
  authSwitch.textContent = uiText(register ? "I already have an account" : "Create an account");
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

document.querySelectorAll(".primary-nav .nav-item[data-route]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigateAppRoute(link.dataset.route);
    sidebar.classList.remove("open");
    document.querySelector("#mobile-menu")?.setAttribute("aria-expanded", "false");
  });
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
  if (typeof value === "number") return value.toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 4 });
  return String(value);
}

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return "UNKNOWN";
  return Number(value).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPercent(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 2 })}%` : "UNKNOWN";
}

function formatDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return "UNKNOWN";
  return new Intl.DateTimeFormat(JobenI18n.locale === "id" ? "id-ID" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) + " UTC";
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
    if (dataPoint?.status === "NOT_CHECKED") return `Not available from current data source ${statusPill(dataPoint)}`;
    return statusPill(dataPoint);
  }
  return `${escapeHtml(formatter(dataPoint.value))} ${statusPill(dataPoint)}`;
}

function pointEvidence(dataPoint) {
  if (!dataPoint) return "UNKNOWN";
  return dataPoint.evidenceId ? `<span class="evidence-id">${escapeHtml(dataPoint.evidenceId)}</span>` : "—";
}

function evidenceLabel(dataPoint) {
  if (!dataPoint || ["UNKNOWN", "NOT_CHECKED", "UNAVAILABLE", "ERROR"].includes(dataPoint.status)) return "UNKNOWN";
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
  const page = privateView ? privatePage() : "public";
  const pageCopy = {
    dashboard: ["Dashboard", "Your evidence-backed contract intelligence workspace."],
    "new-scan": ["Core Scan", "Evidence-based contract analysis for the selected network and address."],
    history: ["Scan History", "Previous analyses available to this workspace."],
    passport: ["Risk Passport", "Track evidence-backed changes across monitored contracts."],
    watchtower: ["Watchtower", "Review scheduled monitoring and evidence alerts."],
    compare: ["Compare Contracts", "Compare saved contract evidence side by side without hiding unknowns."],
    reports: ["Shared Reports", "Create and manage safe, expiring public report links."],
    "api-access": ["API Access", "Programmatic access to evidence-backed contract analysis."],
    community: ["Evidence Community", "Share and review contract claims with traceable evidence."],
    settings: ["Settings", "Manage your identity, security, preferences, and active workspace."],
    public: ["Know what a contract can do before it touches your wallet.", "Read contract risk through real evidence before a decision reaches your wallet."],
  };
  document.querySelectorAll(".primary-nav .nav-item[data-route]").forEach((item) => {
    item.classList.toggle("active", privateView && item.dataset.route === `/dashboard${page === "dashboard" ? "" : `/${page}`}`);
  });
  document.querySelector("#landing-title").textContent = uiText(pageCopy[page][0]);
  document.querySelector("#landing-description").textContent = uiText(pageCopy[page][1]);
  document.querySelector("#scan-mode-card").hidden = !privateView || !["dashboard", "new-scan"].includes(page);
  const signalSurface = document.querySelector("#signal-board");
  const networkPulse = document.querySelector("#network-pulse");
  const evidenceCommand = document.querySelector(".evidence-command");
  if (signalSurface) signalSurface.hidden = privateView;
  if (networkPulse) networkPulse.hidden = privateView;
  if (evidenceCommand) evidenceCommand.hidden = privateView;
  document.querySelector("#dashboard").classList.toggle("private-heading", privateView);
  landing.classList.toggle("passport-page", privateView && page === "passport");
  landing.classList.toggle("core-scan-page", privateView && page === "new-scan");
  document.querySelector("#dashboard-overview").hidden = !privateView || page !== "dashboard";
  document.querySelector("#new-scan").hidden = privateView ? page !== "new-scan" : false;
  document.querySelector("#new-scan").classList.toggle("public-scan-workbench", !privateView);
  document.querySelector("#new-scan").classList.remove("report-route");
  scanHistory.hidden = !privateView || page !== "history";
  intelligenceDashboard.hidden = !privateView || !["passport", "watchtower"].includes(page);
  document.querySelector("#api-access").hidden = !privateView || page !== "api-access";
  if (communityPanel) communityPanel.hidden = !privateView || page !== "community";
  if (comparisonPanel) comparisonPanel.hidden = !privateView || page !== "compare";
  if (reportsPanel) reportsPanel.hidden = !privateView || page !== "reports";
  settingsPanel.hidden = !privateView || page !== "settings";
  document.querySelector("#risk-passport").hidden = page !== "passport";
  document.querySelector("#watchtower").hidden = page !== "watchtower";
  document.querySelector("#watchtower-alerts").hidden = page !== "watchtower";
  if (privateView) {
    if (page === "history") loadScanHistory();
    if (["passport", "watchtower"].includes(page)) loadIntelligenceDashboard();
    if (page === "compare") loadComparisonInputs();
    if (page === "reports") loadReports();
    if (page === "settings") loadSettings();
    if (page === "community") loadCommunity();
  }
  JobenI18n.translate(landing);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function settingMessage(id, message, tone = "") {
  const target = document.querySelector(`#${id}`);
  if (target) {
    target.textContent = message ? uiText(message) : "";
    target.className = `settings-status ${tone}`.trim();
  }
}

function applySettingsTab() {
  if (!settingsPanel) return;
  const validIds = [...settingsNavLinks].map((link) => link.getAttribute("href").slice(1));
  const requestedId = window.location.hash.startsWith("#settings-")
    ? window.location.hash.slice(1)
    : "settings-profile";
  const activeId = validIds.includes(requestedId) ? requestedId : "settings-profile";
  settingsNavLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${activeId}`;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-selected", String(isActive));
    link.setAttribute("tabindex", isActive ? "0" : "-1");
  });
  settingsPanel.querySelectorAll(".settings-content > .settings-card").forEach((section) => {
    section.hidden = section.id !== activeId;
  });
}

async function loadPreferences() {
  let preferences = {};
  try {
    const result = await apiJson("/api/auth/preferences");
    preferences = result.preferences || {};
  } catch (error) {
    settingMessage("preferences-status", "Could not load account preferences.", "error");
  }
  const timezone = preferences.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  document.querySelector("#preference-network").value = preferences.network || "ethereum";
  document.querySelector("#preference-timezone").value = [...document.querySelector("#preference-timezone").options]
    .some((option) => option.value === timezone) ? timezone : "UTC";
  document.querySelector("#preference-confirm-live").checked = preferences.confirmLive !== false;
  document.querySelector("#notify-watchtower").checked = preferences.notifyWatchtower !== false;
  document.querySelector("#notify-scan").checked = preferences.notifyScan !== false;
  document.querySelector("#notify-security").checked = preferences.notifySecurity !== false;
}

async function loadSettings() {
  if (!authState?.authenticated || !settingsPanel) return;
  document.querySelector("#profile-name").value = authState.user?.displayName || "";
  document.querySelector("#profile-email").value = authState.user?.email || "";
  document.querySelector("#workspace-name").value = authState.workspace?.name || "";
  document.querySelector("#settings-workspace-name").textContent = authState.workspace?.name || uiText("Active workspace");
  document.querySelector(".topbar-context strong").textContent = authState.workspace?.name || uiText("Personal");
  document.querySelector("#settings-workspace-role").textContent = authState.membership?.role || uiText("Member");
  document.querySelector("#settings-plan").textContent = authState.workspace?.planId || uiText("free");
  document.querySelector("#settings-workspace-type").textContent = authState.workspace?.workspaceType || uiText("personal");
  const isOwner = authState.membership?.role === "Workspace Owner";
  document.querySelectorAll(".workspace-owner-only").forEach((element) => { element.hidden = !isOwner; });
  applySettingsTab();
  await loadPreferences();
  try {
    const deletionResult = await apiJson("/api/auth/deletion-request");
    const deletionButton = document.querySelector("#delete-account");
    if (deletionResult.deletion?.status === "scheduled") {
      deletionButton.textContent = uiText("Cancel deletion request");
      deletionButton.dataset.scheduled = "true";
      settingMessage("privacy-status", `Deletion scheduled for ${formatDate(deletionResult.deletion.scheduledFor)}. You can cancel during the 30-day retention period.`, "success");
    }
  } catch {}
  try {
    const [sessionResult, memberResult] = await Promise.all([
      apiJson("/api/auth/sessions"),
      authState.workspace?.id ? apiJson(`/api/workspaces/${encodeURIComponent(authState.workspace.id)}/members`) : Promise.resolve({ members: [] }),
    ]);
    sessionsList.innerHTML = sessionResult.sessions.map((session) => `
      <div class="settings-list-row"><div><strong>${escapeHtml(session.userAgent || "Browser session")}</strong><span>${escapeHtml(session.ip || "Unknown network")} · last active ${escapeHtml(formatDate(session.lastSeenAt))}</span></div>
      <div>${session.current ? '<span class="current-session">Current</span>' : `<button class="text-button revoke-session" data-session-id="${escapeHtml(session.id)}" type="button">Revoke</button>`}</div></div>`).join("")
      || '<p class="settings-help">No active sessions found.</p>';
    membersList.innerHTML = memberResult.members.map((member) => `
      <div class="settings-list-row"><div><strong>${escapeHtml(member.user?.displayName || member.user?.email || "Workspace member")}</strong><span>${escapeHtml(member.user?.email || "")}</span></div><span class="role-pill">${escapeHtml(member.role || "Member")}</span></div>`).join("")
      || '<p class="settings-help">No members found.</p>';
    JobenI18n.translate(settingsPanel);
  } catch (error) {
    sessionsList.innerHTML = `<p class="settings-help">${escapeHtml(error.message)}</p>`;
    membersList.innerHTML = `<p class="settings-help">${escapeHtml(error.message)}</p>`;
  }
}

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiJson("/api/auth/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: document.querySelector("#profile-name").value }) });
    authState.user = result.user;
    userName.textContent = result.user.displayName || result.user.email;
    settingMessage("settings-profile-status", "Profile saved.", "success");
  } catch (error) { settingMessage("settings-profile-status", error.message, "error"); }
});

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiJson("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: document.querySelector("#current-password").value, newPassword: document.querySelector("#new-password").value }) });
    passwordForm.reset();
    settingMessage("password-status", `Password changed. ${result.revokedSessions} other session(s) signed out.`, "success");
    await loadSettings();
  } catch (error) { settingMessage("password-status", error.message, "error"); }
});

document.querySelector("#revoke-other-sessions")?.addEventListener("click", async () => {
  try {
    const result = await apiJson("/api/auth/sessions/revoke-others", { method: "POST" });
    settingMessage("password-status", `${result.revoked} other session(s) signed out.`, "success");
    await loadSettings();
  } catch (error) { settingMessage("password-status", error.message, "error"); }
});

sessionsList?.addEventListener("click", async (event) => {
  const button = event.target.closest(".revoke-session");
  if (!button) return;
  await apiJson(`/api/auth/sessions/${encodeURIComponent(button.dataset.sessionId)}`, { method: "DELETE" }).catch((error) => settingMessage("password-status", error.message, "error"));
  await loadSettings();
});

document.querySelector("#save-preferences")?.addEventListener("click", () => {
  const preferences = {
    network: document.querySelector("#preference-network").value,
    timezone: document.querySelector("#preference-timezone").value,
    confirmLive: document.querySelector("#preference-confirm-live").checked,
    notifyWatchtower: document.querySelector("#notify-watchtower").checked,
    notifyScan: document.querySelector("#notify-scan").checked,
    notifySecurity: document.querySelector("#notify-security").checked,
  };
  apiJson("/api/auth/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preferences) })
    .then(() => { networkInput.value = preferences.network; settingMessage("preferences-status", "Preferences saved to your account.", "success"); })
    .catch((error) => settingMessage("preferences-status", error.message, "error"));
});
document.querySelector("#save-notifications")?.addEventListener("click", () => {
  document.querySelector("#save-preferences").click();
  settingMessage("notifications-status", "Notification settings saved to your account.", "success");
});

workspaceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiJson(`/api/workspaces/${encodeURIComponent(authState.workspace.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: document.querySelector("#workspace-name").value }) });
    authState.workspace = result.workspace;
    document.querySelector(".topbar-context strong").textContent = result.workspace.name;
    document.querySelector("#settings-workspace-name").textContent = result.workspace.name;
    settingMessage("workspace-status", "Workspace updated.", "success");
  } catch (error) { settingMessage("workspace-status", error.message, "error"); }
});

inviteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiJson(`/api/workspaces/${encodeURIComponent(authState.workspace.id)}/invites`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: document.querySelector("#invite-email").value.trim(), role: document.querySelector("#invite-role").value }) });
    inviteForm.reset();
    settingMessage("invite-status", `Invite created for ${result.email}. ${result.inviteToken ? `Development token: ${result.inviteToken}` : "The invite email is queued."}`, "success");
    await loadSettings();
  } catch (error) { settingMessage("invite-status", error.message, "error"); }
});

document.querySelector("#export-data")?.addEventListener("click", async () => {
  try {
    const result = await apiJson("/api/scans?limit=100");
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "joben-network-scan-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
    settingMessage("privacy-status", "Your workspace scan data has been exported.", "success");
  } catch (error) { settingMessage("privacy-status", error.message, "error"); }
});

document.querySelector("#delete-account")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  if (button.dataset.scheduled === "true") {
    try {
      await apiJson("/api/auth/deletion-request", { method: "DELETE" });
      settingMessage("privacy-status", "Deletion request cancelled.", "success");
      button.textContent = "Request account deletion";
      delete button.dataset.scheduled;
    } catch (error) {
      settingMessage("privacy-status", error.message, "error");
    }
    return;
  }
  if (!window.confirm("Schedule account deletion? Your account data will be retained for 30 days and then become eligible for permanent removal.")) return;
  try {
    const result = await apiJson("/api/auth/deletion-request", { method: "POST" });
    settingMessage("privacy-status", `Deletion scheduled for ${formatDate(result.scheduledFor)}. You can cancel during the 30-day retention period.`, "success");
    button.textContent = "Cancel deletion request";
    button.dataset.scheduled = "true";
  } catch (error) {
    settingMessage("privacy-status", error.message === "TEAM_OWNERSHIP_REQUIRED" ? "Transfer team workspace ownership before deleting your account." : error.message, "error");
  }
});

settingsNavLinks.forEach((link) => link.addEventListener("click", () => {
  window.requestAnimationFrame(applySettingsTab);
}));
window.addEventListener("hashchange", () => {
  if (isPrivateRoute() && privatePage() === "settings") applySettingsTab();
  else refreshAuth();
});

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
  adminStatus.textContent = message ? uiText(message) : "";
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
  const providers = data.providers || [];
  const networks = data.networks || [];
  const approvals = data.approvals || [];
  const audit = data.audit || [];
  const terminal = Number(scans.succeeded || 0) + Number(scans.failed || 0) + Number(scans.cancelled || 0);
  const failureRate = terminal ? `${((Number(scans.failed || 0) / terminal) * 100).toFixed(1)}%` : "—";
  adminScanThroughput.textContent = Number(scans.completed24h || 0).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US");
  adminScanThroughputNote.textContent = scans.averageDurationMs === null || scans.averageDurationMs === undefined
    ? "No completed-job latency"
    : `avg ${Number(scans.averageDurationMs).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US")} ms`;
  adminFailureRate.textContent = failureRate;
  adminFailureRateNote.textContent = `${Number(scans.failed || 0).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US")} failed · ${terminal.toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US")} terminal`;
  adminQueueDepth.textContent = Number(queue.depth || 0).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US");
  adminQueueNote.textContent = `${Number(queue.running || 0)} running · ${Number(queue.pending || 0)} pending`;
  adminWorkspaceCount.textContent = Number(stats.workspaces || 0).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US");
  adminWorkspaceSummary.textContent = `${Number(stats.teamWorkspaces || 0)} team · ${Number(stats.personalWorkspaces || 0)} personal`;
  adminUserCount.textContent = Number(stats.users || 0).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US");
  adminUserSummary.textContent = `${Number(stats.verifiedUsers || 0)} verified · ${Number(stats.activeSessions || 0)} active sessions`;
  adminSnapshotTime.textContent = `Snapshot ${formatDate(data.generatedAt)}`;
  const storageReady = data.platform?.storage?.configured;
  const identityReady = data.platform?.auth?.configured;
  const activeProviders = providers.filter((provider) => !provider.killSwitch && provider.state === "ACTIVE").length;
  const platformReady = storageReady && identityReady && activeProviders > 0;
  adminSystemState.textContent = platformReady ? "OPERATIONAL" : "ACTION REQUIRED";
  adminSystemNote.textContent = platformReady
    ? `${activeProviders} provider${activeProviders === 1 ? "" : "s"} healthy · telemetry live`
    : "Review runtime boundary below";
  adminOpsPulse.classList.toggle("warning", !platformReady);
  adminCoverage.textContent = `${activeProviders}/${providers.length || 0} providers · ${networks.length} networks`;
  adminReviewQueue.textContent = `${approvals.filter((approval) => approval.status === "PENDING").length} pending`;
  adminLastEvent.textContent = audit[0]?.createdAt ? formatDate(audit[0].createdAt) : "No events";
  renderAdminHealth(data);
  renderAdminNetworks(networks);
  renderAdminInventory(data);
  renderAdminProviders(providers, approvals);
  renderAdminFlags(data.flags || [], approvals);
  renderAdminPlans(data.plans?.items || []);
  renderAdminApprovals(approvals);
  renderAdminSubscriptions(data.subscriptions || []);
  renderAdminWebhooks(data.webhooks || []);
  renderAdminAudit(audit);
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

adminSectionTabs.forEach((tab) => tab.addEventListener("click", () => {
  const target = document.getElementById(tab.dataset.adminTarget);
  if (!target) return;
  adminSectionTabs.forEach((item) => item.classList.toggle("active", item === tab));
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}));

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
  pushSignal("Scan initialized", "The evidence pipeline is validating your selected network and address.", "cyan");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateLoading(scan) {
  if (!scan?.stages) return;
  loadingStages.innerHTML = scan.stages.map((stage, index) => `<span class="stage ${index === scan.stages.length - 1 ? "active" : "done"}">${escapeHtml(stage)}</span>`).join("");
  const currentStage = scan.stages[scan.stages.length - 1];
  if (currentStage) pushSignal(currentStage.replaceAll("_", " "), "Evidence collection is progressing through the forensic pipeline.", "cyan", true);
}

function validateForm() {
  const address = addressInput.value.trim();
  const selectedNetwork = networkInput.options[networkInput.selectedIndex];
  const networkName = selectedNetwork?.textContent?.trim() || "selected network";
  const isSolana = networkInput.value === "solana";
  const isEvm = ["ethereum", "bsc", "base", "arbitrum", "polygon"].includes(networkInput.value);
  const isSuiOrAptos = ["sui", "aptos"].includes(networkInput.value);
  const isNear = networkInput.value === "near";
  const isTron = networkInput.value === "tron";
  let valid = true;
  addressError.textContent = "";
  networkError.textContent = "";
  if (!address) {
    addressError.textContent = "Paste a contract address to begin.";
    valid = false;
  } else if (isEvm && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    addressError.textContent = `Enter a valid ${networkName} contract address (0x followed by 40 hexadecimal characters).`;
    valid = false;
  } else if (isSolana && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    addressError.textContent = "Enter a valid Solana contract address.";
    valid = false;
  } else if (isSuiOrAptos && !/^0x[0-9a-f]{1,64}$/i.test(address)) {
    addressError.textContent = `Enter a valid native ${networkName} address.`;
    valid = false;
  } else if (isNear && !/^(?:[a-z0-9][a-z0-9._-]{0,63}|0x[0-9a-f]{64})$/i.test(address)) {
    addressError.textContent = `Enter a valid native ${networkName} address.`;
    valid = false;
  } else if (isTron && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    addressError.textContent = "Enter a valid native Tron address.";
    valid = false;
  } else if (!isEvm && !isSolana && /^0x[a-fA-F0-9]{40}$/.test(address)) {
    addressError.textContent = `${networkName} does not use EVM contract addresses. Enter an address native to ${networkName}, or check the selected network.`;
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
    if (job.status === "FAILED") {
      const error = new Error(job.error?.message || "The scan failed.");
      error.code = job.error?.code;
      throw error;
    }
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
    JobenI18n.translate(scanHistoryList);
    historyCursor = body.pagination?.nextCursor || null;
    if (historyLoadMore) historyLoadMore.hidden = !body.pagination?.hasMore;
    scanHistoryList.querySelectorAll("[data-cancel-job]").forEach((button) => {
      button.addEventListener("click", () => cancelScan(button.dataset.cancelJob));
    });
  } catch (error) {
    if (reset) scanHistoryList.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
  }
}

async function cancelScan(jobId) {
  if (!jobId) return;
  try {
    await apiJson(`/api/scan/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
    await loadScanHistory();
  } catch (error) {
    if (scanHistoryList) {
      scanHistoryList.insertAdjacentHTML(
        "afterbegin",
        `<div class="field-error" role="alert">${escapeHtml(error.message)}</div>`,
      );
    }
  }
}

let passportCatalog = [];

function renderPassportList(passports) {
  passportCatalog = passports;
  passportCount.textContent = `${passports.length} PASSPORT${passports.length === 1 ? "" : "S"}`;
  passportList.innerHTML = passports.length ? passports.map((passport) => {
    const current = passport.current || {};
    const score = current.risk?.score;
    return `<button type="button" class="intelligence-row passport-row" data-passport-index="${passports.indexOf(passport)}">
      <div><strong>${escapeHtml(truncateAddress(passport.address))}</strong><span>${escapeHtml(passport.networkId)} · ${escapeHtml(formatDate(current.capturedAt))}</span></div>
      <div class="intelligence-row-value"><b class="${scoreTone(score)}">${escapeHtml(score ?? "UNKNOWN")}</b><span>${escapeHtml(current.risk?.level || "UNKNOWN")} · ${passport.snapshotCount} snapshot${passport.snapshotCount === 1 ? "" : "s"}</span></div>
    </button>`;
  }).join("") : `<div class="unknown-message">NO RISK PASSPORTS YET. A completed live scan will create one.</div>`;
  if (passportSelector) {
    passportSelector.disabled = !passports.length;
    passportSelector.innerHTML = passports.length
      ? passports.map((passport, index) => `<option value="${index}">${escapeHtml(passport.networkId)} · ${escapeHtml(truncateAddress(passport.address))}</option>`).join("")
      : `<option value="">No completed passports</option>`;
  }
  passportList.querySelectorAll("[data-passport-index]").forEach((row) => row.addEventListener("click", () => {
    if (passportSelector) passportSelector.value = row.dataset.passportIndex;
    openPassportWorkspace(passports[Number(row.dataset.passportIndex)]);
  }));
  JobenI18n.translate(passportList);
  if (!passports.length && passportAreaContent) {
    passportWorkspace.hidden = false;
    passportWorkspaceTitle.textContent = "No completed Passport selected";
    passportWorkspaceMeta.textContent = "Complete a live scan to activate the six evidence workspace areas.";
    passportAreaContent.innerHTML = `<div class="passport-empty-state"><strong>Risk Passport is ready for your first snapshot.</strong><p>The six areas below will populate from immutable Core Scan evidence: Overview, Risk &amp; Evidence, Changes &amp; Trajectory, Control &amp; Market, Review &amp; Monitoring, and Compare &amp; Audit.</p><a class="secondary-button" href="/dashboard/new-scan">Start a live scan <span>→</span></a></div>`;
  }
}

let passportWorkspaceData = null;
let passportArea = "overview";
function passportMetric(label, value, tone = "") {
  return `<div class="passport-metric"><span>${escapeHtml(label)}</span><strong class="${tone}">${escapeHtml(value ?? "UNKNOWN")}</strong></div>`;
}
function renderPassportArea() {
  const data = passportWorkspaceData;
  if (!passportAreaContent) return;
  if (!data) {
    const emptyAreas = {
      overview: ["Overview", "Risk posture, reliability, coverage, health, and the primary review action will appear here."],
      evidence: ["Risk & Evidence", "Risk fingerprint, evidence provenance, uncertainty budget, and freshness details will appear here."],
      changes: ["Changes & Trajectory", "Before/after snapshots, material changes, and risk momentum require at least two completed snapshots."],
      control: ["Control & Market", "Observed control paths, ownership relationships, holder distribution, liquidity, and exitability context will appear here."],
      review: ["Review & Monitoring", "Evidence-backed next checks, watch rules, alert history, and investigator actions will appear here."],
      audit: ["Compare & Audit", "Replay-safe snapshots, comparison context, evidence hashes, notes, and audit export will appear here."],
    };
    const [title, description] = emptyAreas[passportArea] || emptyAreas.overview;
    passportAreaContent.innerHTML = `<div class="passport-area-heading"><div><span class="card-kicker">WORKSPACE AREA</span><h4>${escapeHtml(title)}</h4></div><span class="data-label">AWAITING SNAPSHOT</span></div><div class="passport-empty-state"><strong>${escapeHtml(title)} is ready.</strong><p>${escapeHtml(description)}</p><a class="secondary-button" href="/dashboard/new-scan">Start a live scan <span>→</span></a></div>`;
    return;
  }
  const current = data.passport.current || {};
  const risk = current.risk || {};
  const evidence = current.evidence || [];
  const trajectory = current.trajectory || {};
  const changes = current.changes || {};
  const timeline = data.timeline || [];
  const graph = data.graph || { nodes: [], edges: [] };
  const watch = data.watchlists?.[0];
  const openAlerts = (data.alerts || []).filter((item) => item.status !== "ACKNOWLEDGED");
  const area = {
    overview: `<div class="passport-metric-grid">${passportMetric("Risk score", risk.score, scoreTone(risk.score))}${passportMetric("Reliability", current.reliabilityScore)}${passportMetric("Evidence points", evidence.length)}${passportMetric("Snapshots", timeline.length)}${passportMetric("Posture", risk.score == null ? "INSUFFICIENT EVIDENCE" : risk.score >= 70 ? "HIGH PRIORITY REVIEW" : risk.score >= 45 ? "CONTINUE WITH CAUTION" : "MONITOR CLOSELY")}${passportMetric("Last captured", formatDate(current.capturedAt))}</div><div class="passport-callout"><strong>Evidence posture</strong><p>${risk.score == null ? "No reliable final risk score is available. Complete a live scan with sufficient evidence before making a review decision." : `Current posture is derived from the latest completed snapshot. Risk (${risk.score}) is separate from reliability (${current.reliabilityScore ?? "UNKNOWN"}); this is not financial advice.`}</p></div>`,
    evidence: `<div class="passport-metric-grid">${passportMetric("Risk", risk.score)}${passportMetric("Reliability", current.reliabilityScore)}${passportMetric("Evidence coverage", evidence.length ? `${evidence.length} recorded` : "UNKNOWN")}${passportMetric("Data status", current.dataStatus)}</div><div class="passport-table">${evidence.length ? evidence.slice(0, 12).map((item) => `<div class="passport-evidence-row"><strong>${escapeHtml(item.label || item.id || item.key || "Evidence point")}</strong><span class="evidence-state">${escapeHtml(item.status || item.evidenceStatus || "UNKNOWN")}</span><small>${escapeHtml(item.evidenceId || item.source || "Reference unavailable")}</small></div>`).join("") : `<div class="unknown-message">No evidence points are available in this snapshot.</div>`}</div>`,
    changes: `<div class="passport-metric-grid">${passportMetric("Trajectory", trajectory.status || "INSUFFICIENT_HISTORY")}${passportMetric("Change events", changes ? Object.keys(changes).length : 0)}${passportMetric("Elapsed", trajectory.elapsedHours == null ? "—" : `${trajectory.elapsedHours}h`)}${passportMetric("Momentum", trajectory.changes?.length ? "CHANGE DETECTED" : "STABLE")}</div><div class="passport-table">${timeline.slice(0, 8).map((item) => `<div class="passport-evidence-row"><strong>${escapeHtml(item.trajectory?.status || "SNAPSHOT")}</strong><span>${escapeHtml(formatDate(item.capturedAt))}</span><small>${escapeHtml(item.why || "Initial evidence snapshot.")}</small></div>`).join("") || `<div class="unknown-message">A second completed snapshot is required for trajectory analysis.</div>`}</div>`,
    control: `<div class="passport-metric-grid">${passportMetric("Observed relations", graph.edges.length)}${passportMetric("Control nodes", graph.nodes.filter((n) => ["owner", "proxy"].includes(n.type)).length)}${passportMetric("Watch status", watch?.status || "NOT MONITORED")}${passportMetric("Network", data.passport.networkId)}</div><div class="passport-table">${graph.edges.length ? graph.edges.map((edge) => `<div class="passport-evidence-row"><strong>${escapeHtml(edge.relation)}</strong><span>${escapeHtml(edge.evidenceStatus || "UNKNOWN")}</span><small>${escapeHtml(edge.source)} → ${escapeHtml(edge.target)}</small></div>`).join("") : `<div class="unknown-message">No observed control or market relationship is available.</div>`}</div><div class="passport-callout"><strong>Relationship boundary</strong><p>Only direct observations are shown here. Inferred relationships require independent verification and are never treated as ownership claims.</p></div>`,
    review: `<div class="passport-metric-grid">${passportMetric("Open alerts", openAlerts.length)}${passportMetric("Monitoring", watch?.status || "NOT MONITORED")}${passportMetric("Next check", watch?.nextCheckAt ? formatDate(watch.nextCheckAt) : "Not scheduled")}${passportMetric("Recommended action", risk.score == null ? "REFRESH EVIDENCE" : openAlerts.length ? "REVIEW ALERT" : "NO OPEN ALERT")}</div><div class="passport-table">${openAlerts.length ? openAlerts.map((item) => `<div class="passport-evidence-row"><strong>${escapeHtml(item.message)}</strong><span>${escapeHtml(item.status)}</span><small>${escapeHtml(formatDate(item.createdAt))} · before/after snapshot linked</small></div>`).join("") : `<div class="unknown-message">No open evidence-backed alerts. Use Watchtower to schedule monitoring.</div>`}</div>`,
    audit: `<div class="passport-metric-grid">${passportMetric("Evidence hash", current.evidenceHash ? current.evidenceHash.slice(0, 16) + "…" : "UNKNOWN")}${passportMetric("Engine version", current.engineVersion)}${passportMetric("Schema version", current.evidenceSchemaVersion)}${passportMetric("Immutable snapshots", timeline.length)}</div><div class="passport-table">${timeline.map((item) => `<div class="passport-evidence-row"><strong>${escapeHtml(item.id)}</strong><span>${escapeHtml(formatDate(item.capturedAt))}</span><small>Hash ${escapeHtml(item.evidenceHash || "UNKNOWN")} · replay-safe snapshot</small></div>`).join("")}</div><div class="passport-callout"><strong>Audit boundary</strong><p>Passport history is append-only. Comparison and replay expose the recorded state; they do not rewrite historical evidence.</p></div>`,
  };
  passportAreaContent.innerHTML = `<div class="passport-area-heading"><div><span class="card-kicker">WORKSPACE AREA</span><h4>${escapeHtml({ overview: "Overview", evidence: "Risk & Evidence", changes: "Changes & Trajectory", control: "Control & Market", review: "Review & Monitoring", audit: "Compare & Audit" }[passportArea])}</h4></div><span class="data-label">LIVE PASSPORT DATA</span></div>${area[passportArea]}`;
}
async function openPassportWorkspace(passport) {
  if (!passport || !passportWorkspace) return;
  passportWorkspace.hidden = false;
  passportWorkspaceTitle.textContent = `${passport.networkId} · ${truncateAddress(passport.address)}`;
  passportWorkspaceMeta.textContent = `${passport.status} · ${passport.snapshotCount} snapshot${passport.snapshotCount === 1 ? "" : "s"} · updated ${formatDate(passport.updatedAt)}`;
  passportArea = "overview";
  passportAreaContent.innerHTML = `<div class="unknown-message">Loading Passport workspace…</div>`;
  try {
    passportWorkspaceData = await apiJson(`/api/risk-passports/${encodeURIComponent(passport.networkId)}/${encodeURIComponent(passport.address)}/workspace`);
    renderPassportArea();
  } catch (error) { passportAreaContent.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`; }
}
passportSelector?.addEventListener("change", () => openPassportWorkspace(passportCatalog[Number(passportSelector.value)]));
document.querySelectorAll("[data-passport-area]").forEach((button) => button.addEventListener("click", () => {
  passportArea = button.dataset.passportArea;
  document.querySelectorAll("[data-passport-area]").forEach((item) => item.classList.toggle("active", item === button));
  renderPassportArea();
}));
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
  JobenI18n.translate(watchlistList);
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
  JobenI18n.translate(alertList);
}

function renderCaseList(cases) {
  if (!caseList || !caseCount) return;
  const open = cases.filter((item) => !["DECIDED", "CLOSED"].includes(item.status)).length;
  caseCount.textContent = `${open} OPEN`;
  caseList.innerHTML = cases.length ? cases.map((item) => `
    <div class="case-row">
      <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.priority)} · ${escapeHtml(item.contracts.map((contract) => `${contract.networkId} ${truncateAddress(contract.address)}`).join(" · "))}</span></div>
      <div class="case-row-actions"><span class="watch-status ${statusClass(item.status)}">${escapeHtml(item.status)}</span><select data-case-status="${escapeHtml(item.id)}"><option value="OPEN" ${item.status === "OPEN" ? "selected" : ""}>Open</option><option value="IN_REVIEW" ${item.status === "IN_REVIEW" ? "selected" : ""}>In review</option><option value="DECIDED" ${item.status === "DECIDED" ? "selected" : ""}>Decided</option><option value="CLOSED" ${item.status === "CLOSED" ? "selected" : ""}>Closed</option></select></div>
      ${item.decision ? `<div class="case-decision"><b>${escapeHtml(item.decision.decision)}</b><span>${escapeHtml(item.decision.rationale)}</span></div>` : ""}
      <details class="case-detail"><summary>VIEW TIMELINE (${item.timeline.length})</summary><div class="case-timeline">${item.timeline.map((event) => `<div><i></i><span><b>${escapeHtml(event.type)}</b><small>${escapeHtml(formatDate(event.at))}</small></span></div>`).join("")}</div></details>
    </div>`).join("") : `<div class="unknown-message">NO CASES. Create a case when a contract needs human review.</div>`;
  caseList.querySelectorAll("[data-case-status]").forEach((select) => select.addEventListener("change", async () => {
    await apiJson(`/api/cases/${encodeURIComponent(select.dataset.caseStatus)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: select.value }) });
    await loadIntelligenceDashboard();
  }));
}

async function loadIntelligenceDashboard() {
  if (!authState?.authenticated || !intelligenceDashboard) return;
  intelligenceDashboard.hidden = false;
  try {
    const [passports, watchlists, alerts, cases] = await Promise.all([
      apiJson("/api/risk-passports"),
      apiJson("/api/watchlists"),
      apiJson("/api/alerts"),
      apiJson("/api/cases"),
    ]);
    renderPassportList(passports.passports || []);
    if ((passports.passports || []).length) openPassportWorkspace(passports.passports[0]);
    renderWatchlistList(watchlists.watchlists || []);
    renderAlertList(alerts.events || []);
    renderCaseList(cases.cases || []);
  } catch (error) {
    passportList.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
  }
}

async function loadCommunity() {
  if (!communityPanel) return;
  try {
    const [profileBody, annotationsBody] = await Promise.all([
      apiJson("/api/community/profile"),
      apiJson("/api/community/annotations"),
    ]);
    const profile = profileBody.profile;
    if (profile) {
      document.querySelector("#community-display-name").value = profile.displayName || "";
      document.querySelector("#community-bio").value = profile.bio || "";
      document.querySelector("#community-specialties").value = (profile.specialties || []).join(", ");
      communityReputation.textContent = `QUALITY ${profile.reputation?.qualityScore ?? "—"}`;
    }
    const annotations = annotationsBody.annotations || [];
    communityAnnotationList.innerHTML = annotations.length ? annotations.map((annotation) => `
      <article class="intelligence-item">
        <div><strong>${escapeHtml(annotation.title)}</strong><small>${escapeHtml(annotation.networkId)} · ${escapeHtml(truncateAddress(annotation.address))} · ${escapeHtml(annotation.moderation || "PENDING")}</small></div>
        <p>${escapeHtml(annotation.body)}</p>
        <small>Evidence: ${escapeHtml(annotation.evidenceRefs.join(", "))} · Reviews: ${annotation.peerReviews.length}</small>
        <div class="community-actions"><button type="button" class="text-button" data-community-review="${escapeHtml(annotation.id)}" data-decision="ACCEPT">Accept</button><button type="button" class="text-button" data-community-review="${escapeHtml(annotation.id)}" data-decision="REJECT">Reject</button><button type="button" class="text-button" data-community-dispute="${escapeHtml(annotation.id)}">Dispute</button></div>
      </article>`).join("") : `<div class="unknown-message">No evidence-backed annotations yet.</div>`;
  } catch (error) {
    communityAnnotationList.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
  }
}

communityProfileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#community-profile-status");
  try {
    await apiJson("/api/community/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: document.querySelector("#community-display-name").value.trim(),
        bio: document.querySelector("#community-bio").value.trim(),
        specialties: document.querySelector("#community-specialties").value.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    });
    status.textContent = "Profile saved.";
    await loadCommunity();
  } catch (error) { status.textContent = error.message; }
});

communityAnnotationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#community-annotation-status");
  try {
    await apiJson("/api/community/annotations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        networkId: document.querySelector("#community-network").value,
        address: document.querySelector("#community-address").value.trim(),
        title: document.querySelector("#community-title").value.trim(),
        body: document.querySelector("#community-body").value.trim(),
        evidenceRefs: document.querySelector("#community-evidence").value.split(",").map((item) => item.trim()).filter(Boolean),
      }),
    });
    communityAnnotationForm.reset();
    status.textContent = "Annotation published for review.";
    await loadCommunity();
  } catch (error) { status.textContent = error.message; }
});
document.querySelector("#community-refresh")?.addEventListener("click", loadCommunity);
communityAnnotationList?.addEventListener("click", async (event) => {
  const reviewButton = event.target.closest("[data-community-review]");
  const disputeButton = event.target.closest("[data-community-dispute]");
  if (!reviewButton && !disputeButton) return;
  const rationale = window.prompt(disputeButton ? "Why is this annotation disputed?" : "Add a review rationale (optional):", "");
  if (rationale === null) return;
  try {
    if (reviewButton) {
      await apiJson(`/api/community/annotations/${encodeURIComponent(reviewButton.dataset.communityReview)}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: reviewButton.dataset.decision, rationale }),
      });
    } else {
      const evidence = window.prompt("Evidence reference supporting this dispute:", "");
      if (!evidence) return;
      await apiJson(`/api/community/annotations/${encodeURIComponent(disputeButton.dataset.communityDispute)}/dispute`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rationale, evidenceRefs: [evidence] }),
      });
    }
    await loadCommunity();
  } catch (error) { window.alert(error.message); }
});

caseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  caseStatus.textContent = "";
  try {
    await apiJson("/api/cases", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.querySelector("#case-title").value.trim(),
        priority: document.querySelector("#case-priority").value,
        networkId: document.querySelector("#case-network").value,
        address: document.querySelector("#case-address").value.trim(),
      }),
    });
    caseForm.reset();
    await loadIntelligenceDashboard();
  } catch (error) {
    caseStatus.textContent = error.message;
  }
});

let comparisonPassports = [];

function renderComparisonInputs() {
  if (!comparisonInputs) return;
  comparisonInputs.innerHTML = comparisonPassports.length
    ? comparisonPassports.map((passport, index) => `
      <label class="comparison-option">
        <input type="checkbox" name="comparison-contract" value="${index}" />
        <span><strong>${escapeHtml(truncateAddress(passport.address))}</strong><small>${escapeHtml(passport.networkId)} · ${passport.snapshotCount} snapshot${passport.snapshotCount === 1 ? "" : "s"}</small></span>
      </label>`).join("")
    : `<div class="unknown-message">No completed passport snapshots are available yet. Complete a live scan first.</div>`;
}

async function loadComparisonInputs() {
  if (!comparisonInputs) return;
  try {
    const body = await apiJson("/api/risk-passports");
    comparisonPassports = body.passports || [];
    renderComparisonInputs();
  } catch (error) {
    comparisonInputs.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
  }
}

function renderComparisonResult(items) {
  if (!comparisonResult) return;
  comparisonResult.hidden = false;
  comparisonResult.innerHTML = `<div class="card-heading"><div><span class="card-kicker">COMPARISON RESULT</span><h3>Latest evidence side by side</h3></div><span class="data-label">${items.length} CONTRACTS</span></div>
    <div class="comparison-table-wrap"><table class="comparison-table"><thead><tr><th>Contract</th><th>Risk</th><th>Reliability</th><th>Findings</th><th>Captured</th></tr></thead><tbody>${items.map((item) => {
      const risk = item.risk?.score;
      return `<tr><td><strong>${escapeHtml(truncateAddress(item.address))}</strong><span>${escapeHtml(item.networkId)}${item.found ? "" : " · NOT FOUND"}</span></td><td>${item.found ? `<b class="${scoreTone(risk)}">${escapeHtml(risk ?? "UNKNOWN")}</b><small>${escapeHtml(item.risk?.level || "UNKNOWN")}</small>` : "UNKNOWN"}</td><td>${item.found ? escapeHtml(item.reliabilityScore ?? "UNKNOWN") : "UNKNOWN"}</td><td>${item.found ? escapeHtml(item.findingCount) : "—"}</td><td>${item.found ? escapeHtml(formatDate(item.capturedAt)) : "—"}</td></tr>`;
    }).join("")}</tbody></table></div>`;
}

comparisonForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selected = [...comparisonForm.querySelectorAll("input[name='comparison-contract']:checked")];
  comparisonStatus.textContent = "";
  if (selected.length < 2 || selected.length > 5) {
    comparisonStatus.textContent = "Select between two and five contracts.";
    return;
  }
  try {
    const body = await apiJson("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contracts: selected.map((input) => {
        const passport = comparisonPassports[Number(input.value)];
        return { networkId: passport.networkId, address: passport.address };
      }) }),
    });
    renderComparisonResult(body.comparison || []);
  } catch (error) {
    comparisonStatus.textContent = error.message;
  }
});

async function loadReports() {
  if (!reportsList) return;
  try {
    const passportsBody = await apiJson("/api/risk-passports");
    const reportsBody = await apiJson("/api/reports");
    const passports = passportsBody.passports || [];
    const reports = reportsBody.reports || [];
    reportsList.innerHTML = `<div class="card-heading"><div><span class="card-kicker">PUBLIC SNAPSHOTS</span><h3>Create or manage a report link</h3></div><span class="data-label">${reports.length} ISSUED</span></div>
      <div class="report-create-list">${passports.length ? passports.map((passport, index) => `<div class="report-row"><div><strong>${escapeHtml(truncateAddress(passport.address))}</strong><span>${escapeHtml(passport.networkId)} · ${passport.snapshotCount} snapshot${passport.snapshotCount === 1 ? "" : "s"}</span></div><button type="button" class="secondary-button" data-create-report="${index}">Create 7-day link</button></div>`).join("") : `<div class="unknown-message">Complete a live scan to create a shareable report.</div>`}</div>
      <div class="report-issued-list">${reports.length ? reports.map((item) => `<div class="report-row"><div><strong>${escapeHtml(truncateAddress(item.address))}</strong><span>${escapeHtml(item.visibility)} · expires ${escapeHtml(formatDate(item.expiresAt))}</span></div><div class="report-actions"><a class="text-button" href="/api/reports/public/${encodeURIComponent(item.id)}" target="_blank" rel="noreferrer">Open API link</a><button type="button" class="text-button" data-revoke-report="${escapeHtml(item.id)}">${item.visibility === "public" ? "Make private" : "Public"}</button></div></div>`).join("") : ""}</div>`;
    reportsList.querySelectorAll("[data-create-report]").forEach((button) => button.addEventListener("click", async () => {
      const passport = passports[Number(button.dataset.createReport)];
      await apiJson("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ network: passport.networkId, address: passport.address, visibility: "public" }) });
      await loadReports();
    }));
    reportsList.querySelectorAll("[data-revoke-report]").forEach((button) => button.addEventListener("click", async () => {
      await apiJson(`/api/reports/${encodeURIComponent(button.dataset.revokeReport)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visibility: "private" }) });
      await loadReports();
    }));
  } catch (error) {
    reportsList.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
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
    window.location.assign(`/login?lang=${encodeURIComponent(JobenI18n.locale)}&returnTo=${encodeURIComponent("/")}`);
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
      window.location.assign(`/login?lang=${encodeURIComponent(JobenI18n.locale)}&returnTo=${encodeURIComponent("/")}`);
      return;
    }
    if (!response.ok) {
      const error = new Error(body.message || "The scan failed.");
      error.code = body.error;
      throw error;
    }
    if (!body.job?.id) throw new Error("The scan job could not be created.");
    activeScanJobId = body.job.id;
    const job = await waitForScan(body.job.id);
    currentJob = job;
    currentScan = job.scan;
    updateLoading(currentScan);
    window.history.pushState({}, "", `/dashboard/scans/${encodeURIComponent(body.job.id)}`);
    renderReport(currentScan);
    const score = currentScan?.risk?.finalScore;
    const level = currentScan?.risk?.level || "UNKNOWN";
    pushSignal(`Scan complete · ${level}`, score === null || score === undefined
      ? "The report is ready, but the available evidence is not sufficient for a numeric risk score."
      : `Risk posture calculated at ${Math.round(score)} / 100. Review the evidence trail before taking action.`, score >= 70 ? "danger" : score >= 40 ? "warning" : "success");
  } catch (error) {
    showLanding({ privateView: true });
    addressError.textContent = ["CONTRACT_NOT_DEPLOYED_ON_NETWORK", "NATIVE_NETWORK_VERIFICATION_UNAVAILABLE"].includes(error.code)
      ? `${error.message} Detected network: unavailable.`
      : error.message;
    pushSignal("Scan interrupted", error.message, "danger");
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
    pushSignal("Report restored", "The completed evidence snapshot is available in your private workspace.", "success");
  } catch (error) {
    showLanding({ privateView: true });
    addressError.textContent = error.message;
    pushSignal("Report unavailable", error.message, "danger");
  }
}

async function scanDemo(scenario) {
  if (!authState?.authenticated) {
    authRequested = true;
    window.location.assign(`/login?lang=${encodeURIComponent(JobenI18n.locale)}&returnTo=%2Fdashboard`);
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
    ${renderNetworkCoverage(scan)}
    <div class="report-hero">
      <div class="report-identity">
        <p class="eyebrow">JOBEN NETWORK / FORENSIC REPORT</p>
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
           <div><div class="data-label">RISK RANGE</div><div class="data-value">${scan.risk?.scoreRange?.min ?? "UNKNOWN"}–${scan.risk?.scoreRange?.max ?? "UNKNOWN"} / 100</div></div>
           <div><div class="data-label">UNSCORED WEIGHT</div><div class="data-value">${scan.risk?.unscoredWeightPct ?? "UNKNOWN"}%</div></div>
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
  return `<section id="report-overview-details" class="report-section full">${sectionHeading("01", "EXECUTIVE SUMMARY", "01 / 08")}
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

function renderProjectContext(scan) {
  const project = scan.project || {};
  const liquidity = scan.liquidity || {};
  const pair = liquidity.pair;
  const website = project.website;
  const socials = project.socials || project.socialLinks;
  const asPoint = (value) => value && typeof value === "object" && "value" in value
    ? value
    : value === null || value === undefined || value === "" ? null : { status: "VALID", value };
  const identityStatus = project.addressConsistency?.value === true ? "VERIFIED" :
    project.addressConsistency?.value === false ? "MISMATCH" :
      website?.value || socials?.value ? "PARTIAL" : "UNKNOWN";
  return `<section class="report-section full model-context-section">${sectionHeading("02", "PROJECT CONTEXT", "02 / 16")}
    <div class="context-overview-grid">
      <div class="metric-grid">
        ${metric("Project name", scan.token?.name)}
        ${metric("Token / symbol", scan.token?.symbol)}
        ${metric("Contract address (per official source)", project.claimedContractAddress)}
        ${metric("Network (per official source)", project.claimedNetwork)}
        ${metric("Official website", website)}
        ${metric("Official socials", asPoint(socials))}
      </div>
      <div class="context-status-card">
        <div class="data-label">PROJECT IDENTITY STATUS</div>
        ${statusPill({ status: identityStatus }, identityStatus)}
        <p>${identityStatus === "VERIFIED"
          ? "The available project evidence is consistent with the scanned contract."
          : identityStatus === "MISMATCH"
            ? "Available project evidence does not match the scanned contract."
            : identityStatus === "PARTIAL"
              ? "Official project links were found, but the scanned contract has not been cross-checked against an official address."
              : "There is insufficient evidence to determine the project-contract relationship."}</p>
      </div>
    </div>
    <div class="context-market-strip">
      <div><span class="data-label">PRIMARY TRADING PAIR</span>${metaValue(pair, truncateAddress)}</div>
      <div><span class="data-label">DEX / VENUE</span>${metaValue(liquidity.dex)}</div>
      <div><span class="data-label">ACTIVE PAIRS</span>${metaValue(asPoint(liquidity.activePairs))}</div>
      <div><span class="data-label">TRADING PAIR AGE</span>${metaValue(asPoint(liquidity.pairAge))}</div>
    </div>
    <p class="pair-note">Source: public market data. Trading-pair age reflects the indexed pair, not necessarily the age of the project.</p>
  </section>`;
}

function renderDataConsistency(scan) {
  const contract = scan.contract || {};
  const network = scan.network || {};
  const security = scan.security || {};
  const liquidity = scan.liquidity || {};
  const asPoint = (value) => value && typeof value === "object" && "status" in value
    ? value
    : value === true ? { status: "VALID", value: true } : null;
  const checks = [
    ["Token contract", asPoint(contract.validated), contract.validated === true ? "PASS" : "UNKNOWN"],
    ["Pair contract", asPoint(liquidity.pair), liquidity.pair?.status === "VALID" ? "PASS" : "UNKNOWN"],
    ["Primary pair", asPoint(liquidity.pair), liquidity.pair ? "PASS" : "UNKNOWN"],
    ["DEX match", asPoint(liquidity.dex), liquidity.dex ? "PASS" : "UNKNOWN"],
    ["Pair ↔ market data", asPoint(liquidity.liquidityUsd), liquidity.liquidityUsd?.status === "VALID" ? "PASS" : "UNKNOWN"],
    ["Price orientation", asPoint(liquidity.price), liquidity.price ? "PASS" : "UNKNOWN"],
    ["Market cap / FDV", asPoint(scan.market?.fdv), scan.market?.fdv ? "PASS" : "UNKNOWN"],
  ];
  return `<section class="report-section full model-context-section">${sectionHeading("03", "DATA CONSISTENCY", "03 / 16")}
    <div class="consistency-grid">
      <div class="metric-grid">
        ${checks.map(([label, point, fallback]) => `<div class="metric"><div class="data-label">${escapeHtml(label)}</div><div class="consistency-value">${statusPill(point || { status: fallback }, point?.status === "VALID" || point?.value === true ? "PASS" : fallback)}</div></div>`).join("")}
      </div>
      <div class="consistency-note">
        <div class="data-label">NETWORK VALIDATION</div>
        ${statusPill({ status: network.validated ? "VERIFIED" : "UNKNOWN" }, network.validated ? "PASS" : "UNKNOWN")}
        <p>Data consistency checks assess evidence integrity only. They are not a risk score and do not change the risk assessment.</p>
        ${security.sourceVerified ? `<span class="data-label">CONTRACT EVIDENCE</span>${statusPill(security.sourceVerified, security.sourceVerified.value === true ? "VERIFIED" : "UNKNOWN")}` : ""}
      </div>
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
   const finalLine = scan.risk?.finalScore === null ? "Final: INSUFFICIENT DATA FOR RELIABLE SCORE" : `Final: ${calculations.reduce((sum, item) => sum + item.contribution, 0).toFixed(2)} / 100 = ${scan.risk.finalScore.toFixed(2)} (range ${scan.risk.scoreRange?.min ?? "UNKNOWN"}–${scan.risk.scoreRange?.max ?? "UNKNOWN"})`;
  const r = scan.reliability?.components || {};
  return `<section class="report-section full">${sectionHeading("02", "RISK BREAKDOWN", "02 / 08")}
    <div class="table-wrap"><table><thead><tr><th>CATEGORY</th><th>SCORE</th><th>ORIGINAL WEIGHT</th><th>APPLIED WEIGHT</th><th>STATUS</th><th>COVERAGE</th></tr></thead><tbody>${rows}</tbody></table></div>
     <p class="breakdown-note">${scan.risk?.partialData ? `This report is marked PARTIAL DATA. Unknown categories are not redistributed. Risk from available data: ${scan.risk.scoreRange?.min ?? "UNKNOWN"}–${scan.risk.scoreRange?.max ?? "UNKNOWN"} / 100; unscored weight: ${scan.risk.unscoredWeightPct ?? "UNKNOWN"}%.` : "All original category weights are applied because each category has sufficient evidence in this snapshot."}</p>
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
  return `<section id="report-contract-forensics" class="report-section full">${sectionHeading("03", "CONTRACT & TRADING FORENSICS", "03 / 08")}
     <div class="forensic-grid">
       <div id="report-contract"><h3 class="subheading">CONTRACT CAPABILITIES</h3><div class="table-wrap"><table><thead><tr><th>CAPABILITY</th><th>STATUS</th><th>IMPACT</th><th>EVIDENCE</th><th>EVIDENCE TYPE</th><th>CONFIDENCE</th></tr></thead><tbody>
        ${capabilityRow("Mint additional tokens", s.canMint, "+30")}
        ${capabilityRow("Blacklist addresses", s.canBlacklist, "+20")}
        ${capabilityRow("Whitelist restrictions", s.canWhitelist, "+10")}
        ${capabilityRow("Pause transfers", s.canPause, "+15")}
        ${capabilityRow("Modify transaction tax", s.canChangeTax, "+20")}
        ${capabilityRow("Upgradeable / proxy", s.isUpgradeable, "+15")}
        ${capabilityRow("Withdraw funds", s.canWithdraw, "+15")}
        ${capabilityRow("Source verification", s.sourceVerified, "Unverified +10")}
      </tbody></table></div></div>
       <div id="report-trading"><h3 class="subheading">TRADING SIGNALS</h3><div class="table-wrap"><table><thead><tr><th>SIGNAL</th><th>VALUE / STATUS</th><th>IMPACT</th><th>EVIDENCE</th><th>EVIDENCE TYPE</th><th>CONFIDENCE</th></tr></thead><tbody>
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

function renderNetworkCoverage(scan) {
  const matrix = scan.network?.capabilityMatrix;
  if (!matrix?.capabilities?.length) return "";
  const classLabel = {
    "evm-rpc-blockscout": "EVM + RPC + Blockscout",
    "evm-rpc": "EVM + RPC",
    "native-adapter": "Native adapter",
    "metadata-only": "Metadata only",
  }[matrix.networkClass] || matrix.networkClass;
  return `<section class="report-section full network-coverage-section">${sectionHeading("01A", "NETWORK CAPABILITY COVERAGE", "01A / 08")}
    <div class="coverage-summary"><div><div class="data-label">NETWORK CLASS</div><strong>${escapeHtml(classLabel)}</strong></div><div><div class="data-label">AVAILABLE CAPABILITIES</div><strong>${matrix.supportedCount} / ${matrix.totalCount}</strong></div><div><div class="data-label">FRESHNESS</div><strong>PER SCAN</strong></div></div>
    <div class="capability-matrix">${matrix.capabilities.map((item) => `<div class="matrix-item ${item.support === "not_supported" ? "unsupported" : ""}"><div><strong>${escapeHtml(item.label)}</strong><span class="matrix-status">${escapeHtml(item.support === "supported" ? "SUPPORTED" : "NOT SUPPORTED")}</span></div><p>${escapeHtml(item.limitation)}</p>${item.provider ? `<small>${escapeHtml(item.provider)}</small>` : ""}</div>`).join("")}</div>
  </section>`;
}

function metric(label, dataPoint, formatter = formatValue) {
  return `<div class="metric"><div class="data-label">${escapeHtml(label)}</div>${metaValue(dataPoint, formatter)}</div>`;
}

function formatEvidenceMetadata(value) {
  if (!value || typeof value !== "object") return formatValue(value);
  return JSON.stringify(value);
}

function renderHolderLiquidity(scan) {
  const h = scan.holders || {};
  const l = scan.liquidity || {};
  const holderHistory = scan.holderHistory || {};
  const ownerHistory = scan.ownerHistory || {};
  const holderFields = [h.totalHolders, h.top1Percent, h.top5Percent, h.top10Percent, h.deployerPercent, h.ownerPercent, h.burnPercent, h.liquidityRelatedAddresses];
  const holderUnavailable = holderFields.every((field) => !field || field.status === "UNKNOWN" || field.status === "UNAVAILABLE" || field.status === "ERROR");
  return `<section id="report-holder-liquidity" class="report-section full">${sectionHeading("04", "HOLDER & LIQUIDITY ANALYSIS", "04 / 08")}
    <div class="forensic-grid">
      <div id="report-holder"><h3 class="subheading">HOLDER SUMMARY</h3>${holderUnavailable ? `<div class="unknown-message">HOLDER DATA UNAVAILABLE</div>` : `<div class="metric-grid">
        ${metric("Total holders", h.totalHolders)}
        ${metric("Top 1%", h.top1Percent, formatPercent)}
        ${metric("Top 5%", h.top5Percent, formatPercent)}
        ${metric("Top 10%", h.top10Percent, formatPercent)}
        ${metric("GoPlus top 10% (incl. contracts/LP)", h.goplusTop10Percent, formatPercent)}
        ${metric("Deployer", h.deployerPercent, formatPercent)}
        ${metric("Owner", h.ownerPercent, formatPercent)}
        ${metric("GoPlus holder count", h.goplusTotalHolders)}
        ${metric("Burn", h.burnPercent, formatPercent)}
        ${metric("Liquidity-related", h.liquidityRelatedAddresses)}
        ${metric("On-chain transfer events", h.onChainTransferCount)}
        ${metric("On-chain observed holders", h.onChainHolderCount)}
        ${metric("Event history status", h.onChainHistoryStatus)}
      </div>`}</div>
     <div id="report-liquidity"><h3 class="subheading">PRIMARY LIQUIDITY PAIR</h3>${!l.pair || ["UNKNOWN", "NOT_CHECKED", "UNAVAILABLE", "ERROR"].includes(l.pair.status) ? `<div class="unknown-message">LIQUIDITY DATA UNKNOWN</div>` : `<div class="metric-grid">
        ${metric("Liquidity", l.liquidityUsd, formatCurrency)}
        ${metric("24h volume", l.volume24h, formatCurrency)}
        ${metric("Pair", l.pair, truncateAddress)}
        ${metric("DEX", l.dex)}
        ${metric("Price", l.price, (value) => `$${Number(value).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 8 })}`)}
        ${metric("24h change", l.change24h, formatPercent)}
         ${metric("Indexed pairs", l.pairCount)}
         ${metric("All-pair liquidity", l.totalLiquidityUsd, formatCurrency)}
         ${metric("All-pair 24h volume", l.totalVolume24h, formatCurrency)}
         ${metric("24h buys / sells", l.buys24h && l.sells24h ? { ...l.buys24h, value: `${l.buys24h.value} / ${l.sells24h.value}` } : null)}
      </div><p class="pair-note">Primary pair rule: ${escapeHtml(l.primaryPairRule || "Highest-evidence pair selection rule.")} Liquidity lock status is not claimed because no reliable lock source is configured.</p>`}</div>
    </div>
    <div class="history-card onchain-history-card">
      <div><span class="data-label">ON-CHAIN EVENT HISTORY</span><strong>${escapeHtml(holderHistory.status || "UNKNOWN")}</strong></div>
      <p>${holderHistory.status === "COMPLETE" || holderHistory.status === "PARTIAL"
        ? `${holderHistory.transfers?.length || 0} Transfer event(s) indexed from block ${holderHistory.scannedFromBlock ?? "UNKNOWN"} to ${holderHistory.scannedToBlock ?? "UNKNOWN"}. ${holderHistory.status === "PARTIAL" ? "The RPC limited the scan range; this is not a complete lifetime history." : "The scan covered the available lifetime range."}`
        : escapeHtml(holderHistory.reason || "No on-chain Transfer history was available.")}</p>
      <div><span class="data-label">OWNER EVENT HISTORY</span><strong>${escapeHtml(ownerHistory.status || "UNKNOWN")}</strong></div>
      ${ownerHistory.events?.length ? `<div class="relationship-list">${ownerHistory.events.map((event) => `<div><span>BLOCK ${escapeHtml(String(event.blockNumber ?? "UNKNOWN"))}</span><strong class="address-text">${escapeHtml(event.previousOwner || "UNKNOWN")} → ${escapeHtml(event.newOwner || "UNKNOWN")}</strong></div>`).join("")}</div>` : `<p>${escapeHtml(ownerHistory.reason || "No OwnershipTransferred events were found in the scanned range.")}</p>`}
    </div>
  </section>`;
}

function renderMarketDeployer(scan) {
  const m = scan.market || {};
  const d = scan.deployer || {};
  const p = scan.project || {};
  const v = scan.verification || {};
  const s = scan.security || {};
  const h = scan.holders || {};
  return `<section id="report-market" class="report-section full">${sectionHeading("05", "MARKET & DEPLOYER SIGNALS", "05 / 08")}
    <div class="forensic-grid">
       <div id="report-market-data"><h3 class="subheading">MARKET & PROJECT</h3><div class="metric-grid">
        ${metric("Price", m.price, (value) => `$${Number(value).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 8 })}`)}
        ${metric("24h volume", m.volume24h, formatCurrency)}
        ${metric("Liquidity", m.liquidityUsd, formatCurrency)}
        ${metric("FDV", m.fdv, formatCurrency)}
         ${metric("Market cap", m.marketCap, formatCurrency)}
        ${metric("24h change", m.change24h, formatPercent)}
        ${metric("7d change", m.change7d, formatPercent)}
        ${metric("Website", p.website)}
        ${metric("Address consistency", p.addressConsistency)}
        ${metric("Audit claim", p.auditClaim)}
      </div></div>
      <div><h3 class="subheading">DEPLOYER</h3><div class="metric-grid">
         ${metric("Contract Creator", d.address, truncateAddress)}
         ${metric("Contract Owner", scan.security?.ownerAddress, truncateAddress)}
         ${metric("Deployment date", d.deploymentDate)}
        ${metric("Suspicious behavior", d.suspiciousBehavior)}
        ${metric("Related contracts", d.relatedContracts)}
        ${metric("Recent deployment", d.veryRecentDeployment)}
        ${metric("Token concentration", d.tokenConcentration, formatPercent)}
        ${metric("Malicious association", d.maliciousAssociation)}
      </div>
      <h3 class="subheading evidence-subheading">EXPLORER / INDEXER EVIDENCE</h3><div class="metric-grid">
        ${metric("Source verification", v.sourceCode || s.sourceVerified)}
        ${metric("Verified ABI / class", v.verifiedAbi, formatEvidenceMetadata)}
        ${metric("Contract metadata", v.contractMetadata, formatEvidenceMetadata)}
        ${metric("Owner address", s.ownerAddress, truncateAddress)}
        ${metric("Deployer address", d.address, truncateAddress)}
        ${metric("Deployment time", d.deploymentDate)}
        ${metric("Holder count", h.totalHolders)}
      </div></div>
    </div>
  </section>`;
}

function findingRow(finding) {
  const interpretation = finding.risk_interpretation_confidence || finding.confidence || "UNKNOWN";
  const retrieval = finding.data_retrieval_confidence || "UNKNOWN";
  return `<tr><td>${statusPill({ status: finding.severity }, finding.severity)}</td><td><div class="finding-title">${escapeHtml(finding.title)}</div><div class="finding-why">${escapeHtml(finding.why)}</div></td><td><strong>Risk confidence: ${escapeHtml(interpretation)}</strong><small>Data retrieval: ${escapeHtml(retrieval)}</small></td><td>${escapeHtml(finding.evidence)}</td></tr>`;
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
  return `<section id="report-evidence" class="report-section full">${sectionHeading("07", "EVIDENCE REGISTER", "07 / 08")}
    <p class="section-intro">Expand an item for WHAT, WHY, EVIDENCE, timestamp, status, confidence, and limitations.</p>
    ${scan.evidence?.length ? `<div class="table-wrap"><table><thead><tr><th>ID</th><th>FINDING</th><th>EVIDENCE TYPE</th><th>RETRIEVED AT</th><th>CONFIDENCE</th></tr></thead><tbody>${scan.evidence.map((evidence) => `<tr><td><span class="evidence-id">${escapeHtml(evidence.id)}</span></td><td>${escapeHtml(evidence.finding)}<details class="evidence-detail"><summary>VIEW EVIDENCE DETAIL</summary><div class="detail-grid"><strong>WHAT</strong><span>${escapeHtml(evidence.what)}</span><strong>WHY</strong><span>${escapeHtml(evidence.why)}</span><strong>EVIDENCE</strong><span>${escapeHtml(evidence.evidence)}</span><strong>EVIDENCE TYPE</strong><span>${escapeHtml(evidenceLabel(evidence))}</span><strong>RETRIEVED AT</strong><span>${escapeHtml(formatDate(evidence.retrievedAt))}</span><strong>STATUS</strong><span>${statusPill(evidence, evidence.status)}</span><strong>CONFIDENCE</strong><span>${escapeHtml(evidence.confidence)}</span>${evidence.limitations ? `<strong>LIMITATIONS</strong><span>${escapeHtml(evidence.limitations)}</span>` : ""}</div></details></td><td>${escapeHtml(evidenceLabel(evidence))}</td><td>${escapeHtml(formatDate(evidence.retrievedAt))}</td><td>${escapeHtml(evidence.confidence)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="unknown-message">NO MATERIAL EVIDENCE REGISTERED</div>`}
  </section>`;
}

function renderEvidenceIntelligence(scan) {
  const providers = scan.providerResults || [];
  const conflicts = scan.conflicts || [];
  const evidence = scan.evidence || [];
  const capturedAt = Date.parse(scan.timestamp || "");
  const stale = evidence.filter((item) => {
    const retrieved = Date.parse(item.retrievedAt || "");
    return Number.isFinite(capturedAt) && Number.isFinite(retrieved) && capturedAt - retrieved > 24 * 60 * 60 * 1000;
  });
  const coverage = Object.entries(scan.risk?.categories || {});
  return `<section id="evidence-intelligence" class="report-section full intelligence-section">
    ${sectionHeading("16", "EVIDENCE INTELLIGENCE", "16 / 16")}
    <p class="section-intro">Lineage, provider posture, conflicts, freshness, and coverage remain separate from the risk score.</p>
    <div class="intelligence-grid phase3-grid">
      <article class="intelligence-card"><div class="card-heading"><div><span class="card-kicker">EVIDENCE GRAPH</span><h3>Snapshot relationships</h3></div><span class="data-label" id="graph-state">LOADING</span></div><div id="evidence-graph" class="graph-summary">Loading graph evidence…</div></article>
      <article class="intelligence-card"><div class="card-heading"><div><span class="card-kicker">PROVIDER POSTURE</span><h3>Independent sources</h3></div><span class="data-label">${providers.length} SOURCES</span></div><div class="provider-posture-list">${providers.length ? providers.map((item) => `<div class="provider-posture-row"><span>${escapeHtml(item.providerId || "Provider")}</span><strong class="${statusClass(item.status)}">${escapeHtml(item.status || "UNKNOWN")}</strong><small>${escapeHtml(item.confidence || "UNKNOWN")} · ${escapeHtml(formatDate(item.retrievedAt))}</small></div>`).join("") : `<div class="unknown-message">Provider lineage is unavailable for this snapshot.</div>`}</div></article>
    </div>
    <div class="intelligence-grid phase3-grid">
      <article class="intelligence-card"><div class="card-heading"><div><span class="card-kicker">CONFLICT VIEW</span><h3>Provider disagreements</h3></div><span class="data-label">${conflicts.length} FOUND</span></div>${conflicts.length ? `<div class="conflict-list">${conflicts.map((item) => `<div class="conflict-row"><strong>${escapeHtml(item.path)}</strong><span>${escapeHtml((item.values || []).map((value) => JSON.stringify(value)).join(" ↔ "))}</span><small>References: ${escapeHtml((item.evidenceReferences || []).join(", ") || "UNKNOWN")}</small></div>`).join("")}</div>` : `<div class="unknown-message">No unresolved provider conflict was recorded.</div>`}</article>
      <article class="intelligence-card"><div class="card-heading"><div><span class="card-kicker">FRESHNESS &amp; COVERAGE</span><h3>Evidence health</h3></div><span class="data-label">${stale.length} STALE</span></div><div class="coverage-map">${coverage.length ? coverage.map(([key, item]) => { const value = item?.coverage ?? 0; return `<div class="coverage-map-row"><span>${escapeHtml(key)}</span><div class="coverage-track"><i style="width:${Math.max(0, Math.min(100, Number(value) || 0))}%"></i></div><strong>${escapeHtml(String(Number(value) || 0))}%</strong></div>`; }).join("") : `<div class="unknown-message">Coverage map unavailable.</div>`}</div><p class="intelligence-note">${stale.length ? `${stale.length} evidence item(s) are older than 24 hours.` : "No evidence item exceeded the 24-hour freshness threshold."}</p></article>
    </div>
    <div class="lineage-table-wrap"><table class="lineage-table"><thead><tr><th>FINDING</th><th>STATUS</th><th>CONFIDENCE</th><th>RETRIEVED</th><th>PROVENANCE</th></tr></thead><tbody>${(scan.findings || []).length ? scan.findings.map((finding) => `<tr><td>${escapeHtml(finding.title || finding.id)}</td><td>${escapeHtml(finding.status || "UNKNOWN")}</td><td>${escapeHtml(finding.confidence || "UNKNOWN")}</td><td>${escapeHtml(formatDate(finding.retrievedAt))}</td><td>${escapeHtml(finding.provenance?.providerId || finding.source || "UNKNOWN")}</td></tr>`).join("") : `<tr><td colspan="5">No evidence-backed findings were generated.</td></tr>`}</tbody></table></div>
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
    <p class="disclaimer">This is not financial advice. This assessment does not guarantee safety and does not establish that a token is a scam. JOBEN NETWORK does not provide BUY, SELL, LONG, or SHORT recommendations.</p>
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

function trajectoryValue(change, value) {
  if (value === null || value === undefined) return "UNKNOWN";
  if (change.kind === "currency") return formatCurrency(value);
  if (change.kind === "percent") return formatPercent(value);
  if (change.kind === "count") return Number(value).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US");
  if (change.kind === "address") return truncateAddress(String(value));
  if (change.kind === "boolean") return value ? "Upgradeable" : "Not upgradeable";
  if (change.kind === "number") return Number(value).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 2 });
  return formatValue(value);
}

function trajectoryDelta(change) {
  if (change.delta === null || change.delta === undefined) return "Changed";
  const sign = change.delta > 0 ? "+" : "";
  if (change.kind === "percent") return `${sign}${formatPercent(change.delta)} pp`;
  if (change.kind === "currency") {
    const absolute = formatCurrency(Math.abs(change.delta));
    const relative = change.relativeDelta === null || change.relativeDelta === undefined
      ? ""
      : ` (${sign}${change.relativeDelta}% )`;
    return `${change.delta < 0 ? "-" : sign}${absolute}${relative}`;
  }
  if (change.kind === "count") return `${sign}${Number(change.delta).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US")} holders`;
  if (change.kind === "points") return `${sign}${Number(change.delta).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 2 })} pts`;
  return change.direction === "increase" ? "Increased" : "Decreased";
}

function trajectoryElapsed(entry) {
  const hours = entry?.trajectory?.elapsedHours;
  if (!Number.isFinite(Number(hours))) return "time unavailable";
  const value = Number(hours);
  if (value < 1) return `${Math.max(1, Math.round(value * 60))} min`;
  if (value < 24) return `${value.toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 })} hr`;
  return `${(value / 24).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 1 })} days`;
}

function renderRiskTrajectory(timeline = []) {
  const current = timeline[0] || null;
  const trajectory = current?.trajectory;
  if (!current || !trajectory || trajectory.status === "INITIAL") {
    return `<section id="risk-trajectory" class="trajectory-card">
      <div class="trajectory-heading"><div><span class="card-kicker">ADVANCED REPORT INTELLIGENCE</span><h3>Risk Trajectory</h3></div><span class="trajectory-state neutral">INITIAL SNAPSHOT</span></div>
      <p class="trajectory-empty">No prior scan is stored for this contract. A future scan will show evidence-backed changes here.</p>
    </section>`;
  }
  const changes = trajectory.changes || [];
  const stateLabel = changes.length ? `${changes.length} CHANGE${changes.length === 1 ? "" : "S"}` : "NO MATERIAL CHANGE";
  return `<section id="risk-trajectory" class="trajectory-card">
    <div class="trajectory-heading"><div><span class="card-kicker">ADVANCED REPORT INTELLIGENCE</span><h3>Risk Trajectory</h3></div><span class="trajectory-state ${changes.length ? "changed" : "neutral"}">${stateLabel}</span></div>
    <p class="trajectory-intro">${changes.length
      ? `Compared with the previous completed scan ${escapeHtml(trajectoryElapsed(current))} earlier. Unknown and unavailable evidence is excluded from deltas.`
      : `Compared with the previous completed scan ${escapeHtml(trajectoryElapsed(current))} earlier, no comparable metric changed.`}</p>
    ${changes.length ? `<div class="trajectory-list">${changes.map((change) => `
      <div class="trajectory-row ${escapeHtml(change.tone || "neutral")}">
        <div class="trajectory-change-main"><strong>${escapeHtml(change.label || change.field)}</strong><span>${escapeHtml(trajectoryValue(change, change.before))} <b>→</b> ${escapeHtml(trajectoryValue(change, change.after))}</span></div>
        <div class="trajectory-change-meta"><strong>${escapeHtml(trajectoryDelta(change))}</strong><span>${escapeHtml(change.direction || "changed")}</span></div>
      </div>`).join("")}</div>` : `<div class="trajectory-empty">The previous scan had the same comparable risk, trading, liquidity, holder, and control values.</div>`}
    <div class="trajectory-foot"><span>PREVIOUS SCAN <b>${escapeHtml(formatDate(current.before?.capturedAt))}</b></span><span>CURRENT SCAN <b>${escapeHtml(formatDate(current.capturedAt))}</b></span><span>${timeline.length} SNAPSHOT${timeline.length === 1 ? "" : "S"} STORED</span></div>
  </section>`;
}

async function loadRiskTrajectory(scan) {
  const target = document.querySelector("#risk-trajectory");
  if (!target || scan.mode === "DEMO" || !scan.contract?.address || !scan.network?.id) return;
  try {
    const params = new URLSearchParams({ network: scan.network.id, address: scan.contract.address });
    const body = await apiJson(`/api/risk-timeline?${params.toString()}`);
    target.outerHTML = renderRiskTrajectory(body.timeline || []);
  } catch (error) {
    target.innerHTML = `<div class="trajectory-heading"><div><span class="card-kicker">ADVANCED REPORT INTELLIGENCE</span><h3>Risk Trajectory</h3></div><span class="trajectory-state neutral">UNAVAILABLE</span></div><p class="trajectory-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function loadEvidenceGraph(scan) {
  const target = document.querySelector("#evidence-graph");
  const state = document.querySelector("#graph-state");
  if (!target || !state || scan.mode === "DEMO" || !currentJob?.id) return;
  try {
    const body = await apiJson(`/api/scans/${encodeURIComponent(currentJob.id)}/graph`);
    const graph = body.graph || {};
    state.textContent = `${graph.nodes?.length || 0} NODES`;
    target.innerHTML = graph.nodes?.length
      ? `<div class="graph-node-list">${graph.nodes.map((node) => `<div class="graph-node"><span class="graph-node-type">${escapeHtml(node.type || "evidence")}</span><strong>${escapeHtml(node.label || node.id)}</strong><small>${escapeHtml(node.status || "UNKNOWN")}</small></div>`).join("")}</div><p class="intelligence-note">${escapeHtml(String(graph.edges?.length || 0))} evidence relationship(s) retained from the snapshot.</p>`
      : `<div class="unknown-message">No graph relationships were available for this snapshot.</div>`;
  } catch (error) {
    state.textContent = "UNAVAILABLE";
    target.innerHTML = `<div class="unknown-message">${escapeHtml(error.message)}</div>`;
  }
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
  const providerResults = scan.providerResults || [];
  const sourceSummary = scan.evidenceSources || {
    total: new Set(providerResults.map((result) => result.providerId).filter(Boolean)).size || (scan.mode === "DEMO" ? 1 : 0),
    successful: providerResults.filter((result) => result.status === "valid").length,
    partial: providerResults.filter((result) => result.status === "unavailable").length,
    failed: providerResults.filter((result) => result.status === "provider_error").length,
  };
  const sourceCount = sourceSummary.total || 0;
  const successfulCount = sourceSummary.successful || 0;
  const partialCount = sourceSummary.partial || 0;
  const tokenName = dashboardValue(scan.token?.name);
  const tokenSymbol = dashboardValue(scan.token?.symbol);
  let totalSupplyLabel = "Total Supply";
  const totalSupply = dashboardValue(scan.token?.totalSupply, (value) => {
    const numeric = Number(value);
    const decimals = Number(scan.token?.decimals?.value);
    return Number.isFinite(numeric) && Number.isFinite(decimals)
      ? (numeric / 10 ** decimals).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 0 })
      : "Tidak dapat dihitung dari sumber data saat ini";
  });
  let displaySupply = totalSupply;
  if (["UNKNOWN", "NOT_CHECKED", "UNAVAILABLE", "ERROR"].includes(scan.token?.totalSupply?.status)) {
    const fdv = Number(scan.market?.fdv?.value);
    const price = Number(scan.market?.price?.value);
    if (Number.isFinite(fdv) && fdv > 0 && Number.isFinite(price) && price > 0) {
    displaySupply = (fdv / price).toLocaleString(JobenI18n.locale === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 0 });
      totalSupplyLabel = "Estimated (FDV ÷ price)";
    } else {
      displaySupply = "Tidak dapat dihitung dari sumber data saat ini";
    }
  }
  const contractAddress = scan.contract?.address || "UNKNOWN";
  const statusPoint = (point) => point || { status: scan.mode === "DEMO" ? "DEMO" : "VERIFIED", value: true };
  const topRiskRows = risks.length ? risks : [{ title: "No evidence-backed risk finding", severity: "UNKNOWN", why: "No material risk was established.", category: "—" }];
  const dataRows = [
    ["On-Chain Data", statusPoint(scan.network)],
    ["Contract Code", statusPoint(scan.security?.sourceVerified)],
    ["Liquidity Data", statusPoint(scan.liquidity?.liquidityUsd)],
    ["Holder Data", statusPoint(scan.holders?.totalHolders)],
    ["Market Data", statusPoint(scan.market?.price)],
    ["Social Data", scan.project?.website?.value || scan.project?.socials?.value
      ? { status: "VERIFIED", value: true }
      : scan.project?.website || scan.project?.socials],
  ];
  const dataStatusLabel = (point) => {
    const status = point?.status || "UNKNOWN";
    if (status === "DEMO" || status === "VERIFIED") return "Valid";
    if (status === "NOT_CHECKED") return "Not Checked";
    if (status === "UNAVAILABLE") return "Not Available";
    return status.replaceAll("_", " ");
  };
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
      ${scan.mode === "DEMO" ? "" : `<section id="risk-trajectory" class="trajectory-card"><div class="trajectory-heading"><div><span class="card-kicker">ADVANCED REPORT INTELLIGENCE</span><h3>Risk Trajectory</h3></div><span class="trajectory-state neutral">LOADING</span></div><p class="trajectory-empty">Loading the previous completed scan for comparison…</p></section>`}
      <div class="dashboard-report-grid">
        <section id="report-overview" class="overview-card">
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
             <div class="summary-row"><span>${escapeHtml(totalSupplyLabel)}</span><strong>${escapeHtml(displaySupply)}</strong></div>
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
        <div class="report-navigation" aria-label="Report navigation">
          <div class="report-category-control">
            <label for="report-category-select">REPORT SECTION</label>
            <select id="report-category-select">
              <option value="all">All sections</option>
              <option value="0">01 · Executive Summary</option>
              <option value="1">02 · Project Context</option>
              <option value="2">03 · Data Consistency</option>
              <option value="3">04 · Risk Profile</option>
              <option value="4">05 · Contract Capabilities</option>
              <option value="5">06 · Contract Power Map</option>
              <option value="6">07 · Exitability</option>
              <option value="7">08 · User Impact</option>
              <option value="8">09 · Risk Breakdown</option>
              <option value="9">10 · Contract &amp; Trading Forensics</option>
              <option value="10">11 · Holder &amp; Liquidity Analysis</option>
              <option value="11">12 · Market &amp; Deployer Signals</option>
              <option value="12">13 · Key Findings</option>
              <option value="13">14 · Evidence Register</option>
              <option value="14">15 · Data Coverage &amp; Limitations</option>
              <option value="15">16 · Evidence Intelligence</option>
              <option value="16">17 · Final Assessment</option>
            </select>
          </div>
          <div class="report-navigation-actions">
            <button type="button" class="report-show-all" id="show-all-analysis">Show All <span>↓</span></button>
            <span class="report-navigation-note">17 sections · full evidence review</span>
          </div>
       </div>
      <div class="dashboard-lower-grid">
        <section class="report-table-card">
          <div class="card-heading"><div class="card-kicker">TOP RISKS</div><button type="button" class="side-link" id="open-findings">View All Findings <span>→</span></button></div>
          <div class="responsive-table"><table><thead><tr><th>RISK</th><th>CATEGORY</th><th>SEVERITY</th><th>IMPACT</th><th>STATUS</th></tr></thead><tbody>${topRiskRows.map((finding) => {
            const category = categoryLabels[finding.category] || (finding.category && finding.category !== "UNKNOWN" ? finding.category : "Unknown");
            const impact = finding.impact === null || finding.impact === undefined ? "—" : `+${finding.impact}`;
            const evidenceStatus = finding.status || (finding.severity === "UNKNOWN" ? "UNKNOWN" : "VALID");
            const statusLabel = evidenceStatus === "VALID" || evidenceStatus === "VERIFIED" ? "Detected" : evidenceStatus.replaceAll("_", " ");
            return `<tr><td><strong>${escapeHtml(finding.title)}</strong></td><td>${escapeHtml(category)}</td><td><span class="severity-chip ${statusClass(finding.severity)}">${escapeHtml(finding.severity || "UNKNOWN")}</span></td><td>${escapeHtml(impact)}</td><td><span class="detected-chip ${statusClass(evidenceStatus)}">${escapeHtml(statusLabel)}</span></td></tr>`;
          }).join("")}</tbody></table></div>
        </section>
         <div class="report-side-column lower-side">
           <section class="side-card"><div class="card-kicker">DATA STATUS</div>${dataRows.map(([label, point]) => `<div class="status-row"><span>${label}</span>${dashboardStatus(point, dataStatusLabel(point))}</div>`).join("")}</section>
           <section class="side-card"><div class="card-kicker">EVIDENCE SOURCES</div><div class="evidence-count"><strong>${sourceCount}</strong><span>Total Sources</span></div><div class="evidence-breakdown"><span><b class="green-text">${successfulCount}</b> Successful</span><span><b class="orange-text">${partialCount}</b> Partial</span><span><b class="red-text">${sourceSummary.failed || 0}</b> Failed</span></div><button type="button" class="side-link" id="open-evidence">View Evidence <span>→</span></button></section>
        </div>
      </div>
       <div id="dashboard-deep" class="dashboard-deep" hidden>
         ${renderExecutiveSummary(scan)}
         ${renderProjectContext(scan)}
         ${renderDataConsistency(scan)}
         ${renderRiskProfile(scan)}
         ${renderCapabilities(scan)}
         ${renderPowerMap(scan)}
         ${renderExitability(scan)}
         ${renderUserImpacts(scan)}
         ${renderRiskBreakdown(scan)}
         ${renderForensics(scan)}
         ${renderHolderLiquidity(scan)}
         ${renderMarketDeployer(scan)}
         ${renderFindings(scan)}
         ${renderEvidence(scan)}
         ${renderCoverage(scan)}
         ${renderEvidenceIntelligence(scan)}
         ${renderFinalAssessment(scan)}
       </div>
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
     <p class="section-intro">Technical permissions are translated into potential user impact. UNVERIFIED_SIGNAL means a bytecode/provider signal was not confirmed by verified source or ABI.</p>
    <div class="capability-grid">${capabilities.map((capability) => `<article class="capability-card ${capability.detected ? "detected" : ""}">
      <div class="capability-head"><h3>${escapeHtml(capability.label)}</h3>${statusPill({ status: capability.status }, capability.status)}</div>
       <div class="data-label">MEANING</div><p>${escapeHtml(capability.status === "UNVERIFIED_SIGNAL" ? "Provider reported a bytecode pattern, but verified source/ABI confirmation is unavailable." : capability.detected ? capability.meaning : capability.status === "UNKNOWN" || capability.status === "NOT_CHECKED" ? "This capability was not checked because the required provider is unavailable." : "The capability was not detected in available evidence.")}</p>
      <div class="capability-meta"><div><span class="data-label">POTENTIAL IMPACT</span><strong>${escapeHtml(capability.impact)}</strong></div><div><span class="data-label">CONTROL</span><strong>${escapeHtml(capability.control)}</strong></div></div>
       <div class="capability-foot"><span>EVIDENCE: ${escapeHtml(capability.detected || capability.status === "NOT_DETECTED" || capability.status === "UNVERIFIED_SIGNAL" ? evidenceLabel({ status: capability.status }) : "UNKNOWN")}</span><span>RISK CONFIDENCE: ${escapeHtml(capability.confidence)}</span></div>
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
  const quote = exit.onChain || {};
  return `<section class="report-section full intelligence-section">${sectionHeading("05", "CAN I EXIT?", "05 / 16")}
    <p class="section-intro">Technical exitability assessment only. This is not investment advice and does not guarantee execution or safety.</p>
    <div class="exit-grid"><div class="exit-summary"><div class="data-label">EXITABILITY</div><div class="exit-level ${statusClass(exit.level)}">${escapeHtml(exit.level || "UNKNOWN")}</div><p>${escapeHtml(exit.explanation || "Insufficient evidence is available to assess practical exit conditions.")}</p></div>
      <div class="exit-signals">${(exit.signals || []).map((signal) => `<div class="exit-signal"><span class="data-label">${escapeHtml(signal.label)}</span><strong>${escapeHtml(signal.value)}</strong></div>`).join("")}</div>
      <div class="history-card"><div><span class="data-label">READ-ONLY ROUTER EVIDENCE</span><strong>${escapeHtml(quote.status || "UNKNOWN")}</strong></div><p>${escapeHtml(quote.status === "PASS" ? `Router quote: ${quote.quotedOutput || "UNKNOWN"} wrapped-native units for ${quote.amountIn || "UNKNOWN"} token base units.` : quote.reason || "No router quote was available.")}</p><small>This is an eth_call quote only. It does not prove allowance, wallet balance, slippage tolerance, tax behavior, or a mined transaction.</small></div>
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
  JobenI18n.translate(dashboardReport);
  loadRiskTrajectory(scan);
  loadEvidenceGraph(scan);
  document.querySelector("#landing-title").textContent = uiText("Private Scan Report");
  document.querySelector("#landing-description").textContent = uiText("Your forensic report is available inside the authenticated workspace.");
  document.querySelector("#scan-mode-card").hidden = true;
  scanHistory.hidden = true;
  document.querySelector("#new-scan").classList.add("report-route");
  document.querySelector("#dashboard").classList.add("private-heading");
  const deep = document.querySelector("#dashboard-deep");
  let restoreDeepAfterPrint = false;
  document.querySelector("#download-report")?.addEventListener("click", () => {
    if (deep?.hidden) {
      deep.hidden = false;
      restoreDeepAfterPrint = true;
    }
    const categorySelect = document.querySelector("#report-category-select");
    if (categorySelect) categorySelect.value = "all";
    window.requestAnimationFrame(() => window.print());
  });
  window.addEventListener("afterprint", () => {
    if (!restoreDeepAfterPrint || !deep) return;
    deep.hidden = true;
    restoreDeepAfterPrint = false;
  }, { once: true });
  document.querySelector("#back-home")?.addEventListener("click", () => {
    window.history.pushState({}, "", "/dashboard");
    showLanding({ privateView: true });
  });
  const reportSections = () => deep ? Array.from(deep.querySelectorAll(":scope > .report-section")) : [];
  const showAllAnalysis = () => {
    if (!deep) return;
    deep.hidden = false;
    document.querySelector("#report-category-select")?.setAttribute("aria-label", "Report section — all sections shown");
  };
  document.querySelector("#show-all-analysis")?.addEventListener("click", () => {
    showAllAnalysis();
    const categorySelect = document.querySelector("#report-category-select");
    if (categorySelect) categorySelect.value = "all";
    deep?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#report-category-select")?.addEventListener("change", (event) => {
    if (event.target.value === "all") {
      showAllAnalysis();
      deep?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const target = reportSections()[Number(event.target.value)];
    if (!target) return;
    if (deep) deep.hidden = false;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const openDeep = () => {
    if (!deep) return;
    deep.hidden = false;
    const categorySelect = document.querySelector("#report-category-select");
    if (categorySelect) categorySelect.value = "all";
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
networkInput.addEventListener("change", () => {
  networkError.textContent = "";
  addressError.textContent = "";
  addressInput.placeholder = networkInput.value === "solana" ? "Solana contract address..." : "Contract address...";
  renderNetworkCapabilityHint();
});
loadNetworkCapabilityCatalog();
document.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => scanDemo(button.dataset.demo)));
document.querySelector("#mobile-menu")?.addEventListener("click", (event) => {
  const open = sidebar.classList.toggle("open");
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = nextTheme;
  if (!themeToggle) return;
  const lightMode = nextTheme === "light";
  themeToggle.setAttribute("aria-pressed", String(lightMode));
  themeToggle.setAttribute("aria-label", lightMode ? "Switch to dark mode" : "Switch to light mode");
  themeToggle.querySelector(".theme-icon").textContent = lightMode ? "☾" : "☼";
  themeToggle.querySelector(".theme-label").textContent = lightMode ? "Dark" : "Light";
}

const previewTheme = new URLSearchParams(window.location.search).get("theme");
applyTheme(previewTheme === "light" || previewTheme === "dark" ? previewTheme : (localStorage.getItem("joben-theme") || "dark"));
themeToggle?.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem("joben-theme", nextTheme);
  applyTheme(nextTheme);
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

window.addEventListener("joben:locale-change", () => {
  configureAuthRoute();
  if (currentScan) {
    renderReport(currentScan);
  } else if (authState?.authenticated && isPrivateRoute()) {
    showLanding({ privateView: true });
  }
  JobenI18n.translate(document);
});

configureAuthRoute();
setShell({ authView: authRequested });
refreshAuth();