// =========================================================================
// CHART.JS HELPERS & SHARED CHART RENDERERS (./js/charts.js)
// =========================================================================

import { formatNum, formatIDR, formatPct, colorClass } from "./storage.js";

export function getChartTextColor() {
  return document.documentElement.classList.contains("dark") ? "#94a3b8" : "#475569";
}

export function getChartGridColor() {
  return document.documentElement.classList.contains("dark")
    ? "rgba(148, 163, 184, 0.1)"
    : "rgba(15, 23, 42, 0.06)";
}

export function destroyChart(charts, key) {
  if (charts && charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

export function renderAllocationChart({ charts, state, getEmitenColor }, m) {
  const canvas = document.getElementById("chart-allocation");
  if (!canvas) return;
  destroyChart(charts, "allocation");

  const labels = ["KAS"];
  const data = [m.cashBalance];
  const colors = ["#64748b"];

  state.holdings.forEach((h) => {
    labels.push(h.ticker);
    data.push(Number(h.shares) * Number(h.currentPrice));
    colors.push(getEmitenColor(h.ticker));
  });

  charts.allocation = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "66%",
      plugins: {
        legend: {
          position: "right",
          labels: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 }, boxWidth: 10 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.raw) || 0;
              const pct = m.totalValuation > 0 ? (val / m.totalValuation) * 100 : 0;
              return ` ${ctx.label}: ${formatIDR(val)} (${formatNum(pct, 1)}%)`;
            }
          }
        }
      }
    }
  });
}

export function renderBenchmarkBars({ state }, m) {
  const container = document.getElementById("benchmark-bars-container");
  const badge = document.getElementById("benchmark-year-badge");
  if (badge) badge.textContent = `YTD ${state.meta.activeYear || 2026}`;
  if (!container) return;

  const getSemanticBarColor = (val) => {
    if (val > 0.0001) return "bg-emerald-500";
    if (val < -0.0001) return "bg-rose-500";
    return "bg-slate-400";
  };

  const items = [
    {
      label: "Portofolio (Unit NAV / TWR)",
      val: m.ytdReturnPct,
      barColor: getSemanticBarColor(m.ytdReturnPct),
      alphaVsPorto: null
    },
    {
      label: "Indeks Harga Saham Gabungan (IHSG)",
      val: m.ihsgReturnPct,
      barColor: getSemanticBarColor(m.ihsgReturnPct),
      alphaVsPorto: m.alphaIhsg
    },
    {
      label: "Indeks Saham Likuid (LQ45)",
      val: m.lq45ReturnPct,
      barColor: getSemanticBarColor(m.lq45ReturnPct),
      alphaVsPorto: m.alphaLq45
    }
  ];
  const maxAbs = Math.max(5, ...items.map((i) => Math.abs(i.val)));

  const axisHeaderHTML = `
    <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pb-1 border-b border-slate-100 dark:border-slate-800/70">
      <span>&larr; Negatif (-)</span>
      <span class="font-bold text-slate-500 dark:text-slate-400">0,00%</span>
      <span>Positif (+) &rarr;</span>
    </div>
  `;

  const rowsHTML = items
    .map((item) => {
      const halfWidthPct = Math.min(50, (Math.abs(item.val) / maxAbs) * 50);
      const isNeg = item.val < -0.0001;
      const isPos = item.val > 0.0001;
      const barPositionStyle = isNeg
        ? `right: 50%; width: ${halfWidthPct}%;`
        : isPos
        ? `left: 50%; width: ${halfWidthPct}%;`
        : `left: 50%; width: 0%;`;
      const barRadiusClass = isNeg ? "rounded-l-full" : isPos ? "rounded-r-full" : "rounded-full";

      const alphaBadgeHTML =
        item.alphaVsPorto !== null
          ? `<span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
              item.alphaVsPorto >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }">Porto ${formatPct(item.alphaVsPorto)}</span>`
          : "";

      return `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center flex-wrap font-semibold text-slate-700 dark:text-slate-200">
              <span>${item.label}</span>
              ${alphaBadgeHTML}
            </div>
            <span class="font-mono font-bold ${colorClass(item.val)} shrink-0">${formatPct(item.val)}</span>
          </div>
          <div class="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center">
            <div class="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-slate-400/80 dark:bg-slate-500 z-10"></div>
            ${
              isNeg || isPos
                ? `<div class="absolute top-0 h-full ${item.barColor} ${barRadiusClass} transition-all duration-500" style="${barPositionStyle}"></div>`
                : `<div class="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-400"></div>`
            }
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = axisHeaderHTML + rowsHTML;
}

export function renderCalculatorChart(charts, curAvg, newAvg, buyPrice, targetPrice) {
  const canvas = document.getElementById("chart-calculator-bars");
  if (!canvas) return;
  destroyChart(charts, "calcBars");
  charts.calcBars = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Avg. Lama", "Harga Beli", "Avg. Baru", "Target Jual"],
      datasets: [
        {
          label: "Harga (Rp)",
          data: [curAvg, buyPrice, newAvg, targetPrice],
          backgroundColor: ["#64748b", "#38bdf8", "#10b981", "#8b5cf6"],
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } }, grid: { display: false } },
        y: { ticks: { color: getChartTextColor(), font: { family: "JetBrains Mono", size: 11 } }, grid: { color: getChartGridColor() } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` Rp ${formatNum(ctx.raw, 2)}` } }
      }
    }
  });
}
