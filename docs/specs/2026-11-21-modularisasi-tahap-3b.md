# Design Doc, Spec & Tickets — Modularisasi Tahap 3B (Finalisasi UI Modules & `app.js`)

**Tanggal:** 2026-11-21  
**Status:** Completed (T1–T5 Selesai & Terverifikasi `/browser`)  
**Target Fase:** Tahap 3B dari Blueprint Modularisasi `docs/ARCHITECTURE.md`

---

## 1. Tujuan & Ruang Lingkup

Menuntaskan modularisasi `index.html` (saat ini **4.630 baris**) sehingga seluruh logika JavaScript berada di dalam modul ES6 terpisah (`./js/...`) dan `index.html` murni menjadi shell HTML (~2.235 baris) yang hanya memuat `<script type="module" src="./js/app.js"></script>`.

### Modul yang Dibuat di Tahap 3B
1. **`./js/ui/analytics.js` (~325 baris)** — Tab 4 (Analytics & Historical Tables):
   - Actions & Rollover: `onAnalyticsYearChange`, `updateBenchmarkInputs`, `updateMonthlyHistoryCell`, `updateAnnualHistoryCell`, `snapshotCurrentMonth`, `openYearRolloverModal`, `handleYearRollover`.
   - Renderer & 3 Chart: `renderAnalyticsTab` (`charts.monthlyPerf`, `charts.annualPerf`, `charts.annualTopup`).
2. **`./js/ui/dividends.js` (~770 baris)** — Tab 2 (Dividends & Projections):
   - Actions & Schedule Modal: `setDividendQuickDate`, `openDividendModal`, `onDivTickerInput`, `handleAddDividend`, `deleteDividend`, `openDividendScheduleModal`, `updateSchedulePreview`, `handleSaveDividendSchedule`.
   - Renderers & 4 Chart: `renderDividendsTab`, `renderDividendProjectionSim`, `renderActualDividendsSection` (`charts.divStacked`, `charts.divDonut`, `charts.divProj`, `charts.divActual`).
3. **`./js/ui/portfolio.js` (~785 baris)** — Tab 1 (Portfolio & NAV CRUD + Renderer):
   - Buy Modal: `openBuyModal`, `onBuyFeePresetChange`, `onBuyFeeManualInput`, `updateBuyPreview`, `handleBuyStock`.
   - Sell Modal: `openSellModal`, `setSellFraction`, `onSellFeePresetChange`, `onSellFeeManualInput`, `updateSellPreview`, `handleSellStock`.
   - Edit/Delete Holding Modal: `openEditHoldingModal`, `updateEditHoldingPreview`, `handleEditHolding`, `deleteHolding`.
   - Inline & Bulk Price Update: `updateSinglePrice`, `openBulkPriceModal`, `handleBulkPriceSave`.
   - Cash & Baseline Calibration: `openCashModal`, `handleSaveCash`, `openBaselineModal`, `onBaselineCapitalOrNavInput`, `updateBaselinePreview`, `applyCurrentPortfolioAsBaseline`, `handleSaveBaseline`.
   - Renderer & 2 Chart: `renderPortfolioTab`, `renderPortfolioDividendRecap` (`charts.allocation`, `charts.contrib`).
4. **`./js/app.js` (~560 baris)** — Master Entry Point & Orchestrator:
   - Mengimpor seluruh modul (`nav-engine.js`, `state.js`, `storage.js`, `market.js`, `charts.js`, serta 6 modul `./ui/*.js`).
   - Mengelola runtime state (`activeTab`, `isMarketSyncing`, `charts`, `state`) dan `appContext` (termasuk `getState()`, `setState(nextState)`, `getCharts()`, `computeMetrics()`, `commitStateChange()`, `openModal()`, `closeModal()`, `askConfirm()`, `showToast()`, `ensureYearStructure()`).
   - Market Auto-Sync UI & Scheduler (`updateMarketSyncStatusUI`, `toggleAutoMarketSync`, `syncMarketData`, `scheduleDailyMarketCloseSync`).
   - Navigasi Tab, Theme & Modals (`switchTab`, `openModal`, `closeModal`, `toggleTheme`, `askConfirm`).
   - JSON Export / Import / Reset / Cloud Modal (`exportJSON`, `openImportModal`, `triggerImportFilePicker`, `handleImportFileSelected`, `handleImportFileDrop`, `handleImportPasteSubmit`, `copyCurrentJSONToClipboard`, `confirmResetTemplate`, `openCloudModal`).
   - `window.renderAll` & `initApp()`.

