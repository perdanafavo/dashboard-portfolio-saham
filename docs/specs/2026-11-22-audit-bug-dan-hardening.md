# Design Doc, Spec & Tickets — Audit Bug Fungsional, Integritas Matematika & Hardening Edge-Case

- **Tanggal:** 2026-11-22
- **Status:** Selesai & Terverifikasi QA (`/browser` 8/8 PASS, 0 console errors)
- **Pendekatan Terpilih:** Pendekatan 1 — Sprint Terpadu (3 Tiket Vertical-Slice: Critical Functional Bugs → Math & State Integrity → UI & Code Hardening)

---

## 1. Tujuan & Latar Belakang (Intent & Why)

Setelah modularisasi ES Modules (Tahap 1–3B) dan pembaruan dataset utama portofolio selesai, audit 5-axis (`code-review-and-quality` + `impeccable harden`) menemukan sejumlah bug fungsional, celah matematika *edge-case*, dan celah interaksi UI yang perlu dibereskan agar aplikasi **Portfolio NAV Tracker** tahan banting di seluruh skenario penggunaan nyata.

### Goals
1. Menghilangkan seluruh bug runtime (`ReferenceError` pada dropdown Tab Dividen) dan bug *state pollution* (mengintip tahun historis di Tab Analytics tidak boleh mengubah `state.meta.activeYear` atau menimpa data historis saat Sync Harga).
2. Menjaga integritas matematika Unit Penyertaan (NAV), fee IPOT (PMK 131/2024), mutasi dana (*full withdrawal* / `totalUnits <= 0`), dan konsistensi `totalPaidInCapital` vs `annualHistory.topUp`.
3. Memperkuat ketahanan UI (*edge-case hardening*): anti-duplikat saat *edit ticker* + migrasi jadwal dividen, penggabungan bulan kembar pada jadwal DPS, validasi `handleYearRollover`, Clipboard API modern, *reset* input invalid, dan penutupan modal via tombol `Escape` / klik *backdrop*.

### Non-Goals & Anti-Goals
- **Non-Goal:** Mengubah skema `localStorage` (`portfolio_nav_tracker_favo_v1`) atau merombak tampilan visual dashboard yang sudah stabil.
- **Anti-Goal:** Menambah *build step* / dependency eksternal, atau merusak kompatibilitas file backup JSON lama.

---

## 2. Perbandingan Pendekatan (Approaches)

| Pendekatan | Deskripsi | Trade-off | Keputusan |
| :--- | :--- | :--- | :--- |
| **Pendekatan 1: Sprint Terpadu (3 Tiket)** | Menyelesaikan seluruh bug fungsional kritis, integritas matematika/state, dan UI hardening dalam satu siklus rilis & verifikasi `/browser`. | Menyentuh ~8 file modul, tetapi seluruh celah langsung tuntas dalam 1 siklus QA. | **Dipilih User** |
| **Pendekatan 2: Bertahap (2 Sesi)** | Hanya memperbaiki Tiket 1 & 2 terlebih dahulu; UI hardening ditunda ke sesi berikutnya. | Diff per sesi lebih kecil, namun membutuhkan 2 siklus QA `/browser`. | Ditolak |

---

## 3. Spesifikasi Teknis per Area Perubahan

### A. Perbaikan Bug Fungsional Kritis (Tiket 1)
1. **Ekspos `window.renderDividendsTab` (`js/ui/dividends.js`):**
   - Daftarkan `window.renderDividendsTab = renderDividendsTab;` di dalam `createDividendsUI(ctx)` agar dropdown `#div-year-select` dan `#div-actual-chart-mode` di `index.html` berjalan tanpa `ReferenceError`.
