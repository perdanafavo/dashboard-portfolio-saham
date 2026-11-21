// =========================================================================
// Portfolio NAV Tracker — Formatters, WIB Timezone, localStorage & Cloud Sync
// Native ES Module (relative imports only for GitHub Pages & Vercel)
// =========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  STORAGE_KEY,
  TEMPLATE_REV_KEY,
  TEMPLATE_REV,
  EMITEN_PALETTE,
  getInitialTemplateData,
  mergeWithDefaults
} from "./state.js";

// =========================================================================
// FORMATTING & ANTI-XSS HELPERS
// =========================================================================

export function formatNum(val, decimals = 2) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatIDR(val) {
  const n = Math.round(Number(val) || 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}Rp ${Math.abs(n).toLocaleString("id-ID")}`;
}

export function formatSignedIDR(val) {
  const n = Math.round(Number(val) || 0);
  if (n > 0) return `+Rp ${n.toLocaleString("id-ID")}`;
  if (n < 0) return `-Rp ${Math.abs(n).toLocaleString("id-ID")}`;
  return "Rp 0";
}

export function formatCompactIDR(val) {
  const n = Number(val) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}Rp ${formatNum(abs / 1e9, 2)} M`;
  if (abs >= 1e6) return `${sign}Rp ${formatNum(abs / 1e6, 2)} Jt`;
  if (abs >= 1e3) return `${sign}Rp ${formatNum(abs / 1e3, 0)} Rb`;
  return `${sign}Rp ${Math.round(abs).toLocaleString("id-ID")}`;
}

export function formatPct(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return "0,00%";
  const sign = n > 0 ? "+" : "";
  return `${sign}${formatNum(n, 2)}%`;
}

export function colorClass(val) {
  const n = Number(val) || 0;
  if (n > 0) return "text-emerald-600 dark:text-emerald-400";
  if (n < 0) return "text-rose-600 dark:text-rose-400";
  return "text-slate-500 dark:text-slate-400";
}

export function escapeHTML(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getEmitenColorFromHoldings(ticker, holdings = []) {
  const idx = Array.isArray(holdings) ? holdings.findIndex((h) => h.ticker === ticker) : -1;
  if (idx >= 0) return EMITEN_PALETTE[idx % EMITEN_PALETTE.length];
  let hash = 0;
  const sym = String(ticker || "");
  for (let i = 0; i < sym.length; i++) hash = sym.charCodeAt(i) + ((hash << 5) - hash);
  return EMITEN_PALETTE[Math.abs(hash) % EMITEN_PALETTE.length];
}

// =========================================================================
// TIMEZONE (WIB) & PRICE FRESHNESS HELPERS
// =========================================================================

export function getJakartaTimeInfo() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const timeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short"
  }).format(now);

  const [yr, mo] = dateStr.split("-").map(Number);
  const [hr, min] = timeStr.split(":").map(Number);
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const isAfterMarketClose = isWeekend || hr > 16 || (hr === 16 && min >= 15);

  return {
    dateStr,
    timeStr,
    year: yr,
    monthIndex: Math.max(0, Math.min(11, (mo || 1) - 1)),
    isWeekend,
    isAfterMarketClose
  };
}

export function getTodayISO() {
  return getJakartaTimeInfo().dateStr;
}

export function getLatestTradingDateWIB() {
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    const probe = new Date(d.getTime() - i * 86400000);
    const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short" }).format(probe);
    if (wd !== "Sat" && wd !== "Sun") {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(probe);
    }
  }
  return getTodayISO();
}

