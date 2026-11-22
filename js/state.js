// =========================================================================
// Portfolio NAV Tracker — Constants, Presets & State Schema Normalizer
// Pure ES Module (zero DOM & zero circular dependencies)
// =========================================================================

export const STORAGE_KEY = "portfolio_nav_tracker_favo_v1";
export const TEMPLATE_REV_KEY = "portfolio_nav_tracker_template_rev";
export const TEMPLATE_REV = "2026-11-22_1";

export const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export const MONTH_SHORT_ID = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGU", "SEP", "OKT", "NOV", "DES"
];

export const EMITEN_PALETTE = [
  "#10b981", "#38bdf8", "#f59e0b", "#6366f1", "#ec4899",
  "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16"
];

export const DIVIDEND_PRESETS = {
  BBRI: { payouts: [{ month: 3, dps: 209 }, { month: 11, dps: 137 }] },
  BMRI: { payouts: [{ month: 4, dps: 376.96 }, { month: 0, dps: 100 }] },
  BBCA: { payouts: [{ month: 2, dps: 281 }, { month: 11, dps: 55 }] },
  BBNI: { payouts: [{ month: 2, dps: 349.41 }] },
  ASII: { payouts: [{ month: 4, dps: 292 }, { month: 9, dps: 98 }] },
  ADRO: { payouts: [{ month: 3, dps: 118.26 }, { month: 11, dps: 145.14 }] },
  ITMG: { payouts: [{ month: 3, dps: 1747 }, { month: 10, dps: 1228 }] },
  PTBA: { payouts: [{ month: 5, dps: 397 }] },
  TLKM: { payouts: [{ month: 5, dps: 223.17 }] },
  UNTR: { payouts: [{ month: 4, dps: 1569 }, { month: 9, dps: 667 }] },
  INDF: { payouts: [{ month: 6, dps: 290 }] },
  ICBP: { payouts: [{ month: 6, dps: 200 }] },
  BJTM: { payouts: [{ month: 4, dps: 54.4 }] },
  BJBR: { payouts: [{ month: 4, dps: 95.05 }] },
  BNGA: { payouts: [{ month: 4, dps: 122.6 }] },
  NISP: { payouts: [{ month: 3, dps: 72 }] },
  PGAS: { payouts: [{ month: 5, dps: 148 }] },
  SIDO: { payouts: [{ month: 4, dps: 18 }, { month: 10, dps: 18 }] }
};

export const TEMPLATE_DEFAULT_PRICES = {
  BBRI: 3050,
  BMRI: 3900,
  TLKM: 2120,
  BBNI: 3560,
  INDF: 7175,
  ASII: 5375,
  BBCA: 5625,
  ADRO: 2330
};

