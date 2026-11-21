import { computeMetrics as computeMetricsEngine } from "./nav-engine.js";
import {
  getInitialTemplateData,
  mergeWithDefaults,
  ensureYearStructureForState
} from "./state.js";
import {
  getEmitenColorFromHoldings,
  getJakartaTimeInfo,
  getTodayISO,
  getLatestTradingDateWIB,
  loadInitialState,
  saveStateToLocalStorage,
  createCloudSyncController
} from "./storage.js";
import {
  formatUnixMarketDateWIB,
  formatIsoDateLabelWIB,
  fetchMarketQuotes
} from "./market.js";
import { createPortfolioUI } from "./ui/portfolio.js";
import { createDividendsUI } from "./ui/dividends.js";
import { createMutationsUI } from "./ui/mutations.js";
import { createAnalyticsUI } from "./ui/analytics.js";
import { createJournalUI } from "./ui/journal.js";
import { createCalculatorUI } from "./ui/calculator.js";

// =========================================================================
// 1. GLOBAL RUNTIME STATE & RENDER CACHE
// =========================================================================
let activeTab = "portfolio";
let isMarketSyncing = false;
const charts = {};
let state = loadInitialState();

let stateVersion = 1;
const renderedTabVersion = {};
let cachedMetricsVersion = 0;
let cachedMetricsResult = null;

function invalidateRenderCache() {
  stateVersion += 1;
}

function renderIconsIn(rootEl = null) {
  if (!window.lucide || typeof window.lucide.createIcons !== "function") return;
  try {
    if (rootEl instanceof HTMLElement) {
      const hasUnrendered = rootEl.querySelector("i[data-lucide]");
      if (!hasUnrendered) return;
    }
    window.lucide.createIcons();
  } catch (e) {
    window.lucide.createIcons();
  }
}

// =========================================================================
// 2. CORE WRAPPERS & CLOUD SYNC
// =========================================================================
const computeMetrics = () => {
  if (cachedMetricsVersion === stateVersion && cachedMetricsResult) {
    return cachedMetricsResult;
  }
  cachedMetricsResult = computeMetricsEngine(state);
  cachedMetricsVersion = stateVersion;
  return cachedMetricsResult;
};
const getEmitenColor = (ticker) => getEmitenColorFromHoldings(ticker, state.holdings);
const ensureYearStructure = (year) => ensureYearStructureForState(state, year);
const saveToLocalStorage = () => saveStateToLocalStorage(state);

