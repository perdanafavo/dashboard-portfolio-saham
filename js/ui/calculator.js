// =========================================================================
// TAB 6 UI MODULE: AVERAGE CALCULATOR (./js/ui/calculator.js)
// =========================================================================

import { calculateIPOTBuyFee, calculateIPOTSellFee } from "../nav-engine.js";
import {
  formatNum,
  formatIDR,
  formatSignedIDR,
  formatPct,
  colorClass,
  escapeHTML,
  getNumInput,
  setNumInput
} from "../storage.js";
import { renderCalculatorChart } from "../charts.js";

export function createCalculatorUI(ctx) {
  function recalculateAverageSim() {
    const curShares = Math.max(0, getNumInput("calc-cur-shares"));
    const curAvg = Math.max(0, getNumInput("calc-cur-avg"));
    const buyPrice = Math.max(0, getNumInput("calc-new-price"));
    const buyShares = Math.max(0, getNumInput("calc-new-shares"));
    const targetPrice = Math.max(0, getNumInput("calc-target-price"));
    const includeFee = document.getElementById("calc-include-ipot-fee")?.checked;

    const curCost = curShares * curAvg;
    const buyGross = buyShares * buyPrice;
    const addedCost = includeFee ? calculateIPOTBuyFee(buyGross, 0.19).netAmount : buyGross;
    const totalShares = curShares + buyShares;
    const totalCost = curCost + addedCost;
    const newAvg = totalShares > 0 ? totalCost / totalShares : curAvg;
    const avgDiffPct = curAvg > 0 ? ((newAvg - curAvg) / curAvg) * 100 : 0;

    const targetGross = totalShares * targetPrice;
    const targetNet = includeFee ? calculateIPOTSellFee(targetGross, 0.29).netProceeds : targetGross;
    const targetPL = targetNet - totalCost;
    const targetPLPct = totalCost > 0 ? (targetPL / totalCost) * 100 : 0;

    document.getElementById("calc-res-new-avg").textContent = `Rp ${formatNum(newAvg, 2)}`;
    document.getElementById("calc-res-avg-diff").textContent = `Perubahan: ${formatPct(avgDiffPct)}`;
    document.getElementById("calc-res-total-shares").textContent = `${totalShares.toLocaleString("id-ID")} lbr`;
    document.getElementById("calc-res-total-lots").textContent = `${formatNum(totalShares / 100, 2)} Lot`;
    document.getElementById("calc-res-total-cost").textContent = formatIDR(totalCost);
    document.getElementById("calc-res-added-cost").textContent = `+Modal Baru: ${formatIDR(addedCost)}`;

    const plEl = document.getElementById("calc-res-target-pl");
    plEl.textContent = formatSignedIDR(targetPL);
    plEl.className = `text-base sm:text-lg font-bold font-mono mt-0.5 ${colorClass(targetPL)}`;
    document.getElementById("calc-res-target-pct").textContent = `Return: ${formatPct(targetPLPct)}`;

    renderCalculatorChart(ctx.charts, curAvg, newAvg, buyPrice, targetPrice);
  }

  function syncCalcFromShares() {
    const price = Math.max(0, getNumInput("calc-new-price"));
    const shares = Math.max(0, getNumInput("calc-new-shares"));
    setNumInput("calc-new-budget", Math.round(price * shares));
    recalculateAverageSim();
  }

  function syncCalcFromBudget() {
    const price = Math.max(1, getNumInput("calc-new-price", 1));
    const budget = Math.max(0, getNumInput("calc-new-budget"));
    const lots = Math.floor(budget / (price * 100));
    setNumInput("calc-new-shares", lots * 100);
    recalculateAverageSim();
  }

  function loadTickerIntoCalculator() {
    const state = ctx.getState();
    const ticker = document.getElementById("calc-load-ticker").value;
    const h = state.holdings.find((item) => item.ticker === ticker);
    if (!h) return;
    setNumInput("calc-cur-shares", h.shares);
    setNumInput("calc-cur-avg", Number(h.avgPrice), 2);
    setNumInput("calc-new-price", h.currentPrice);
    setNumInput("calc-target-price", Math.round(h.avgPrice * 1.05));
    syncCalcFromShares();
  }

  function renderCalculatorTab() {
    const state = ctx.getState();
    const sel = document.getElementById("calc-load-ticker");
    if (sel) {
      const prev = sel.value;
      sel.innerHTML =
        `<option value="">-- Muat dari Portofolio --</option>` +
        state.holdings
          .map(
            (h) =>
              `<option value="${escapeHTML(h.ticker)}">${escapeHTML(h.ticker)} (${Number(h.shares).toLocaleString("id-ID")} lbr @ ${formatNum(h.avgPrice, 2)})</option>`
          )
          .join("");
      if (prev && state.holdings.some((h) => h.ticker === prev)) sel.value = prev;
    }
    recalculateAverageSim();
  }

  window.loadTickerIntoCalculator = loadTickerIntoCalculator;
  window.syncCalcFromShares = syncCalcFromShares;
  window.syncCalcFromBudget = syncCalcFromBudget;
  window.recalculateAverageSim = recalculateAverageSim;

  return { renderCalculatorTab };
}
