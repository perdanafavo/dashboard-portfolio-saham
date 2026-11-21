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
  if (!Number.isFinite(totalUnits) || totalUnits < 0) totalUnits = 0;

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
  const currentNav = totalUnits > 0 ? totalValuation / totalUnits : (totalValuation > 0 ? initNav : 0);
  const ytdReturnPct = totalUnits > 0 && initNav > 0 ? ((currentNav - initNav) / initNav) * 100 : 0;

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
  const totalFee = gross * (pct / 100);
  const rawLevy = gross * 0.0003;
  const rawKpei = gross * 0.0001;
  const fixedSum = rawLevy + rawKpei;
  const scale = fixedSum > 0 && totalFee < fixedSum ? totalFee / fixedSum : 1;
  const levyFee = rawLevy * scale;
  const kpeiFee = rawKpei * scale;
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
      dpp: 0,
      vat12: 0,
      salesTax: 0,
      totalFee: 0,
      netProceeds: gross
    };
  }
  const totalFee = gross * (pct / 100);
  const rawLevy = gross * 0.0003;
  const rawKpei = gross * 0.0001;
  const rawSalesTax = gross * 0.001;
  const fixedSum = rawLevy + rawKpei + rawSalesTax;
  const scale = fixedSum > 0 && totalFee < fixedSum ? totalFee / fixedSum : 1;
  const levyFee = rawLevy * scale;
  const kpeiFee = rawKpei * scale;
  const salesTax = rawSalesTax * scale;
  const brokerPlusVat = Math.max(0, totalFee - levyFee - kpeiFee - salesTax);
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
    salesTax,
    totalFee,
    netProceeds: Math.max(0, gross - totalFee)
  };
}

/**
 * Compute All-Time Capital Gain, Total Return (incl. Dividends), and Multi-Year CAGR.
 * Safe against empty history, zero capital, and negative compounding wipeouts.
 * @param {object} portfolioState
 * @param {object|null} [precomputedMetrics=null]
 */
export function computeAllTimeMetrics(portfolioState, precomputedMetrics = null) {
  const safeState = portfolioState && typeof portfolioState === "object" ? portfolioState : {};
  const metrics = precomputedMetrics || computeMetrics(safeState);
  const annualHistory = Array.isArray(safeState.annualHistory)
    ? [...safeState.annualHistory].filter((a) => a && typeof a === "object").sort((a, b) => Number(a.year) - Number(b.year))
    : [];
  const activeYear = Number(safeState.meta?.activeYear) || 0;

  const annualTopupSum = annualHistory.reduce((sum, a) => sum + safeFinite(a.topUp, 0), 0);
  const allTimePaidIn = annualTopupSum > 0 ? annualTopupSum : Math.max(0, safeFinite(metrics.totalPaidInCapital, 0));
  const totalValuation = Math.max(0, safeFinite(metrics.totalValuation, 0));
  const totalDividends = Math.max(0, safeFinite(metrics.totalDividendsReceived, 0));

  const allTimeCapitalGain = totalValuation - allTimePaidIn;
  const allTimeCapitalGainPct = allTimePaidIn > 0 ? (allTimeCapitalGain / allTimePaidIn) * 100 : 0;
  const allTimeTotalReturn = allTimeCapitalGain + totalDividends;
  const allTimeTotalReturnPct = allTimePaidIn > 0 ? (allTimeTotalReturn / allTimePaidIn) * 100 : 0;

  let portoFactor = 1;
  let yearsCount = 0;
  let startYear = null;
  let endYear = null;

  let ihsgFactor = 1;
  let ihsgYears = 0;

  for (const row of annualHistory) {
    const yr = Number(row.year);
    if (!Number.isFinite(yr) || yr < 1900) continue;

    let portoRet = row.portfolio !== null && row.portfolio !== undefined && row.portfolio !== ""
      ? Number(row.portfolio)
      : null;
    if (portoRet === null && yr === activeYear && Number.isFinite(metrics.ytdReturnPct)) {
      portoRet = metrics.ytdReturnPct;
    }

    if (portoRet !== null && Number.isFinite(portoRet)) {
      portoFactor *= Math.max(0, 1 + portoRet / 100);
      yearsCount += 1;
      if (startYear === null) startYear = yr;
      endYear = yr;
    }

    let ihsgRet = row.ihsg !== null && row.ihsg !== undefined && row.ihsg !== ""
      ? Number(row.ihsg)
      : null;
    if (ihsgRet === null && yr === activeYear && Number.isFinite(metrics.ihsgReturnPct)) {
      ihsgRet = metrics.ihsgReturnPct;
    }
    if (ihsgRet !== null && Number.isFinite(ihsgRet)) {
      ihsgFactor *= Math.max(0, 1 + ihsgRet / 100);
      ihsgYears += 1;
    }
  }

  const cumulativeTwrPct = yearsCount > 0 ? (portoFactor - 1) * 100 : 0;
  const cagrPct = yearsCount > 0 && portoFactor > 0
    ? (Math.pow(portoFactor, 1 / yearsCount) - 1) * 100
    : (yearsCount > 0 && portoFactor <= 0 ? -100 : 0);

  const ihsgCumulativePct = ihsgYears > 0 ? (ihsgFactor - 1) * 100 : 0;
  const ihsgCagrPct = ihsgYears > 0 && ihsgFactor > 0
    ? (Math.pow(ihsgFactor, 1 / ihsgYears) - 1) * 100
    : (ihsgYears > 0 && ihsgFactor <= 0 ? -100 : 0);

  return {
    allTimePaidIn,
    allTimeCapitalGain,
    allTimeCapitalGainPct,
    allTimeTotalReturn,
    allTimeTotalReturnPct,
    cumulativeTwrPct,
    cagrPct,
    yearsCount,
    startYear,
    endYear,
    ihsgCumulativePct,
    ihsgCagrPct,
    allTimeAlphaIhsg: cumulativeTwrPct - ihsgCumulativePct,
    cagrAlphaIhsg: cagrPct - ihsgCagrPct
  };
}