const cloudSync = createCloudSyncController({
  getState: () => state,
  setState: (incoming) => {
    state = incoming;
    invalidateRenderCache();
  },
  onRemoteUpdate: () => window.renderAll({ force: true }),
  onConnected: ({ userId }) => {
    const statusText = document.getElementById("cloud-status-text");
    if (statusText) statusText.textContent = "Cloud Sync Aktif";
    const modalStatus = document.getElementById("modal-cloud-status");
    if (modalStatus) modalStatus.textContent = "Cloud Sync Terhubung";
    const modalUid = document.getElementById("modal-cloud-userid");
    if (modalUid) modalUid.textContent = userId;
  }
});
const saveToCloudIfAvailable = () => cloudSync.save();
const initCloudStorage = () => cloudSync.init();

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  const bgClass =
    type === "error"
      ? "bg-rose-600 text-white"
      : type === "warning"
      ? "bg-amber-500 text-slate-950"
      : "bg-slate-900 dark:bg-emerald-600 text-white";
  toast.className = `pointer-events-auto px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all duration-300 ${bgClass}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function commitStateChange(toastMsg = null) {
  invalidateRenderCache();
  saveToLocalStorage();
  saveToCloudIfAvailable();
  window.renderAll({ force: false });
  if (toastMsg) showToast(toastMsg, "success");
}

// =========================================================================
// 3. MARKET AUTO-SYNC UI & SCHEDULER
// =========================================================================
function updateMarketSyncStatusUI() {
  const jkt = getJakartaTimeInfo();
  const clockEl = document.getElementById("market-wib-clock");
  if (clockEl) {
    clockEl.textContent = `${jkt.dateStr} ${jkt.timeStr} WIB (${jkt.isAfterMarketClose ? "Market Closed" : "Bursa Aktif"})`;
  }

  const toggleEl = document.getElementById("toggle-auto-market-sync");
  if (toggleEl) {
    toggleEl.checked = state.marketSync.autoSyncAfterClose !== false;
  }

  const badgeEl = document.getElementById("market-sync-badge");
  const dotEl = document.getElementById("market-sync-dot");
  const statusText = document.getElementById("market-sync-status-text");
  if (!statusText || isMarketSyncing) return;

  if (state.marketSync.lastSyncError) {
    if (badgeEl) {
      badgeEl.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300";
    }
    if (dotEl) dotEl.className = "w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0";
    statusText.textContent = state.marketSync.lastSyncError;
  } else if (state.marketSync.lastSyncAt) {
    if (badgeEl) {
      badgeEl.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
    }
    if (dotEl) dotEl.className = "w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0";
    const dt = new Date(state.marketSync.lastSyncAt);
    const timeFmt = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(dt);
    const cleanSource = String(state.marketSync.lastSyncSource || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    statusText.textContent = `Terakhir Sync: ${timeFmt} WIB${cleanSource ? ` • ${cleanSource}` : ""}`;
  } else {
    if (badgeEl) {
      badgeEl.className = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300";
    }
    if (dotEl) dotEl.className = "w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0";
    statusText.textContent = "Belum pernah Sync Real — klik tombol Sync Harga & IHSG untuk verifikasi harga bursa";
  }
}

window.toggleAutoMarketSync = function (enabled) {
  state.marketSync.autoSyncAfterClose = !!enabled;
  saveToLocalStorage();
  saveToCloudIfAvailable();
  showToast(enabled ? "Auto-Sync setelah Market Close (16:15 WIB) aktif" : "Auto-Sync otomatis dinonaktifkan");
};

window.syncMarketData = async function ({ force = false, silent = false } = {}) {
  if (isMarketSyncing) return;
  isMarketSyncing = true;

  const btn = document.getElementById("btn-sync-market");
  const icon = document.getElementById("icon-sync-market");
  const label = document.getElementById("label-sync-market");
  const statusText = document.getElementById("market-sync-status-text");

  if (btn) btn.disabled = true;
  if (icon) icon.classList.add("animate-spin");
  if (label) label.textContent = "Menyinkronkan...";
  if (statusText) statusText.textContent = "Mengambil harga saham BEI, IHSG & LQ45...";

  let updatedStocks = 0;
  let updatedIndices = 0;
  let sourceProviderLabel = "IDX Real";

  try {
    const jktNow = getJakartaTimeInfo();
    const isoNow = new Date().toISOString();
    const latestSessionWIB = getLatestTradingDateWIB();
    const latestSessionLabel = formatIsoDateLabelWIB(latestSessionWIB) || jktNow.dateStr;

    const tickers = state.holdings.map((h) => h.ticker.toUpperCase().trim());
    const marketSnapshot = await fetchMarketQuotes(tickers);
    sourceProviderLabel = marketSnapshot.sourceProviderLabel;

    for (const h of state.holdings) {
      const ticker = h.ticker.toUpperCase().trim();
      const quote = marketSnapshot.stockQuotes[ticker];
      if (quote && quote.price > 0) {
        const roundedPrice = Math.round(quote.price);
        const mktDateInfo = formatUnixMarketDateWIB(quote.lastTs);

        h.currentPrice = roundedPrice;
        if (quote.prevClose > 0) h.prevClose = Math.round(quote.prevClose);
        h.priceUpdatedAt = isoNow;
        h.priceUpdatedDateWIB = jktNow.dateStr;
        h.marketDateWIB = mktDateInfo?.dateWIB || latestSessionWIB;
        h.marketDateLabel = mktDateInfo?.labelWIB || latestSessionLabel;
        h.priceSource = "SYNC";
        updatedStocks++;
      }
    }

    if (marketSnapshot.ihsgQuote && marketSnapshot.ihsgQuote.price > 0) {
      state.benchmark.ihsgEnd = Number(marketSnapshot.ihsgQuote.price.toFixed(2));
      updatedIndices++;
    }

    if (marketSnapshot.lq45Quote && marketSnapshot.lq45Quote.price > 0) {
      state.benchmark.lq45End = Number(marketSnapshot.lq45Quote.price.toFixed(2));
      updatedIndices++;
    }

    if (updatedStocks > 0 || updatedIndices > 0) {
      state.marketSync.lastSyncAt = isoNow;
      state.marketSync.lastSyncDateWIB = jktNow.dateStr;
      state.marketSync.lastSyncError = null;
      state.marketSync.lastSyncSource = `${sourceProviderLabel} • ${updatedStocks}/${state.holdings.length} emiten`;

      const activeYr = Number(state.meta.activeYear) || jktNow.year;
      ensureYearStructure(activeYr);
      const m = computeMetrics();
      const moIdx = jktNow.monthIndex;
      const row = state.monthlyHistoryByYear[activeYr]?.[moIdx];
      if (row) {
        row.portfolio = Number(m.ytdReturnPct.toFixed(4));
        row.ihsg = Number(m.ihsgReturnPct.toFixed(4));
        row.lq45 = Number(m.lq45ReturnPct.toFixed(4));
      }
      const ann = state.annualHistory.find((a) => Number(a.year) === activeYr);
      if (ann) {
        ann.portfolio = Number(m.ytdReturnPct.toFixed(4));
        ann.ihsg = Number(m.ihsgReturnPct.toFixed(4));
        ann.lq45 = Number(m.lq45ReturnPct.toFixed(4));
      }

      saveToLocalStorage();
      saveToCloudIfAvailable();
      if (!silent) {
        showToast(`Sync berhasil: ${updatedStocks}/${state.holdings.length} saham terverifikasi`);
      }
    } else {
      state.marketSync.lastSyncError = "Gagal menjangkau server data bursa — periksa koneksi internet Anda";
      if (!silent) {
        showToast("Gagal mengambil data harga bursa. Coba lagi beberapa saat.", "error");
      }
    }
  } catch (err) {
    console.error("Sync market error:", err);
    state.marketSync.lastSyncError = "Terjadi gangguan koneksi saat sinkronisasi harga";
    if (!silent) showToast("Gagal menyinkronkan harga pasar.", "error");
  } finally {
    isMarketSyncing = false;
    if (btn) btn.disabled = false;
    if (icon) icon.classList.remove("animate-spin");
    if (label) label.textContent = "Sync Harga & IHSG";
    invalidateRenderCache();
    window.renderAll({ force: false });
  }
};

function scheduleDailyMarketCloseSync() {
  setInterval(() => {
    updateMarketSyncStatusUI();
    const jkt = getJakartaTimeInfo();
    if (
      state.marketSync.autoSyncAfterClose !== false &&
      !jkt.isWeekend &&
      jkt.isAfterMarketClose &&
      state.marketSync.lastSyncDateWIB !== jkt.dateStr &&
      !isMarketSyncing
    ) {
      window.syncMarketData({ silent: true });
    }
  }, 60000);
}

// =========================================================================
// 4. TAB NAVIGATION, THEME & SHARED MODALS
// =========================================================================
window.switchTab = function (tabName) {
  activeTab = tabName;
  document.querySelectorAll(".tab-panel").forEach((el) => el.classList.add("hidden"));
  const panel = document.getElementById(`tab-panel-${tabName}`);
  if (panel) panel.classList.remove("hidden");

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.className =
      "tab-btn flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white";
  });
  const activeBtn = document.getElementById(`tab-btn-${tabName}`);
  if (activeBtn) {
    activeBtn.className =
      "tab-btn flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all bg-emerald-600 text-white shadow-sm shadow-emerald-600/20";
  }

  if (renderedTabVersion[tabName] === stateVersion) {
    updateMarketSyncStatusUI();
    return;
  }

  window.renderAll({ force: false });
};

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("flex");
  renderIconsIn(el);
}

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
};

window.toggleTheme = function () {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("portfolio_nav_theme", isDark ? "dark" : "light");
  invalidateRenderCache();
  window.renderAll({ force: false });
};

function askConfirm(title, message, onConfirm) {
  document.getElementById("confirm-title").textContent = title;
  document.getElementById("confirm-message").textContent = message;
  const okBtn = document.getElementById("confirm-ok-btn");
  okBtn.onclick = () => {
    window.closeModal("modal-confirm");
    onConfirm();
  };
  openModal("modal-confirm");
}

// =========================================================================
// 5. JSON EXPORT / IMPORT / RESET / CLOUD MODAL
// =========================================================================
window.exportJSON = function () {
  try {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-nav-backup-${getTodayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("File backup JSON berhasil diunduh");
  } catch (e) {
    showToast("Gagal mengekspor JSON", "error");
  }
};

window.openImportModal = function () {
  const fb = document.getElementById("import-feedback-box");
  if (fb) fb.classList.add("hidden");
  const ta = document.getElementById("import-json-textarea");
  if (ta) ta.value = "";
  const fileInp = document.getElementById("import-json-file-input");
  if (fileInp) fileInp.value = "";
  openModal("modal-import");
};

window.triggerImportFilePicker = function () {
  const inp = document.getElementById("import-json-file-input");
  if (inp) inp.click();
};

function showImportFeedback(msg, isError = true) {
  const fb = document.getElementById("import-feedback-box");
  if (!fb) return;
  fb.classList.remove("hidden");
  fb.className = isError
    ? "p-3 rounded-xl border text-xs leading-relaxed bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300"
    : "p-3 rounded-xl border text-xs leading-relaxed bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
  fb.textContent = msg;
}

function applyImportedJSONText(rawText) {
  const cleaned = String(rawText || "").replace(/^\uFEFF/, "").trim();
  if (!cleaned) {
    showImportFeedback("Isi file atau teks JSON masih kosong.");
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    showImportFeedback(`Format JSON tidak valid: ${err.message}`);
    return;
  }

  if (!parsed || typeof parsed !== "object") {
    showImportFeedback("Struktur data JSON tidak dikenali sebagai backup portofolio.");
    return;
  }

  const normalized = mergeWithDefaults(parsed);
  state = normalized;
  window.closeModal("modal-import");
  commitStateChange(`Data berhasil dipulihkan (${state.holdings.length} emiten)`);
}

window.handleImportFileSelected = function (event) {
  const file = event.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => applyImportedJSONText(ev.target?.result);
  reader.onerror = () => showImportFeedback("Gagal membaca file dari perangkat.");
  reader.readAsText(file);
};

window.handleImportFileDrop = function (event) {
  event.preventDefault();
  const dz = document.getElementById("import-dropzone");
  if (dz) dz.classList.remove("border-sky-500", "bg-sky-500/10");
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => applyImportedJSONText(ev.target?.result);
  reader.onerror = () => showImportFeedback("Gagal membaca file yang ditarik.");
  reader.readAsText(file);
};

window.handleImportPasteSubmit = function (event) {
  event.preventDefault();
  const raw = document.getElementById("import-json-textarea")?.value || "";
  applyImportedJSONText(raw);
};

window.copyCurrentJSONToClipboard = function () {
  const ta = document.getElementById("import-json-textarea");
  if (!ta) return;
  ta.value = JSON.stringify(state, null, 2);
  ta.select();
  try {
    document.execCommand("copy");
    showImportFeedback("JSON portofolio saat ini disalin ke kotak teks & clipboard.", false);
  } catch (e) {
    showImportFeedback("JSON ditampilkan di kotak teks di bawah.", false);
  }
};

window.confirmResetTemplate = function () {
  askConfirm(
    "Reset ke Data Awal Template?",
    "Seluruh perubahan lokal akan diganti kembali dengan data awal bawaan template.",
    () => {
      state = getInitialTemplateData();
      commitStateChange("Data portofolio dikembalikan ke template awal");
    }
  );
};

window.openCloudModal = function () {
  openModal("modal-cloud");
};

// =========================================================================
// 6. UI MODULE WIRING & MASTER RENDER ORCHESTRATOR
// =========================================================================
const appContext = {
  getState: () => state,
  setState: (nextState) => {
    state = nextState;
    invalidateRenderCache();
  },
  charts,
  computeMetrics,
  commitStateChange,
  showToast,
  openModal,
  closeModal: (id) => window.closeModal(id),
  askConfirm,
  getEmitenColor,
  ensureYearStructure
};

const { renderPortfolioTab } = createPortfolioUI(appContext);
const { renderDividendsTab } = createDividendsUI(appContext);
const { renderMutationsTab } = createMutationsUI(appContext);
const { renderAnalyticsTab } = createAnalyticsUI(appContext);
const { renderJournalTab } = createJournalUI(appContext);
const { renderCalculatorTab } = createCalculatorUI(appContext);

window.renderAll = function ({ force = true } = {}) {
  if (force) {
    invalidateRenderCache();
  }
  updateMarketSyncStatusUI();
  if (activeTab === "portfolio") renderPortfolioTab();
  else if (activeTab === "dividends") renderDividendsTab();
  else if (activeTab === "mutations") renderMutationsTab();
  else if (activeTab === "analytics") renderAnalyticsTab();
  else if (activeTab === "journal") renderJournalTab();
  else if (activeTab === "calculator") renderCalculatorTab();

  renderedTabVersion[activeTab] = stateVersion;

  const activePanel = document.getElementById(`tab-panel-${activeTab}`);
  renderIconsIn(activePanel);
};

function initApp() {
  const today = getTodayISO();
  ["mut-date", "sell-date", "div-date", "mj-date"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = today;
  });

  renderIconsIn(document.body);
  window.renderAll({ force: false });
  scheduleDailyMarketCloseSync();
  initCloudStorage();

  const jkt = getJakartaTimeInfo();
  if (
    state.marketSync.autoSyncAfterClose !== false &&
    !jkt.isWeekend &&
    jkt.isAfterMarketClose &&
    state.marketSync.lastSyncDateWIB !== jkt.dateStr
  ) {
    window.syncMarketData({ silent: true });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
