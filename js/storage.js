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

// =========================================================================
// INDONESIAN (id-ID) NUMBER INPUT PARSER & LIVE AUTO-FORMATTER
// =========================================================================

export function parseIDNumber(raw, mode = "dec") {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  let s = String(raw ?? "").trim();
  if (!s || s === "-" || s === "+") return 0;

  const sign = s.startsWith("-") ? -1 : 1;
  s = s.replace(/^[+-]/, "").trim();

  if (mode === "int" || mode === "signed-int") {
    if (s.includes(",")) {
      s = s.split(",")[0].replace(/\D/g, "");
    } else if ((s.match(/\./g) || []).length > 1 || /^[1-9]\d{0,2}\.\d{3}$/.test(s)) {
      s = s.replace(/\D/g, "");
    } else {
      return sign * Math.round(Number(s.replace(/[^\d.]/g, "")) || 0);
    }
    return sign * (Number(s) || 0);
  }

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  } else if ((s.match(/\./g) || []).length > 1) {
    s = s.replace(/\./g, "").replace(/\D/g, "");
  } else if (/^[1-9]\d{0,2}\.\d{3}$/.test(s)) {
    s = s.replace(".", "");
  } else {
    s = s.replace(/[^\d.]/g, "");
  }

  const num = Number(s);
  return Number.isFinite(num) ? sign * num : 0;
}

export function formatIDInputValue(val, mode = "int", maxDecimals = 2, minDecimals = 0) {
  if (val === "" || val === null || val === undefined) return "";
  const n = typeof val === "number" ? val : parseIDNumber(val, mode);
  if (!Number.isFinite(n)) return "";
  const isInt = mode === "int" || mode === "signed-int" || maxDecimals <= 0;
  if (isInt) return Math.round(n).toLocaleString("id-ID");
  return n.toLocaleString("id-ID", {
    minimumFractionDigits: Math.max(0, Math.min(minDecimals, maxDecimals)),
    maximumFractionDigits: Math.max(0, maxDecimals)
  });
}

export function formatLiveIDString(rawStr, mode = "int", maxDecimals = 2) {
  const s = String(rawStr ?? "");
  if (!s) return "";
  const allowNeg = mode === "signed-int" || mode === "signed-dec";
  const isNeg = allowNeg && s.trim().startsWith("-");
  const isInt = mode === "int" || mode === "signed-int" || maxDecimals <= 0;

  if (isInt) {
    const digits = s.replace(/\D/g, "");
    if (!digits) return isNeg ? "-" : "";
    const norm = digits.replace(/^0+(?=\d)/, "");
    return (isNeg ? "-" : "") + norm.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  const parts = s.split(",");
  const intDigits = parts[0].replace(/\D/g, "");
  const hasComma = parts.length > 1;
  const decDigits = hasComma ? parts.slice(1).join("").replace(/\D/g, "").slice(0, maxDecimals) : "";

  if (!intDigits && !hasComma) return isNeg ? "-" : "";
  const normInt = (intDigits || "0").replace(/^0+(?=\d)/, "");
  const fmtInt = normInt.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (isNeg ? "-" : "") + fmtInt + (hasComma ? "," + decDigits : "");
}

export function getNumInput(idOrEl, fallback = 0) {
  const el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return fallback;
  const raw = String(el.value ?? "").trim();
  if (!raw || raw === "-") return fallback;
  const mode = el.dataset?.numInput || "dec";
  const parsed = parseIDNumber(raw, mode);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function setNumInput(idOrEl, val, minDecimals = 0) {
  const el = typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  if (!el) return;
  if (val === "" || val === null || val === undefined) {
    el.value = "";
    return;
  }
  const mode = el.dataset?.numInput || "int";
  const maxDec = Number(el.dataset?.numDecimals ?? (mode.includes("int") ? 0 : 2));
  const minDec = Number(el.dataset?.numMinDecimals ?? minDecimals);
  el.value = formatIDInputValue(val, mode, maxDec, minDec);
}

export function syncNumInputs(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll("input[data-num-input]").forEach((el) => {
    if (document.activeElement === el) return;
    const raw = String(el.value ?? "").trim();
    if (!raw) return;
    setNumInput(el, raw);
  });
}

let liveNumInputsInitialized = false;
export function initLiveNumberInputs() {
  if (liveNumInputsInitialized || typeof document === "undefined") return;
  liveNumInputsInitialized = true;

  // Step over thousand-separator '.' on Backspace/Delete so 1 keypress deletes the digit
  document.addEventListener(
    "keydown",
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || !el.dataset.numInput) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === null || start !== end) return;
      if (e.key === "Backspace" && start > 0 && el.value[start - 1] === ".") {
        el.setSelectionRange(start - 1, start);
      } else if (e.key === "Delete" && start < el.value.length && el.value[start] === ".") {
        el.setSelectionRange(start, start + 1);
      }
    },
    true
  );

  // Capture-phase live formatting so el.value is formatted before inline oninput="..." runs
  document.addEventListener(
    "input",
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLInputElement) || !el.dataset.numInput) return;
      const mode = el.dataset.numInput;
      const maxDec = Number(el.dataset.numDecimals ?? (mode.includes("int") ? 0 : 2));
      const isDec = !mode.includes("int") && maxDec > 0;

      let val = el.value;
      let caret = el.selectionStart ?? val.length;

      // Convert newly typed '.' (e.g. numpad decimal key) into ',' on decimal inputs
      if (isDec && e.data === "." && caret > 0 && val[caret - 1] === ".") {
        val = val.slice(0, caret - 1) + "," + val.slice(caret);
      } else if (isDec && e.inputType === "insertFromPaste" && !val.includes(",") && (val.match(/\./g) || []).length === 1) {
        if (!/^[+-]?[1-9]\d{0,2}\.\d{3}$/.test(val.trim())) {
          val = val.replace(".", ",");
        }
      }

      const leftSlice = val.slice(0, caret);
      const meaningfulLeftCount = (leftSlice.match(/[\d,-]/g) || []).length;

      const formatted = formatLiveIDString(val, mode, maxDec);
      if (formatted === el.value) return;

      el.value = formatted;

      // Restore caret after the same count of meaningful chars (digits, ',', '-')
      let newCaret = 0;
      let seen = 0;
      while (newCaret < formatted.length && seen < meaningfulLeftCount) {
        if (/[\d,-]/.test(formatted[newCaret])) seen++;
        newCaret++;
      }
      try {
        el.setSelectionRange(newCaret, newCaret);
      } catch {
        // Ignore if input type does not support selection range
      }
    },
    true
  );

  syncNumInputs(document);
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
