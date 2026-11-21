/**
 * Core Financial Calculation Engine (Pure ES Module)
 * Handles Unitization / NAV metrics and IPOT Indonesia buy/sell fee breakdown.
 * No DOM or global state access — safe for zero, negative, empty, NaN, and Infinity inputs.
 */

function safeFinite(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Compute portfolio NAV, unitization, benchmark alpha, and dividend metrics.
 * @param {object} portfolioState
 */
export function computeMetrics(portfolioState) {
  const safeState = portfolioState && typeof portfolioState === "object" ? portfolioState : {};
  const meta = safeState.meta && typeof safeState.meta === "object" ? safeState.meta : {};
  const mutations = Array.isArray(safeState.mutations) ? safeState.mutations : [];
  const holdings = Array.isArray(safeState.holdings) ? safeState.holdings : [];
  const benchmark = safeState.benchmark && typeof safeState.benchmark === "object" ? safeState.benchmark : {};
  const dividends = Array.isArray(safeState.dividends) ? safeState.dividends : [];

  const initCap = safeFinite(meta.initialCapital, 0);
  const rawInitNav = safeFinite(meta.initialNav, 1000);
  const initNav = rawInitNav > 0 ? rawInitNav : 1000;
  const rawInitUnits = safeFinite(meta.initialUnits, 0);
  const initUnits = rawInitUnits > 0 ? rawInitUnits : (initNav > 0 ? initCap / initNav : 0);

  let totalUnits = initUnits;
  let totalPaidInCapital = initCap;

  for (const mut of mutations) {
    if (!mut || typeof mut !== "object") continue;
    const delta = safeFinite(mut.unitsDelta, 0);
    const amt = safeFinite(mut.amount, 0);
    if (mut.type === "TOPUP") {
      totalUnits += delta;
      totalPaidInCapital += amt;
    } else {
      totalUnits -= Math.abs(delta);
      totalPaidInCapital -= Math.abs(amt);
    }
  }
  if (!Number.isFinite(totalUnits) || totalUnits <= 0) totalUnits = 1;

  let stockCostTotal = 0;
  let stockValTotal = 0;
  for (const h of holdings) {
    if (!h || typeof h !== "object") continue;
    const sh = safeFinite(h.shares, 0);
    const avg = safeFinite(h.avgPrice, 0);
    const cur = safeFinite(h.currentPrice, 0);
    stockCostTotal += sh * avg;
    stockValTotal += sh * cur;
  }

  const cashBalance = safeFinite(safeState.cash, 0);
  const totalCost = stockCostTotal + cashBalance;
  const totalValuation = stockValTotal + cashBalance;
  const currentNav = totalUnits > 0 ? totalValuation / totalUnits : 0;
  const ytdReturnPct = initNav > 0 ? ((currentNav - initNav) / initNav) * 100 : 0;

  const rawIhsgStart = safeFinite(benchmark.ihsgStart, 0);
  const ihsgStart = rawIhsgStart > 0 ? rawIhsgStart : 1;
  const ihsgEnd = safeFinite(benchmark.ihsgEnd, 0) || ihsgStart;

  const rawLq45Start = safeFinite(benchmark.lq45Start, 0);
  const lq45Start = rawLq45Start > 0 ? rawLq45Start : 1;
  const lq45End = safeFinite(benchmark.lq45End, 0) || lq45Start;

  const ihsgReturnPct = ((ihsgEnd - ihsgStart) / ihsgStart) * 100;
  const lq45ReturnPct = ((lq45End - lq45Start) / lq45Start) * 100;

  const alphaIhsg = ytdReturnPct - ihsgReturnPct;
  const alphaLq45 = ytdReturnPct - lq45ReturnPct;

  const totalDividendsReceived = dividends.reduce(
    (s, d) => s + (d && typeof d === "object" ? safeFinite(d.amount, 0) : 0),
    0
  );

  return {
    initCap,
    initNav,
    initUnits,
    totalUnits,
    totalPaidInCapital,
    stockCostTotal,
    stockValTotal,
    cashBalance,
    totalCost,
    totalValuation,
    currentNav,
    ytdReturnPct,
    ihsgReturnPct,
    lq45ReturnPct,
    alphaIhsg,
    alphaLq45,
    totalDividendsReceived
  };
}

/**
 * Calculate IPOT Indonesia buy fee breakdown.
 * @param {number} tradeAmount
 * @param {number} [allInPct=0.19]
 */
export function calculateIPOTBuyFee(tradeAmount, allInPct = 0.19) {
  const gross = Math.max(0, safeFinite(tradeAmount, 0));
  const pct = safeFinite(allInPct, 0);
  if (gross <= 0 || pct <= 0) {
    return {
      tradeAmount: gross,
      brokerFee: 0,
      levyFee: 0,
      kpeiFee: 0,
      dpp: 0,
      vat12: 0,
      totalFee: 0,
      netAmount: gross
    };
  }
  const levyFee = gross * 0.0003;
  const kpeiFee = gross * 0.0001;
  const totalFee = gross * (pct / 100);
  const brokerPlusVat = Math.max(0, totalFee - levyFee - kpeiFee);
  const brokerFee = brokerPlusVat / 1.11;
  const dpp = brokerFee * (11 / 12);
  const vat12 = dpp * 0.12;
  return {
    tradeAmount: gross,
    brokerFee,
    levyFee,
    kpeiFee,
    dpp,
    vat12,
    totalFee,
    netAmount: gross + totalFee
  };
}

/**
 * Calculate IPOT Indonesia sell fee breakdown.
 * @param {number} tradeAmount
 * @param {number} [allInPct=0.29]
 */
export function calculateIPOTSellFee(tradeAmount, allInPct = 0.29) {
  const gross = Math.max(0, safeFinite(tradeAmount, 0));
  const pct = safeFinite(allInPct, 0);
  if (gross <= 0 || pct <= 0) {
    return {
      tradeAmount: gross,
      brokerFee: 0,
      levyFee: 0,
      kpeiFee: 0,
      vat12: 0,
      salesTax: 0,
      totalFee: 0,
      netProceeds: gross
    };
  }
  const levyFee = gross * 0.0003;
  const kpeiFee = gross * 0.0001;
  const salesTax = gross * 0.001;
  const totalFee = gross * (pct / 100);
  const brokerPlusVat = Math.max(0, totalFee - levyFee - kpeiFee - salesTax);
  const brokerFee = brokerPlusVat / 1.11;
  const dpp = brokerFee * (11 / 12);
  const vat12 = dpp * 0.12;
  return {
    tradeAmount: gross,
    brokerFee,
    levyFee,
    kpeiFee,
    vat12,
    salesTax,
    totalFee,
    netProceeds: Math.max(0, gross - totalFee)
  };
}
