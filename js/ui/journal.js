// =========================================================================
// TAB 5 UI MODULE: JOURNAL TP / CL (./js/ui/journal.js)
// =========================================================================

import { calculateIPOTSellFee } from "../nav-engine.js";
import {
  formatNum,
  formatSignedIDR,
  formatPct,
  colorClass,
  escapeHTML,
  getTodayISO
} from "../storage.js";

export function createJournalUI(ctx) {
  function openManualJournalModal() {
    document.getElementById("mj-date").value = getTodayISO();
    document.getElementById("mj-ticker").value = "";
    document.getElementById("mj-shares").value = "";
    document.getElementById("mj-avg").value = "";
    document.getElementById("mj-sell").value = "";
    document.getElementById("mj-note").value = "";
    ctx.openModal("modal-manual-journal");
  }

  function handleAddManualJournal(e) {
    e.preventDefault();
    const state = ctx.getState();
    const date = document.getElementById("mj-date").value || getTodayISO();
    const ticker = (document.getElementById("mj-ticker").value || "").toUpperCase().trim();
    const shares = Math.max(1, Number(document.getElementById("mj-shares").value) || 0);
    const avgCost = Math.max(0, Number(document.getElementById("mj-avg").value) || 0);
    const sellPrice = Math.max(0, Number(document.getElementById("mj-sell").value) || 0);
    const note = (document.getElementById("mj-note").value || "").trim();

    const feeCalc = calculateIPOTSellFee(shares * sellPrice, 0.29);
    const costBasis = shares * avgCost;
    const realizedPL = feeCalc.netProceeds - costBasis;
    const realizedPLPct = costBasis > 0 ? (realizedPL / costBasis) * 100 : 0;

    state.journal.unshift({
      id: `j-${Date.now()}`,
      date,
      ticker,
      shares,
      avgCost,
      sellPrice,
      netProceeds: feeCalc.netProceeds,
      realizedPL,
      realizedPLPct,
      note: note || (realizedPL >= 0 ? "Take Profit" : "Cut Loss")
    });

    ctx.closeModal("modal-manual-journal");
    ctx.commitStateChange(`Catatan jurnal ${ticker} ditambahkan`);
  }

  function deleteJournalEntry(jId) {
    ctx.askConfirm("Hapus Entri Jurnal?", "Catatan transaksi TP/CL ini akan dihapus dari jurnal.", () => {
      const state = ctx.getState();
      state.journal = state.journal.filter((j) => j.id !== jId);
      ctx.commitStateChange("Entri jurnal dihapus");
    });
  }

  function renderJournalTab() {
    const state = ctx.getState();
    const totalPL = state.journal.reduce((s, j) => s + (Number(j.realizedPL) || 0), 0);
    const wins = state.journal.filter((j) => (Number(j.realizedPL) || 0) > 0).length;
    const winRate = state.journal.length > 0 ? (wins / state.journal.length) * 100 : 0;

    const plEl = document.getElementById("journal-kpi-total-pl");
    plEl.textContent = formatSignedIDR(totalPL);
    plEl.className = `text-2xl sm:text-3xl font-extrabold font-sans tabular-nums tracking-tight mt-2 ${colorClass(totalPL)}`;
    document.getElementById("journal-kpi-winrate").textContent = `${formatNum(winRate, 1)}%`;
    document.getElementById("journal-kpi-count").textContent = `${state.journal.length} transaksi`;

    const tbody = document.getElementById("journal-table-body");
    if (state.journal.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="py-10 text-center text-xs text-slate-400 dark:text-[#8E9BA8]">Belum ada transaksi TP / CL yang tercatat.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.journal
      .map((j) => {
        const pl = Number(j.realizedPL) || 0;
        const pct = Number(j.realizedPLPct) || 0;
        const badgeColor = ctx.getEmitenColor(j.ticker);
        return `
          <tr class="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors">
            <td class="py-3 px-4 font-sans tabular-nums text-xs text-slate-600 dark:text-[#8E9BA8] whitespace-nowrap">${escapeHTML(j.date)}</td>
            <td class="py-3 px-3 whitespace-nowrap">
              <div class="inline-flex items-center gap-2">
                <span class="w-7 h-7 rounded-md font-sans font-bold text-[11px] flex items-center justify-center shrink-0" style="background:${badgeColor}18; border:1px solid ${badgeColor}55; color:${badgeColor}">
                  ${escapeHTML(j.ticker)}
                </span>
                <span class="font-sans font-bold text-slate-900 dark:text-[#EEF2F6]">${escapeHTML(j.ticker)}</span>
              </div>
            </td>
            <td class="py-3 px-3 text-right font-sans tabular-nums text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${Number(j.shares).toLocaleString("id-ID")} <span class="text-[11px] text-slate-400 dark:text-[#8E9BA8]">(${formatNum(j.shares / 100, 1)} lot)</span></td>
            <td class="py-3 px-3 text-right font-sans tabular-nums text-slate-600 dark:text-[#8E9BA8] whitespace-nowrap">${formatNum(j.avgCost, 2)}</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums text-slate-900 dark:text-[#EEF2F6] whitespace-nowrap">${formatNum(j.sellPrice, 2)}</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums font-bold whitespace-nowrap ${colorClass(pl)}">${formatSignedIDR(pl)}</td>
            <td class="py-3 px-3 text-right font-sans tabular-nums whitespace-nowrap">
              <span class="inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${pl >= 0 ? "bg-[#10B981]/15 text-emerald-600 dark:text-[#10B981]" : "bg-rose-500/15 text-rose-600 dark:text-rose-400"}">
                ${formatPct(pct)}
              </span>
            </td>
            <td class="py-3 px-3 text-slate-600 dark:text-[#8E9BA8]">${escapeHTML(j.note || "")}</td>
            <td class="py-3 px-4 text-center">
              <button type="button" onclick="deleteJournalEntry('${escapeHTML(j.id)}')" class="p-1.5 rounded-md hover:bg-rose-500/15 text-slate-400 dark:text-[#8E9BA8] hover:text-rose-400 transition-colors" title="Hapus">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  window.openManualJournalModal = openManualJournalModal;
  window.handleAddManualJournal = handleAddManualJournal;
  window.deleteJournalEntry = deleteJournalEntry;

  return { renderJournalTab };
}