---

## 2. Kontrak Modul & Invarian Wajib

1. **Zero Build Step & Relative Path:**
   - Dari `index.html` ke entry point: `<script type="module" src="./js/app.js"></script>`.
   - Dari `./js/app.js` ke sibling module: `./nav-engine.js`, `./state.js`, `./storage.js`, `./market.js`, `./charts.js`, dan `./ui/<tab>.js`.
   - Dari `./js/ui/*.js` ke parent module: `../nav-engine.js`, `../state.js`, `../charts.js`.
2. **Kompatibilitas Inline HTML Event Handlers (`window.*`):**
   - Semua fungsi yang dipanggil dari atribut HTML `onclick`, `onchange`, `oninput`, `onsubmit` di `index.html` tetap didaftarkan ke `window.*` saat `create*UI(appContext)` dipanggil di `js/app.js`.
3. **Invarian Matematika, Storage & Anti-XSS:**
   - Tidak mengubah rumus NAV, fee IPOT, dividen, CAGR/benchmark, maupun `STORAGE_KEY` (`portfolio_nav_tracker_favo_v1`).
   - Seluruh render HTML dinamis di `portfolio.js`, `dividends.js`, dan `analytics.js` tetap menggunakan `escapeHTML()`.

---

## 3. Breakdown Tiket Vertical-Slice

### Tiket T1 — Ekstrak `./js/ui/analytics.js` (Tab 4)
- **Target File:** Buat `./js/ui/analytics.js`.
- **Isi:** `createAnalyticsUI(ctx)` yang mengekspor `{ renderAnalyticsTab }` dan mendaftarkan `window.onAnalyticsYearChange`, `window.updateBenchmarkInputs`, `window.updateMonthlyHistoryCell`, `window.updateAnnualHistoryCell`, `window.snapshotCurrentMonth`, `window.openYearRolloverModal`, `window.handleYearRollover`.

### Tiket T2 — Ekstrak `./js/ui/dividends.js` (Tab 2)
- **Target File:** Buat `./js/ui/dividends.js`.
- **Isi:** `createDividendsUI(ctx)` yang mengekspor `{ renderDividendsTab, renderActualDividendsSection, renderDividendProjectionSim }` dan mendaftarkan `window.setDividendQuickDate`, `window.openDividendModal`, `window.onDivTickerInput`, `window.handleAddDividend`, `window.deleteDividend`, `window.openDividendScheduleModal`, `window.updateSchedulePreview`, `window.handleSaveDividendSchedule`, `window.renderDividendProjectionSim`.

### Tiket T3 — Ekstrak `./js/ui/portfolio.js` (Tab 1)
- **Target File:** Buat `./js/ui/portfolio.js`.
- **Isi:** `createPortfolioUI(ctx)` yang mengekspor `{ renderPortfolioTab, renderPortfolioDividendRecap }` dan mendaftarkan seluruh handler Buy, Sell, Edit/Delete Holding, Single/Bulk Price, Cash, dan Baseline Calibration ke `window.*`.

### Tiket T4 — Buat `./js/app.js` & Bersihkan `index.html`
- **Target File:** Buat `./js/app.js` dan ganti blok inline `<script type="module">...</script>` di `index.html` (`L2231–L4628`) menjadi `<script type="module" src="./js/app.js"></script>`.
- **Hasil:** `index.html` turun dari 4.630 baris menjadi ~2.235 baris murni HTML.

### Tiket T5 — QA 5-Axis, Verifikasi `/browser` & Dokumentasi `ARCHITECTURE.md`
- **Target:**
  - Audit statis seluruh import path dan binding `window.*`.
  - Uji runtime lewat `/browser` pada `http://127.0.0.1:8765/`: pastikan 14 file aset/modul (`styles.css`, `app.js`, 5 core modules, 6 UI modules) berstatus HTTP 200, `0` console error, dan keenam tab + modal utama berfungsi normal.
  - Perbarui `docs/ARCHITECTURE.md` untuk menandai selesainya seluruh fase modularisasi (Tahap 1, 2, 3A, 3B).