function getDefaultTodayWIB() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function getInitialTemplateData() {
  return {
    meta: {
      portfolioName: "Portofolio Saham — Favo Perdana (Unit System)",
      initialCapital: 211094375,
      initialNav: 1199.7646972697,
      initialUnits: 175946.4797,
      activeYear: 2026,
      owner: "Favo Perdana",
      currentUnits: 222450,
      currentNav: 1130.9663,
      initialUnitPrice: 1199.7647,
      ihsgStart: 8646.94,
      ihsgEnd: 5344.41,
      lq45Start: 846.57,
      lq45End: 550.37,
      reconciledWithSheet: true
    },
    cash: 219473,
    holdings: [
      {
        id: "h-bbri",
        ticker: "BBRI",
        name: "Bank Rakyat Indonesia Tbk",
        shares: 30006,
        avgPrice: 3478.2312,
        currentPrice: 3050,
        prevClose: 3040,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      },
      {
        id: "h-bmri",
        ticker: "BMRI",
        name: "Bank Mandiri (Persero) Tbk",
        shares: 10400,
        avgPrice: 4222.2381,
        currentPrice: 3900,
        prevClose: 3920,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      },
      {
        id: "h-tlkm",
        ticker: "TLKM",
        name: "Telkom Indonesia (Persero) Tbk",
        shares: 8500,
        avgPrice: 3607.8884,
        currentPrice: 2120,
        prevClose: 2150,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      },
      {
        id: "h-bbni",
        ticker: "BBNI",
        name: "Bank Negara Indonesia Tbk",
        shares: 1000,
        avgPrice: 3843.9005,
        currentPrice: 3560,
        prevClose: 3570,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      },
      {
        id: "h-indf",
        ticker: "INDF",
        name: "Indofood Sukses Makmur Tbk",
        shares: 7500,
        avgPrice: 6531.0527,
        currentPrice: 7175,
        prevClose: 7150,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      },
      {
        id: "h-asii",
        ticker: "ASII",
        name: "Astra International Tbk",
        shares: 4500,
        avgPrice: 4965.9736,
        currentPrice: 5375,
        prevClose: 5500,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      },
      {
        id: "h-bbca",
        ticker: "BBCA",
        name: "Bank Central Asia Tbk",
        shares: 2500,
        avgPrice: 7102.189,
        currentPrice: 5625,
        prevClose: 5750,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      },
      {
        id: "h-1794653926420",
        ticker: "ADRO",
        name: "Alamtri Resources Indonesia Tbk.",
        shares: 2500,
        avgPrice: 2484.712,
        currentPrice: 2330,
        prevClose: 2360,
        priceUpdatedAt: "2026-11-19T09:06:19.090Z",
        priceUpdatedDateWIB: "2026-11-19",
        marketDateWIB: "2026-11-19",
        marketDateLabel: "19 Nov",
        priceSource: "SYNC",
        targetWeight: 0
      }
    ],
    mutations: [
      { id: "m-01", date: "2026-01-15", type: "TOPUP", amount: 2005000, navAtTime: 1199.764697, unitsDelta: 1671.161024, note: "Top Up Januari 2026" },
      { id: "m-02", date: "2026-02-15", type: "TOPUP", amount: 2000000, navAtTime: 1221, unitsDelta: 1638.001638, note: "Top Up Februari 2026" },
      { id: "m-03", date: "2026-03-15", type: "TOPUP", amount: 6000000, navAtTime: 1221, unitsDelta: 4914.004914, note: "Top Up Maret 2026" },
      { id: "m-04", date: "2026-04-15", type: "TOPUP", amount: 3000000, navAtTime: 1113.000008, unitsDelta: 2695.417771, note: "Top Up April 2026" },
      { id: "m-05", date: "2026-05-15", type: "TOPUP", amount: 12000000, navAtTime: 1091.000003, unitsDelta: 10999.083375, note: "Top Up Mei 2026" },
      { id: "m-06", date: "2026-06-15", type: "TOPUP", amount: 10500000, navAtTime: 1114.000001, unitsDelta: 9425.493709, note: "Top Up Juni 2026" },
      { id: "m-07", date: "2026-07-15", type: "TOPUP", amount: 10500000, navAtTime: 1199.000012, unitsDelta: 8757.297664, note: "Top Up Juli 2026" },
      { id: "m-08", date: "2026-08-15", type: "TOPUP", amount: 2500000, navAtTime: 1155.999982, unitsDelta: 2162.629792, note: "Top Up Agustus 2026" },
      { id: "m-09", date: "2026-09-15", type: "TOPUP", amount: 2500000, navAtTime: 1233.00002, unitsDelta: 2027.574988, note: "Top Up September 2026" },
      { id: "m-10", date: "2026-10-15", type: "TOPUP", amount: 2500000, navAtTime: 1129.762013, unitsDelta: 2212.855425, note: "Top Up Oktober 2026" }
    ],
    dividends: [],
    dividendSchedules: JSON.parse(JSON.stringify(DIVIDEND_PRESETS)),
    journal: [],
    benchmark: {
      ihsgStart: 8646.94,
      ihsgEnd: 5181.14,
      lq45Start: 846.57,
      lq45End: 538.43
    },
    monthlyHistoryByYear: {
      2026: [
        { monthIndex: 0, month: "JAN", portfolio: 0.410185, ihsg: -3.669853, lq45: -1.539152 },
        { monthIndex: 1, month: "FEB", portfolio: 1.778683, ihsg: -4.758331, lq45: -1.442291 },
        { monthIndex: 2, month: "MAR", portfolio: -7.407588, ihsg: -18.488853, lq45: -15.445858 },
        { monthIndex: 3, month: "APR", portfolio: -11.430371, ihsg: -19.546105, lq45: -20.935067 },
        { monthIndex: 4, month: "MEI", portfolio: -9.948956, ihsg: -29.138169, lq45: -27.806324 },
        { monthIndex: 5, month: "JUN", portfolio: -16.907871, ihsg: -34.737722, lq45: -34.664588 },
        { monthIndex: 6, month: "JUL", portfolio: -3.64708, ihsg: -27.880614, lq45: -26.616818 },
        { monthIndex: 7, month: "AGU", portfolio: -0.023077, ihsg: -24.534228, lq45: -23.948404 },
        { monthIndex: 8, month: "SEP", portfolio: -6.182446, ihsg: -29.788573, lq45: -28.98638 },
        { monthIndex: 9, month: "OKT", portfolio: -13.322818, ihsg: -41.516305, lq45: -39.146202 },
        { monthIndex: 10, month: "NOV", portfolio: -5.6663, ihsg: -40.0812, lq45: -36.3986 },
        { monthIndex: 11, month: "DES", portfolio: null, ihsg: null, lq45: null }
      ]
    },
    annualHistory: [
      { year: 2020, portfolio: null, ihsg: null, lq45: null, topUp: 9015000 },
      { year: 2021, portfolio: null, ihsg: null, lq45: null, topUp: 8100000 },
      { year: 2022, portfolio: null, ihsg: null, lq45: null, topUp: 36500000 },
      { year: 2023, portfolio: 18.951136, ihsg: 6.16, lq45: 3.56, topUp: 23100000 },
      { year: 2024, portfolio: -5.260968, ihsg: -2.65, lq45: -14.83, topUp: 41300000 },
      { year: 2025, portfolio: 6.462961, ihsg: 22.13, lq45: 2.41, topUp: 29500000 },
      { year: 2026, portfolio: -5.6663, ihsg: -40.0812, lq45: -36.3986, topUp: 53505000 }
    ],
    marketSync: {
      autoSyncAfterClose: true,
      lastSyncAt: "2026-11-19T09:06:19.090Z",
      lastSyncDateWIB: "2026-11-19",
      lastSyncSource: "TradingView IDX • 8/8 emiten",
      lastSyncError: null
    }
  };
}

