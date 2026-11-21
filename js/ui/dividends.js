import { MONTH_NAMES_ID, MONTH_SHORT_ID } from "../state.js";
import {
  formatNum,
  formatIDR,
  formatCompactIDR,
  escapeHTML,
  getJakartaTimeInfo,
  getTodayISO
} from "../storage.js";
import {
  getChartTextColor,
  getChartGridColor,
  destroyChart as destroyChartInstance
} from "../charts.js";

/**
 * Tab 2 (Dividends & Projections) UI module.
 * Registers window.* handlers for inline HTML event bindings and returns dividend renderers.
 */
export function createDividendsUI(ctx) {
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

  const destroyChart = (key) => destroyChartInstance(charts, key);

  window.setDividendQuickDate = function (mode) {
    const dateEl = document.getElementById("div-date");
    if (!dateEl) return;
    const today = getTodayISO();
    if (mode === "TODAY") {
      dateEl.value = today;
    } else if (mode === "NEXT_YEAR") {
      const curVal = dateEl.value || today;
      const parts = curVal.split("-");
      const nextYr = (Number(parts[0]) || Number(today.slice(0, 4))) + 1;
      dateEl.value = `${nextYr}-${parts[1] || "04"}-${parts[2] || "15"}`;
    }
  };

  window.openDividendModal = function (preselectTicker = "") {
    const state = getState();
    const datalist = document.getElementById("div-ticker-options");
    if (datalist) {
      datalist.innerHTML = state.holdings.map((h) => `<option value="${escapeHTML(h.ticker)}">${escapeHTML(h.name || "")}</option>`).join("");
    }
    document.getElementById("div-ticker").value = preselectTicker || "";
    document.getElementById("div-date").value = getTodayISO();
    document.getElementById("div-amount").value = "";
    document.getElementById("div-note").value = "";
    window.onDivTickerInput();
    openModal("modal-dividend");
  };

  window.onDivTickerInput = function () {
    const state = getState();
    const ticker = (document.getElementById("div-ticker").value || "").toUpperCase().trim();
    const hint = document.getElementById("div-holding-hint");
    const h = state.holdings.find((item) => item.ticker === ticker);
    if (h) {
      hint.classList.remove("hidden");
      hint.innerHTML = `<span>Dimiliki: <strong>${Number(h.shares).toLocaleString("id-ID")} lbr</strong></span><span class="font-mono">Valuasi: ${formatIDR(h.shares * h.currentPrice)}</span>`;
    } else {
      hint.classList.add("hidden");
    }
  };

  window.handleAddDividend = function (e) {
    e.preventDefault();
    const state = getState();
    const ticker = (document.getElementById("div-ticker").value || "").toUpperCase().trim();
    const date = document.getElementById("div-date").value || getTodayISO();
    const amount = Math.max(0, Number(document.getElementById("div-amount").value) || 0);
    const note = (document.getElementById("div-note").value || "").trim();
    const syncSched = document.getElementById("div-sync-schedule").checked;

    if (!ticker || amount <= 0) {
      showToast("Masukkan kode emiten dan nominal dividen yang valid.", "error");
      return;
    }

    state.dividends.unshift({
      id: `div-${Date.now()}`,
      ticker,
      date,
      amount,
      note: note || "Dividen Tunai"
    });

    state.cash = (Number(state.cash) || 0) + amount;

    if (syncSched && !state.dividendSchedules[ticker]) {
      const h = state.holdings.find((item) => item.ticker === ticker);
      const shares = h ? Number(h.shares) || 0 : 0;
      if (shares > 0) {
        const moIdx = Math.max(0, Math.min(11, (parseInt(date.split("-")[1], 10) || 4) - 1));
        state.dividendSchedules[ticker] = {
          payouts: [{ month: moIdx, dps: Number((amount / shares).toFixed(2)) }]
        };
      }
    }

    const divYear = String(date || "").slice(0, 4);
    const yearSelectEl = document.getElementById("div-year-select");
    if (yearSelectEl && divYear.length === 4) {
      if (!Array.from(yearSelectEl.options).some((opt) => opt.value === divYear)) {
        const opt = document.createElement("option");
        opt.value = divYear;
        opt.textContent = divYear;
        yearSelectEl.appendChild(opt);
      }
      yearSelectEl.value = divYear;
      yearSelectEl.dataset.userPicked = "1";
    }

    closeModal("modal-dividend");
    commitStateChange(`Dividen ${ticker} (${divYear}) sebesar ${formatIDR(amount)} ditambahkan ke Kas RDN`);
  };

  window.deleteDividend = function (divId) {
    const state = getState();
    const idx = state.dividends.findIndex((d) => d.id === divId);
    if (idx < 0) return;
    const item = state.dividends[idx];
    askConfirm(
      `Hapus Catatan Dividen ${item.ticker}?`,
      `Nominal ${formatIDR(item.amount)} akan dihapus dari riwayat dan dikurangkan kembali dari Saldo Kas RDN.`,
      () => {
        const curState = getState();
        curState.cash = Math.max(0, (Number(curState.cash) || 0) - (Number(item.amount) || 0));
        const curIdx = curState.dividends.findIndex((d) => d.id === divId);
        if (curIdx >= 0) curState.dividends.splice(curIdx, 1);
        commitStateChange(`Catatan dividen ${item.ticker} dihapus`);
      }
    );
  };

  window.openDividendScheduleModal = function (ticker) {
    const state = getState();
    const t = ticker.toUpperCase().trim();
    const h = state.holdings.find((item) => item.ticker === t);
    const sched = state.dividendSchedules[t] || { payouts: [] };
    const p1 = sched.payouts?.[0] || { month: 3, dps: 0 };
    const p2 = sched.payouts?.[1] || { month: 11, dps: 0 };

    document.getElementById("sched-ticker-input").value = t;
    document.getElementById("sched-ticker-label").textContent = t;
    document.getElementById("sched-owned-shares").textContent = h ? `${Number(h.shares).toLocaleString("id-ID")} lembar` : "0 lembar";
    document.getElementById("sched-owned-avg").textContent = h ? `Rp ${formatNum(h.avgPrice, 2)}` : "Rp 0";
    document.getElementById("sched-month-1").value = String(p1.month ?? 3);
    document.getElementById("sched-dps-1").value = p1.dps || 0;
    document.getElementById("sched-month-2").value = String(p2.month ?? 11);
    document.getElementById("sched-dps-2").value = p2.dps || 0;

    window.updateSchedulePreview();
    openModal("modal-dividend-schedule");
  };

  window.updateSchedulePreview = function () {
    const state = getState();
    const t = document.getElementById("sched-ticker-input").value;
    const h = state.holdings.find((item) => item.ticker === t);
    const shares = h ? Number(h.shares) || 0 : 0;
    const cost = h ? shares * (Number(h.avgPrice) || 0) : 0;
    const dps1 = Math.max(0, Number(document.getElementById("sched-dps-1").value) || 0);
    const dps2 = Math.max(0, Number(document.getElementById("sched-dps-2").value) || 0);
    const totalDps = dps1 + dps2;
    const annualEst = shares * totalDps;
    const yoc = cost > 0 ? (annualEst / cost) * 100 : 0;

    document.getElementById("sched-prev-dps").textContent = `Rp ${formatNum(totalDps, 2)} / lbr`;
    document.getElementById("sched-prev-annual").textContent = formatIDR(annualEst);
    document.getElementById("sched-prev-yoc").textContent = `${formatNum(yoc, 2)}%`;
  };

  window.handleSaveDividendSchedule = function (e) {
    e.preventDefault();
    const state = getState();
    const t = document.getElementById("sched-ticker-input").value;
    const m1 = Number(document.getElementById("sched-month-1").value) || 0;
    const d1 = Math.max(0, Number(document.getElementById("sched-dps-1").value) || 0);
    const m2 = Number(document.getElementById("sched-month-2").value) || 0;
    const d2 = Math.max(0, Number(document.getElementById("sched-dps-2").value) || 0);

    const payouts = [];
    if (d1 > 0) payouts.push({ month: m1, dps: d1 });
    if (d2 > 0) payouts.push({ month: m2, dps: d2 });
    state.dividendSchedules[t] = { payouts };

    closeModal("modal-dividend-schedule");
    commitStateChange(`Jadwal & estimasi DPS ${t} disimpan`);
  };

  function renderDividendProjectionSim(passedAnnualEst = null, passedStockVal = null) {
    const state = getState();
    const m = computeMetrics();
    let baseAnnualDiv = passedAnnualEst;
    if (baseAnnualDiv === null) {
      baseAnnualDiv = 0;
      for (const h of state.holdings) {
        const shares = Number(h.shares) || 0;
        const sched = state.dividendSchedules[h.ticker] || { payouts: [] };
        (sched.payouts || []).forEach((p) => {
          baseAnnualDiv += shares * (Math.max(0, Number(p.dps) || 0));
        });
      }
    }
    const stockVal = passedStockVal !== null ? passedStockVal : m.stockValTotal;
    const baseYield = stockVal > 0 && baseAnnualDiv > 0 ? baseAnnualDiv / stockVal : 0.065;
    const startYear = Number(state.meta.activeYear) || getJakartaTimeInfo().year;

    const growthPct = Math.max(0, Number(document.getElementById("div-proj-growth")?.value) || 0) / 100;
    const monthlyTopup = Math.max(0, Number(document.getElementById("div-proj-topup")?.value) || 0);
    const useDrip = document.getElementById("div-proj-drip")?.checked !== false;

    let organicBaseDiv = baseAnnualDiv;
    let addedCapitalFromTopupAndDrip = 0;

    const labels = [];
    const annualSeries = [];
    const monthlySeries = [];
    let cumDiv10Y = 0;
    let y5Annual = 0;
    let y10Annual = 0;

    for (let yr = 1; yr <= 10; yr++) {
      const yearNum = startYear + yr - 1;
      if (yr > 1) {
        organicBaseDiv = organicBaseDiv * (1 + growthPct);
        addedCapitalFromTopupAndDrip += monthlyTopup * 12;
      }

      const annualDiv = organicBaseDiv + addedCapitalFromTopupAndDrip * baseYield;
      if (useDrip) {
        addedCapitalFromTopupAndDrip += annualDiv;
      }

      cumDiv10Y += annualDiv;
      if (yr === 5) y5Annual = annualDiv;
      if (yr === 10) y10Annual = annualDiv;

      labels.push(String(yearNum));
      annualSeries.push(Math.round(annualDiv));
      monthlySeries.push(Math.round(annualDiv / 12));
    }

    document.getElementById("div-proj-y5-monthly").textContent = formatIDR(y5Annual / 12);
    document.getElementById("div-proj-y5-annual").textContent = `${formatIDR(y5Annual)} / thn`;

    document.getElementById("div-proj-y10-monthly").textContent = formatIDR(y10Annual / 12);
    document.getElementById("div-proj-y10-annual").textContent = `${formatIDR(y10Annual)} / thn`;

    document.getElementById("div-proj-10y-cum").textContent = formatIDR(cumDiv10Y);

    const canvas = document.getElementById("chart-dividend-projection");
    if (!canvas) return;
    destroyChart("divProj");
    charts.divProj = new Chart(canvas, {
      data: {
        labels,
        datasets: [
          {
            type: "bar",
            label: "Estimasi Dividen / Tahun (Rp)",
            data: annualSeries,
            backgroundColor: "rgba(16, 185, 129, 0.78)",
            borderColor: "#10b981",
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y"
          },
          {
            type: "line",
            label: "Rata-rata Dividen / Bulan (Rp)",
            data: monthlySeries,
            borderColor: "#f59e0b",
            backgroundColor: "#f59e0b",
            borderWidth: 2.5,
            pointRadius: 3.5,
            tension: 0.3,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } }, grid: { display: false } },
          y: {
            position: "left",
            ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 10 }, callback: (v) => formatCompactIDR(v) },
            grid: { color: getChartGridColor() }
          },
          y1: {
            position: "right",
            ticks: { color: "#f59e0b", font: { family: "JetBrains Mono", size: 10 }, callback: (v) => formatCompactIDR(v) },
            grid: { drawOnChartArea: false }
          }
        },
        plugins: {
          legend: {
            labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            callbacks: {
              label: (tooltipCtx) => ` ${tooltipCtx.dataset.label}: ${formatIDR(tooltipCtx.raw)}`
            }
          }
        }
      }
    });
  }

  window.renderDividendProjectionSim = renderDividendProjectionSim;

  function renderActualDividendsSection(selectedYear) {
    const state = getState();
    const mode = document.getElementById("div-actual-chart-mode")?.value || "MONTHLY";
    const canvas = document.getElementById("chart-dividend-actual");
    const subEl = document.getElementById("div-actual-chart-sub");
    const recapEl = document.getElementById("div-annual-recap-container");

    const byYear = {};
    state.dividends.forEach((d) => {
      const yr = String(d.date || "").slice(0, 4) || selectedYear;
      byYear[yr] = (byYear[yr] || 0) + (Number(d.amount) || 0);
    });

    if (recapEl) {
      const entries = Object.entries(byYear).sort((a, b) => Number(a[0]) - Number(b[0]));
      recapEl.innerHTML =
        entries.length === 0
          ? `<span class="text-xs text-slate-400 dark:text-[#8E9BA8]">Belum ada realisasi dividen yang dicatat.</span>`
          : `<div class="flex flex-wrap items-center gap-1.5"><span class="text-xs font-medium text-slate-500 dark:text-[#8E9BA8] mr-1">Rekap per Tahun:</span>${entries
              .map(
                ([yr, tot]) =>
                  `<span class="px-2.5 py-1 rounded-md text-xs font-sans tabular-nums font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">${yr}: ${formatIDR(tot)}</span>`
              )
              .join("")}</div>`;
    }

    if (canvas) {
      destroyChart("divActual");
      if (mode === "ANNUAL") {
        if (subEl) subEl.textContent = "Akumulasi dividen cair per tahun (Multi-Tahun)";
        const yrs = Object.keys(byYear).sort((a, b) => Number(a) - Number(b));
        charts.divActual = new Chart(canvas, {
          type: "bar",
          data: {
            labels: yrs.length > 0 ? yrs : [selectedYear],
            datasets: [
              {
                label: "Dividen Cair Tahunan (Rp)",
                data: yrs.length > 0 ? yrs.map((y) => byYear[y]) : [0],
                backgroundColor: "#6366f1",
                borderRadius: 6
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } }, grid: { display: false } },
              y: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 10 }, callback: (v) => formatCompactIDR(v) }, grid: { color: getChartGridColor() } }
            },
            plugins: {
              legend: { labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, boxWidth: 10 } },
              tooltip: { callbacks: { label: (tooltipCtx) => ` ${tooltipCtx.dataset.label}: ${formatIDR(tooltipCtx.raw)}` } }
            }
          }
        });
      } else {
        if (subEl) subEl.textContent = `Realisasi aktual vs estimasi proyeksi bulanan (${selectedYear})`;
        const moActual = new Array(12).fill(0);
        state.dividends
          .filter((d) => String(d.date || "").startsWith(selectedYear))
          .forEach((d) => {
            const mo = Math.max(0, Math.min(11, (parseInt(String(d.date).split("-")[1], 10) || 1) - 1));
            moActual[mo] += Number(d.amount) || 0;
          });

        const moEst = new Array(12).fill(0);
        for (const h of state.holdings) {
          const shares = Number(h.shares) || 0;
          const sched = state.dividendSchedules[h.ticker] || { payouts: [] };
          (sched.payouts || []).forEach((p) => {
            const mo = Math.max(0, Math.min(11, Number(p.month) || 0));
            moEst[mo] += shares * (Math.max(0, Number(p.dps) || 0));
          });
        }

        charts.divActual = new Chart(canvas, {
          type: "bar",
          data: {
            labels: MONTH_SHORT_ID,
            datasets: [
              {
                label: `Aktual Cair (${selectedYear})`,
                data: moActual,
                backgroundColor: "#6366f1",
                borderRadius: 5
              },
              {
                label: "Estimasi Jadwal",
                data: moEst,
                backgroundColor: "rgba(245, 158, 11, 0.35)",
                borderColor: "#f59e0b",
                borderWidth: 1,
                borderRadius: 5
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 10 } }, grid: { display: false } },
              y: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 10 }, callback: (v) => formatCompactIDR(v) }, grid: { color: getChartGridColor() } }
            },
            plugins: {
              legend: { labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, boxWidth: 10 } },
              tooltip: { callbacks: { label: (tooltipCtx) => ` ${tooltipCtx.dataset.label}: ${formatIDR(tooltipCtx.raw)}` } }
            }
          }
        });
      }
    }

    document.getElementById("div-actual-count-badge").textContent = `${state.dividends.length} catatan`;
    const histBody = document.getElementById("dividend-history-body");
    if (histBody) {
      if (state.dividends.length === 0) {
        histBody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-slate-400 dark:text-[#8E9BA8]">Belum ada riwayat dividen tunai. Klik "Catat Dividen Tunai" untuk menambahkan.</td></tr>`;
      } else {
        histBody.innerHTML = state.dividends
          .map(
            (d) => `
            <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
              <td class="py-2.5 px-4 font-sans tabular-nums text-slate-600 dark:text-[#8E9BA8] whitespace-nowrap">${escapeHTML(d.date)}</td>
              <td class="py-2.5 px-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md font-sans font-bold text-xs text-white" style="background:${getEmitenColor(d.ticker)}">
                  ${escapeHTML(d.ticker)}
                </span>
              </td>
              <td class="py-2.5 px-3 text-right font-sans tabular-nums font-bold text-[#10B981] whitespace-nowrap">${formatIDR(d.amount)}</td>
              <td class="py-2.5 px-3 text-slate-500 dark:text-[#8E9BA8]">${escapeHTML(d.note || "")}</td>
              <td class="py-2.5 px-3 text-center">
                <button type="button" onclick="deleteDividend('${escapeHTML(d.id)}')" class="p-1 rounded hover:bg-rose-500/15 text-slate-400 dark:text-[#8E9BA8] hover:text-rose-400" title="Hapus">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </td>
            </tr>
          `
          )
          .join("");
      }
    }
  }

  function renderDividendsTab() {
    const state = getState();
    const m = computeMetrics();
    const jkt = getJakartaTimeInfo();
    const activeYr = String(state.meta.activeYear || jkt.year);

    const yearSelect = document.getElementById("div-year-select");
    const yearSet = new Set([activeYr, String(jkt.year)]);
    state.dividends.forEach((d) => {
      const y = String(d.date || "").slice(0, 4);
      if (y.length === 4) yearSet.add(y);
    });
    const years = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
    if (yearSelect) {
      const currentChoice = yearSelect.dataset.userPicked === "1" ? yearSelect.value : activeYr;
      yearSelect.innerHTML = years.map((y) => `<option value="${y}" class="bg-white dark:bg-[#141C24] text-slate-900 dark:text-[#EEF2F6]">${y}</option>`).join("");
      yearSelect.value = years.includes(currentChoice) ? currentChoice : activeYr;
    }
    const selectedYear = yearSelect ? yearSelect.value : activeYr;

    const monthlyTotals = new Array(12).fill(0);
    const monthlyEmitens = Array.from({ length: 12 }, () => []);
    const emitenBreakdown = [];
    let annualEstimate = 0;

    for (const h of state.holdings) {
      const shares = Number(h.shares) || 0;
      const cost = shares * (Number(h.avgPrice) || 0);
      const val = shares * (Number(h.currentPrice) || 0);
      const sched = state.dividendSchedules[h.ticker] || { payouts: [] };
      const payouts = Array.isArray(sched.payouts) ? sched.payouts : [];

      let totalDps = 0;
      let emitenEst = 0;
      const scheduleBadges = [];

      for (const p of payouts) {
        const mo = Math.max(0, Math.min(11, Number(p.month) || 0));
        const dps = Math.max(0, Number(p.dps) || 0);
        if (dps > 0) {
          const amt = shares * dps;
          const payoutIdx = scheduleBadges.length;
          const dpsFormatted = dps % 1 === 0 ? Math.round(dps).toLocaleString("id-ID") : formatNum(dps, 1);
          const pillStyle =
            payoutIdx === 0
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
          totalDps += dps;
          emitenEst += amt;
          monthlyTotals[mo] += amt;
          monthlyEmitens[mo].push({ ticker: h.ticker, amount: amt });
          scheduleBadges.push(
            `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-sans tabular-nums font-medium border whitespace-nowrap ${pillStyle}">${MONTH_SHORT_ID[mo]} (Rp ${dpsFormatted})</span>`
          );
        }
      }

      annualEstimate += emitenEst;
      const actualYearEmiten = state.dividends
        .filter((d) => d.ticker === h.ticker && String(d.date || "").startsWith(selectedYear))
        .reduce((s, d) => s + (Number(d.amount) || 0), 0);

      emitenBreakdown.push({
        ticker: h.ticker,
        name: h.name,
        shares,
        cost,
        val,
        totalDps,
        payoutCount: scheduleBadges.length,
        scheduleHTML:
          scheduleBadges.length > 0
            ? `<div class="flex flex-col items-start gap-1">${scheduleBadges.join("")}</div>`
            : `<button type="button" onclick="openDividendScheduleModal('${escapeHTML(h.ticker)}')" class="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-[#0C1117] text-slate-500 dark:text-[#8E9BA8] hover:text-amber-500 border border-slate-200/70 dark:border-white/[0.07] transition-colors whitespace-nowrap">Belum diatur</button>`,
        annualEst: emitenEst,
        monthlyAvg: emitenEst / 12,
        actualYear: actualYearEmiten,
        yoc: cost > 0 ? (emitenEst / cost) * 100 : 0,
        mktYield: val > 0 ? (emitenEst / val) * 100 : 0
      });
    }

    const actualYearTotal = state.dividends
      .filter((d) => String(d.date || "").startsWith(selectedYear))
      .reduce((s, d) => s + (Number(d.amount) || 0), 0);

    const overallYoC = m.stockCostTotal > 0 ? (annualEstimate / m.stockCostTotal) * 100 : 0;
    const overallMktYield = m.stockValTotal > 0 ? (annualEstimate / m.stockValTotal) * 100 : 0;
    const progressPct = annualEstimate > 0 ? (actualYearTotal / annualEstimate) * 100 : 0;

    let peakMonthIdx = 0;
    let peakMonthVal = 0;
    let activeMonthsCount = 0;
    monthlyTotals.forEach((val, idx) => {
      if (val > 0) activeMonthsCount++;
      if (val > peakMonthVal) {
        peakMonthVal = val;
        peakMonthIdx = idx;
      }
    });

    document.getElementById("div-hero-monthly-avg").textContent = formatIDR(annualEstimate / 12);
    document.getElementById("div-hero-annual").textContent = formatIDR(annualEstimate);
    document.getElementById("div-hero-yoc").textContent = `${formatNum(overallYoC, 2)}%`;
    document.getElementById("div-hero-yield-market").textContent = `${formatNum(overallMktYield, 2)}%`;
    document.getElementById("div-hero-stock-val").textContent = formatIDR(m.stockValTotal);
    document.getElementById("div-hero-stock-cost").textContent = formatIDR(m.stockCostTotal);
    document.getElementById("div-hero-actual-label").textContent = `Dividen Cair (${selectedYear})`;
    document.getElementById("div-hero-actual-total").textContent = formatIDR(actualYearTotal);
    document.getElementById("div-hero-alltime-sub").textContent = `All-Time: ${formatIDR(m.totalDividendsReceived)}`;

    document.getElementById("div-insight-peak").textContent =
      peakMonthVal > 0 ? `Panen Tertinggi: ${MONTH_NAMES_ID[peakMonthIdx]} (${formatCompactIDR(peakMonthVal)})` : "Panen Tertinggi: —";
    document.getElementById("div-insight-active-months").textContent = `${activeMonthsCount}/12 Bulan Cair`;

    document.getElementById("div-progress-title").textContent = `Progres Realisasi Dividen Tahun ${selectedYear} (Aktual vs Estimasi)`;
    document.getElementById("div-progress-remaining").textContent = `Sisa Potensi: ${formatIDR(Math.max(0, annualEstimate - actualYearTotal))}`;
    document.getElementById("div-progress-pct").textContent = `${formatNum(progressPct, 1)}%`;
    document.getElementById("div-progress-bar").style.width = `${Math.min(100, progressPct)}%`;

    // 12-Month Calendar Grid
    const calGrid = document.getElementById("dividend-calendar-grid");
    if (calGrid) {
      calGrid.innerHTML = MONTH_NAMES_ID.map((mName, idx) => {
        const val = monthlyTotals[idx];
        const isPeak = peakMonthVal > 0 && idx === peakMonthIdx;
        const isCurrent = idx === jkt.monthIndex;
        const cardCls = isPeak
          ? "border-amber-500/50 bg-amber-500/[0.07]"
          : isCurrent
          ? "border-[#10B981]/50 bg-[#10B981]/[0.07]"
          : "border-slate-200/80 dark:border-white/[0.08] bg-slate-50/60 dark:bg-[#0C1117]/70";
        const monthTitleCls = isPeak
          ? "text-amber-600 dark:text-amber-400 font-bold"
          : isCurrent
          ? "text-emerald-600 dark:text-[#10B981] font-bold"
          : val > 0
          ? "text-slate-800 dark:text-[#EEF2F6] font-semibold"
          : "text-slate-500 dark:text-[#8E9BA8] font-medium";
        const amountCls = isPeak
          ? "text-amber-600 dark:text-amber-400"
          : val > 0
          ? "text-emerald-600 dark:text-[#10B981]"
          : "text-slate-400 dark:text-[#8E9BA8]/60";
        const rightBadge =
          isPeak && isCurrent
            ? '<div class="flex items-center gap-1.5"><span class="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300">Peak</span><span class="w-1.5 h-1.5 rounded-full bg-[#10B981]" title="Bulan Ini"></span></div>'
            : isPeak
            ? '<span class="px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300">Peak</span>'
            : isCurrent
            ? '<span class="w-1.5 h-1.5 rounded-full bg-[#10B981]" title="Bulan Ini"></span>'
            : "";
        const chips = monthlyEmitens[idx]
          .map((item) => {
            const c = getEmitenColor(item.ticker);
            return `<span class="px-1.5 py-0.5 rounded text-[10px] font-sans tabular-nums font-semibold" style="background:${c}18; border:1px solid ${c}44; color:${c}">${escapeHTML(item.ticker)}</span>`;
          })
          .join("");
        const barPct = peakMonthVal > 0 && val > 0 ? Math.max(6, Math.min(100, (val / peakMonthVal) * 100)) : 0;

        return `
          <div class="p-3 rounded-lg border ${cardCls} flex flex-col justify-between min-h-[104px] text-left">
            <div>
              <div class="flex items-center justify-between gap-1">
                <span class="text-xs ${monthTitleCls}">${mName}</span>
                ${rightBadge}
              </div>
              <div class="font-sans tabular-nums font-bold text-sm ${amountCls} my-1.5">
                ${val > 0 ? formatCompactIDR(val) : "Rp 0"}
              </div>
              <div class="flex flex-wrap gap-1 min-h-[20px]">
                ${chips || '<span class="text-xs text-slate-400 dark:text-[#8E9BA8]/50">—</span>'}
              </div>
            </div>
            <div class="w-full h-1 rounded-full bg-slate-200/80 dark:bg-white/[0.06] overflow-hidden mt-2.5">
              <div class="h-full rounded-full ${isPeak ? "bg-amber-400" : "bg-[#10B981]"} transition-all duration-500" style="width:${barPct}%"></div>
            </div>
          </div>
        `;
      }).join("");
    }

    // Stacked Monthly Chart
    const stackedCanvas = document.getElementById("chart-dividend-monthly-stacked");
    if (stackedCanvas) {
      destroyChart("divStacked");
      const datasets = state.holdings.map((h) => {
        const shares = Number(h.shares) || 0;
        const sched = state.dividendSchedules[h.ticker] || { payouts: [] };
        const arr = new Array(12).fill(0);
        (sched.payouts || []).forEach((p) => {
          const mo = Math.max(0, Math.min(11, Number(p.month) || 0));
          arr[mo] += shares * (Math.max(0, Number(p.dps) || 0));
        });
        return {
          label: h.ticker,
          data: arr,
          backgroundColor: getEmitenColor(h.ticker),
          borderRadius: 4
        };
      });

      charts.divStacked = new Chart(stackedCanvas, {
        type: "bar",
        data: { labels: MONTH_SHORT_ID, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } }, grid: { display: false } },
            y: {
              stacked: true,
              ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 10 }, callback: (v) => formatCompactIDR(v) },
              grid: { color: getChartGridColor() }
            }
          },
          plugins: {
            legend: { labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, boxWidth: 10 } },
            tooltip: {
              callbacks: {
                label: (tooltipCtx) => ` ${tooltipCtx.dataset.label}: ${formatIDR(tooltipCtx.raw)}`
              }
            }
          }
        }
      });
    }

    // Emiten Contribution Donut
    const donutCanvas = document.getElementById("chart-dividend-emiten-donut");
    if (donutCanvas) {
      destroyChart("divDonut");
      const activeDivItems = emitenBreakdown.filter((i) => i.annualEst > 0);
      charts.divDonut = new Chart(donutCanvas, {
        type: "doughnut",
        data: {
          labels: activeDivItems.length > 0 ? activeDivItems.map((i) => i.ticker) : ["Belum ada estimasi"],
          datasets: [
            {
              data: activeDivItems.length > 0 ? activeDivItems.map((i) => i.annualEst) : [1],
              backgroundColor: activeDivItems.length > 0 ? activeDivItems.map((i) => getEmitenColor(i.ticker)) : ["#475569"],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: { position: "bottom", labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, boxWidth: 10 } },
            tooltip: {
              callbacks: {
                label: (tooltipCtx) => {
                  if (activeDivItems.length === 0) return " Atur jadwal DPS emiten";
                  const val = Number(tooltipCtx.raw) || 0;
                  const pct = annualEstimate > 0 ? (val / annualEstimate) * 100 : 0;
                  return ` ${tooltipCtx.label}: ${formatIDR(val)} (${formatNum(pct, 1)}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Breakdown Table
    document.getElementById("div-col-actual-header").textContent = `Sudah Cair (${selectedYear})`;
    const bdBody = document.getElementById("dividend-breakdown-body");
    bdBody.innerHTML = emitenBreakdown
      .sort((a, b) => b.annualEst - a.annualEst)
      .map((item) => {
        const sharePct = annualEstimate > 0 ? (item.annualEst / annualEstimate) * 100 : 0;
        const badgeColor = getEmitenColor(item.ticker);
        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
            <td class="py-3 px-4">
              <div class="flex items-center gap-2.5">
                <span class="w-8 h-8 rounded-lg font-sans font-bold text-xs flex items-center justify-center shrink-0" style="background:${badgeColor}18; border:1px solid ${badgeColor}55; color:${badgeColor}">
                  ${escapeHTML(item.ticker)}
                </span>
                <div class="min-w-0">
                  <div class="font-bold text-slate-900 dark:text-[#EEF2F6] text-xs sm:text-sm leading-tight">${escapeHTML(item.ticker)}</div>
                  <div class="text-[11px] text-slate-500 dark:text-[#8E9BA8] truncate max-w-[145px]">${escapeHTML(item.name || "")}</div>
                </div>
              </div>
            </td>
            <td class="py-3 px-3 text-right font-sans tabular-nums font-semibold text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">
              ${item.shares.toLocaleString("id-ID")}
            </td>
            <td class="py-3 px-3 text-right font-sans tabular-nums font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
              Rp ${formatNum(item.totalDps, 2)}
            </td>
            <td class="py-3 px-3">${item.scheduleHTML}</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums font-bold text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${formatIDR(item.annualEst)}</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums text-slate-600 dark:text-[#8E9BA8] whitespace-nowrap">${formatIDR(item.monthlyAvg)}</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums font-semibold text-[#10B981] whitespace-nowrap">${formatIDR(item.actualYear)}</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">${formatNum(item.yoc, 2)}%</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums font-bold text-[#10B981] whitespace-nowrap">${formatNum(item.mktYield, 2)}%</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums whitespace-nowrap">
              <div class="font-bold text-slate-900 dark:text-[#EEF2F6] text-xs">${formatNum(sharePct, 1)}%</div>
              <div class="mt-1.5 h-1.5 w-14 ml-auto rounded-full bg-slate-200 dark:bg-[#0C1117] overflow-hidden">
                <div class="h-full rounded-full" style="width:${Math.min(100, sharePct)}%; background:${badgeColor}"></div>
              </div>
            </td>
            <td class="py-3 px-4 text-center">
              <div class="inline-flex items-center gap-1.5">
                <button type="button" onclick="openDividendScheduleModal('${escapeHTML(item.ticker)}')" class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/25 transition-colors whitespace-nowrap" title="Atur Estimasi DPS & Bulan Cair">Atur DPS</button>
                <button type="button" onclick="openDividendModal('${escapeHTML(item.ticker)}')" class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#10B981]/15 hover:bg-[#10B981]/25 text-emerald-600 dark:text-[#10B981] border border-[#10B981]/25 transition-colors whitespace-nowrap" title="Catat Dividen Cair">Catat Cair</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    document.getElementById("dividend-breakdown-foot").innerHTML = `
      <tr>
        <td colspan="4" class="py-3.5 px-4 text-slate-900 dark:text-[#EEF2F6]">Total Estimasi &amp; Realisasi Dividen</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">${formatIDR(annualEstimate)}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums font-bold text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${formatIDR(annualEstimate / 12)}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums font-bold text-[#10B981] whitespace-nowrap">${formatIDR(actualYearTotal)}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">${formatNum(overallYoC, 2)}%</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums font-bold text-[#10B981] whitespace-nowrap">${formatNum(overallMktYield, 2)}%</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums font-bold text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">100,0%</td>
        <td></td>
      </tr>
    `;

    renderDividendProjectionSim(annualEstimate, m.stockValTotal);
    renderActualDividendsSection(selectedYear);
  }

  window.renderDividendsTab = renderDividendsTab;

  return {
    renderDividendsTab,
    renderActualDividendsSection,
    renderDividendProjectionSim
  };
}
