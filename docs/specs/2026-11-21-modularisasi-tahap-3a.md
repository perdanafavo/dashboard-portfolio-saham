# Spec & Tiket: Modularisasi Tahap 3A (Charts & 3 Tab Ringan: Journal, Calculator, Mutations)

**Tanggal:** 2026-11-21
**Status:** Selesai & Terverifikasi (T1–T4 PASS)
**Target Model Eksekusi:** **Argon (Medium)** *(modul kecil, mandiri, rendah risiko)*

---

## 1. Tujuan & Ruang Lingkup

Memecah gelombang pertama lapisan UI & Chart dari `index.html` ke dalam 4 modul ES terpisah tanpa mengubah perilaku fungsional, tampilan UI, maupun kompatibilitas `onclick` handler di HTML:

1. `./js/charts.js` — Helper Chart.js (`getChartTextColor`, `getChartGridColor`, `destroyChart`) dan renderer chart lintas tab (`renderAllocationChart`, `renderBenchmarkBars`, `renderCalculatorChart`).
2. `./js/ui/journal.js` — Tab 5 (Jurnal TP / CL): aksi modal jurnal manual (`openManualJournalModal`, `handleAddManualJournal`, `deleteJournalEntry`) & renderer `renderJournalTab`.
3. `./js/ui/calculator.js` — Tab 6 (Kalkulator Average): aksi simulasi (`loadTickerIntoCalculator`, `syncCalcFromShares`, `syncCalcFromBudget`, `recalculateAverageSim`) & renderer `renderCalculatorTab`.
4. `./js/ui/mutations.js` — Tab 3 (Mutasi Dana): aksi mutasi unit penyertaan (`setMutationQuickAmount`, `onMutationNavInput`, `resetMutationNavToCurrent`, `updateMutationPreview`, `handleAddMutation`, `updateMutationNavInline`, `deleteMutation`) & renderer `renderMutationsTab` (termasuk chart mutasi).

### Non-Goals (Disimpan untuk Tahap 3B)
- Tab 1 (`portfolio.js`), Tab 2 (`dividends.js`), Tab 4 (`analytics.js`), serta pemindahan sisa orchestrator ke `./js/app.js` akan dilakukan di **Tahap 3B** agar perubahan Tahap 3A tetap kecil dan mudah diverifikasi.

---

## 2. Desain Kontrak Modul (`appContext` & `window.*` Bindings)

Agar modul UI tidak mengalami masalah *stale state* saat JSON Import / Reset / Cloud Sync (karena variabel `state` di-reassign) dan tidak menimbulkan *circular dependency*:

- Di `index.html`, buat objek `appContext` tunggal:
  ```js
  const appContext = {
    getState: () => state,
    setState: (next) => { state = next; },
    charts,
    computeMetrics,
    commitStateChange,
    showToast,
    openModal,
    closeModal,
    askConfirm,
    getEmitenColor,
    ensureYearStructure
  };
  ```
- Setiap modul `./js/ui/*.js` mengekspor fungsi factory `create<TabName>UI(ctx)` yang:
  1. Mengembalikan fungsi renderer (mis. `{ renderJournalTab }`) untuk dipanggil oleh `window.renderAll()`.
  2. Mendaftarkan semua handler event global ke `window.*` (mis. `window.openManualJournalModal`, `window.handleAddMutation`, `window.recalculateAverageSim`, dll.) sehingga atribut `onclick="..."` dan `onchange="..."` pada HTML tetap bekerja 100% tanpa perlu mengubah HTML.

---

## 3. Invarian Wajib
1. **Matematika NAV & IPOT Fee:** Tidak ada perubahan rumus pada `handleAddMutation`, `handleAddManualJournal`, atau `recalculateAverageSim`.
2. **Kompatibilitas Data & Deploy:** Semua path import wajib relatif (`./js/...`, `../charts.js`, `../storage.js`, `../nav-engine.js`, `../state.js`) agar berjalan di GitHub Pages & Vercel.
3. **Anti-XSS:** Tetap gunakan `escapeHTML(...)` pada seluruh render tabel mutasi, jurnal, dan dropdown kalkulator.

---

## 4. Breakdown Tiket (Vertical Slices)

- [x] **T1 — Ekstrak `./js/charts.js`:**
  - Pindahkan `getChartTextColor()`, `getChartGridColor()`, `destroyChart(charts, key)`, `renderAllocationChart(ctx, m)`, `renderBenchmarkBars(ctx, m)`, dan `renderCalculatorChart(charts, curAvg, newAvg, buyPrice, targetPrice)` ke `./js/charts.js`.
  - Hubungkan kembali di `index.html`.
- [x] **T2 — Ekstrak `./js/ui/journal.js` (Tab 5) & `./js/ui/calculator.js` (Tab 6):**
  - Buat `./js/ui/journal.js` (`createJournalUI(ctx)`) dan `./js/ui/calculator.js` (`createCalculatorUI(ctx)`).
  - Hubungkan ke `appContext` dan `window.renderAll` di `index.html`.
- [x] **T3 — Ekstrak `./js/ui/mutations.js` (Tab 3):**
  - Buat `./js/ui/mutations.js` (`createMutationsUI(ctx)`), termasuk preview unit NAV, inline edit NAV mutasi, hapus mutasi, dan chart mutasi.
  - Hubungkan ke `appContext` dan `window.renderAll` di `index.html`.
- [x] **T4 — QA Review, Browser Verification (`/browser`) & Update `docs/ARCHITECTURE.md`:**
  - Jalankan review statis 5-axis + uji runtime via `/browser` (pastikan `charts.js`, `journal.js`, `calculator.js`, `mutations.js` HTTP 200, 0 console error, Tab 3/5/6 berfungsi penuh).
  - Perbarui peta baris di `docs/ARCHITECTURE.md`.