function sanitizeId(rawId, fallback) {
  const cleaned = String(rawId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return cleaned || fallback;
}

function sanitizeTicker(rawTicker) {
  return String(rawTicker || "").toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
}

const FORBIDDEN_KEYS = new Set(["__PROTO__", "CONSTRUCTOR", "PROTOTYPE"]);

export function mergeWithDefaults(raw, fallbackDate = getDefaultTodayWIB()) {
  const def = getInitialTemplateData();
  if (!raw || typeof raw !== "object") return def;

  let source = raw;
  if (typeof source.payload === "string") {
    try {
      source = JSON.parse(source.payload);
    } catch {
      return def;
    }
  } else if (source.data && typeof source.data === "object" && !Array.isArray(source.data)) {
    source = source.data;
  } else if (source.state && typeof source.state === "object" && !Array.isArray(source.state)) {
    source = source.state;
  } else if (Array.isArray(source)) {
    source = { holdings: source };
  }

  if (!source || typeof source !== "object") return def;

  const rawMeta = source.meta && typeof source.meta === "object" ? source.meta : {};
  const initCap = Number(rawMeta.initialCapital) > 0 ? Number(rawMeta.initialCapital) : def.meta.initialCapital;
  const initNav = Number(rawMeta.initialNav) > 0 ? Number(rawMeta.initialNav) : def.meta.initialNav;
  const initUnits = Number(rawMeta.initialUnits) > 0 ? Number(rawMeta.initialUnits) : (initCap / initNav);
  const activeYear = Number(rawMeta.activeYear) >= 2000 ? Number(rawMeta.activeYear) : def.meta.activeYear;

  const meta = {
    title: String(rawMeta.title || def.meta.title).slice(0, 120),
    currency: "IDR",
    initialCapital: initCap,
    initialNav: initNav,
    initialUnits: initUnits,
    activeYear
  };

  const parsedCash = Number(source.cash);
  const cash = Number.isFinite(parsedCash) && parsedCash >= 0 ? parsedCash : def.cash;

  const rawHoldings = Array.isArray(source.holdings) ? source.holdings : def.holdings;
  const sanitizedHoldings = rawHoldings
    .filter((h) => h && typeof h === "object")
    .map((h, idx) => {
      const ticker = sanitizeTicker(h.ticker || h.code || h.symbol || "");
      const shares = Math.max(
        0,
        h.shares != null
          ? Number(h.shares) || 0
          : (h.lots != null ? (Number(h.lots) || 0) * 100 : 0)
      );
      const avgPrice = Math.max(0, Number(h.avgPrice ?? h.averagePrice ?? h.avg ?? 0) || 0);
      const currentPrice = Math.max(0, Number(h.currentPrice ?? h.price ?? h.lastPrice ?? avgPrice) || 0);
      const prevClose = Math.max(0, Number(h.prevClose) || 0);
      const rawTargetWeight = Number(h.targetWeight);
      const targetWeight = Number.isFinite(rawTargetWeight)
        ? Math.min(100, Math.max(0, rawTargetWeight))
        : 0;

      const copy = {
        id: sanitizeId(h.id, `h-${ticker || "item"}-${idx}-${Date.now()}`),
        ticker,
        name: String(h.name || h.companyName || (ticker ? `${ticker} Tbk` : "Emiten")).slice(0, 120),
        sector: h.sector ? String(h.sector).slice(0, 80) : undefined,
        shares,
        avgPrice,
        currentPrice,
        prevClose,
        targetWeight,
        priceUpdatedAt: h.priceUpdatedAt ? String(h.priceUpdatedAt).slice(0, 40) : undefined,
        priceUpdatedDateWIB: h.priceUpdatedDateWIB ? String(h.priceUpdatedDateWIB).slice(0, 20) : undefined,
        marketDateWIB: h.marketDateWIB ? String(h.marketDateWIB).slice(0, 20) : undefined,
        marketDateLabel: h.marketDateLabel ? String(h.marketDateLabel).slice(0, 30) : undefined,
        priceSource: ["SYNC", "MANUAL", "TRX"].includes(h.priceSource) ? h.priceSource : undefined,
        lastSyncStatus: ["LIVE", "CACHE"].includes(h.lastSyncStatus) ? h.lastSyncStatus : undefined
      };

      if (copy.priceSource !== "SYNC" && TEMPLATE_DEFAULT_PRICES[ticker] === currentPrice) {
        delete copy.priceUpdatedAt;
        delete copy.priceUpdatedDateWIB;
        delete copy.priceSource;
        delete copy.marketDateLabel;
      }
      return copy;
    });

  const rawMutations = Array.isArray(source.mutations) ? source.mutations : def.mutations;
  const isOldFlatTemplate =
    rawMutations.length === 10 &&
    rawMutations.every((m, idx) => m && m.id === `m-0${idx + 1}`.slice(-4) && Math.abs(Number(m.navAtTime) - 1199.7646972697) < 0.0001);

  const mutations = (isOldFlatTemplate ? def.mutations : rawMutations)
    .filter((m) => m && typeof m === "object")
    .map((m, idx) => {
      const amount = Math.abs(Number(m.amount) || 0);
      const navAtTime = Number(m.navAtTime) > 0 ? Number(m.navAtTime) : initNav;
      const type = String(m.type || "TOPUP").toUpperCase() === "WITHDRAW" ? "WITHDRAW" : "TOPUP";
      const unitsDelta = Number(m.unitsDelta) || (navAtTime > 0 ? amount / navAtTime : 0);
      return {
        id: sanitizeId(m.id, `m-${idx}-${Date.now()}`),
        date: String(m.date || fallbackDate),
        type,
        amount,
        navAtTime,
        unitsDelta,
        note: String(m.note || "")
      };
    });

  const dividends = (Array.isArray(source.dividends) ? source.dividends : def.dividends)
    .filter((d) => d && typeof d === "object")
    .map((d, idx) => ({
      id: sanitizeId(d.id, `div-${idx}-${Date.now()}`),
      ticker: sanitizeTicker(d.ticker || ""),
      date: String(d.date || fallbackDate),
      amount: Number(d.amount) || 0,
      note: String(d.note || "Dividen Tunai")
    }));

  const rawSchedules = source.dividendSchedules && typeof source.dividendSchedules === "object"
    ? source.dividendSchedules
    : {};
  const dividendSchedules = { ...def.dividendSchedules };
  for (const [k, v] of Object.entries(rawSchedules)) {
    const key = sanitizeTicker(k);
    if (!key || FORBIDDEN_KEYS.has(key) || !v || typeof v !== "object") continue;
    if (Array.isArray(v.payouts)) {
      dividendSchedules[key] = {
        payouts: v.payouts.map((p) => ({
          month: Math.max(0, Math.min(11, Number(p.month) || 0)),
          dps: Math.max(0, Number(p.dps) || 0)
        }))
      };
    } else if (v.dps != null) {
      dividendSchedules[key] = {
        payouts: [{ month: Math.max(0, Math.min(11, Number(v.month) || 3)), dps: Math.max(0, Number(v.dps) || 0) }]
      };
    }
  }

  const journal = (Array.isArray(source.journal) ? source.journal : def.journal)
    .filter((j) => j && typeof j === "object")
    .map((j, idx) => ({
      id: sanitizeId(j.id, `j-${idx}-${Date.now()}`),
      date: String(j.date || fallbackDate),
      ticker: sanitizeTicker(j.ticker || ""),
      shares: Number(j.shares) || 0,
      avgCost: Number(j.avgCost) || 0,
      sellPrice: Number(j.sellPrice) || 0,
      netProceeds: Number(j.netProceeds) || 0,
      realizedPL: Number(j.realizedPL) || 0,
      realizedPLPct: Number(j.realizedPLPct) || 0,
      note: String(j.note || "")
    }));

  const rawBench = source.benchmark && typeof source.benchmark === "object" ? source.benchmark : {};
  const benchmark = {
    ihsgStart: Number.isFinite(Number(rawBench.ihsgStart)) ? Number(rawBench.ihsgStart) : def.benchmark.ihsgStart,
    ihsgEnd: Number.isFinite(Number(rawBench.ihsgEnd)) ? Number(rawBench.ihsgEnd) : def.benchmark.ihsgEnd,
    lq45Start: Number.isFinite(Number(rawBench.lq45Start)) ? Number(rawBench.lq45Start) : def.benchmark.lq45Start,
    lq45End: Number.isFinite(Number(rawBench.lq45End)) ? Number(rawBench.lq45End) : def.benchmark.lq45End
  };

  const monthlyHistoryByYear = {};
  const rawMonthlyMap = source.monthlyHistoryByYear && typeof source.monthlyHistoryByYear === "object" && !Array.isArray(source.monthlyHistoryByYear)
    ? source.monthlyHistoryByYear
    : (Array.isArray(source.monthlyHistory) ? { [activeYear]: source.monthlyHistory } : def.monthlyHistoryByYear);

  for (const [yrKey, rows] of Object.entries(rawMonthlyMap)) {
    const yrNum = Number(yrKey);
    if (!yrNum || !Array.isArray(rows)) continue;
    monthlyHistoryByYear[yrNum] = MONTH_SHORT_ID.map((mLabel, mIdx) => {
      const found = rows.find((r) => r && Number(r.monthIndex) === mIdx) || rows[mIdx] || {};
      return {
        monthIndex: mIdx,
        month: mLabel,
        portfolio: found.portfolio != null && found.portfolio !== "" && Number.isFinite(Number(found.portfolio)) ? Number(found.portfolio) : null,
        ihsg: found.ihsg != null && found.ihsg !== "" && Number.isFinite(Number(found.ihsg)) ? Number(found.ihsg) : null,
        lq45: found.lq45 != null && found.lq45 !== "" && Number.isFinite(Number(found.lq45)) ? Number(found.lq45) : null
      };
    });
  }
  if (Object.keys(monthlyHistoryByYear).length === 0) {
    Object.assign(monthlyHistoryByYear, def.monthlyHistoryByYear);
  }

  const rawAnnual = Array.isArray(source.annualHistory) ? source.annualHistory : [];
  const annualMap = new Map();
  for (const dItem of def.annualHistory) {
    annualMap.set(Number(dItem.year), { ...dItem });
  }
  for (const a of rawAnnual) {
    if (!a || typeof a !== "object") continue;
    const yr = Number(a.year);
    if (!yr || yr < 2000) continue;
    const base = annualMap.get(yr) || { year: yr, portfolio: null, ihsg: null, lq45: null, topUp: 0 };
    const parsedTopUp = Number(a.topUp ?? a.topup ?? a.modal);
    annualMap.set(yr, {
      year: yr,
      portfolio: a.portfolio != null && a.portfolio !== "" && Number.isFinite(Number(a.portfolio)) ? Number(a.portfolio) : base.portfolio,
      ihsg: a.ihsg != null && a.ihsg !== "" && Number.isFinite(Number(a.ihsg)) ? Number(a.ihsg) : base.ihsg,
      lq45: a.lq45 != null && a.lq45 !== "" && Number.isFinite(Number(a.lq45)) ? Number(a.lq45) : base.lq45,
      topUp: Number.isFinite(parsedTopUp) && parsedTopUp !== 0 ? parsedTopUp : base.topUp
    });
  }

  const mutYearTotals = {};
  for (const mut of mutations) {
    const mYr = Number(String(mut.date || "").slice(0, 4));
    if (mYr >= 2000) {
      mutYearTotals[mYr] = (mutYearTotals[mYr] || 0) + (mut.type === "TOPUP" ? Number(mut.amount) || 0 : -(Number(mut.amount) || 0));
    }
  }
  for (const [yrStr, netMut] of Object.entries(mutYearTotals)) {
    const yrNum = Number(yrStr);
    const existingAnn = annualMap.get(yrNum) || { year: yrNum, portfolio: null, ihsg: null, lq45: null, topUp: 0 };
    existingAnn.topUp = netMut;
    annualMap.set(yrNum, existingAnn);
  }

  const annualHistory = Array.from(annualMap.values()).sort((a, b) => a.year - b.year);

  return {
    meta,
    cash,
    holdings: sanitizedHoldings,
    mutations,
    dividends,
    dividendSchedules,
    journal,
    benchmark,
    monthlyHistoryByYear,
    annualHistory,
    marketSync: { ...def.marketSync, ...(source.marketSync && typeof source.marketSync === "object" ? source.marketSync : {}) }
  };
}

export function ensureYearStructureForState(portfolioState, year) {
  const yr = Number(year);
  if (!yr || yr < 2000 || !portfolioState) return;
  if (!portfolioState.monthlyHistoryByYear[yr]) {
    portfolioState.monthlyHistoryByYear[yr] = MONTH_SHORT_ID.map((mLabel, mIdx) => ({
      monthIndex: mIdx,
      month: mLabel,
      portfolio: null,
      ihsg: null,
      lq45: null
    }));
  }
  if (!portfolioState.annualHistory.some((a) => Number(a.year) === yr)) {
    portfolioState.annualHistory.push({ year: yr, portfolio: null, ihsg: null, lq45: null, topUp: 0 });
    portfolioState.annualHistory.sort((a, b) => a.year - b.year);
  }
}
