// =========================================================================
// TAB 3 UI MODULE: MUTATIONS / TOP UP & WITHDRAW (./js/ui/mutations.js)
// =========================================================================

import { MONTH_NAMES_ID, MONTH_SHORT_ID } from "../state.js";
import {
  formatNum,
  formatIDR,
  formatSignedIDR,
  formatCompactIDR,
  formatPct,
  escapeHTML,
  getTodayISO,
  parseIDNumber,
  getNumInput,
  setNumInput
} from "../storage.js";
import { upsertChart, getChartTextColor, getChartGridColor } from "../charts.js";

export function createMutationsUI(ctx) {
  function updateMutationPreview() {
    const m = ctx.computeMetrics();
    const type = document.getElementById("mut-type")?.value || "TOPUP";
    const amount = Math.max(0, getNumInput("mut-amount"));
    const rawNav = getNumInput("mut-nav-price");
    const nav = rawNav > 0 ? rawNav : (m.currentNav > 0 ? m.currentNav : m.initNav);
    const delta = nav > 0 ? amount / nav : 0;
    const signedDelta = type === "TOPUP" ? delta : -delta;
    const afterUnits = Math.max(0, m.totalUnits + signedDelta);

    const navEl = document.getElementById("mut-prev-nav");
    const deltaEl = document.getElementById("mut-prev-units-delta");
    const afterEl = document.getElementById("mut-prev-units-after");

    if (navEl) navEl.textContent = formatNum(nav, 4);
    if (deltaEl) {
      deltaEl.textContent = `${signedDelta >= 0 ? "+" : ""}${formatNum(signedDelta, 4)} unit`;
      deltaEl.className = `font-mono ${signedDelta >= 0 ? "text-emerald-500" : "text-rose-500"}`;
    }
    if (afterEl) afterEl.textContent = `${formatNum(afterUnits, 4)} unit`;
  }

  function setMutationQuickAmount(val) {
    setNumInput("mut-amount", val);
    updateMutationPreview();
  }

  function onMutationNavInput() {
    const navInp = document.getElementById("mut-nav-price");
    if (navInp) navInp.dataset.userEdited = "1";
    updateMutationPreview();
  }

  function resetMutationNavToCurrent() {
    const m = ctx.computeMetrics();
    const navInp = document.getElementById("mut-nav-price");
    if (navInp) {
      navInp.dataset.userEdited = "";
      setNumInput(navInp, m.currentNav > 0 ? m.currentNav : m.initNav, 4);
    }
    updateMutationPreview();
  }

  function syncAnnualTopUpForYear(state, yr) {
    if (!yr || yr < 2000) return;
    ctx.ensureYearStructure(yr);
    const ann = state.annualHistory.find((a) => Number(a.year) === yr);
    if (!ann) return;
    const netYr = state.mutations
      .filter((m) => Number(String(m.date || "").slice(0, 4)) === yr)
      .reduce((s, m) => s + (m.type === "TOPUP" ? Number(m.amount) || 0 : -(Number(m.amount) || 0)), 0);
    ann.topUp = netYr;
  }

  function handleAddMutation(e) {
    e.preventDefault();
    const state = ctx.getState();
    const m = ctx.computeMetrics();
    const date = document.getElementById("mut-date").value || getTodayISO();
    const type = document.getElementById("mut-type").value;
    const amount = Math.max(0, getNumInput("mut-amount"));
    const navInp = document.getElementById("mut-nav-price");
    const inputNav = getNumInput(navInp);
    const note = (document.getElementById("mut-note").value || "").trim();
    const adjustCash = document.getElementById("mut-adjust-cash").checked;

    if (amount <= 0) {
      ctx.showToast("Masukkan nominal mutasi yang valid.", "error");
      return;
    }
    if (!Number.isFinite(inputNav) || inputNav <= 0) {
      ctx.showToast("Masukkan Harga Unit (NAV) Eksekusi yang valid.", "error");
      return;
    }

    const navAtTime = inputNav;
    const unitsDelta = amount / navAtTime;

    if (type === "WITHDRAW") {
      if (adjustCash && amount > (Number(state.cash) || 0)) {
        ctx.showToast("Saldo Kas RDN tidak mencukupi untuk penarikan (Withdraw) ini.", "error");
        return;
      }
      if (unitsDelta > m.totalUnits + 1e-6 || amount > m.totalValuation + 1) {
        ctx.showToast("Nominal penarikan melebihi total unit / valuasi portofolio yang tersedia.", "error");
        return;
      }
    }

    const moIdx = Math.max(0, Math.min(11, (parseInt(date.split("-")[1], 10) || 1) - 1));
    const defaultMonthNote = MONTH_NAMES_ID[moIdx].toUpperCase();

    state.mutations.push({
      id: `m-${Date.now()}`,
      date,
      type,
      amount,
      navAtTime,
      unitsDelta,
      note: note || defaultMonthNote
    });

    if (adjustCash) {
      state.cash = type === "TOPUP" ? (Number(state.cash) || 0) + amount : Math.max(0, (Number(state.cash) || 0) - amount);
    }

    const yr = Number(date.slice(0, 4)) || state.meta.activeYear;
    syncAnnualTopUpForYear(state, yr);

    document.getElementById("mut-amount").value = "";
    document.getElementById("mut-note").value = "";
    if (navInp) navInp.dataset.userEdited = "";
    ctx.commitStateChange(`${type === "TOPUP" ? "Top Up" : "Withdraw"} ${formatIDR(amount)} @ NAV ${formatNum(navAtTime, 4)} dicatat`);
  }

  function updateMutationNavInline(mutId, rawVal) {
    const state = ctx.getState();
    const item = state.mutations.find((m) => m.id === mutId);
    const newNav = parseIDNumber(rawVal, "dec");
    if (!item || !Number.isFinite(newNav) || newNav <= 0) {
      renderMutationsTab();
      return;
    }
    item.navAtTime = newNav;
    item.unitsDelta = (Number(item.amount) || 0) / newNav;
    ctx.commitStateChange(`Harga Unit mutasi diperbarui ke ${formatNum(newNav, 4)}`);
  }

  function deleteMutation(mutId) {
    const state = ctx.getState();
    const idx = state.mutations.findIndex((item) => item.id === mutId);
    if (idx < 0) return;
    const item = state.mutations[idx];
    ctx.askConfirm(
      "Hapus Riwayat Mutasi Dana?",
      `Mutasi ${item.type} sebesar ${formatIDR(item.amount)} akan dihapus dan unit penyertaan akan dihitung ulang.`,
      () => {
        const curState = ctx.getState();
        const curIdx = curState.mutations.findIndex((m) => m.id === mutId);
        if (curIdx < 0) return;
        const yr = Number(String(item.date || "").slice(0, 4));
        curState.mutations.splice(curIdx, 1);
        syncAnnualTopUpForYear(curState, yr);
        ctx.commitStateChange("Riwayat mutasi dihapus");
      }
    );
  }

  function renderMutationsTab() {
    const state = ctx.getState();
    const m = ctx.computeMetrics();
    const dateInput = document.getElementById("mut-date");
    if (dateInput && !dateInput.value) dateInput.value = getTodayISO();

    let totalTopup = 0;
    let topupCount = 0;
    let totalWithdraw = 0;
    let withdrawCount = 0;

    for (const mut of state.mutations) {
      const amt = Number(mut.amount) || 0;
      if (mut.type === "TOPUP") {
        totalTopup += amt;
        topupCount++;
      } else {
        totalWithdraw += amt;
        withdrawCount++;
      }
    }

    document.getElementById("mut-kpi-paidin").textContent = formatIDR(m.totalPaidInCapital);
    document.getElementById("mut-kpi-paidin-sub").textContent = `Modal Awal: ${formatIDR(m.initCap)}`;
    document.getElementById("mut-kpi-total-topup").textContent = `+${formatIDR(totalTopup)}`;
    document.getElementById("mut-kpi-topup-count").textContent = `${topupCount}x transaksi masuk`;
    document.getElementById("mut-kpi-total-withdraw").textContent = formatIDR(totalWithdraw);
    document.getElementById("mut-kpi-withdraw-count").textContent = `${withdrawCount}x penarikan dana`;
    document.getElementById("mut-kpi-total-units").textContent = formatNum(m.totalUnits, 4);
    document.getElementById("mut-kpi-nav-sub").textContent = `NAV Saat Ini: ${formatNum(m.currentNav, 4)}`;

    const sampleUnits = m.currentNav > 0 ? 10000000 / m.currentNav : 0;
    document.getElementById("mut-neutrality-nav").textContent = formatNum(m.currentNav, 4);
    document.getElementById("mut-neutrality-units").textContent = `+${formatNum(sampleUnits, 4)} unit`;
    document.getElementById("mut-neutrality-twr").textContent = formatPct(m.ytdReturnPct);

    document.getElementById("mut-summary-badge").innerHTML = `Total Modal Disetor: <strong class="text-slate-900 dark:text-[#EEF2F6]">${formatIDR(m.totalPaidInCapital)}</strong>`;
    const mutNavInp = document.getElementById("mut-nav-price");
    if (mutNavInp && mutNavInp.dataset.userEdited !== "1") {
      setNumInput(mutNavInp, m.currentNav > 0 ? m.currentNav : m.initNav, 4);
    }
    updateMutationPreview();

    const sorted = [...state.mutations].sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let runningPaidIn = m.initCap;
    let runningUnits = m.initUnits;

    const tbody = document.getElementById("mutations-table-body");
    let rowsHTML = `
      <tr class="bg-slate-50/50 dark:bg-[#0C1117]/40">
        <td class="py-3 px-4 font-sans tabular-nums text-xs font-medium text-slate-500 dark:text-[#8E9BA8] whitespace-nowrap">Saldo Awal</td>
        <td class="py-3 px-3 text-slate-600 dark:text-[#EEF2F6]">Modal Awal Dasar Unit</td>
        <td class="py-3 px-3"><span class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/80 dark:bg-[#0C1117] text-slate-700 dark:text-[#8E9BA8] border border-slate-300/60 dark:border-white/[0.08]">Awal</span></td>
        <td class="py-3 px-3 text-right font-sans tabular-nums text-slate-700 dark:text-[#EEF2F6] whitespace-nowrap">${formatIDR(m.initCap)}</td>
        <td class="py-3 px-3 text-right font-sans tabular-nums text-slate-600 dark:text-[#8E9BA8] whitespace-nowrap">${formatNum(m.initNav, 4)}</td>
        <td class="py-3 px-3 text-right font-sans tabular-nums text-sky-600 dark:text-sky-400 whitespace-nowrap">+${formatNum(m.initUnits, 4)}</td>
        <td class="py-3 px-3 text-right font-sans tabular-nums font-semibold text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${formatIDR(runningPaidIn)}</td>
        <td class="py-3 px-3 text-right font-sans tabular-nums font-semibold text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${formatNum(runningUnits, 4)}</td>
        <td class="py-3 px-4 text-center text-slate-400 dark:text-[#8E9BA8]">—</td>
      </tr>
    `;

    const chartLabels = ["AWAL"];
    const chartTopupData = [0];
    const chartWithdrawData = [0];
    const chartUnitsData = [Number(runningUnits.toFixed(2))];

    for (const mut of sorted) {
      const amt = Number(mut.amount) || 0;
      const delta = Number(mut.unitsDelta) || 0;
      const isTopup = mut.type === "TOPUP";
      runningPaidIn += isTopup ? amt : -amt;
      runningUnits += isTopup ? delta : -delta;

      const moIdx = Math.max(0, Math.min(11, (parseInt(String(mut.date).split("-")[1], 10) || 1) - 1));
      chartLabels.push(`${MONTH_SHORT_ID[moIdx]} ${String(mut.date).slice(2, 4)}`);
      chartTopupData.push(isTopup ? amt : 0);
      chartWithdrawData.push(!isTopup ? -amt : 0);
      chartUnitsData.push(Number(runningUnits.toFixed(2)));

      rowsHTML += `
        <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
          <td class="py-3 px-4 font-sans tabular-nums whitespace-nowrap">
            <div class="font-bold text-slate-900 dark:text-[#EEF2F6] text-xs">${MONTH_NAMES_ID[moIdx]} ${String(mut.date).slice(0, 4)}</div>
            <div class="text-[11px] text-slate-400 dark:text-[#8E9BA8]">${escapeHTML(mut.date)}</div>
          </td>
          <td class="py-3 px-3 text-slate-700 dark:text-[#EEF2F6]">${escapeHTML(mut.note || "")}</td>
          <td class="py-3 px-3 whitespace-nowrap">
            <span class="px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
              isTopup ? "bg-[#10B981]/10 text-emerald-600 dark:text-[#10B981] border-[#10B981]/25" : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
            }">${isTopup ? "Top Up" : "Withdraw"}</span>
          </td>
          <td class="py-3 px-3 text-right font-sans tabular-nums font-bold whitespace-nowrap ${isTopup ? "text-emerald-600 dark:text-[#10B981]" : "text-rose-600 dark:text-rose-400"}">
            ${isTopup ? "+" : "-"}${formatIDR(amt)}
          </td>
          <td class="py-2 px-3 text-right font-sans tabular-nums text-slate-600 dark:text-[#EEF2F6] whitespace-nowrap">
            <input
              type="text"
              inputmode="decimal"
              data-num-input="dec"
              data-num-decimals="4"
              data-num-min-decimals="4"
              value="${formatNum(mut.navAtTime, 4)}"
              onchange="updateMutationNavInline('${escapeHTML(mut.id)}', this.value)"
              title="Klik untuk koreksi Harga Unit (NAV) eksekusi"
              class="w-24 px-2 py-1 rounded-md text-right font-sans tabular-nums bg-transparent hover:bg-slate-100 dark:hover:bg-[#0C1117] border border-transparent focus:border-[#10B981] focus:outline-none text-slate-700 dark:text-[#EEF2F6]"
            />
          </td>
          <td class="py-3 px-3 text-right font-sans tabular-nums whitespace-nowrap ${isTopup ? "text-emerald-600 dark:text-[#10B981]" : "text-rose-600 dark:text-rose-400"}">
            ${isTopup ? "+" : "-"}${formatNum(delta, 4)}
          </td>
          <td class="py-3 px-3 text-right font-sans tabular-nums font-semibold text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${formatIDR(runningPaidIn)}</td>
          <td class="py-3 px-3 text-right font-sans tabular-nums font-semibold text-sky-600 dark:text-sky-400 whitespace-nowrap">${formatNum(runningUnits, 4)}</td>
          <td class="py-3 px-4 text-center">
            <button type="button" onclick="deleteMutation('${escapeHTML(mut.id)}')" class="p-1.5 rounded-md hover:bg-rose-500/15 text-slate-400 dark:text-[#8E9BA8] hover:text-rose-400" title="Hapus mutasi">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
      `;
    }
    tbody.innerHTML = rowsHTML;

    const totalUnitDiff = m.totalUnits - m.initUnits;
    const totalUnitDiffLabel = `${totalUnitDiff > 0 ? "+" : totalUnitDiff < 0 ? "-" : ""}${formatNum(Math.abs(totalUnitDiff), 4)} unit`;
    document.getElementById("mutations-table-foot").innerHTML = `
      <tr>
        <td colspan="3" class="py-3.5 px-4 text-slate-900 dark:text-[#EEF2F6]">Total Akumulasi Modal &amp; Unit Penyertaan</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-emerald-600 dark:text-[#10B981] whitespace-nowrap">${formatSignedIDR(totalTopup - totalWithdraw)}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-400 dark:text-[#8E9BA8]">—</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-sky-600 dark:text-sky-400 whitespace-nowrap">${totalUnitDiffLabel}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${formatIDR(m.totalPaidInCapital)}</td>
        <td class="py-3.5 px-3 text-right font-sans tabular-nums text-sky-600 dark:text-sky-400 whitespace-nowrap">${formatNum(m.totalUnits, 4)}</td>
        <td></td>
      </tr>
    `;

    const canvas = document.getElementById("chart-mutations");
    if (canvas) {
      upsertChart(ctx.charts, "mutations", canvas, {
        data: {
          labels: chartLabels,
          datasets: [
            {
              type: "bar",
              label: "Top Up",
              data: chartTopupData,
              backgroundColor: "rgba(16, 185, 129, 0.75)",
              borderRadius: 4,
              yAxisID: "y"
            },
            {
              type: "bar",
              label: "Withdraw",
              data: chartWithdrawData,
              backgroundColor: "rgba(244, 63, 94, 0.75)",
              borderRadius: 4,
              yAxisID: "y"
            },
            {
              type: "line",
              label: "Akumulasi Unit",
              data: chartUnitsData,
              borderColor: "#38bdf8",
              backgroundColor: "#38bdf8",
              tension: 0.3,
              pointRadius: 3,
              yAxisID: "y1"
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 10 } }, grid: { display: false } },
            y: {
              position: "left",
              ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 10 }, callback: (v) => formatCompactIDR(v) },
              grid: { color: getChartGridColor() }
            },
            y1: {
              position: "right",
              ticks: { color: "#38bdf8", font: { family: "JetBrains Mono", size: 10 }, callback: (v) => formatNum(v, 0) },
              grid: { drawOnChartArea: false }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (tCtx) =>
                  tCtx.dataset.yAxisID === "y1"
                    ? ` ${tCtx.dataset.label}: ${formatNum(tCtx.raw, 4)} unit`
                    : ` ${tCtx.dataset.label}: ${formatSignedIDR(tCtx.raw)}`
              }
            }
          }
        }
      });
    }
    window.lucide?.createIcons?.();
  }

  window.setMutationQuickAmount = setMutationQuickAmount;
  window.onMutationNavInput = onMutationNavInput;
  window.resetMutationNavToCurrent = resetMutationNavToCurrent;
  window.updateMutationPreview = updateMutationPreview;
  window.handleAddMutation = handleAddMutation;
  window.updateMutationNavInline = updateMutationNavInline;
  window.deleteMutation = deleteMutation;

  return { renderMutationsTab };
}
