import {
  computeMetrics,
  calculateIPOTBuyFee,
  calculateIPOTSellFee,
  computeAllTimeMetrics,
  computeRebalancePlan
} from "../js/nav-engine.js";
import { getInitialTemplateData, mergeWithDefaults } from "../js/state.js";

// =========================================================================
// Minimal Zero-Dependency Browser Test Runner
// =========================================================================
const suites = [];
let currentSuite = null;

function describe(name, fn) {
  currentSuite = { name, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

function test(name, fn) {
  if (!currentSuite) throw new Error("test() must be called inside describe()");
  currentSuite.tests.push({ name, fn });
}

function assertEqual(actual, expected, msg = "") {
  if (actual !== expected) {
    throw new Error(`${msg ? msg + " — " : ""}Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertApprox(actual, expected, tolerance = 1e-4, msg = "") {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg ? msg + " — " : ""}Expected ~${expected} (±${tolerance}), got ${actual}`);
  }
}

function assertTrue(cond, msg = "Expected condition to be truthy") {
  if (!cond) throw new Error(msg);
}

// =========================================================================
// SEAM 1: computeMetrics(state)
// =========================================================================
describe("Seam 1: computeMetrics(state)", () => {
  test("computes accurate NAV, units, valuation, and YTD return on normal portfolio", () => {
    const sample = {
      meta: { initialCapital: 100_000_000, initialNav: 1000, initialUnits: 100_000 },
      cash: 10_000_000,
      holdings: [
        { ticker: "BBCA", shares: 10000, avgPrice: 9000, currentPrice: 10000 }
      ],
      mutations: [
        { type: "TOPUP", amount: 10_000_000, unitsDelta: 10_000 },
        { type: "WITHDRAW", amount: 5_000_000, unitsDelta: 5_000 }
      ],
      dividends: [{ amount: 2_500_000 }],
      benchmark: { ihsgStart: 7000, ihsgEnd: 7350, lq45Start: 900, lq45End: 945 }
    };
    const m = computeMetrics(sample);
    assertEqual(m.totalUnits, 105_000, "totalUnits");
    assertEqual(m.totalPaidInCapital, 105_000_000, "totalPaidInCapital");
    assertEqual(m.stockValTotal, 100_000_000, "stockValTotal");
    assertEqual(m.totalValuation, 110_000_000, "totalValuation");
    assertApprox(m.currentNav, 110_000_000 / 105_000, 1e-6, "currentNav");
    assertApprox(m.ihsgReturnPct, 5.0, 1e-6, "ihsgReturnPct");
    assertEqual(m.totalDividendsReceived, 2_500_000, "totalDividendsReceived");
  });

  test("handles zero units, full withdrawal, empty/null inputs without NaN or Infinity", () => {
    const empty = computeMetrics(null);
    assertTrue(Number.isFinite(empty.currentNav), "empty currentNav finite");
    assertEqual(empty.totalValuation, 0, "empty valuation");
    assertEqual(empty.ytdReturnPct, 0, "empty ytdReturnPct");

    const fullWithdraw = computeMetrics({
      meta: { initialCapital: 10_000_000, initialNav: 1000, initialUnits: 10_000 },
      cash: 0,
      holdings: [{ shares: NaN, avgPrice: Infinity, currentPrice: "bad" }],
      mutations: [{ type: "WITHDRAW", amount: 15_000_000, unitsDelta: 15_000 }],
      benchmark: { ihsgStart: 0, ihsgEnd: 0, lq45Start: -10, lq45End: 0 }
    });
    assertEqual(fullWithdraw.totalUnits, 0, "clamped units to 0");
    assertEqual(fullWithdraw.currentNav, 0, "nav is 0 on zero valuation & zero units");
    assertEqual(fullWithdraw.ytdReturnPct, 0, "ytdReturnPct safe on zero units");
    assertTrue(Number.isFinite(fullWithdraw.alphaIhsg), "alphaIhsg finite");
  });
});

// =========================================================================
// SEAM 2: calculateIPOTBuyFee & calculateIPOTSellFee
// =========================================================================
describe("Seam 2: IPOT Buy & Sell Fee Calculations", () => {
  test("computes default IPOT buy fee (0.19%) with broker, levy, KPEI, DPP & VAT12", () => {
    const res = calculateIPOTBuyFee(10_000_000, 0.19);
    assertApprox(res.totalFee, 19_000, 1e-4, "totalFee");
    assertApprox(res.netAmount, 10_019_000, 1e-4, "netAmount");
    assertApprox(res.levyFee, 3_000, 1e-4, "levyFee");
    assertApprox(res.kpeiFee, 1_000, 1e-4, "kpeiFee");
    assertApprox(res.brokerFee + res.vat12 + res.levyFee + res.kpeiFee, res.totalFee, 1e-4, "component sum matches totalFee");
  });

  test("computes default IPOT sell fee (0.29%) including 0.1% final sales tax", () => {
    const res = calculateIPOTSellFee(10_000_000, 0.29);
    assertApprox(res.totalFee, 29_000, 1e-4, "totalFee");
    assertApprox(res.salesTax, 10_000, 1e-4, "salesTax");
    assertApprox(res.netProceeds, 9_971_000, 1e-4, "netProceeds");
    assertApprox(res.brokerFee + res.vat12 + res.levyFee + res.kpeiFee + res.salesTax, res.totalFee, 1e-4, "sell component sum");
  });

  test("handles zero and negative trade amounts safely", () => {
    const buyZero = calculateIPOTBuyFee(-5000, 0.19);
    assertEqual(buyZero.totalFee, 0, "buy negative fee 0");
    assertEqual(buyZero.netAmount, 0, "buy negative netAmount 0");

    const sellZero = calculateIPOTSellFee(0, 0.29);
    assertEqual(sellZero.totalFee, 0, "sell zero fee 0");
    assertEqual(sellZero.netProceeds, 0, "sell zero netProceeds 0");
  });
});

// =========================================================================
// SEAM 3: mergeWithDefaults(raw)
// =========================================================================
describe("Seam 3: mergeWithDefaults(raw) Backward Compatibility", () => {
  test("normalizes legacy holdings without targetWeight to default 0 and clamps invalid values", () => {
    const legacy = {
      cash: 500_000,
      holdings: [
        { ticker: "bbca", lots: 5, avg: 8000, price: 9000 },
        { ticker: "BBRI", shares: 1000, avgPrice: 4000, currentPrice: 4500, targetWeight: 150 },
        { ticker: "TLKM", shares: 1000, avgPrice: 3000, currentPrice: 3100, targetWeight: -20 }
      ]
    };
    const merged = mergeWithDefaults(legacy, "2026-11-22");
    assertEqual(merged.holdings.length, 3, "holding count");
    assertEqual(merged.holdings[0].ticker, "BBCA", "uppercased ticker");
    assertEqual(merged.holdings[0].shares, 500, "lots converted to shares");
    assertEqual(merged.holdings[0].targetWeight, 0, "legacy missing targetWeight defaults to 0");
    assertEqual(merged.holdings[1].targetWeight, 100, "targetWeight clamped to max 100");
    assertEqual(merged.holdings[2].targetWeight, 0, "targetWeight clamped to min 0");
  });

  test("returns valid default template on corrupted or null input", () => {
    const res = mergeWithDefaults({ payload: "{invalid-json" });
    assertTrue(Array.isArray(res.holdings) && res.holdings.length > 0, "fallback holdings present");
    assertTrue(res.holdings.every((h) => typeof h.targetWeight === "number"), "all holdings have numeric targetWeight");
  });

  test("sanitizes malicious id/ticker payloads to prevent inline-handler DOM XSS", () => {
    const malicious = {
      holdings: [{ id: "x');alert(1);//", ticker: "BBCA');alert(1)//", shares: 100, avgPrice: 5000, currentPrice: 5000 }],
      dividends: [{ id: "d'\"<>()", ticker: "BBRI<script>", amount: 1000 }],
      dividendSchedules: { __proto__: { dps: 999 }, constructor: { dps: 999 } }
    };
    const merged = mergeWithDefaults(malicious, "2026-11-22");
    assertTrue(!/['"()<>\\/]/.test(merged.holdings[0].id), "holding id stripped of XSS chars");
    assertTrue(!/['"()<>\\/]/.test(merged.holdings[0].ticker), "holding ticker stripped of XSS chars");
    assertTrue(!/['"()<>\\/]/.test(merged.dividends[0].id), "dividend id stripped of XSS chars");
    assertTrue(!Object.prototype.hasOwnProperty.call(merged.dividendSchedules, "CONSTRUCTOR"), "prototype keys blocked");
  });
});

// =========================================================================
// SEAM 4: computeAllTimeMetrics(state, metrics)
// =========================================================================
describe("Seam 4: computeAllTimeMetrics(state, metrics)", () => {
  test("computes All-Time Capital Gain, Total Return with Dividends, and Multi-Year CAGR", () => {
    const sample = {
      meta: { initialCapital: 100_000_000, initialNav: 1000, initialUnits: 100_000, activeYear: 2025 },
      cash: 20_000_000,
      holdings: [{ ticker: "BBCA", shares: 10000, avgPrice: 8000, currentPrice: 12000 }],
      mutations: [],
      dividends: [{ amount: 10_000_000 }],
      benchmark: { ihsgStart: 7000, ihsgEnd: 7700, lq45Start: 900, lq45End: 945 },
      annualHistory: [
        { year: 2023, portfolio: 20, ihsg: 10, lq45: 5, topUp: 50_000_000 },
        { year: 2024, portfolio: 10, ihsg: 5, lq45: 2, topUp: 30_000_000 },
        { year: 2025, portfolio: 10, ihsg: 10, lq45: 5, topUp: 20_000_000 }
      ]
    };
    const m = computeMetrics(sample);
    const allTime = computeAllTimeMetrics(sample, m);

    assertEqual(allTime.allTimePaidIn, 100_000_000, "allTimePaidIn");
    assertEqual(allTime.allTimeCapitalGain, 40_000_000, "allTimeCapitalGain (140M - 100M)");
    assertApprox(allTime.allTimeCapitalGainPct, 40.0, 1e-4, "allTimeCapitalGainPct");
    assertEqual(allTime.allTimeTotalReturn, 50_000_000, "allTimeTotalReturn (+10M div)");
    assertApprox(allTime.allTimeTotalReturnPct, 50.0, 1e-4, "allTimeTotalReturnPct");

    // Compound factor = 1.2 * 1.1 * 1.1 = 1.452 -> CAGR = (1.452^(1/3) - 1) * 100 = 13.2371%
    const expectedCagr = (Math.pow(1.2 * 1.1 * 1.1, 1 / 3) - 1) * 100;
    assertEqual(allTime.yearsCount, 3, "yearsCount");
    assertApprox(allTime.cagrPct, expectedCagr, 1e-4, "cagrPct");
    assertTrue(allTime.cagrAlphaIhsg > 0, "positive CAGR alpha vs IHSG");
  });

  test("handles empty history and zero paid-in safely without NaN", () => {
    const emptyState = { meta: { activeYear: 2026 }, cash: 0, holdings: [], mutations: [], dividends: [], annualHistory: [] };
    const allTime = computeAllTimeMetrics(emptyState);
    assertEqual(allTime.allTimeCapitalGain, 0, "zero gain");
    assertEqual(allTime.cagrPct, 0, "zero cagr");
    assertTrue(Number.isFinite(allTime.allTimeTotalReturnPct), "finite totalReturnPct");
  });
});

// =========================================================================
// SEAM 5: computeRebalancePlan(holdings, metrics)
// =========================================================================
describe("Seam 5: computeRebalancePlan(holdings, metrics)", () => {
  test("computes BUY / SELL / HOLD lot recommendations accurately", () => {
    const holdings = [
      { id: "h1", ticker: "BBRI", name: "BRI", shares: 1000, currentPrice: 5000, targetWeight: 60 }, // Val 5M (50%) -> Target 6M -> +1M = +2 Lot
      { id: "h2", ticker: "TLKM", name: "Telkom", shares: 2000, currentPrice: 2500, targetWeight: 30 } // Val 5M (50%) -> Target 3M -> -2M = -8 Lot
    ];
    const metrics = { totalValuation: 10_000_000, cashBalance: 0 };
    const plan = computeRebalancePlan(holdings, metrics);

    assertEqual(plan.totalTargetWeight, 90, "totalTargetWeight");
    assertEqual(plan.impliedCashTargetPct, 10, "impliedCashTargetPct");
    assertEqual(plan.isOverAllocated, false, "not over-allocated");

    const bbri = plan.items[0];
    assertEqual(bbri.action, "BUY", "BBRI action BUY");
    assertEqual(bbri.suggestedLots, 2, "BBRI +2 lot");
    assertApprox(bbri.driftPct, -10, 1e-4, "BBRI drift -10%");

    const tlkm = plan.items[1];
    assertEqual(tlkm.action, "SELL", "TLKM action SELL");
    assertEqual(tlkm.suggestedLots, -8, "TLKM -8 lot");
    assertApprox(tlkm.driftPct, 20, 1e-4, "TLKM drift +20%");
  });

  test("handles zero currentPrice, zero valuation, and over-100% target gracefully", () => {
    const holdings = [
      { id: "h1", ticker: "ZERO", shares: 100, currentPrice: 0, targetWeight: 70 },
      { id: "h2", ticker: "OVER", shares: 100, currentPrice: 1000, targetWeight: 50 }
    ];
    const plan = computeRebalancePlan(holdings, { totalValuation: 0 });
    assertEqual(plan.isOverAllocated, true, "over-allocated detected");
    assertEqual(plan.items[0].suggestedLots, 0, "zero price -> 0 lots");
    assertEqual(plan.items[0].action, "HOLD", "zero price -> HOLD");
    assertTrue(Number.isFinite(plan.items[0].driftPct), "finite drift");
  });
});

// =========================================================================
// Execute & Render Results
// =========================================================================
const resultsEl = document.getElementById("test-results");
const summaryEl = document.getElementById("test-summary");

let passed = 0;
let failed = 0;

for (const suite of suites) {
  const suiteEl = document.createElement("section");
  suiteEl.className = "suite";
  const titleEl = document.createElement("div");
  titleEl.className = "suite-title";
  titleEl.textContent = suite.name;
  suiteEl.appendChild(titleEl);

  for (const t of suite.tests) {
    const row = document.createElement("div");
    row.className = "test-row";
    const left = document.createElement("div");
    left.textContent = t.name;

    const badge = document.createElement("span");
    try {
      t.fn();
      passed++;
      badge.className = "badge pass";
      badge.textContent = "PASS";
    } catch (err) {
      failed++;
      badge.className = "badge fail";
      badge.textContent = "FAIL";
      const errDiv = document.createElement("div");
      errDiv.className = "err";
      errDiv.textContent = err?.message || String(err);
      left.appendChild(errDiv);
    }

    row.appendChild(left);
    row.appendChild(badge);
    suiteEl.appendChild(row);
  }

  resultsEl.appendChild(suiteEl);
}

const total = passed + failed;
summaryEl.textContent = failed === 0 ? `ALL PASS (${passed}/${total})` : `FAILED (${passed}/${total} passed, ${failed} failed)`;
summaryEl.className = `summary ${failed === 0 ? "pass" : "fail"}`;
window.__TEST_RESULTS__ = { passed, failed, total };