2. **Isolasi Filter Tahun Historis Tab Analytics (`js/ui/analytics.js`):**
   - Tambahkan variabel lokal modul `let selectedAnalyticsYear = null;`.
   - Saat `onAnalyticsYearChange()` dipanggil dari `#analytics-year-select`, ubah hanya `selectedAnalyticsYear = yr` lalu panggil `renderAnalyticsTab()` (dan `renderIconsIn`), **jangan** mengubah `state.meta.activeYear`!
   - `state.meta.activeYear` hanya berubah saat **Tutup Buku (`handleYearRollover`)** atau saat **Import/Reset JSON**.
   - Dengan demikian, ketika user melihat data historis tahun `2023` atau `2024` di Tab Analytics lalu menekan **Sync Harga & IHSG** atau **Snapshot Kinerja Bulan Ini**, data yang diupdate tetap tahun aktif portofolio (`state.meta.activeYear`, yaitu `2026`), bukan menimpa data historis `2023`/`2024`.
   - Tambahkan badge/indikator jelas pada tombol Snapshot: selalu menyimpan ke bulan berjalan pada `state.meta.activeYear` (dan otomatis mengalihkan tampilan `selectedAnalyticsYear` kembali ke `state.meta.activeYear` setelah snapshot/rollover).
3. **Presisi 4-Desimal Footer Unit di Tab Mutasi (`js/ui/mutations.js`):**
   - Ganti `${formatSignedIDR(m.totalUnits - m.initUnits).replace("Rp ", "")} unit` pada `#mutations-table-foot` menjadi helper format unit bertanda (`+` / `-`) dengan **4 desimal** (`formatNum(Math.abs(unitDiff), 4)`), konsisten dengan seluruh baris tabel mutasi.

### B. Integritas Matematika NAV, Fee IPOT & State (Tiket 2)
1. **Proteksi *Full Withdrawal* & Batas Penarikan Unit (`js/nav-engine.js` & `js/ui/mutations.js`):**
   - Di `js/ui/mutations.js` (`handleAddMutation`): saat `type === "WITHDRAW"`, validasi bahwa `unitsDelta <= m.totalUnits + 1e-6` dan `amount <= m.totalValuation + 1`. Jika melebihi total unit/valuasi portofolio, tampilkan toast error dan batalkan mutasi.
   - Di `js/nav-engine.js` (`computeMetrics`): jika `totalUnits <= 0` (misal karena data JSON eksternal mencatat *full withdrawal*), jangan paksa `totalUnits = 1` ketika `totalValuation > 0` yang menyebabkan `currentNav = totalValuation / 1` meledak. Gunakan `totalUnits = 0` dan `currentNav = totalValuation > 0 ? initNav : 0`, atau hanya fallback ke `initNav` ketika unit habis (`totalUnits <= 0`), serta clamp `totalPaidInCapital` agar aman.
2. **Keseimbangan Komponen Fee IPOT pada Custom Fee Rendah (`js/nav-engine.js`):**
   - Pada `calculateIPOTBuyFee(tradeAmount, allInPct)` dan `calculateIPOTSellFee(tradeAmount, allInPct)`:
     - Jika user memasukkan custom `allInPct` yang lebih kecil dari biaya bursa/pajak tetap (`< 0.04%` pada Beli atau `< 0.14%` pada Jual), skalakan komponen `levyFee`, `kpeiFee` (dan `salesTax` pada Jual) secara proporsional terhadap `totalFee` agar jumlah seluruh komponen rincian selalu sama persis (`100% balance`) dengan `totalFee`.
     - Tambahkan properti `dpp` pada return object `calculateIPOTSellFee` agar konsisten dengan `calculateIPOTBuyFee`.
