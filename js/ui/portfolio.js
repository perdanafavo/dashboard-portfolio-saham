import { calculateIPOTBuyFee, calculateIPOTSellFee, computeRebalancePlan } from "../nav-engine.js";
import {
  formatNum,
  formatIDR,
  formatSignedIDR,
  formatCompactIDR,
  formatPct,
  colorClass,
  escapeHTML,
  getJakartaTimeInfo,
  getTodayISO,
  getPriceFreshnessInfo,
  parseIDNumber,
  formatIDInputValue,
  getNumInput,
  setNumInput
} from "../storage.js";
import {
  renderAllocationChart as renderAllocationChartShared,
  renderBenchmarkBars as renderBenchmarkBarsShared
} from "../charts.js";

/**
 * Tab 1 (Portfolio & NAV CRUD + Renderer) UI module.
 * Registers window.* handlers for inline HTML event bindings and returns portfolio renderers.
 */
export function createPortfolioUI(ctx) {
  const {
    getState,
    charts,
    computeMetrics,
    commitStateChange,
    showToast,
    openModal,
    closeModal,
    askConfirm,
    getEmitenColor
  } = ctx;

  // Ephemeral UI state for Portfolio Table Search & Sort (does not mutate localStorage order)
  let searchQuery = "";
  let sortField = null;
  let sortDir = "desc";

  window.onPortfolioSearchInput = function (val) {
    searchQuery = String(val || "").trim().toLowerCase();
    renderPortfolioTableRows();
  };

  window.togglePortfolioSort = function (field) {
    if (sortField !== field) {
      sortField = field;
      sortDir = field === "ticker" ? "asc" : "desc";
    } else if ((field === "ticker" && sortDir === "asc") || (field !== "ticker" && sortDir === "desc")) {
      sortDir = field === "ticker" ? "desc" : "asc";
    } else {
      sortField = null;
      sortDir = "desc";
    }
    renderPortfolioTableRows();
  };

  window.updateHoldingTargetWeight = function (holdingId, rawVal) {
    const state = getState();
    const h = state.holdings.find((item) => item.id === holdingId);
    if (!h) return;
    const parsed = parseIDNumber(rawVal, "dec");
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      showToast("Target alokasi harus antara 0% sampai 100%.", "warning");
      renderPortfolioTab();
      return;
    }
    h.targetWeight = Number(parsed.toFixed(2));
    commitStateChange();
  };

  window.syncTargetsToCurrentWeights = function () {
    const state = getState();
    const m = computeMetrics();
    if (m.totalValuation <= 0) {
      showToast("Valuasi portofolio masih Rp 0.", "warning");
      return;
    }
    for (const h of state.holdings) {
      const val = (Number(h.shares) || 0) * (Number(h.currentPrice) || 0);
      const w = (val / m.totalValuation) * 100;
      h.targetWeight = Number(w.toFixed(1));
    }
    commitStateChange("Target alokasi disamakan dengan bobot valuasi saat ini");
  };

  window.resetAllTargetWeights = function () {
    const state = getState();
    for (const h of state.holdings) {
      h.targetWeight = 0;
    }
    commitStateChange("Target alokasi seluruh emiten direset ke 0%");
  };

  // --- BUY STOCK MODAL ---
  window.openBuyModal = function (holdingId = null) {
    const state = getState();
    const titleEl = document.getElementById("modal-buy-title");
    const tickerInput = document.getElementById("buy-ticker");
    const nameInput = document.getElementById("buy-name");
    const qtyInput = document.getElementById("buy-qty");
    const priceInput = document.getElementById("buy-price");

    if (holdingId) {
      const h = state.holdings.find((item) => item.id === holdingId);
      if (h) {
        titleEl.textContent = `Tambah Posisi (Average): ${h.ticker}`;
        tickerInput.value = h.ticker;
        nameInput.value = h.name || "";
        qtyInput.value = "";
        setNumInput(priceInput, h.currentPrice || "");
      }
    } else {
      titleEl.textContent = "Beli / Tambah Posisi Saham";
      tickerInput.value = "";
      nameInput.value = "";
      qtyInput.value = "";
      priceInput.value = "";
    }

    document.getElementById("buy-unit-mode").value = "LOT";
    document.getElementById("buy-fee-preset").value = "IPOT";
    setNumInput("buy-fee", 0.19, 2);
    document.getElementById("buy-deduct-cash").checked = true;
    window.updateBuyPreview();
    openModal("modal-buy");
  };

  window.onBuyFeePresetChange = function () {
    const preset = document.getElementById("buy-fee-preset").value;
    if (preset === "IPOT") setNumInput("buy-fee", 0.19, 2);
    else if (preset === "ZERO") setNumInput("buy-fee", 0);
    window.updateBuyPreview();
  };

  window.onBuyFeeManualInput = function () {
    const val = getNumInput("buy-fee");
    const presetEl = document.getElementById("buy-fee-preset");
    if (val === 0.19) presetEl.value = "IPOT";
    else if (val === 0) presetEl.value = "ZERO";
    else presetEl.value = "CUSTOM";
    window.updateBuyPreview();
  };

  window.updateBuyPreview = function () {
    const state = getState();
    const ticker = (document.getElementById("buy-ticker").value || "").toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
    const mode = document.getElementById("buy-unit-mode").value;
    const qty = Math.max(0, getNumInput("buy-qty"));
    const price = Math.max(0, getNumInput("buy-price"));
    const feePct = Math.max(0, getNumInput("buy-fee"));
    const deductCash = document.getElementById("buy-deduct-cash").checked;

    const shares = mode === "LOT" ? qty * 100 : qty;
    const tradeAmount = shares * price;
    const feeCalc = calculateIPOTBuyFee(tradeAmount, feePct);

    const existing = state.holdings.find((h) => h.ticker === ticker);
    const oldShares = existing ? Number(existing.shares) || 0 : 0;
    const oldCost = existing ? oldShares * (Number(existing.avgPrice) || 0) : 0;
    const newTotalShares = oldShares + shares;
    const newAvg = newTotalShares > 0 ? (oldCost + feeCalc.netAmount) / newTotalShares : 0;
    const remainingCash = deductCash ? (Number(state.cash) || 0) - feeCalc.netAmount : Number(state.cash) || 0;

    document.getElementById("buy-prev-shares").textContent = `${shares.toLocaleString("id-ID")} lembar (${formatNum(shares / 100, 2)} lot)`;
    document.getElementById("buy-prev-trade-amount").textContent = formatIDR(feeCalc.tradeAmount);
    document.getElementById("buy-prev-broker").textContent = formatIDR(feeCalc.brokerFee);
    document.getElementById("buy-prev-levy").textContent = formatIDR(feeCalc.levyFee);
    document.getElementById("buy-prev-kpei").textContent = formatIDR(feeCalc.kpeiFee);
    document.getElementById("buy-prev-dpp").textContent = formatIDR(feeCalc.dpp);
    document.getElementById("buy-prev-vat").textContent = formatIDR(feeCalc.vat12);
    document.getElementById("buy-prev-total-fee").textContent = formatIDR(feeCalc.totalFee);
    document.getElementById("buy-prev-total").textContent = formatIDR(feeCalc.netAmount);
    document.getElementById("buy-prev-newavg").textContent = `Rp ${formatNum(newAvg, 2)}`;

    const cashEl = document.getElementById("buy-prev-cash");
    cashEl.textContent = formatIDR(remainingCash);
    cashEl.className = `font-sans tabular-nums font-semibold ${remainingCash < 0 ? "text-rose-500" : "text-slate-700 dark:text-[#EEF2F6]"}`;
  };

  window.handleBuyStock = function (e) {
    e.preventDefault();
    const state = getState();
    const ticker = (document.getElementById("buy-ticker").value || "").toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
    const name = (document.getElementById("buy-name").value || "").trim();
    const mode = document.getElementById("buy-unit-mode").value;
    const qty = Math.max(0, getNumInput("buy-qty"));
    const price = Math.max(0, getNumInput("buy-price"));
    const feePct = Math.max(0, getNumInput("buy-fee"));
    const deductCash = document.getElementById("buy-deduct-cash").checked;

    const shares = mode === "LOT" ? qty * 100 : qty;
    if (!ticker || shares <= 0 || price <= 0) {
      showToast("Lengkapi kode emiten, jumlah, dan harga beli.", "error");
      return;
    }

    const feeCalc = calculateIPOTBuyFee(shares * price, feePct);
    if (deductCash && feeCalc.netAmount > (Number(state.cash) || 0)) {
      showToast("Saldo Kas RDN tidak mencukupi untuk pembelian ini.", "error");
      return;
    }

    const existing = state.holdings.find((h) => h.ticker === ticker);
    if (existing) {
      const oldShares = Number(existing.shares) || 0;
      const oldCost = oldShares * (Number(existing.avgPrice) || 0);
      const totalShares = oldShares + shares;
      existing.shares = totalShares;
      existing.avgPrice = (oldCost + feeCalc.netAmount) / totalShares;
      existing.currentPrice = price;
      existing.priceSource = "TRX";
      existing.priceUpdatedDateWIB = getTodayISO();
      if (name) existing.name = name;
    } else {
      state.holdings.push({
        id: `h-${ticker.toLowerCase()}-${Date.now()}`,
        ticker,
        name: name || `${ticker} Tbk`,
        shares,
        avgPrice: feeCalc.netAmount / shares,
        currentPrice: price,
        priceSource: "TRX",
        priceUpdatedDateWIB: getTodayISO()
      });
    }

    if (deductCash) {
      state.cash = Math.max(0, (Number(state.cash) || 0) - feeCalc.netAmount);
    }

    closeModal("modal-buy");
    commitStateChange(`Berhasil membeli ${shares.toLocaleString("id-ID")} lbr ${ticker}`);
  };

  // --- SELL STOCK MODAL ---
  window.openSellModal = function (holdingId) {
    const state = getState();
    const h = state.holdings.find((item) => item.id === holdingId);
    if (!h) return;

    document.getElementById("sell-holding-id").value = h.id;
    document.getElementById("sell-ticker-label").textContent = h.ticker;
    document.getElementById("sell-owned-shares").textContent = `${Number(h.shares).toLocaleString("id-ID")} lbr (${formatNum(h.shares / 100, 2)} lot)`;
    document.getElementById("sell-owned-avg").textContent = `Rp ${formatNum(h.avgPrice, 2)}`;
    setNumInput("sell-shares", h.shares);
    setNumInput("sell-price", h.currentPrice);
    document.getElementById("sell-fee-preset").value = "IPOT";
    setNumInput("sell-fee", 0.29, 2);
    document.getElementById("sell-date").value = getTodayISO();
    document.getElementById("sell-note").value = "";
    document.getElementById("sell-add-cash").checked = true;

    window.updateSellPreview();
    openModal("modal-sell");
  };

  window.setSellFraction = function (fraction) {
    const state = getState();
    const id = document.getElementById("sell-holding-id").value;
    const h = state.holdings.find((item) => item.id === id);
    if (!h) return;
    const total = Number(h.shares) || 0;
    const target = fraction >= 1 ? total : Math.max(100, Math.floor((total * fraction) / 100) * 100);
    setNumInput("sell-shares", Math.min(total, target));
    window.updateSellPreview();
  };

  window.onSellFeePresetChange = function () {
    const preset = document.getElementById("sell-fee-preset").value;
    if (preset === "IPOT") setNumInput("sell-fee", 0.29, 2);
    else if (preset === "ZERO") setNumInput("sell-fee", 0);
    window.updateSellPreview();
  };

  window.onSellFeeManualInput = function () {
    const val = getNumInput("sell-fee");
    const presetEl = document.getElementById("sell-fee-preset");
    if (val === 0.29) presetEl.value = "IPOT";
    else if (val === 0) presetEl.value = "ZERO";
    else presetEl.value = "CUSTOM";
    window.updateSellPreview();
  };

  window.updateSellPreview = function () {
    const state = getState();
    const id = document.getElementById("sell-holding-id").value;
    const h = state.holdings.find((item) => item.id === id);
    if (!h) return;

    const shares = Math.max(0, getNumInput("sell-shares"));
    const price = Math.max(0, getNumInput("sell-price"));
    const feePct = Math.max(0, getNumInput("sell-fee"));

    const feeCalc = calculateIPOTSellFee(shares * price, feePct);
    const costBasis = shares * (Number(h.avgPrice) || 0);
    const realizedPL = feeCalc.netProceeds - costBasis;
    const realizedPLPct = costBasis > 0 ? (realizedPL / costBasis) * 100 : 0;

    document.getElementById("sell-prev-trade-amount").textContent = formatIDR(feeCalc.tradeAmount);
    document.getElementById("sell-prev-broker").textContent = formatIDR(feeCalc.brokerFee);
    document.getElementById("sell-prev-levy-kpei").textContent = formatIDR(feeCalc.levyFee + feeCalc.kpeiFee);
    document.getElementById("sell-prev-vat").textContent = formatIDR(feeCalc.vat12);
    document.getElementById("sell-prev-salestax").textContent = formatIDR(feeCalc.salesTax);
    document.getElementById("sell-prev-total-fee").textContent = formatIDR(feeCalc.totalFee);
    document.getElementById("sell-prev-proceeds").textContent = formatIDR(feeCalc.netProceeds);

    const plEl = document.getElementById("sell-prev-pl");
    plEl.textContent = `${formatSignedIDR(realizedPL)} (${formatPct(realizedPLPct)})`;
    plEl.className = `font-sans tabular-nums font-bold ${colorClass(realizedPL)}`;
  };

  window.handleSellStock = function (e) {
    e.preventDefault();
    const state = getState();
    const id = document.getElementById("sell-holding-id").value;
    const hIdx = state.holdings.findIndex((item) => item.id === id);
    if (hIdx < 0) return;

    const h = state.holdings[hIdx];
    const owned = Number(h.shares) || 0;
    const shares = Math.max(0, getNumInput("sell-shares"));
    const price = Math.max(0, getNumInput("sell-price"));
    const feePct = Math.max(0, getNumInput("sell-fee"));
    const date = document.getElementById("sell-date").value || getTodayISO();
    const note = (document.getElementById("sell-note").value || "").trim();
    const addCash = document.getElementById("sell-add-cash").checked;

    if (shares <= 0 || shares > owned || price <= 0) {
      showToast("Jumlah lembar jual melebihi kepemilikan atau tidak valid.", "error");
      return;
    }

    const feeCalc = calculateIPOTSellFee(shares * price, feePct);
    const costBasis = shares * (Number(h.avgPrice) || 0);
    const realizedPL = feeCalc.netProceeds - costBasis;
    const realizedPLPct = costBasis > 0 ? (realizedPL / costBasis) * 100 : 0;

    state.journal.unshift({
      id: `j-${Date.now()}`,
      date,
      ticker: h.ticker,
      shares,
      avgCost: Number(h.avgPrice) || 0,
      sellPrice: price,
      netProceeds: feeCalc.netProceeds,
      realizedPL,
      realizedPLPct,
      note: note || (realizedPL >= 0 ? "Take Profit" : "Cut Loss")
    });

    if (addCash) {
      state.cash = (Number(state.cash) || 0) + feeCalc.netProceeds;
    }

    if (shares >= owned) {
      state.holdings.splice(hIdx, 1);
    } else {
      h.shares = owned - shares;
      h.currentPrice = price;
      h.priceSource = "TRX";
      h.priceUpdatedDateWIB = date;
    }

    closeModal("modal-sell");
    commitStateChange(`Penjualan ${h.ticker} dicatat (${formatSignedIDR(realizedPL)})`);
  };

  // --- EDIT HOLDING MODAL ---
  window.openEditHoldingModal = function (holdingId) {
    const state = getState();
    const h = state.holdings.find((item) => item.id === holdingId);
    if (!h) return;

    document.getElementById("edit-holding-id").value = h.id;
    document.getElementById("edit-holding-title-ticker").textContent = h.ticker;
    document.getElementById("edit-holding-ticker").value = h.ticker;
    document.getElementById("edit-holding-name").value = h.name || "";
    setNumInput("edit-holding-shares", h.shares);
    setNumInput("edit-holding-avg", h.avgPrice, 2);
    setNumInput("edit-holding-current", h.currentPrice);
    setNumInput("edit-holding-target-weight", Number(h.targetWeight) || 0);
    document.getElementById("edit-holding-adjust-cash").checked = false;

    window.updateEditHoldingPreview();
    openModal("modal-edit-holding");
  };

  window.updateEditHoldingPreview = function () {
    const state = getState();
    const id = document.getElementById("edit-holding-id").value;
    const h = state.holdings.find((item) => item.id === id);
    if (!h) return;

    const oldCost = (Number(h.shares) || 0) * (Number(h.avgPrice) || 0);
    const newShares = Math.max(0, getNumInput("edit-holding-shares"));
    const newAvg = Math.max(0, getNumInput("edit-holding-avg"));
    const newCur = Math.max(0, getNumInput("edit-holding-current"));
    const adjustCash = document.getElementById("edit-holding-adjust-cash").checked;

    const newCost = newShares * newAvg;
    const costDiff = newCost - oldCost;
    const newVal = newShares * newCur;
    const pl = newVal - newCost;
    const plPct = newCost > 0 ? (pl / newCost) * 100 : 0;
    const projCash = adjustCash ? (Number(state.cash) || 0) - costDiff : Number(state.cash) || 0;

    document.getElementById("edit-prev-lots").textContent = `${formatNum(newShares / 100, 2)} lot`;
    document.getElementById("edit-prev-old-cost").textContent = formatIDR(oldCost);
    document.getElementById("edit-prev-new-cost").textContent = formatIDR(newCost);

    const diffEl = document.getElementById("edit-prev-cost-diff");
    diffEl.textContent = formatSignedIDR(costDiff);
    diffEl.className = `font-sans tabular-nums font-semibold ${colorClass(-costDiff)}`;

    const plEl = document.getElementById("edit-prev-pl");
    plEl.textContent = `${formatSignedIDR(pl)} (${formatPct(plPct)})`;
    plEl.className = `font-sans tabular-nums font-bold ${colorClass(pl)}`;

    const cashEl = document.getElementById("edit-prev-cash");
    cashEl.textContent = formatIDR(projCash);
    cashEl.className = `font-sans tabular-nums font-semibold ${projCash < 0 ? "text-rose-500" : "text-slate-700 dark:text-[#EEF2F6]"}`;
  };

  window.handleEditHolding = function (e) {
    e.preventDefault();
    const state = getState();
    const id = document.getElementById("edit-holding-id").value;
    const h = state.holdings.find((item) => item.id === id);
    if (!h) return;

    const ticker = (document.getElementById("edit-holding-ticker").value || "").toUpperCase().replace(/[^A-Z0-9.-]/g, "").slice(0, 12);
    const name = (document.getElementById("edit-holding-name").value || "").trim();
    const shares = Math.max(1, getNumInput("edit-holding-shares"));
    const avgPrice = Math.max(0, getNumInput("edit-holding-avg"));
    const currentPrice = Math.max(1, getNumInput("edit-holding-current"));
    const rawTarget = getNumInput("edit-holding-target-weight", NaN);
    const targetWeight = Number.isFinite(rawTarget) ? Math.min(100, Math.max(0, Number(rawTarget.toFixed(2)))) : (Number(h.targetWeight) || 0);
    const adjustCash = document.getElementById("edit-holding-adjust-cash").checked;

    if (!ticker) {
      showToast("Kode emiten wajib diisi.", "error");
      return;
    }

    const isDuplicateTicker = state.holdings.some((item) => item.id !== id && item.ticker === ticker);
    if (isDuplicateTicker) {
      showToast(`Emiten ${ticker} sudah ada di portofolio. Gunakan tombol Beli untuk menambah lot.`, "error");
      return;
    }

    const oldCost = (Number(h.shares) || 0) * (Number(h.avgPrice) || 0);
    const newCost = shares * avgPrice;
    const costDiff = newCost - oldCost;

    if (adjustCash) {
      const nextCash = (Number(state.cash) || 0) - costDiff;
      if (nextCash < 0) {
        showToast("Saldo Kas RDN tidak mencukupi untuk penyesuaian modal tersebut.", "error");
        return;
      }
      state.cash = nextCash;
    }

    const oldTicker = h.ticker;
    const priceChanged = Number(h.currentPrice) !== currentPrice;
    h.ticker = ticker;
    h.name = name || `${ticker} Tbk`;
    h.shares = shares;
    h.avgPrice = avgPrice;
    h.currentPrice = currentPrice;
    h.targetWeight = targetWeight;
    if (oldTicker && oldTicker !== ticker && state.dividendSchedules && state.dividendSchedules[oldTicker]) {
      if (!state.dividendSchedules[ticker]) {
        state.dividendSchedules[ticker] = state.dividendSchedules[oldTicker];
      }
      delete state.dividendSchedules[oldTicker];
    }
    if (priceChanged) {
      h.priceSource = "MANUAL";
      h.priceUpdatedDateWIB = getTodayISO();
    }

    closeModal("modal-edit-holding");
    commitStateChange(`Data emiten ${ticker} berhasil diperbarui`);
  };

  window.deleteHolding = function (holdingId) {
    const state = getState();
    const h = state.holdings.find((item) => item.id === holdingId);
    if (!h) return;
    askConfirm(
      `Hapus Emiten ${h.ticker}?`,
      `Emiten ${h.ticker} akan dihapus dari daftar portofolio tanpa menambah Saldo Kas RDN. Gunakan tombol "Jual" jika saham dijual ke RDN.`,
      () => {
        const curState = getState();
        curState.holdings = curState.holdings.filter((item) => item.id !== holdingId);
        commitStateChange(`Emiten ${h.ticker} dihapus dari portofolio`);
      }
    );
  };

  // --- INLINE & BULK PRICE UPDATES ---
  window.updateSinglePrice = function (holdingId, rawVal) {
    const state = getState();
    const h = state.holdings.find((item) => item.id === holdingId);
    if (!h) return;
    const price = parseIDNumber(rawVal, "int");
    if (!Number.isFinite(price) || price <= 0) {
      showToast("Harga saham harus berupa angka lebih dari Rp 0.", "warning");
      renderPortfolioTab();
      return;
    }
    h.currentPrice = price;
    h.priceSource = "MANUAL";
    h.priceUpdatedDateWIB = getTodayISO();
    commitStateChange(`Harga ${h.ticker} diperbarui ke ${formatIDR(price)}`);
  };

  window.openBulkPriceModal = function () {
    const state = getState();
    const list = document.getElementById("bulk-price-list");
    list.innerHTML = state.holdings
      .map(
        (h) => `
        <div class="modal-preview-box py-2.5 flex items-center justify-between gap-3">
          <div>
            <span class="font-mono font-bold text-xs text-slate-900 dark:text-[#EEF2F6]">${escapeHTML(h.ticker)}</span>
            <span class="block text-[11px] font-sans tabular-nums text-slate-500 dark:text-[#8E9BA8]">Avg: ${formatNum(h.avgPrice, 2)}</span>
          </div>
          <input type="text" inputmode="numeric" data-num-input="int" data-holding-id="${escapeHTML(h.id)}" value="${Math.round(Number(h.currentPrice) || 0).toLocaleString("id-ID")}" required class="bulk-price-input modal-input w-32 py-1.5 text-right font-bold" />
        </div>
      `
      )
      .join("");
    openModal("modal-bulk-price");
  };

  window.handleBulkPriceSave = function (e) {
    e.preventDefault();
    const state = getState();
    const today = getTodayISO();
    document.querySelectorAll(".bulk-price-input").forEach((inp) => {
      const h = state.holdings.find((item) => item.id === inp.dataset.holdingId);
      const val = getNumInput(inp);
      if (h && Number.isFinite(val) && val > 0 && Number(h.currentPrice) !== val) {
        h.currentPrice = val;
        h.priceSource = "MANUAL";
        h.priceUpdatedDateWIB = today;
      }
    });
    closeModal("modal-bulk-price");
    commitStateChange("Semua harga pasar berhasil diperbarui");
  };

  // --- CASH & BASELINE NAV CALIBRATION ---
  window.openCashModal = function () {
    const state = getState();
    setNumInput("edit-cash-amount", Math.round(Number(state.cash) || 0));
    openModal("modal-cash");
  };

  window.handleSaveCash = function (e) {
    e.preventDefault();
    const state = getState();
    const val = Math.max(0, getNumInput("edit-cash-amount"));
    state.cash = val;
    closeModal("modal-cash");
    commitStateChange(`Saldo Kas RDN diperbarui menjadi ${formatIDR(val)}`);
  };

  window.openBaselineModal = function () {
    const state = getState();
    setNumInput("base-init-capital", Number(state.meta.initialCapital) || 0);
    setNumInput("base-init-nav", Number(state.meta.initialNav) || 1000, 4);
    setNumInput("base-init-units", Number(state.meta.initialUnits) || 0, 4);
    window.updateBaselinePreview();
    openModal("modal-baseline");
  };

  window.onBaselineCapitalOrNavInput = function () {
    const cap = Math.max(0, getNumInput("base-init-capital"));
    const nav = Math.max(0.0001, getNumInput("base-init-nav", 1000));
    setNumInput("base-init-units", cap / nav, 4);
    window.updateBaselinePreview();
  };

  window.updateBaselinePreview = function () {
    const state = getState();
    const m = computeMetrics();
    const initUnits = Math.max(0.0001, getNumInput("base-init-units", 1));
    const initNav = Math.max(0.0001, getNumInput("base-init-nav", 1000));
    const clearMuts = document.getElementById("base-clear-template-mutations")?.checked;

    let totalUnits = initUnits;
    if (!clearMuts) {
      for (const mut of state.mutations) {
        const delta = Number(mut.unitsDelta) || 0;
        totalUnits += mut.type === "TOPUP" ? delta : -Math.abs(delta);
      }
    }
    if (totalUnits <= 0) totalUnits = 1;

    const projNav = m.totalValuation / totalUnits;
    const projRet = ((projNav - initNav) / initNav) * 100;

    document.getElementById("base-prev-val").textContent = formatIDR(m.totalValuation);
    document.getElementById("base-prev-units").textContent = formatNum(totalUnits, 4);
    document.getElementById("base-prev-nav").textContent = formatNum(projNav, 4);

    const retEl = document.getElementById("base-prev-return");
    retEl.textContent = formatPct(projRet);
    retEl.className = `font-sans tabular-nums font-bold ${colorClass(projRet)}`;
  };

  window.applyCurrentPortfolioAsBaseline = function () {
    const m = computeMetrics();
    const totalCostNow = Math.max(1, Math.round(m.totalCost));
    setNumInput("base-init-capital", totalCostNow);
    setNumInput("base-init-nav", 1000, 4);
    setNumInput("base-init-units", totalCostNow / 1000, 4);
    window.updateBaselinePreview();
  };

  window.handleSaveBaseline = function (e) {
    e.preventDefault();
    const state = getState();
    const initCap = Math.max(1, getNumInput("base-init-capital"));
    const initNav = Math.max(0.0001, getNumInput("base-init-nav", 1000));
    const initUnits = Math.max(0.0001, getNumInput("base-init-units", initCap / initNav));
    const clearMuts = document.getElementById("base-clear-template-mutations").checked;

    state.meta.initialCapital = initCap;
    state.meta.initialNav = initNav;
    state.meta.initialUnits = initUnits;
    if (clearMuts) {
      state.mutations = [];
      const activeYr = Number(state.meta.activeYear);
      const ann = state.annualHistory?.find((a) => Number(a.year) === activeYr);
      if (ann) ann.topUp = 0;
    }

    closeModal("modal-baseline");
    commitStateChange("Parameter awal Unit Penyertaan (NAV) berhasil dikalibrasi");
  };

  function renderPortfolioDividendRecap(m) {
    const state = getState();
    const allTimeEl = document.getElementById("porto-div-recap-alltime");
    const countEl = document.getElementById("porto-div-recap-count");
    const yearLabelEl = document.getElementById("porto-div-recap-year-label");
    const yearSelectEl = document.getElementById("porto-div-recap-year-select");
    const yearTotalEl = document.getElementById("porto-div-recap-year-total");
    const yieldPaidInEl = document.getElementById("porto-div-recap-yield-paidin");
    const breakdownEl = document.getElementById("porto-div-recap-breakdown");

    if (!allTimeEl) return;

    const activeYear = String(state.meta.activeYear || getJakartaTimeInfo().year);
    const byYear = {};
    const byTicker = {};
    let allTimeTotal = 0;

    for (const d of state.dividends) {
      const amt = Number(d.amount) || 0;
      const yr = String(d.date || "").slice(0, 4) || activeYear;
      const t = String(d.ticker || "LAINNYA").toUpperCase();
      allTimeTotal += amt;
      byYear[yr] = (byYear[yr] || 0) + amt;
      byTicker[t] = (byTicker[t] || 0) + amt;
    }

    const yearSet = new Set([activeYear, String(getJakartaTimeInfo().year), ...Object.keys(byYear)]);
    const sortedYears = Array.from(yearSet).filter((y) => y.length === 4).sort((a, b) => Number(b) - Number(a));

    if (yearSelectEl) {
      const prevPicked = yearSelectEl.dataset.userPicked === "1" ? yearSelectEl.value : activeYear;
      yearSelectEl.innerHTML = sortedYears
        .map((y) => `<option value="${y}">${y}</option>`)
        .join("");
      yearSelectEl.value = sortedYears.includes(prevPicked) ? prevPicked : activeYear;
    }

    const selectedYr = yearSelectEl ? yearSelectEl.value : activeYear;
    const yearTotal = byYear[selectedYr] || 0;
    const paidInRatio = m.totalPaidInCapital > 0 ? (allTimeTotal / m.totalPaidInCapital) * 100 : 0;

    allTimeEl.textContent = formatIDR(allTimeTotal);
    if (countEl) countEl.textContent = `${state.dividends.length}x pencairan dividen`;
    if (yearLabelEl) yearLabelEl.textContent = `Dividen Tahun ${selectedYr}`;
    if (yearTotalEl) yearTotalEl.textContent = formatIDR(yearTotal);
    if (yieldPaidInEl) yieldPaidInEl.textContent = `Kumulatif: ${formatNum(paidInRatio, 2)}% dari Modal Disetor`;

    if (breakdownEl) {
      if (state.dividends.length === 0) {
        breakdownEl.innerHTML = `<span>Belum ada dividen tunai tercatat</span>`;
      } else {
        const yearBadges = Object.entries(byYear)
          .sort((a, b) => Number(b[0]) - Number(a[0]))
          .map(([yr, tot]) => `<span class="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold">${yr}: ${formatCompactIDR(tot)}</span>`);
        const tickerBadges = Object.entries(byTicker)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([tk, tot]) => `<span class="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">${escapeHTML(tk)}: ${formatCompactIDR(tot)}</span>`);
        breakdownEl.innerHTML = [...yearBadges, ...tickerBadges].join("");
      }
    }
  }

  function renderPortfolioTab() {
    const state = getState();
    const m = computeMetrics();

    document.getElementById("kpi-total-valuation").textContent = formatIDR(m.totalValuation);
    const cashPct = m.totalValuation > 0 ? (m.cashBalance / m.totalValuation) * 100 : 0;
    const stockPct = m.totalValuation > 0 ? (m.stockValTotal / m.totalValuation) * 100 : 0;
    document.getElementById("kpi-total-valuation-sub").innerHTML = `
      <span>Saham: <strong class="text-slate-700 dark:text-[#EEF2F6]">${formatIDR(m.stockValTotal)}</strong> (${formatNum(stockPct, 2)}%)</span>
      <span class="text-slate-300 dark:text-white/20">&bull;</span>
      <span>Kas: <strong class="text-slate-700 dark:text-[#EEF2F6]">${formatIDR(m.cashBalance)}</strong> (${formatNum(cashPct, 2)}%)</span>
    `;

    document.getElementById("kpi-nav-unit").textContent = formatNum(m.currentNav, 4);
    const navDiff = m.currentNav - m.initNav;
    document.getElementById("kpi-nav-unit-sub").innerHTML = `Awal: ${formatNum(m.initNav, 4)} <span class="font-mono ${colorClass(navDiff)}">(${navDiff >= 0 ? "+" : ""}${formatNum(navDiff, 2)})</span>`;

    document.getElementById("kpi-total-units").textContent = formatNum(m.totalUnits, 4);
    const unitDiff = m.totalUnits - m.initUnits;
    document.getElementById("kpi-total-units-sub").innerHTML = `Awal: ${formatNum(m.initUnits, 4)} <span class="font-mono text-sky-500">(${unitDiff >= 0 ? "+" : ""}${formatNum(unitDiff, 2)})</span>`;

    const ytdEl = document.getElementById("kpi-ytd-return");
    ytdEl.textContent = formatPct(m.ytdReturnPct);
    ytdEl.className = `text-xl sm:text-2xl font-bold font-sans tabular-nums tracking-tight mt-0.5 ${colorClass(m.ytdReturnPct)}`;

    document.getElementById("kpi-alpha-sub").innerHTML = `
      <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0C1117] border border-slate-200/60 dark:border-white/[0.06] ${colorClass(m.alphaIhsg)}">vs IHSG: ${formatPct(m.alphaIhsg)}</span>
      <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#0C1117] border border-slate-200/60 dark:border-white/[0.06] ${colorClass(m.alphaLq45)}">vs LQ45: ${formatPct(m.alphaLq45)}</span>
    `;

    document.getElementById("kpi-cash-balance").textContent = formatIDR(m.cashBalance);
    document.getElementById("kpi-cash-sub").innerHTML = `Porsi Kas: <strong class="text-slate-700 dark:text-[#EEF2F6]">${formatNum(cashPct, 2)}%</strong> &bull; Dividen: <span class="tabular-nums text-[#10B981]">${formatCompactIDR(m.totalDividendsReceived)}</span>`;

    document.getElementById("table-total-paidin").textContent = formatIDR(m.totalPaidInCapital);

    const verifiedCount = state.holdings.filter((h) => getPriceFreshnessInfo(h).status === "VERIFIED_SYNC").length;
    const freshBadge = document.getElementById("table-price-freshness-badge");
    if (freshBadge) {
      const allVerified = state.holdings.length > 0 && verifiedCount === state.holdings.length;
      freshBadge.className = allVerified
        ? "inline-flex items-center gap-1.5 text-xs font-sans tabular-nums bg-[#10B981]/10 border border-[#10B981]/25 px-3 py-1.5 rounded-lg text-[#10B981]"
        : "inline-flex items-center gap-1.5 text-xs font-sans tabular-nums bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-lg text-amber-500 dark:text-amber-400";
      freshBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${allVerified ? "bg-[#10B981]" : "bg-amber-400"}"></span> Terverifikasi Real: <strong>${verifiedCount}/${state.holdings.length}</strong>`;
    }

    renderPortfolioTableRows(m);
    renderAllocationChartShared({ charts, state, getEmitenColor }, m);
    renderBenchmarkBarsShared({ state }, m);
    renderPortfolioDividendRecap(m);
    renderRebalancingPanel(m);
  }

  function renderPortfolioTableRows(passedMetrics = null) {
    const state = getState();
    const m = passedMetrics || computeMetrics();
    const cashPct = m.totalValuation > 0 ? (m.cashBalance / m.totalValuation) * 100 : 0;
    const tbody = document.getElementById("portfolio-table-body");
    if (!tbody) return;
    const totalPL = m.totalValuation - m.totalCost;
    const totalPLPct = m.totalCost > 0 ? (totalPL / m.totalCost) * 100 : 0;

    let rowsHTML = `
      <tr class="bg-slate-50/50 dark:bg-[#0C1117]/35">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] font-sans font-bold text-xs flex items-center justify-center shrink-0">Kas</span>
            <div>
              <div class="font-bold text-slate-900 dark:text-[#EEF2F6] text-xs sm:text-sm">Saldo Kas (RDN)</div>
              <div class="text-[11px] text-slate-500 dark:text-[#8E9BA8]">Dana siap beli saham</div>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-400 dark:text-[#8E9BA8]">—</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-400 dark:text-[#8E9BA8]">—</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-400 dark:text-[#8E9BA8]">—</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#EEF2F6]">${formatIDR(m.cashBalance)}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums font-semibold text-slate-900 dark:text-[#EEF2F6]">${formatIDR(m.cashBalance)}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-400 dark:text-[#8E9BA8]">Rp 0 (0,00%)</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#8E9BA8]">${m.totalCost > 0 ? formatNum((m.cashBalance / m.totalCost) * 100, 2) : "0,00"}%</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#8E9BA8]">${formatNum(cashPct, 2)}%</td>
        <td class="py-3.5 px-4 text-center">
          <button type="button" data-onclick="openCashModal()" class="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-[#0C1117] hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-700 dark:text-[#EEF2F6] border border-slate-200/70 dark:border-white/[0.08] transition-colors">Edit Kas</button>
        </td>
      </tr>
    `;

    const sortFields = ["ticker", "valuation", "pl", "weight"];
    for (const f of sortFields) {
      const ind = document.getElementById(`sort-ind-${f}`);
      if (!ind) continue;
      if (sortField === f) {
        ind.textContent = sortDir === "asc" ? "↑" : "↓";
        ind.className = "text-[10px] text-[#10B981] font-bold opacity-100";
      } else {
        ind.textContent = "↕";
        ind.className = "text-[10px] opacity-60";
      }
    }

    let displayedHoldings = state.holdings.filter((h) => {
      if (!searchQuery) return true;
      const haystack = `${h.ticker || ""} ${h.name || ""} ${h.sector || ""}`.toLowerCase();
      return haystack.includes(searchQuery);
    });

    if (sortField) {
      displayedHoldings = [...displayedHoldings].sort((a, b) => {
        const aVal = (Number(a.shares) || 0) * (Number(a.currentPrice) || 0);
        const bVal = (Number(b.shares) || 0) * (Number(b.currentPrice) || 0);
        const aCost = (Number(a.shares) || 0) * (Number(a.avgPrice) || 0);
        const bCost = (Number(b.shares) || 0) * (Number(b.avgPrice) || 0);
        let cmp = 0;
        if (sortField === "ticker") {
          cmp = String(a.ticker || "").localeCompare(String(b.ticker || ""));
        } else if (sortField === "valuation" || sortField === "weight") {
          cmp = aVal - bVal;
        } else if (sortField === "pl") {
          cmp = (aVal - aCost) - (bVal - bCost);
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    if (searchQuery && displayedHoldings.length === 0) {
      rowsHTML += `
        <tr>
          <td colspan="10" class="py-6 px-4 text-center text-xs text-slate-500 dark:text-[#8E9BA8]">
            Tidak ada emiten yang cocok dengan pencarian "<strong>${escapeHTML(searchQuery)}</strong>".
          </td>
        </tr>
      `;
    }

    const maxAbsPL = Math.max(
      1,
      ...displayedHoldings.map((item) => {
        const s = Number(item.shares) || 0;
        return Math.abs(s * (Number(item.currentPrice) || 0) - s * (Number(item.avgPrice) || 0));
      })
    );

    for (const h of displayedHoldings) {
      const shares = Number(h.shares) || 0;
      const avg = Number(h.avgPrice) || 0;
      const cur = Number(h.currentPrice) || 0;
      const cost = shares * avg;
      const val = shares * cur;
      const pl = val - cost;
      const plPct = cost > 0 ? (pl / cost) * 100 : 0;
      const plBarWidth = Math.max(4, Math.min(100, Math.round((Math.abs(pl) / maxAbsPL) * 100)));
      const fundAlloc = m.totalCost > 0 ? (cost / m.totalCost) * 100 : 0;
      const valWeight = m.totalValuation > 0 ? (val / m.totalValuation) * 100 : 0;
      const valEffect = valWeight - fundAlloc;

      const freshness = getPriceFreshnessInfo(h);
      const isSyncCache = h.lastSyncStatus === "CACHE";
      const isSyncLive = h.lastSyncStatus === "LIVE";
      const priceInputStyle = isSyncCache
        ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
        : freshness.status === "VERIFIED_SYNC"
        ? "border-[#10B981]/40 bg-[#10B981]/5 text-emerald-700 dark:text-[#10B981]"
        : "border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0C1117] text-slate-900 dark:text-[#EEF2F6]";

      const dailyChgHTML =
        freshness.changePct !== null
          ? `<span class="font-sans tabular-nums ${colorClass(freshness.changePct)}">(${formatPct(freshness.changePct)})</span>`
          : "";

      const shortDateLabel = String(freshness.label || "").replace(/\s+20\d{2}$/, "");

      const priceBadgeHTML = isSyncCache
        ? `<div title="Sinkronisasi terakhir gagal untuk ${escapeHTML(h.ticker)} — memakai harga tersimpan (cache)" class="mt-1 inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <span class="px-1 py-0.2 rounded bg-amber-500/15 text-[9px] font-bold">CACHE</span>
            <span>${escapeHTML(shortDateLabel || "Terakhir")}</span>
          </div>`
        : freshness.status === "VERIFIED_SYNC" || isSyncLive
        ? `<div title="${escapeHTML(freshness.tooltip)}" class="mt-1 inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-medium text-emerald-600 dark:text-[#10B981]">
            <span class="px-1 py-0.2 rounded bg-[#10B981]/15 text-[9px] font-bold">LIVE</span>
            <span>${escapeHTML(shortDateLabel)}</span>${dailyChgHTML}
          </div>`
        : freshness.status === "STALE_SYNC"
        ? `<div title="${escapeHTML(freshness.tooltip)}" class="mt-1 inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span>${escapeHTML(shortDateLabel)}</span>${dailyChgHTML}
          </div>`
        : freshness.status === "MANUAL"
        ? `<div title="${escapeHTML(freshness.tooltip)}" class="mt-1 inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-medium text-sky-600 dark:text-sky-400">
            <span class="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0"></span>
            <span>${escapeHTML(shortDateLabel)}</span>
          </div>`
        : `<div title="${escapeHTML(freshness.tooltip)}" class="mt-1 inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] text-amber-500/90">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
            <span>Belum Sync</span>
          </div>`;

      const safeId = escapeHTML(h.id);
      rowsHTML += `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
          <td class="py-3.5 px-4">
            <div class="flex items-center gap-2.5">
              <span class="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#0C1117] border border-slate-200 dark:border-white/[0.08] font-sans font-bold text-xs flex items-center justify-center text-slate-900 dark:text-[#EEF2F6] shrink-0">
                ${escapeHTML(h.ticker)}
              </span>
              <div class="min-w-0">
                <div class="font-bold text-slate-900 dark:text-[#EEF2F6] text-xs sm:text-sm">${escapeHTML(h.ticker)}</div>
                <div class="text-[11px] text-slate-500 dark:text-[#8E9BA8] truncate max-w-[150px]">${escapeHTML(h.name || "")}</div>
              </div>
            </div>
          </td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums">
            <div class="font-semibold text-slate-900 dark:text-[#EEF2F6]">${shares.toLocaleString("id-ID")} <span class="text-[10px] text-slate-400 dark:text-[#8E9BA8]">lbr</span></div>
            <div class="text-[11px] text-slate-500 dark:text-[#8E9BA8]">${formatNum(shares / 100, 2)} lot</div>
          </td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#8E9BA8]">
            ${formatNum(avg, 2)}
          </td>
          <td class="py-3.5 px-3 text-right">
            <div class="inline-flex flex-col items-end">
              <input
                type="text"
                inputmode="numeric"
                data-num-input="int"
                value="${Math.round(cur).toLocaleString("id-ID")}"
                data-onchange="updateSinglePrice('${safeId}', this.value)"
                class="w-24 px-2.5 py-1.5 rounded-lg text-right font-sans tabular-nums font-bold text-xs sm:text-sm border ${priceInputStyle} focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                title="Klik untuk edit harga manual"
              />
              ${priceBadgeHTML}
            </div>
          </td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#8E9BA8]">
            ${formatIDR(cost)}
          </td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums font-semibold text-slate-900 dark:text-[#EEF2F6]">
            ${formatIDR(val)}
          </td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums">
            <div class="font-bold ${colorClass(pl)}">${formatSignedIDR(pl)}</div>
            <div class="flex items-center justify-end gap-1.5 mt-0.5">
              <div class="w-12 h-1.5 rounded-full bg-slate-200/80 dark:bg-[#0C1117] overflow-hidden flex ${pl >= 0 ? "justify-start" : "justify-end"}" title="Proporsi P/L terhadap posisi terbesar">
                <div class="h-full rounded-full ${pl >= 0 ? "bg-[#10B981]" : "bg-rose-500"}" style="width:${plBarWidth}%"></div>
              </div>
              <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${pl >= 0 ? "bg-[#10B981]/15 text-emerald-600 dark:text-[#10B981]" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}">
                ${formatPct(plPct)}
              </span>
            </div>
          </td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#8E9BA8]">
            ${formatNum(fundAlloc, 2)}%
          </td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums">
            <div class="font-semibold text-slate-900 dark:text-[#EEF2F6]">${formatNum(valWeight, 2)}%</div>
            <div class="text-[10px] ${colorClass(valEffect)}">${formatPct(valEffect)}</div>
          </td>
          <td class="py-3.5 px-4 text-center">
            <div class="inline-flex items-center gap-1">
              <button type="button" data-onclick="openBuyModal('${safeId}')" aria-label="Beli atau tambah ${escapeHTML(h.ticker)}" class="px-2 py-1 rounded-md text-[11px] font-semibold bg-[#10B981]/15 hover:bg-[#10B981]/25 text-emerald-600 dark:text-[#10B981]" title="Tambah / Average">Beli</button>
              <button type="button" data-onclick="openSellModal('${safeId}')" aria-label="Jual ${escapeHTML(h.ticker)}" class="px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400" title="Jual / TP / CL">Jual</button>
              <button type="button" data-onclick="openEditHoldingModal('${safeId}')" aria-label="Edit data emiten ${escapeHTML(h.ticker)}" class="p-1.5 rounded-md bg-slate-100 dark:bg-[#0C1117] hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-600 dark:text-[#8E9BA8] hover:text-[#EEF2F6]" title="Edit Data Emiten">
                <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              </button>
              <button type="button" data-onclick="deleteHolding('${safeId}')" aria-label="Hapus emiten ${escapeHTML(h.ticker)}" class="p-1.5 rounded-md hover:bg-rose-500/15 text-slate-400 dark:text-[#8E9BA8] hover:text-rose-400" title="Hapus Emiten">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    tbody.innerHTML = rowsHTML;

    const tfoot = document.getElementById("portfolio-table-foot");
    if (tfoot) {
      const stockPL = m.stockValTotal - m.stockCostTotal;
      const stockPLPct = m.stockCostTotal > 0 ? (stockPL / m.stockCostTotal) * 100 : 0;
      const stockCostAlloc = m.totalCost > 0 ? (m.stockCostTotal / m.totalCost) * 100 : 0;
      const stockValWeight = m.totalValuation > 0 ? (m.stockValTotal / m.totalValuation) * 100 : 0;
      tfoot.innerHTML = `
        <tr class="border-b border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-[#8E9BA8] font-semibold">
          <td colspan="4" class="py-2.5 px-4">Subtotal Saham</td>
          <td class="py-2.5 px-3 text-right font-sans tabular-nums">${formatIDR(m.stockCostTotal)}</td>
          <td class="py-2.5 px-3 text-right font-sans tabular-nums text-slate-800 dark:text-[#EEF2F6]">${formatIDR(m.stockValTotal)}</td>
          <td class="py-2.5 px-3 text-right font-sans tabular-nums ${colorClass(stockPL)}">${formatSignedIDR(stockPL)} (${formatPct(stockPLPct)})</td>
          <td class="py-2.5 px-3 text-right font-sans tabular-nums">${formatNum(stockCostAlloc, 2)}%</td>
          <td class="py-2.5 px-3 text-right font-sans tabular-nums">${formatNum(stockValWeight, 2)}%</td>
          <td></td>
        </tr>
        <tr>
          <td colspan="4" class="py-3.5 px-4 text-slate-900 dark:text-[#EEF2F6]">Total Portofolio (Saham + Kas)</td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-800 dark:text-[#8E9BA8]">${formatIDR(m.totalCost)}</td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-900 dark:text-[#EEF2F6]">${formatIDR(m.totalValuation)}</td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums ${colorClass(totalPL)}">${formatSignedIDR(totalPL)} (${formatPct(totalPLPct)})</td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#8E9BA8]">${m.totalCost > 0 ? "100,00%" : "0,00%"}</td>
          <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-900 dark:text-[#EEF2F6]">${m.totalValuation > 0 ? "100,00%" : "0,00%"}</td>
          <td></td>
        </tr>
      `;
    }
    window.lucide?.createIcons?.();
  }

  function renderRebalancingPanel(m) {
    const state = getState();
    const tbody = document.getElementById("rebalance-table-body");
    const badge = document.getElementById("rebalance-allocation-badge");
    if (!tbody) return;

    const plan = computeRebalancePlan(state.holdings, m);

    if (badge) {
      if (plan.isOverAllocated) {
        badge.className = "inline-flex items-center gap-1.5 text-xs font-sans tabular-nums px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400";
        badge.innerHTML = `Total Target Melebihi 100%: <strong>${formatNum(plan.totalTargetWeight, 2)}%</strong>`;
      } else if (plan.totalTargetWeight > 0) {
        badge.className = "inline-flex items-center gap-1.5 text-xs font-sans tabular-nums px-3 py-1.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-emerald-700 dark:text-[#10B981]";
        badge.innerHTML = `Target Saham: <strong>${formatNum(plan.totalTargetWeight, 2)}%</strong> &bull; Target Kas: <strong>${formatNum(plan.impliedCashTargetPct, 2)}%</strong>`;
      } else {
        badge.className = "inline-flex items-center gap-1.5 text-xs font-sans tabular-nums px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0C1117] border border-slate-200/70 dark:border-white/[0.07] text-slate-600 dark:text-[#8E9BA8]";
        badge.innerHTML = `Target Saham: <strong>0,00%</strong> &bull; Sisa Kas: <strong>100,00%</strong>`;
      }
    }

    if (plan.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-5 px-4 text-center text-xs text-slate-500 dark:text-[#8E9BA8]">
            Belum ada saham di portofolio untuk disimulasikan rebalancing.
          </td>
        </tr>
      `;
      return;
    }

    const maxWeightScale = Math.max(
      25,
      ...plan.items.map((i) => Math.max(Number(i.actualWeight) || 0, Number(i.targetWeight) || 0))
    );

    tbody.innerHTML = plan.items
      .map((item) => {
        const safeId = escapeHTML(item.id);
        const actualBarPct = Math.min(100, Math.round(((Number(item.actualWeight) || 0) / maxWeightScale) * 100));
        const targetBarPct = Math.min(100, Math.round(((Number(item.targetWeight) || 0) / maxWeightScale) * 100));
        const actionBadge =
          item.action === "BUY"
            ? `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-sans tabular-nums font-bold bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border border-[#10B981]/25">Beli +${item.suggestedLots.toLocaleString("id-ID")} Lot</span>`
            : item.action === "SELL"
            ? `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-sans tabular-nums font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">Jual ${item.suggestedLots.toLocaleString("id-ID")} Lot</span>`
            : `<span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#0C1117] text-slate-500 dark:text-[#8E9BA8]">On Target</span>`;

        const driftClass =
          Math.abs(item.driftPct) < 0.5
            ? "text-slate-500 dark:text-[#8E9BA8]"
            : item.driftPct > 0
            ? "text-amber-600 dark:text-amber-400"
            : "text-sky-600 dark:text-sky-400";

        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
            <td class="py-2.5 px-4">
              <div class="font-bold text-slate-900 dark:text-[#EEF2F6]">${escapeHTML(item.ticker)}</div>
              <div class="text-[11px] text-slate-500 dark:text-[#8E9BA8] truncate max-w-[160px]">${escapeHTML(item.name)}</div>
            </td>
            <td class="py-2.5 px-3 text-right font-sans tabular-nums">
              <div class="font-semibold text-slate-800 dark:text-[#EEF2F6]">${formatNum(item.actualWeight, 2)}% <span class="text-[10px] font-normal text-slate-400">/ ${formatNum(item.targetWeight, 1)}%</span></div>
              <div class="w-28 ml-auto mt-1 space-y-0.5" title="Hijau: Bobot Aktual (${formatNum(item.actualWeight, 2)}%) • Biru: Target (${formatNum(item.targetWeight, 2)}%)">
                <div class="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-[#0C1117] overflow-hidden">
                  <div class="h-full rounded-full bg-[#10B981]" style="width:${actualBarPct}%"></div>
                </div>
                <div class="h-1 w-full rounded-full bg-slate-200/80 dark:bg-[#0C1117] overflow-hidden">
                  <div class="h-full rounded-full bg-sky-400" style="width:${targetBarPct}%"></div>
                </div>
              </div>
            </td>
            <td class="py-2.5 px-3 text-right">
              <div class="inline-flex items-center gap-1 justify-end">
                <input
                  type="text"
                  inputmode="decimal"
                  data-num-input="dec"
                  data-num-decimals="2"
                  value="${formatIDInputValue(item.targetWeight, "dec", 2)}"
                  aria-label="Target bobot ${escapeHTML(item.ticker)}"
                  data-onchange="updateHoldingTargetWeight('${safeId}', this.value)"
                  class="w-20 px-2 py-1 rounded-lg text-right font-sans tabular-nums font-bold text-xs bg-slate-50 dark:bg-[#0C1117] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-[#EEF2F6] focus:outline-none focus:ring-1 focus:ring-[#10B981]"
                />
                <span class="text-xs text-slate-400">%</span>
              </div>
            </td>
            <td class="py-2.5 px-3 text-right font-sans tabular-nums font-semibold ${driftClass}">
              ${formatPct(item.driftPct)}
            </td>
            <td class="py-2.5 px-3 text-right font-sans tabular-nums ${colorClass(item.diffIDR)}">
              ${formatSignedIDR(item.diffIDR)}
            </td>
            <td class="py-2.5 px-4 text-right">
              ${actionBadge}
            </td>
          </tr>
        `;
      })
      .join("");
  }

  return {
    renderPortfolioTab,
    renderPortfolioDividendRecap
  };
}