export function getPriceFreshnessInfo(h) {
  const cur = Number(h.currentPrice) || 0;
  const prev = Number(h.prevClose) || 0;
  const changePct = prev > 0 ? ((cur - prev) / prev) * 100 : null;
  const latestSession = getLatestTradingDateWIB();

  if (h.priceSource === "SYNC") {
    const isFresh = h.marketDateWIB === latestSession || h.priceUpdatedDateWIB === getTodayISO();
    const dateTag = h.marketDateLabel || h.priceUpdatedDateWIB || "Bursa";
    return {
      status: isFresh ? "VERIFIED_SYNC" : "STALE_SYNC",
      label: `Real ${dateTag}`,
      tooltip: `Harga terverifikasi dari bursa (${dateTag})`,
      changePct
    };
  }
  if (h.priceSource === "MANUAL" || h.priceSource === "TRX") {
    return {
      status: "MANUAL",
      label: h.priceSource === "TRX" ? "Harga Trx" : `Manual ${h.priceUpdatedDateWIB || ""}`,
      tooltip: "Harga diperbarui manual / dari transaksi terakhir",
      changePct: null
    };
  }
  return {
    status: "UNVERIFIED",
    label: "Belum Sync Real",
    tooltip: "Klik Sync Harga & IHSG untuk memverifikasi harga penutupan bursa",
    changePct: null
  };
}

// =========================================================================
// LOCAL STORAGE & OPTIONAL FIREBASE CLOUD SYNC
// =========================================================================

export function loadInitialState() {
  try {
    const currentRev = localStorage.getItem(TEMPLATE_REV_KEY);
    if (currentRev !== TEMPLATE_REV) {
      const fresh = getInitialTemplateData();
      localStorage.setItem(TEMPLATE_REV_KEY, TEMPLATE_REV);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return mergeWithDefaults(JSON.parse(saved), getTodayISO());
    }
  } catch (e) {
    console.warn("Gagal membaca localStorage:", e);
  }
  return getInitialTemplateData();
}

export function saveStateToLocalStorage(portfolioState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolioState));
  } catch (e) {
    console.warn("Gagal menyimpan ke localStorage:", e);
  }
}

export function createCloudSyncController({ getState, setState, onRemoteUpdate, onConnected }) {
  let isCloudConnected = false;
  let cloudUserId = "local-browser";
  let db = null;
  let cloudDocRef = null;

  async function save() {
    if (!isCloudConnected || !cloudDocRef) return;
    try {
      await setDoc(
        cloudDocRef,
        { payload: JSON.stringify(getState()), updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {
      console.warn("Gagal sinkronisasi ke cloud:", e);
    }
  }

  async function init() {
    try {
      const firebaseConfig = globalThis.__firebase_config;
      if (typeof firebaseConfig === "undefined" || !firebaseConfig) return;
      const cfg = typeof firebaseConfig === "string" ? JSON.parse(firebaseConfig) : firebaseConfig;
      const app = initializeApp(cfg);
      const auth = getAuth(app);
      const initialAuthToken = globalThis.__initial_auth_token;
      if (typeof initialAuthToken !== "undefined" && initialAuthToken) {
        await signInWithCustomToken(auth, initialAuthToken);
      } else {
        await signInAnonymously(auth);
      }
      cloudUserId = auth.currentUser?.uid || "anonymous";
      db = getFirestore(app);
      const appId = typeof globalThis.__app_id !== "undefined" ? globalThis.__app_id : "portfolio-nav-tracker";
      cloudDocRef = doc(db, "artifacts", appId, "users", cloudUserId, "portfolio", "state");
      isCloudConnected = true;

      if (typeof onConnected === "function") {
        onConnected({ userId: cloudUserId });
      }

      onSnapshot(cloudDocRef, (snap) => {
        if (snap.exists() && snap.data()?.payload) {
          const incoming = mergeWithDefaults(snap.data(), getTodayISO());
          if (JSON.stringify(incoming) !== JSON.stringify(getState())) {
            setState(incoming);
            saveStateToLocalStorage(incoming);
            if (typeof onRemoteUpdate === "function") onRemoteUpdate(incoming);
          }
        }
      });
    } catch (e) {
      console.info("Berjalan dalam mode penyimpanan lokal browser.");
    }
  }

  return {
    init,
    save,
    isConnected: () => isCloudConnected,
    getUserId: () => cloudUserId
  };
}
