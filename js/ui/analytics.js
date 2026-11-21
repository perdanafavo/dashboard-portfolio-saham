import { computeAllTimeMetrics } from "../nav-engine.js";
import { MONTH_NAMES_ID } from "../state.js";
import {
  formatNum,
  formatIDR,
  formatSignedIDR,
  formatCompactIDR,
  formatPct,
  colorClass,
  getJakartaTimeInfo
} from "../storage.js";
import {
  getChartTextColor,
  getChartGridColor,
  destroyChart as destroyChartInstance
} from "../charts.js";

/**
 * Tab 4 (Analytics & Historical Tables) UI module.
 * Registers window.* handlers for inline HTML event bindings and returns renderAnalyticsTab().
 */
export function createAnalyticsUI(ctx) {
  const {
    getState,
    charts,
    computeMetrics,
    commitStateChange,
    showToast,
    openModal,
    closeModal,
    ensureYearStructure
  } = ctx;

  const destroyChart = (key) => destroyChartInstance(charts, key);
  let selectedAnalyticsYear = null;

  window.onAnalyticsYearChange = function () {
    const yr = Number(document.getElementById("analytics-year-select").value);
    if (yr) {
      selectedAnalyticsYear = yr;
      renderAnalyticsTab();
    }
  };

  window.updateBenchmarkInputs = function () {
    const state = getState();
    const ihsgStart = Number(document.getElementById("bench-ihsg-start").value);
    const ihsgEnd = Number(document.getElementById("bench-ihsg-end").value);
    const lq45Start = Number(document.getElementById("bench-lq45-start").value);
    const lq45End = Number(document.getElementById("bench-lq45-end").value);

    if (
      !Number.isFinite(ihsgStart) || ihsgStart <= 0 ||
      !Number.isFinite(ihsgEnd) || ihsgEnd <= 0 ||
      !Number.isFinite(lq45Start) || lq45Start <= 0 ||
      !Number.isFinite(lq45End) || lq45End <= 0
    ) {
      if (typeof showToast === "function") {
        showToast("Nilai indeks IHSG & LQ45 harus berupa angka lebih dari 0.", "warning");
      }
      renderAnalyticsTab();
      return;
    }

    state.benchmark.ihsgStart = ihsgStart;
    state.benchmark.ihsgEnd = ihsgEnd;
    state.benchmark.lq45Start = lq45Start;
    state.benchmark.lq45End = lq45End;
    commitStateChange("Benchmark IHSG & LQ45 diperbarui");
  };

  window.updateMonthlyHistoryCell = function (year, monthIdx, field, rawVal) {
    const state = getState();
    ensureYearStructure(year);
    const row = state.monthlyHistoryByYear[year]?.[monthIdx];
    if (!row) return;
    const cleaned = String(rawVal ?? "").replace(",", ".").trim();
    row[field] = cleaned === "" || !Number.isFinite(Number(cleaned)) ? null : Number(cleaned);
    commitStateChange();
  };

  window.updateAnnualHistoryCell = function (year, field, rawVal) {
    const state = getState();
    ensureYearStructure(year);
    const ann = state.annualHistory.find((a) => Number(a.year) === Number(year));
    if (!ann) return;
    if (field === "topUp") {
      const numeric = Number(String(rawVal ?? "").replace(/[^\d.-]/g, ""));
      ann.topUp = Number.isFinite(numeric) ? numeric : 0;
    } else {
      const cleaned = String(rawVal ?? "").replace(",", ".").trim();
      ann[field] = cleaned === "" || !Number.isFinite(Number(cleaned)) ? null : Number(cleaned);
    }
    commitStateChange();
  };

  window.snapshotCurrentMonth = function () {
    const state = getState();
    const jkt = getJakartaTimeInfo();
    const activeYr = Number(state.meta.activeYear) || jkt.year;
    ensureYearStructure(activeYr);
    const m = computeMetrics();
    const row = state.monthlyHistoryByYear[activeYr][jkt.monthIndex];
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
    selectedAnalyticsYear = activeYr;
    commitStateChange(`Snapshot kinerja bulan ${MONTH_NAMES_ID[jkt.monthIndex]} ${activeYr} tersimpan`);
  };

  window.openYearRolloverModal = function () {
    const state = getState();
    const m = computeMetrics();
    const nextYear = (Number(state.meta.activeYear) || getJakartaTimeInfo().year) + 1;
    document.getElementById("rollover-new-year").value = nextYear;
    document.getElementById("rollover-prev-nav").textContent = formatNum(m.currentNav, 4);
    document.getElementById("rollover-prev-idx").textContent = `${formatNum(state.benchmark.ihsgEnd, 2)} / ${formatNum(state.benchmark.lq45End, 2)}`;
    openModal("modal-year-rollover");
  };

  window.handleYearRollover = function (e) {
    e.preventDefault();
    const state = getState();
    const m = computeMetrics();
    const jkt = getJakartaTimeInfo();
    const oldYear = Number(state.meta.activeYear) || jkt.year;
    const newYear = Number(document.getElementById("rollover-new-year").value);

    if (!Number.isFinite(newYear) || newYear <= oldYear) {
      if (typeof showToast === "function") {
        showToast(`Tahun baru harus lebih besar dari tahun aktif saat ini (${oldYear}).`, "error");
      }
      return;
    }

    ensureYearStructure(oldYear);
    const oldAnn = state.annualHistory.find((a) => Number(a.year) === oldYear);
    if (oldAnn) {
      oldAnn.portfolio = Number(m.ytdReturnPct.toFixed(4));
      oldAnn.ihsg = Number(m.ihsgReturnPct.toFixed(4));
      oldAnn.lq45 = Number(m.lq45ReturnPct.toFixed(4));
    }
    const oldLastMo = state.monthlyHistoryByYear[oldYear]?.[jkt.monthIndex];
    if (oldLastMo && oldLastMo.portfolio === null) {
      oldLastMo.portfolio = Number(m.ytdReturnPct.toFixed(4));
      oldLastMo.ihsg = Number(m.ihsgReturnPct.toFixed(4));
      oldLastMo.lq45 = Number(m.lq45ReturnPct.toFixed(4));
    }

    state.meta.initialNav = m.currentNav > 0 ? m.currentNav : m.initNav;
    state.meta.initialUnits = m.totalUnits;
    state.meta.initialCapital = m.totalValuation;
    state.meta.activeYear = newYear;
    state.mutations = [];

    state.benchmark.ihsgStart = state.benchmark.ihsgEnd;
    state.benchmark.lq45Start = state.benchmark.lq45End;
    ensureYearStructure(newYear);
    selectedAnalyticsYear = newYear;

    const divYearSel = document.getElementById("div-year-select");
    if (divYearSel) divYearSel.dataset.userPicked = "";
    const portoDivSel = document.getElementById("porto-div-recap-year-select");
    if (portoDivSel) portoDivSel.dataset.userPicked = "";

    closeModal("modal-year-rollover");
    commitStateChange(`Tutup buku ${oldYear} selesai. Tahun ${newYear} dimulai dari 0,00%`);
  };

  function renderAnalyticsTab() {
    const state = getState();
    const m = computeMetrics();
    const activeYr = Number(state.meta.activeYear) || getJakartaTimeInfo().year;
    ensureYearStructure(activeYr);

    const yearSel = document.getElementById("analytics-year-select");
    const allYears = Array.from(
      new Set([...state.annualHistory.map((a) => Number(a.year)), ...Object.keys(state.monthlyHistoryByYear).map(Number)])
    )
      .filter((y) => y >= 2000)
      .sort((a, b) => b - a);

    const viewYr = selectedAnalyticsYear && allYears.includes(selectedAnalyticsYear) ? selectedAnalyticsYear : activeYr;
    selectedAnalyticsYear = viewYr;
    ensureYearStructure(viewYr);

    if (yearSel) {
      yearSel.innerHTML = allYears.map((y) => `<option value="${y}">${y}</option>`).join("");
      yearSel.value = String(viewYr);
    }

    document.getElementById("bench-ihsg-start").value = state.benchmark.ihsgStart;
    document.getElementById("bench-ihsg-end").value = state.benchmark.ihsgEnd;
    document.getElementById("bench-lq45-start").value = state.benchmark.lq45Start;
    document.getElementById("bench-lq45-end").value = state.benchmark.lq45End;

    const ihsgBadge = document.getElementById("bench-ihsg-pct-badge");
    ihsgBadge.textContent = formatPct(m.ihsgReturnPct);
    ihsgBadge.className = `text-[11px] font-sans tabular-nums font-bold ${colorClass(m.ihsgReturnPct)}`;

    const lqBadge = document.getElementById("bench-lq45-pct-badge");
    lqBadge.textContent = formatPct(m.lq45ReturnPct);
    lqBadge.className = `text-[11px] font-sans tabular-nums font-bold ${colorClass(m.lq45ReturnPct)}`;

    ["ana-kpi-year-1", "ana-kpi-year-2", "ana-kpi-year-3", "monthly-chart-year-label", "monthly-table-year-label"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(viewYr);
    });

    const annActive = state.annualHistory.find((a) => Number(a.year) === viewYr);
    const isViewingActiveYear = viewYr === activeYr;
    const portoDisplay = annActive && annActive.portfolio !== null ? annActive.portfolio : (isViewingActiveYear ? m.ytdReturnPct : 0);
    const ihsgDisplay = annActive && annActive.ihsg !== null ? annActive.ihsg : (isViewingActiveYear ? m.ihsgReturnPct : 0);
    const lq45Display = annActive && annActive.lq45 !== null ? annActive.lq45 : (isViewingActiveYear ? m.lq45ReturnPct : 0);

    const portoEl = document.getElementById("ana-kpi-porto-ytd");
    portoEl.textContent = formatPct(portoDisplay);
    portoEl.className = `text-2xl sm:text-3xl font-extrabold font-sans tabular-nums tracking-tight mt-2 ${colorClass(portoDisplay)}`;

    const ihsgEl = document.getElementById("ana-kpi-ihsg-ytd");
    ihsgEl.textContent = formatPct(ihsgDisplay);
    ihsgEl.className = `text-lg sm:text-xl font-bold font-sans tabular-nums tracking-tight mt-2 ${colorClass(ihsgDisplay)}`;
    const aIhsg = portoDisplay - ihsgDisplay;
    const aIhsgEl = document.getElementById("ana-kpi-ihsg-alpha");
    aIhsgEl.textContent = `Alpha: ${formatPct(aIhsg)}`;
    aIhsgEl.className = `text-xs font-sans tabular-nums mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] ${colorClass(aIhsg)}`;

    const lqEl = document.getElementById("ana-kpi-lq45-ytd");
    lqEl.textContent = formatPct(lq45Display);
    lqEl.className = `text-lg sm:text-xl font-bold font-sans tabular-nums tracking-tight mt-2 ${colorClass(lq45Display)}`;
    const aLq = portoDisplay - lq45Display;
    const aLqEl = document.getElementById("ana-kpi-lq45-alpha");
    aLqEl.textContent = `Alpha: ${formatPct(aLq)}`;
    aLqEl.className = `text-xs font-sans tabular-nums mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] ${colorClass(aLq)}`;

    const allTimeTopup = state.annualHistory.reduce((s, a) => s + (Number(a.topUp) || 0), 0);
    const activeYrTopup = annActive ? Number(annActive.topUp) || 0 : 0;
    document.getElementById("ana-kpi-total-topup").textContent = formatIDR(allTimeTopup);
    document.getElementById("ana-kpi-topup-year-sub").textContent = `Tahun ${viewYr}: ${formatIDR(activeYrTopup)}`;
    document.getElementById("annual-topup-chart-badge").textContent = `Total: ${formatIDR(allTimeTopup)}`;

    // All-Time Gain & Multi-Year CAGR Cards
    const allTime = computeAllTimeMetrics(state, m);
    const capGainEl = document.getElementById("ana-alltime-capgain");
    if (capGainEl) {
      capGainEl.textContent = formatSignedIDR(allTime.allTimeCapitalGain);
      capGainEl.className = `text-lg sm:text-xl font-extrabold font-sans tabular-nums tracking-tight mt-1.5 ${colorClass(allTime.allTimeCapitalGain)}`;
    }
    const capGainSub = document.getElementById("ana-alltime-capgain-sub");
    if (capGainSub) {
      capGainSub.textContent = `${formatPct(allTime.allTimeCapitalGainPct)} dari Modal ${formatCompactIDR(allTime.allTimePaidIn)}`;
    }

    const totRetEl = document.getElementById("ana-alltime-totalret");
    if (totRetEl) {
      totRetEl.textContent = formatSignedIDR(allTime.allTimeTotalReturn);
      totRetEl.className = `text-lg sm:text-xl font-extrabold font-sans tabular-nums tracking-tight mt-1.5 ${colorClass(allTime.allTimeTotalReturn)}`;
    }
    const totRetSub = document.getElementById("ana-alltime-totalret-sub");
    if (totRetSub) {
      totRetSub.textContent = `${formatPct(allTime.allTimeTotalReturnPct)} • Dividen: ${formatCompactIDR(m.totalDividendsReceived)}`;
    }

    const cagrEl = document.getElementById("ana-alltime-cagr");
    if (cagrEl) {
      cagrEl.textContent = `${formatPct(allTime.cagrPct)} / thn`;
      cagrEl.className = `text-lg sm:text-xl font-extrabold font-sans tabular-nums tracking-tight mt-1.5 ${colorClass(allTime.cagrPct)}`;
    }
    const cagrSub = document.getElementById("ana-alltime-cagr-sub");
    if (cagrSub) {
      const spanTxt = allTime.startYear && allTime.endYear ? `${allTime.startYear}–${allTime.endYear} (${allTime.yearsCount} thn)` : "Belum ada data";
      cagrSub.textContent = `Kumulatif: ${formatPct(allTime.cumulativeTwrPct)} • ${spanTxt}`;
    }

    const alphaEl = document.getElementById("ana-alltime-alpha");
    if (alphaEl) {
      alphaEl.textContent = formatPct(allTime.cagrAlphaIhsg);
      alphaEl.className = `text-lg sm:text-xl font-extrabold font-sans tabular-nums tracking-tight mt-1.5 ${colorClass(allTime.cagrAlphaIhsg)}`;
    }
    const alphaSub = document.getElementById("ana-alltime-alpha-sub");
    if (alphaSub) {
      alphaSub.textContent = `IHSG CAGR: ${formatPct(allTime.ihsgCagrPct)} / thn`;
    }

    // Monthly Chart & Editable Table
    const monthRows = state.monthlyHistoryByYear[viewYr] || [];
    const mBody = document.getElementById("monthly-history-table-body");
    mBody.innerHTML = monthRows
      .map((r) => {
        const aI = r.portfolio !== null && r.ihsg !== null ? r.portfolio - r.ihsg : null;
        const aL = r.portfolio !== null && r.lq45 !== null ? r.portfolio - r.lq45 : null;
        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
            <td class="py-2.5 px-5 font-sans font-bold text-slate-900 dark:text-[#EEF2F6]">${MONTH_NAMES_ID[r.monthIndex]}</td>
            <td class="py-2 px-4 text-right">
              <input type="text" value="${r.portfolio !== null ? formatNum(r.portfolio, 2) : ""}" placeholder="—" onchange="updateMonthlyHistoryCell(${viewYr}, ${r.monthIndex}, 'portfolio', this.value)" class="w-24 px-2 py-1 rounded-md text-right font-sans tabular-nums font-semibold bg-transparent hover:bg-slate-100 dark:hover:bg-[#0C1117] border border-transparent focus:border-[#10B981] focus:outline-none ${r.portfolio !== null ? colorClass(r.portfolio) : "text-slate-400 dark:text-[#8E9BA8]"}" />
            </td>
            <td class="py-2 px-4 text-right">
              <input type="text" value="${r.ihsg !== null ? formatNum(r.ihsg, 2) : ""}" placeholder="—" onchange="updateMonthlyHistoryCell(${viewYr}, ${r.monthIndex}, 'ihsg', this.value)" class="w-24 px-2 py-1 rounded-md text-right font-sans tabular-nums bg-transparent hover:bg-slate-100 dark:hover:bg-[#0C1117] border border-transparent focus:border-sky-500 focus:outline-none ${r.ihsg !== null ? colorClass(r.ihsg) : "text-slate-400 dark:text-[#8E9BA8]"}" />
            </td>
            <td class="py-2 px-4 text-right">
              <input type="text" value="${r.lq45 !== null ? formatNum(r.lq45, 2) : ""}" placeholder="—" onchange="updateMonthlyHistoryCell(${viewYr}, ${r.monthIndex}, 'lq45', this.value)" class="w-24 px-2 py-1 rounded-md text-right font-sans tabular-nums bg-transparent hover:bg-slate-100 dark:hover:bg-[#0C1117] border border-transparent focus:border-amber-500 focus:outline-none ${r.lq45 !== null ? colorClass(r.lq45) : "text-slate-400 dark:text-[#8E9BA8]"}" />
            </td>
            <td class="py-2.5 px-4 text-right font-sans tabular-nums font-semibold ${aI !== null ? colorClass(aI) : "text-slate-400 dark:text-[#8E9BA8]"}">${aI !== null ? formatPct(aI) : "—"}</td>
            <td class="py-2.5 px-5 text-right font-sans tabular-nums font-semibold ${aL !== null ? colorClass(aL) : "text-slate-400 dark:text-[#8E9BA8]"}">${aL !== null ? formatPct(aL) : "—"}</td>
          </tr>
        `;
      })
      .join("");

    const moCanvas = document.getElementById("chart-monthly-performance");
    if (moCanvas) {
      destroyChart("monthlyPerf");
      charts.monthlyPerf = new Chart(moCanvas, {
        type: "line",
        data: {
          labels: monthRows.map((r) => r.month),
          datasets: [
            { label: "Portofolio (%)", data: monthRows.map((r) => r.portfolio), borderColor: "#10b981", backgroundColor: "#10b981", tension: 0.25, spanGaps: true },
            { label: "IHSG (%)", data: monthRows.map((r) => r.ihsg), borderColor: "#38bdf8", backgroundColor: "#38bdf8", tension: 0.25, spanGaps: true },
            { label: "LQ45 (%)", data: monthRows.map((r) => r.lq45), borderColor: "#f59e0b", backgroundColor: "#f59e0b", tension: 0.25, spanGaps: true }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } }, grid: { display: false } },
            y: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, callback: (v) => `${v}%` }, grid: { color: getChartGridColor() } }
          },
          plugins: { legend: { labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } } } }
        }
      });
    }

    // Annual Charts & Table
    const annList = [...state.annualHistory].sort((a, b) => a.year - b.year);
    let cumTopUp = 0;
    const cumSeries = [];
    const aBody = document.getElementById("annual-history-table-body");
    aBody.innerHTML = annList
      .map((a) => {
        const top = Number(a.topUp) || 0;
        cumTopUp += top;
        cumSeries.push(cumTopUp);
        const alphaI = a.portfolio !== null && a.ihsg !== null ? a.portfolio - a.ihsg : null;
        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
            <td class="py-2.5 px-5 font-sans tabular-nums font-bold text-slate-900 dark:text-[#EEF2F6]">${a.year}</td>
            <td class="py-2.5 px-4 text-right font-sans tabular-nums font-bold ${a.portfolio !== null ? colorClass(a.portfolio) : "text-slate-400 dark:text-[#8E9BA8]"}">${a.portfolio !== null ? formatPct(a.portfolio) : "—"}</td>
            <td class="py-2.5 px-4 text-right font-sans tabular-nums ${a.ihsg !== null ? colorClass(a.ihsg) : "text-slate-400 dark:text-[#8E9BA8]"}">${a.ihsg !== null ? formatPct(a.ihsg) : "—"}</td>
            <td class="py-2.5 px-4 text-right font-sans tabular-nums ${a.lq45 !== null ? colorClass(a.lq45) : "text-slate-400 dark:text-[#8E9BA8]"}">${a.lq45 !== null ? formatPct(a.lq45) : "—"}</td>
            <td class="py-2.5 px-4 text-right font-sans tabular-nums font-semibold ${alphaI !== null ? colorClass(alphaI) : "text-slate-400 dark:text-[#8E9BA8]"}">${alphaI !== null ? formatPct(alphaI) : "—"}</td>
            <td class="py-2 px-4 text-right">
              <input type="number" value="${Math.round(top)}" onchange="updateAnnualHistoryCell(${a.year}, 'topUp', this.value)" class="w-32 px-2 py-1 rounded-md text-right font-sans tabular-nums text-slate-800 dark:text-[#EEF2F6] bg-transparent hover:bg-slate-100 dark:hover:bg-[#0C1117] border border-transparent focus:border-[#10B981] focus:outline-none" />
            </td>
            <td class="py-2.5 px-5 text-right font-sans tabular-nums font-bold text-indigo-600 dark:text-indigo-400">${formatIDR(cumTopUp)}</td>
          </tr>
        `;
      })
      .join("");

    document.getElementById("annual-history-table-foot").innerHTML = `
      <tr>
        <td colspan="5" class="py-3.5 px-5 text-slate-900 dark:text-[#EEF2F6]">Total Akumulasi Setoran Modal Bersih</td>
        <td class="py-3.5 px-4 text-right font-sans tabular-nums text-slate-900 dark:text-[#EEF2F6]">${formatIDR(allTimeTopup)}</td>
        <td class="py-3.5 px-5 text-right font-sans tabular-nums text-indigo-600 dark:text-indigo-400">${formatIDR(cumTopUp)}</td>
      </tr>
    `;

    const annPerfCanvas = document.getElementById("chart-annual-performance");
    if (annPerfCanvas) {
      destroyChart("annualPerf");
      const perfYears = annList.filter((a) => a.portfolio !== null || a.ihsg !== null);
      charts.annualPerf = new Chart(annPerfCanvas, {
        type: "bar",
        data: {
          labels: perfYears.map((a) => String(a.year)),
          datasets: [
            { label: "Portofolio", data: perfYears.map((a) => a.portfolio), backgroundColor: "#10b981", borderRadius: 4 },
            { label: "IHSG", data: perfYears.map((a) => a.ihsg), backgroundColor: "#38bdf8", borderRadius: 4 },
            { label: "LQ45", data: perfYears.map((a) => a.lq45), backgroundColor: "#f59e0b", borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } }, grid: { display: false } },
            y: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, callback: (v) => `${v}%` }, grid: { color: getChartGridColor() } }
          },
          plugins: { legend: { labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } } } }
        }
      });
    }

    const annTopCanvas = document.getElementById("chart-annual-topup");
    if (annTopCanvas) {
      destroyChart("annualTopup");
      charts.annualTopup = new Chart(annTopCanvas, {
        data: {
          labels: annList.map((a) => String(a.year)),
          datasets: [
            {
              type: "bar",
              label: "Top Up Tahunan",
              data: annList.map((a) => Number(a.topUp) || 0),
              backgroundColor: "rgba(99, 102, 241, 0.75)",
              borderRadius: 5,
              yAxisID: "y"
            },
            {
              type: "line",
              label: "Akumulasi Kumulatif",
              data: cumSeries,
              borderColor: "#10b981",
              backgroundColor: "#10b981",
              tension: 0.25,
              yAxisID: "y"
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
          plugins: { legend: { labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } } } }
        }
      });
    }
  }

  return { renderAnalyticsTab };
}