3. **Konsistensi `totalPaidInCapital` vs `annualHistory.topUp` (`js/state.js`, `js/ui/portfolio.js`, `js/ui/mutations.js`, `index.html`):**
   - Perjelas label di UI:
     - Di Tab 1 & Tab 3: tambahkan keterangan/tooltip jelas bahwa **Total Modal Disetor (Basis Unit)** adalah *Modal Awal Tahun Berjalan + Mutasi Bersih Tahun Berjalan*, sedangkan di Tab 4 adalah **Akumulasi Top Up Bersih (All-Time)**.
   - Di `js/ui/mutations.js` (`handleAddMutation` & `deleteMutation`): gunakan fungsi rekalkulasi yang konsisten untuk `ann.topUp` pada tahun mutasi (`yr`) berdasarkan total bersih `state.mutations` di tahun `yr`.
   - Di `js/ui/portfolio.js` (`handleSaveBaseline`): jika `clearMuts` dicentang (`state.mutations = []`), sinkronkan juga `ann.topUp = 0` untuk `state.meta.activeYear` agar Tab 4 tidak menyisakan angka mutasi template yang sudah dihapus.
   - Di `js/state.js` (`mergeWithDefaults`): hanya timpa `annualHistory[yr].topUp` dari `mutYearTotals` jika terdapat mutasi pada tahun `yr` tersebut (sudah dilakukan), sehingga tahun-tahun historis `2020–2025` yang tidak punya item di `mutations` tetap terjaga.
4. **Anti-Duplikat & Migrasi Jadwal Dividen Saat Edit Emiten (`js/ui/portfolio.js`):**
   - Di `handleEditHolding`:
     - Cek apakah `ticker` baru sudah dipakai oleh holding lain (`state.holdings.some(item => item.id !== id && item.ticker === ticker)`). Jika sudah ada, tolak dengan toast error `"Emiten ${ticker} sudah ada di portofolio. Gunakan fitur Beli untuk menambah lot."`.
     - Jika `oldTicker !== ticker`, migrasikan `state.dividendSchedules[oldTicker]` ke `state.dividendSchedules[ticker]` (jika belum ada) dan perbarui ticker pada `state.dividends`? *(Catatan: riwayat dividen masa lalu tetap membawa ticker saat cair, tetapi jadwal proyeksi masa depan `dividendSchedules` wajib ikut pindah ke ticker baru).*
5. **Validasi & Reset Filter pada Tutup Buku (`handleYearRollover` di `js/ui/analytics.js`):**
   - Validasi `if (newYear <= oldYear)` → tampilkan toast error `"Tahun baru harus lebih besar dari tahun aktif saat ini (${oldYear})."`.
   - Kunci juga snapshot bulan terakhir (Desember / bulan berjalan) pada `oldYear` jika belum terisi.
   - Reset `dataset.userPicked = ""` pada `#div-year-select` dan `#porto-div-recap-year-select`, serta set `selectedAnalyticsYear = newYear` agar seluruh tab otomatis berpindah ke tahun baru (`newYear`).

### C. UI, Form & Edge-Case Hardening (Tiket 3)
1. **Modern Clipboard API + Fallback (`js/app.js`):**
   - Di `copyCurrentJSONToClipboard`, gunakan `navigator.clipboard.writeText(jsonStr)` (async/promise) sebagai metode utama, dan gunakan `ta.select(); document.execCommand("copy")` di blok fallback jika Clipboard API gagal/tidak tersedia.
2. **Penggabungan Duplikasi Bulan Jadwal Dividen & Indikator Surplus (`js/ui/dividends.js` & `index.html`):**
   - Di `handleSaveDividendSchedule`: jika `d1 > 0 && d2 > 0 && m1 === m2`, gabungkan keduanya menjadi 1 entri `[{ month: m1, dps: Number((d1 + d2).toFixed(4)) }]` dan tampilkan info bahwa pembayaran di bulan yang sama digabungkan, sehingga tidak muncul 2 chip emiten kembar di Kalender Panen.
   - Tambahkan `onchange="updateSchedulePreview()"` pada `#sched-month-1` dan `#sched-month-2` di `index.html`.
   - Pada `#div-progress-remaining` (`js/ui/dividends.js`): jika `actualYearTotal > annualEstimate && annualEstimate > 0`, tampilkan `"Surplus Realisasi: +${formatIDR(actualYearTotal - annualEstimate)}"` alih-alih `"Sisa Potensi: Rp 0"`.