/**
 * Compute Target Allocation & Rebalancing Lot Plan.
 * Rounds trade recommendations to IDX lot size (1 lot = 100 shares).
 * @param {Array} holdings
 * @param {object} metrics
 */
export function computeRebalancePlan(holdings, metrics) {
  const safeHoldings = Array.isArray(holdings) ? holdings : [];
  const totalValuation = Math.max(0, safeFinite(metrics?.totalValuation, 0));

  let totalTargetWeight = 0;
  const items = [];

  for (const h of safeHoldings) {
    if (!h || typeof h !== "object") continue;
    const shares = Math.max(0, safeFinite(h.shares, 0));
    const currentPrice = Math.max(0, safeFinite(h.currentPrice, 0));
    const currentVal = shares * currentPrice;
    const actualWeight = totalValuation > 0 ? (currentVal / totalValuation) * 100 : 0;
    const targetWeight = Math.min(100, Math.max(0, safeFinite(h.targetWeight, 0)));
    totalTargetWeight += targetWeight;

    const driftPct = actualWeight - targetWeight;
    const targetVal = totalValuation > 0 ? (targetWeight / 100) * totalValuation : 0;
    const diffIDR = targetVal - currentVal;
    const lotPrice = currentPrice * 100;
    const ownedLots = Math.floor(shares / 100);

    let suggestedLots = 0;
    if (lotPrice > 0 && totalValuation > 0) {
      suggestedLots = Math.round(diffIDR / lotPrice);
      if (suggestedLots < -ownedLots) {
        suggestedLots = -ownedLots;
      }
    }
    if (suggestedLots === 0) suggestedLots = 0; // avoid -0

    let action = "HOLD";
    if (suggestedLots > 0) action = "BUY";
    else if (suggestedLots < 0) action = "SELL";

    items.push({
      id: h.id || "",
      ticker: String(h.ticker || "").toUpperCase(),
      name: String(h.name || ""),
      shares,
      currentPrice,
      currentVal,
      actualWeight,
      targetWeight,
      driftPct,
      targetVal,
      diffIDR,
      suggestedLots,
      action,
      estTradeValue: Math.abs(suggestedLots) * lotPrice
    });
  }

  return {
    items,
    totalTargetWeight,
    impliedCashTargetPct: Math.max(0, 100 - totalTargetWeight),
    isOverAllocated: totalTargetWeight > 100.0001,
    totalValuation
  };
}
