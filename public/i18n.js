(function () {
  "use strict";

  const translations = {
    id: {
      "CONTRACT INTELLIGENCE": "INTELIJEN KONTRAK",
      "Know what a contract can do before it touches your wallet.": "Pahami apa yang dapat dilakukan kontrak sebelum menyentuh wallet Anda.",
      "Read contract risk through real evidence before a decision reaches your wallet.": "Baca risiko kontrak melalui bukti nyata sebelum keputusan menyentuh wallet Anda.",
      "FORENSIC INTELLIGENCE / LIVE NETWORK SIGNAL": "INTELIJEN FORENSIK / SINYAL JARINGAN LIVE",
      "53 NETWORKS": "53 JARINGAN",
      "READ-ONLY BY DESIGN": "DIRANCANG READ-ONLY",
      "Evidence workspace": "Workspace bukti",
      "Start a new scan or review the latest evidence collected for this workspace.": "Mulai pemindaian baru atau tinjau bukti terbaru yang dikumpulkan untuk workspace ini.",
      "Start a new scan": "Mulai pemindaian baru",
      "Review previous work": "Tinjau pekerjaan sebelumnya",
      "Keep an auditable view of completed, running, and failed analyses.": "Pertahankan tampilan yang dapat diaudit untuk analisis yang selesai, berjalan, dan gagal.",
      "Open scan history": "Buka riwayat pemindaian",
      "Monitor risk over time": "Pantau risiko dari waktu ke waktu",
      "Use Risk Passport and Watchtower to follow changes after the first scan.": "Gunakan Paspor Risiko dan Menara Pantau untuk mengikuti perubahan setelah pemindaian pertama.",
      "Open intelligence": "Buka intelijen",
      "Dashboard": "Dasbor",
      "New Scan": "Pemindaian Baru",
      "Scan History": "Riwayat Pemindaian",
      "Risk Passport": "Paspor Risiko",
      "Watchtower": "Menara Pantau",
      "API Access": "Akses API",
      "Settings": "Pengaturan",
      "Platform Ops": "Operasi Platform",
      "Current Plan": "Paket Saat Ini",
      "Scans this month": "Pemindaian bulan ini",
      "Upgrade Plan": "Tingkatkan Paket",
      "Logout": "Keluar",
      "Scan contract": "Pindai kontrak",
      "How it works": "Cara kerja",
      "Sign in": "Masuk",
      "Light": "Terang",
      "Dark": "Gelap",
      "Open navigation": "Buka navigasi",
      "Notifications": "Notifikasi",
      "Select workspace": "Pilih workspace",
      "PRIVATE WORKSPACE ACCESS": "AKSES WORKSPACE PRIVAT",
      "Sign in to JOBEN NETWORK": "Masuk ke JOBEN NETWORK",
      "Create your JOBEN NETWORK account": "Buat akun JOBEN NETWORK",
      "Sign in to securely save your analysis and keep scan history isolated to your account.": "Masuk untuk menyimpan analisis dengan aman dan menjaga riwayat pemindaian tetap terpisah di akun Anda.",
      "Email": "Email",
      "Password": "Kata sandi",
      "Create account": "Buat akun",
      "Create an account": "Buat akun",
      "I already have an account": "Saya sudah punya akun",
      "Forgot password?": "Lupa kata sandi?",
      "Recovery email": "Email pemulihan",
      "Request link": "Minta tautan",
      "Verify": "Verifikasi",
      "Verify email": "Verifikasi email",
      "Verify your email": "Verifikasi email Anda",
      "Email verification token": "Token verifikasi email",
      "Superadmin verification code": "Kode verifikasi superadmin",
      "Authenticator code": "Kode autentikator",
      "Search platform inventory…": "Cari inventaris platform…",
      "Superadmin control plane": "Control plane superadmin",
      "Platform-wide visibility and controlled change management. Every privileged read is step-up protected; every write is reasoned and auditable.": "Visibilitas seluruh platform dan pengelolaan perubahan terkontrol. Setiap pembacaan terprivileg menggunakan step-up protection; setiap perubahan memiliki alasan dan dapat diaudit.",
      "Refresh snapshot": "Segarkan snapshot",
      "Verify operator session": "Verifikasi sesi operator",
      "Platform data and configuration changes require a fresh six-digit authenticator code. Provider secrets are never returned to this browser.": "Data platform dan perubahan konfigurasi memerlukan kode autentikator enam digit yang baru. Rahasia provider tidak pernah dikirim kembali ke browser ini.",
      "Verify session": "Verifikasi sesi",
      "Overview": "Ringkasan",
      "Providers": "Provider",
      "Access & flags": "Akses & flag",
      "Billing": "Penagihan",
      "Audit trail": "Jejak audit",
      "Scan contract on the network": "Pindai kontrak di jaringan",
      "Know what a contract can do before it touches your wallet.": "Pahami apa yang dapat dilakukan kontrak sebelum menyentuh wallet Anda.",
      "Read contract risk through real evidence before a decision reaches your wallet.": "Baca risiko kontrak melalui bukti nyata sebelum keputusan menyentuh wallet Anda.",
      "FORENSIC INTELLIGENCE / LIVE NETWORK SIGNAL": "INTELIJEN FORENSIK / SINYAL JARINGAN LIVE",
      "READ-ONLY BY DESIGN": "DIRANCANG READ-ONLY",
      "PROVIDER-AWARE": "SADAR-PROVIDER",
      "Select network": "Pilih jaringan",
      "Contract address": "Alamat kontrak",
      "Contract Address": "Alamat Kontrak",
      "Network": "Jaringan",
      "Start Scan": "Mulai Pemindaian",
      "We never store your private keys. All scans are read-only.": "Kami tidak pernah menyimpan private key Anda. Semua pemindaian bersifat read-only.",
      "Scan Mode": "Mode Pemindaian",
      "Live": "Live",
      "Real Blockchain Data": "Data Blockchain Nyata",
      "Demo": "Demo",
      "Sample Data": "Data Contoh",
      "Load sample report": "Muat laporan contoh",
      "Moderate sample": "Contoh moderat",
      "NETWORK TELEMETRY": "TELEMETRI JARINGAN",
      "Evidence systems online": "Sistem bukti online",
      "NETWORKS": "JARINGAN",
      "SUPPORTED": "DIDUKUNG",
      "SCAN MODE": "MODE PEMINDAIAN",
      "NO WALLET ACCESS": "TANPA AKSES WALLET",
      "STATUS": "STATUS",
      "OPERATIONAL": "BEROPERASI",
      "LAST CHECK": "PEMERIKSAAN TERAKHIR",
      "INTELLIGENCE LAYER / 01": "LAPISAN INTELIJEN / 01",
      "See the signal behind the score.": "Lihat sinyal di balik skor.",
      "Every verdict is connected to a trail of verifiable evidence.": "Setiap putusan terhubung dengan jejak bukti yang dapat diverifikasi.",
      "EVIDENCE MAP": "PETA BUKTI",
      "STREAMING": "STREAMING",
      "CONTROL": "KONTROL",
      "OWNER / ADMIN": "OWNER / ADMIN",
      "MARKET": "PASAR",
      "LIQUIDITY / PAIR": "LIKUIDITAS / PAIR",
      "HOLDERS": "HOLDER",
      "CONCENTRATION": "KONSENTRASI",
      "SOURCE": "SUMBER",
      "ABI / BYTECODE": "ABI / BYTECODE",
      "TRANSFER": "TRANSFER",
      "TAX / PAUSE": "PAJAK / PAUSE",
      "LIQUIDITY": "LIKUIDITAS",
      "LOCK / DEPTH": "LOCK / KEDALAMAN",
      "VERIFIED": "TERVERIFIKASI",
      "WATCH": "PANTAU",
      "ELEVATED": "MENINGKAT",
      "CRITICAL": "KRITIS",
      "LIVE GRAPH →": "GRAF LIVE →",
      "WHY JOBEN NETWORK": "MENGAPA JOBEN NETWORK",
      "See the risk before the connection.": "Lihat risiko sebelum koneksi.",
      "Turn a contract address into a clear, evidence-backed brief—without guessing and with a sharper view of the signals that matter.": "Ubah alamat kontrak menjadi ringkasan yang jelas dan berbasis bukti—tanpa menebak, dengan pandangan lebih tajam atas sinyal yang penting.",
      "Control signals surfaced": "Sinyal kontrol ditampilkan",
      "Market and holder context": "Konteks pasar dan holder",
      "Unknowns kept visible": "Hal yang belum diketahui tetap terlihat",
      "Scan a contract": "Pindai kontrak",
      "RISK POSTURE": "POSTUR RISIKO",
      "Awaiting contract": "Menunggu kontrak",
      "Available evidence": "Bukti yang tersedia",
      "READY": "SIAP",
      "Unknowns preserved": "Hal yang belum diketahui dipertahankan",
      "EXPLICIT": "EKSPLISIT",
      "Wallet access": "Akses wallet",
      "COMING SOON": "SEGERA HADIR",
      "VERIFICATION TRAIL": "JEJAK VERIFIKASI",
      "Network selected": "Jaringan dipilih",
      "Protocol-aware routing": "Routing sadar-protokol",
      "Contract queried": "Kontrak ditanyakan",
      "Read-only evidence request": "Permintaan bukti read-only",
      "Verdict assembled": "Putusan dirangkai",
      "Unknowns remain visible": "Hal yang belum diketahui tetap terlihat",
      "WAITING": "MENUNGGU",
      "LOCKED": "TERKUNCI",
      "SIGNAL CENTER": "PUSAT SINYAL",
      "Every scan leaves an evidence trail.": "Setiap pemindaian meninggalkan jejak bukti.",
      "LIVE MONITORING": "PEMANTAUAN LIVE",
      "Provider-aware": "Sadar-provider",
      "Conflicting or unavailable evidence stays visible instead of becoming a false “safe” result.": "Bukti yang konflik atau tidak tersedia tetap terlihat, bukan berubah menjadi hasil “aman” yang keliru.",
      "Risk changes": "Perubahan risiko",
      "Re-scans surface what changed in control, liquidity, trading, and holder behavior.": "Pemindaian ulang menampilkan perubahan pada kontrol, likuiditas, trading, dan perilaku holder.",
      "Actionable verdicts": "Putusan yang dapat ditindaklanjuti",
      "Every high-impact finding is paired with evidence and a clear next step.": "Setiap temuan berdampak tinggi disertai bukti dan langkah berikutnya yang jelas.",
      "TRACKED": "DILACAK",
      "Filter status": "Filter status",
      "All statuses": "Semua status",
      "Queued": "Dalam antrean",
      "Running": "Berjalan",
      "Completed": "Selesai",
      "Failed": "Gagal",
      "Cancelled": "Dibatalkan",
      "LOAD MORE SCANS": "MUAT PEMINDAIAN LAINNYA",
      "Run due checks": "Jalankan pemeriksaan jatuh tempo",
      "Tracked contracts": "Kontrak yang dilacak",
      "Scheduled monitoring": "Pemantauan terjadwal",
      "Loading passports…": "Memuat paspor…",
      "Settings sections": "Bagian pengaturan",
      "Scan live contract": "Pindai kontrak live",
      "Run demo scan": "Jalankan pemindaian demo",
      "Clear address": "Hapus alamat",
      "Network telemetry": "Telemetri jaringan",
      "Monitoring status legend": "Legenda status pemantauan",
      "Helpful scan signals": "Sinyal pemindaian yang membantu",
      "ANALYSIS IN PROGRESS": "ANALISIS SEDANG BERLANGSUNG",
      "Building a forensic snapshot.": "Membangun snapshot forensik.",
      "Available evidence is preserved as returned. No fallback values are being substituted.": "Bukti yang tersedia dipertahankan sesuai hasil yang diterima. Tidak ada nilai pengganti yang disisipkan.",
      "Cancel scan": "Batalkan pemindaian",
      "Report sections": "Bagian laporan",
      "Your forensic report is available inside the authenticated workspace.": "Laporan forensik Anda tersedia di dalam workspace terautentikasi.",
      "Your name": "Nama Anda",
      "Save profile": "Simpan profil",
      "Change password": "Ubah kata sandi",
      "Active sessions": "Sesi aktif",
      "Workspace name": "Nama workspace",
      "Save workspace": "Simpan workspace",
      "TEAM MEMBERS": "ANGGOTA TIM",
      "People with access": "Orang yang memiliki akses",
      "Member": "Anggota",
      "Owner": "Pemilik",
      "Invite": "Undang",
      "Plan and usage": "Paket dan penggunaan",
      "Current plan": "Paket saat ini",
      "Workspace type": "Jenis workspace",
      "Billing status": "Status penagihan",
      "Managed by workspace owner": "Dikelola oleh pemilik workspace",
      "Your data controls": "Kontrol data Anda",
      "Export my scan data": "Ekspor data pemindaian saya",
      "Request account deletion": "Minta penghapusan akun",
      "Active workspace": "Workspace aktif",
      "ADVANCED REPORT INTELLIGENCE": "INTELIJEN LAPORAN LANJUTAN",
      "Risk Trajectory": "Lintasan Risiko",
      "Price": "Harga",
      "holders": "holder",
      "days": "hari",
      "hr": "jam",
      "pts": "poin",
      "failed": "gagal",
      "terminal": "terminal",
      "ACTIVE": "AKTIF",
      "OPEN": "TERBUKA",
      "UNAVAILABLE": "TIDAK TERSEDIA",
      "UNKNOWN": "TIDAK DIKETAHUI",
      "Soon": "Segera",
      "Sign out": "Keluar",
      "Sign in →": "Masuk →",
      "Platform Ops →": "Operasi Platform →"
    }
  };

  const attributeTranslations = {
    "you@example.com": "anda@contoh.com",
    "Your name": "Nama Anda",
    "colleague@example.com": "kolega@contoh.com",
    "Contract address...": "Alamat kontrak...",
    "Solana contract address...": "Alamat kontrak Solana...",
    "Select workspace": "Pilih workspace",
    "Clear address": "Hapus alamat",
    "Search platform inventory…": "Cari inventaris platform…"
  };

  const requestedLocale = new URLSearchParams(window.location.search).get("lang");
  let locale = requestedLocale || localStorage.getItem("joben-locale") || "en";
  if (!translations[locale]) locale = "en";

  function translateText(value) {
    const trimmed = value.trim();
    if (!trimmed) return value;
    let translated = translations[locale]?.[trimmed] || trimmed;
    if (locale === "id") {
      translated = translated
        .replace(/^(\d[\d.,]*) ACTIVE$/, "$1 AKTIF")
        .replace(/^(\d[\d.,]*) OPEN$/, "$1 TERBUKA")
        .replace(/^(\d[\d.,]*) holders$/, "$1 holder")
        .replace(/^(\d[\d.,]*) failed · (\d[\d.,]*) terminal$/, "$1 gagal · $2 terminal")
        .replace(/^avg (.+) ms$/, "rata-rata $1 ms")
        .replace(/^(\d[\d.,]*) hr$/, "$1 jam")
        .replace(/^(\d[\d.,]*) days$/, "$1 hari")
        .replace(/^(\d[\d.,]*) pts$/, "$1 poin");
    }
    return value.replace(trimmed, translated);
  }

  function translate(root = document) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (node.parentElement?.closest("script,style")) return;
      if (!node.__jobenSource) node.__jobenSource = node.nodeValue;
      node.nodeValue = translateText(node.__jobenSource);
    });

    root.querySelectorAll?.("*").forEach((element) => {
      ["placeholder", "aria-label", "title"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        element.__jobenAttributes ||= {};
        element.__jobenAttributes[attribute] ||= element.getAttribute(attribute);
        const source = element.__jobenAttributes[attribute];
        const translated = translations[locale]?.[source] || attributeTranslations[source] || source;
        element.setAttribute(attribute, translated);
      });
    });
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.textContent = locale === "id" ? "EN" : "ID";
      button.setAttribute("aria-label", locale === "id" ? "Switch to English" : "Beralih ke Bahasa Indonesia");
      button.setAttribute("title", locale === "id" ? "Switch to English" : "Beralih ke Bahasa Indonesia");
    });
  }

  function setLocale(nextLocale) {
    locale = translations[nextLocale] ? nextLocale : "en";
    localStorage.setItem("joben-locale", locale);
    translate();
    document.title = locale === "id" ? "JOBEN NETWORK — Intelijen Kontrak" : "JOBEN NETWORK — Contract Intelligence";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = locale === "id"
      ? "JOBEN NETWORK — analisis forensik kontrak kripto berbasis bukti."
      : "JOBEN NETWORK — evidence-based crypto contract forensic analysis.";
    window.dispatchEvent(new CustomEvent("joben:locale-change", { detail: { locale } }));
  }

  window.JobenI18n = {
    get locale() { return locale; },
    setLocale,
    t: (value) => translateText(String(value)),
    formatNumber: (value, options) => Number(value).toLocaleString(locale === "id" ? "id-ID" : "en-US", options),
    formatDate: (value, options) => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", options).format(new Date(value))
  };

  document.querySelectorAll("[data-language-toggle]").forEach((button) => {
    button.addEventListener("click", () => setLocale(locale === "id" ? "en" : "id"));
  });
  translate();
  document.title = locale === "id" ? "JOBEN NETWORK — Intelijen Kontrak" : "JOBEN NETWORK — Contract Intelligence";
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = locale === "id"
    ? "JOBEN NETWORK — analisis forensik kontrak kripto berbasis bukti."
    : "JOBEN NETWORK — evidence-based crypto contract forensic analysis.";
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) translate(node);
    }));
  }).observe(document.body, { childList: true, subtree: true });
})();