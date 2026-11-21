# Spec & Tiket: Optimasi Perpindahan Tab (Opsi A) & Pembaruan Data Utama Portofolio

- **Tanggal:** 2026-11-22
- **Status:** Disetujui User (Opsi A)
- **Target Deploy:** GitHub Pages & Vercel (Static ES Modules, Zero Build Step)

---

## 1. Tujuan & Latar Belakang (Intent & Why)
1. **Kelancaran Berpindah Tab (<16ms / Instan):**
   - Sebelumnya, setiap klik `switchTab(tabName)` selalu memanggil `renderAll()` penuh yang membangun ulang tabel DOM, memanggil `chart.destroy()` + `new Chart()` pada semua kanvas di tab tersebut, serta menjalankan `window.lucide.createIcons()` ke seluruh 2.233 baris HTML meskipun state portofolio maupun tema tidak berubah.
   - Selain itu, `computeMetrics(state)` dipanggil berulang kali di dalam satu siklus render yang sama.
2. **Pembaruan Data Default Utama (`Portofolio Saham — Favo Perdana (Unit System)`):**
   - Menjadikan JSON portofolio terbaru (8 emiten ter-sync 19 Nov 2026: BBRI, BMRI, TLKM, BBNI, INDF, ASII, BBCA, ADRO; `cash: 219473`; 10 mutasi Jan–Okt 2026; 18 jadwal dividen; benchmark & histori bulanan/tahunan 2020–2026) sebagai data utama saat aplikasi pertama kali dibuka maupun saat tombol Reset Template ditekan.

---

## 2. Goals, Non-Goals & Constraints
- **Goals:**
  - Perpindahan ke tab yang sudah pernah dirender pada versi state/tema yang sama berjalan instan (`0ms` re-render: cukup toggle class `hidden` tanpa membuat ulang DOM dan Chart.js).
  - Membatasi pemindaian ikon Lucide (`lucide.createIcons`) hanya pada kontainer panel tab aktif atau modal yang sedang dibuka, bukan seluruh `document`.
  - Memoisasi `computeMetrics()` berbasis `stateVersion` agar tidak dihitung berulang kali saat state belum berubah.
  - Menambahkan `<link rel="modulepreload">` pada `index.html` untuk meratakan waterfall pemuatan ES module.
  - Memperbarui `getInitialTemplateData()`, `DIVIDEND_PRESETS`, `TEMPLATE_DEFAULT_PRICES`, dan menaikkan `TEMPLATE_REV` ke `"2026-11-22_1"` di `js/state.js`.
- **Non-Goals:**
  - Tidak mengubah rumus matematika NAV, unit penyertaan, fee IPOT, atau CAGR di `js/nav-engine.js`.
  - Tidak menambahkan build step (bundler/npm build) agar tetap langsung jalan di GitHub Pages & Vercel.
- **Constraints (`AGENTS.md`):**
  - Semua path wajib relatif (`./...`).
  - Skema `localStorage` (`portfolio_nav_tracker_favo_v1`) dan JSON Export/Import tetap kompatibel.

---

## 3. Pendekatan yang Dipilih (Approaches)
- **Opsi A (Dipilih User):** *Dirty-Flag Tab Caching + Scoped Lucide Icons + Memoized Metrics + Modulepreload*.
  - Setiap perubahan state (`commitStateChange`, `setState`, `syncMarketData`, perubahan tahun/mode chart) atau `toggleTheme()` menaikkan `stateVersion` (atau mereset cache tab terkait).
  - `switchTab(tabName)` mengecek apakah `renderedTabVersion[tabName] === stateVersion`. Jika sudah sama, cukup tampilkan panel tanpa render ulang DOM/Chart.js.
- **Opsi B (Ditolak):** *Background Idle Pre-rendering (`requestIdleCallback`)* — ditolak karena Chart.js pada panel `display: none` (`hidden`) berisiko menghasilkan ukuran kanvas `0x0` dan memboroskan memori awal.

---

## 4. Breakdown Tiket Implementasi (Vertical Slices)

### Tiket 1: Update Data Default Utama di `js/state.js`
- **Target File:** `js/state.js`
- **Perubahan:**
  1. Naikkan `TEMPLATE_REV` menjadi `"2026-11-22_1"`.
  2. Perbarui `DIVIDEND_PRESETS`, `TEMPLATE_DEFAULT_PRICES`, dan `getInitialTemplateData()` sesuai JSON `Portofolio Saham — Favo Perdana (Unit System)` (8 emiten: BBRI, BMRI, TLKM, BBNI, INDF, ASII, BBCA, ADRO; `cash: 219473`; `meta` lengkap dengan `owner: "Favo Perdana"`, `currentUnits: 222450`, `currentNav: 1130.9663`, `reconciledWithSheet: true`; 18 `dividendSchedules`; `benchmark`; `monthlyHistoryByYear[2026]`; `annualHistory` 2020–2026; `marketSync` 19 Nov 2026).
  3. Pastikan `mergeWithDefaults()` tidak menghapus metadata `SYNC` (`priceUpdatedAt`, `marketDateWIB`, `marketDateLabel`, `prevClose`) pada data default baru.

### Tiket 2: Dirty-Flag Tab Caching, Memoized Metrics & Scoped Lucide di `js/app.js`
- **Target File:** `js/app.js`
- **Perubahan:**
  1. Tambahkan `let stateVersion = 1;` dan `const renderedTabVersion = {};` serta helper `invalidateRenderCache(tabName = null)`.
  2. Memoisasi `computeMetrics()` sehingga selama `cachedMetricsVersion === stateVersion`, fungsi langsung mengembalikan hasil kalkulasi yang sudah di-cache.
  3. Tambahkan helper `renderIconsIn(rootEl)` untuk membatasi pemindaian Lucide (`lucide.createIcons()`) pada panel aktif / modal yang dibuka, plus sekali saat `initApp()` untuk header/navigasi.
  4. Pada `window.switchTab(tabName)`:
     - Toggle `.tab-panel` dan styling `.tab-btn`.
     - Jika `renderedTabVersion[tabName] === stateVersion`, lewati render ulang DOM & Chart.js (cukup update jam status market sync). Jika belum, jalankan `window.renderAll({ force: false })`.
  5. Pada `window.renderAll({ force = true } = {})`:
     - Jika `force === true` (misal dipanggil dari perubahan filter/select inline atau perubahan state), naikkan `stateVersion` sehingga tab aktif dirender ulang dan tab lain otomatis ditandai *dirty* untuk dirender saat nanti dibuka.

### Tiket 3: Flatten ES Module Waterfall di `index.html` & Verifikasi QA Browser
- **Target File:** `index.html` (`<head>`)
- **Perubahan:**
  1. Tambahkan `<link rel="modulepreload" href="...">` untuk `./js/app.js`, `./js/nav-engine.js`, `./js/state.js`, `./js/storage.js`, `./js/market.js`, `./js/charts.js`, dan ke-6 modul `./js/ui/*.js`.
  2. Verifikasi via Browser Subagent (`/browser`) bahwa:
     - Data utama yang tampil saat pertama dibuka adalah **Portofolio Saham — Favo Perdana (Unit System)** (Kas Rp 219.473, 8 emiten BBRI..ADRO, NAV Rp 1.130,97, Unit 222.450,0000).
     - Perpindahan antar 6 tab berjalan instan tanpa kedipan chart saat kembali ke tab yang sudah dibuka, dan 0 console error.