3. **Reset Otomatis Input Inline Invalid (`js/ui/portfolio.js`, `js/ui/analytics.js`, `js/ui/journal.js`):**
   - Di `updateSinglePrice` (`js/ui/portfolio.js`): jika harga `<= 0` atau `!Number.isFinite(price)`, tampilkan toast peringatan `"Harga saham harus lebih dari Rp 0"` dan panggil `renderPortfolioTab()` untuk mengembalikan nilai input ke `h.currentPrice`.
   - Di `updateBenchmarkInputs` (`js/ui/analytics.js`): jika nilai input `<= 0` atau `!Number.isFinite(val)`, tolak perubahan, tampilkan toast peringatan, dan kembalikan nilai input ke nilai `state.benchmark` sebelumnya (jangan di-reset paksa menjadi `1`).
   - Di `handleAddManualJournal` (`js/ui/journal.js`): tambahkan guard validasi JS `if (!ticker || shares <= 0 || avgCost <= 0 || sellPrice <= 0)` dengan toast error.
4. **Empty State Footer `0,00%`, Chart Alokasi Kosong & Modal Accessibility (`Escape` + Backdrop Click):**
   - Di `js/ui/portfolio.js` (`tfoot`): tampilkan `${m.totalCost > 0 ? "100,00%" : "0,00%"}` dan `${m.totalValuation > 0 ? "100,00%" : "0,00%"}`.
   - Di `js/ui/dividends.js` (`tfoot`): tampilkan `${annualEstimate > 0 ? "100,0%" : "0,0%"}`.
   - Di `js/charts.js` (`renderAllocationChart`): jika `m.totalValuation <= 0`, render placeholder dataset `["Belum ada aset"]` dengan nilai `[1]` dan warna `#475569` (seperti pada donut dividen) beserta tooltip `" Belum ada aset saham / kas"`.
   - Di `js/app.js`: tambahkan global listener `keydown` untuk tombol `Escape` yang menutup modal `.fixed.inset-0.z-50:not(.hidden)` paling atas, serta klik pada *backdrop* overlay modal (`event.target === modalEl`) untuk menutup modal (kecuali `#modal-confirm` agar konfirmasi destruktif tetap eksplisit).

---

## 4. Breakdown Tiket Eksekusi (Vertical Slices)

- **Tiket 1 — Critical Functional Fixes:**
  - Target: `js/ui/dividends.js`, `js/ui/analytics.js`, `js/ui/mutations.js`
  - Kriteria Selesai: Dropdown Tab 2 bebas `ReferenceError`; ganti tahun di Tab 4 tidak mengubah `state.meta.activeYear`; footer unit Tab 3 presisi 4 desimal.
- **Tiket 2 — Financial Math & State Sync Integrity:**
  - Target: `js/nav-engine.js`, `js/ui/mutations.js`, `js/ui/portfolio.js`, `js/ui/analytics.js`, `index.html`
  - Kriteria Selesai: Validasi withdraw > total unit & proteksi full withdrawal `totalUnits === 0`; komponen fee IPOT tetap balance pada custom fee rendah + `dpp` pada sell fee; sinkronisasi `annualHistory.topUp` saat hapus/clear mutasi; anti-duplikat & migrasi `dividendSchedules` saat edit ticker; validasi `newYear > oldYear` & reset filter tahun dividen pada Tutup Buku.
- **Tiket 3 — UI, Form & Edge-Case Hardening + Browser QA:**
  - Target: `js/app.js`, `js/ui/dividends.js`, `js/ui/portfolio.js`, `js/ui/analytics.js`, `js/ui/journal.js`, `js/charts.js`, `index.html`
  - Kriteria Selesai: Clipboard API modern + fallback; penggabungan bulan kembar di jadwal dividen + label surplus; reset otomatis input harga/benchmark invalid; footer `0,00%` & chart alokasi saat kosong; tutup modal dengan `Escape` / klik backdrop; lolos verifikasi `/browser` 0 error console.
