# Design Doc & Tiket — Modularisasi Tahap 2 (Data, Storage & Market Sync)

- **Tanggal:** 2026-11-21
- **Status:** Selesai & Terverifikasi (QA 5-Axis + `/browser`)
- **Ruang Lingkup:** Memisahkan lapisan **State/Schema**, **Formatting/Storage/Cloud Sync**, dan **Market Auto-Sync** dari `index.html` ke Native ES Modules (`./js/state.js`, `./js/storage.js`, `./js/market.js`) tanpa mengubah perilaku UI maupun perhitungan finansial.

---

## 1. Tujuan & Latar Belakang

Setelah Tahap 1 (`css/styles.css` dan `js/nav-engine.js`), `index.html` masih berukuran **5.990 baris** dan mencampur konstanta/skema data, helper format Rupiah/WIB, logika `localStorage`/Firebase, serta mesin *fetch* harga pasar dengan kode UI.

Tahap 2 memisahkan seluruh lapisan non-UI (*Data & Network*) agar:
- Seluruh logika inti belakang layar (Matematika NAV, Skema Data, Storage, dan Live Market Sync) terisolasi bersih dari DOM.
- `index.html` menyusut sekitar **~850–950 baris** (~5.000 baris tersisa, mayoritas HTML + UI per tab).
- Pondasi siap untuk langkah berikutnya (baik *Data Hardening/Security*, *Vercel `/api/market.js` proxy*, maupun fitur produk baru + Tahap 3 *on-demand*).

---

## 2. Pendekatan yang Dipertimbangkan

| Opsi | Cakupan | Trade-off | Keputusan |
| :--- | :--- | :--- | :--- |
| **Opsi 1 (Dipilih)** | Ekstrak 3 modul sekaligus secara bertahap per tiket: `state.js`, `storage.js`, `market.js` | Menyelesaikan seluruh lapisan Data & Network sekaligus (~950 baris keluar dari `index.html`) dalam 4 tiket kecil terverifikasi | **Dipilih User** |
| **Opsi 2** | Hanya `state.js` dan `storage.js` | Lebih cepat, tapi kode *fetch* bursa (~355 baris) tetap menempel di `index.html` | Tidak dipilih |
| **Opsi 3** | Hanya `market.js` | Fokus live price saja, fondasi data/storage belum rapi | Tidak dipilih |

---

## 3. Arsitektur Modul & Batasan Desain

### Prinsip Pemisahan (Anti-Circular & Anti-Regresi)
- **State Ownership Aman:** Variabel `let state` tetap dipegang di `index.html` sementara waktu (hingga Tahap 3) agar assignment seperti `state = incoming` (saat Import JSON / Reset / Cloud Snapshot) tetap bekerja 100% tanpa error ES Module live-binding.
- **Pure Helpers & Dependency Injection:** Modul baru menerima `state` (atau callback) lewat parameter — bukan membaca variabel global secara implisit.
- **Relative Path Wajib:** Semua import menggunakan `./js/...` agar kompatibel 100% di subpath **GitHub Pages** dan root **Vercel** tanpa build step.

### Peta Modul Baru

1. **`./js/state.js`** *(dari `index.html` L2244–L2578 & L2759–L2775)*
   - Export konstanta: `STORAGE_KEY`, `TEMPLATE_REV_KEY`, `TEMPLATE_REV`, `MONTH_NAMES_ID`, `MONTH_SHORT_ID`, `EMITEN_PALETTE`, `DIVIDEND_PRESETS`, `TEMPLATE_DEFAULT_PRICES`.
   - Export fungsi data: `getInitialTemplateData()`, `mergeWithDefaults(raw)`, `ensureYearStructureForState(portfolioState, year)`.
2. **`./js/storage.js`** *(dari `index.html` L2232–L2234, L2580–L2597, L2609–L2857)*
   - Export formatter & utilitas WIB/XSS: `formatNum`, `formatIDR`, `formatSignedIDR`, `formatCompactIDR`, `formatPct`, `colorClass`, `escapeHTML`, `getEmitenColorFromHoldings`, `getJakartaTimeInfo`, `getTodayISO`, `getLatestTradingDateWIB`, `getPriceFreshnessInfo`.
   - Export persistensi: `loadInitialState()`, `saveStateToLocalStorage(portfolioState)`, dan `createCloudSyncController(...)` (memindahkan import Firebase CDN ke `./js/storage.js` secara opsional/aman bila `__firebase_config` tidak ada).
3. **`./js/market.js`** *(dari `index.html` L2862–L3000 + inti fetch dari `syncMarketData`)*
   - Export helper tanggal bursa & fetcher: `formatUnixMarketDateWIB`, `formatIsoDateLabelWIB`, `fetchTradingViewIDX`, `fetchGoogleFinanceQuote`, `fetchYahooChart`, `fetchStooqQuote`.
   - Export orchestrator network: `fetchMarketQuotes(tickers)` yang mengambil harga saham BEI (TradingView → Google Finance → Yahoo → Stooq) + indeks IHSG & LQ45 dan mengembalikan objek hasil bersih. Update DOM spinner & toast tetap di `index.html`.

### Non-Goals & Anti-Goals
- **Non-Goals:** Tidak mengubah desain visual, tidak mengubah formula NAV/IPOT fee, tidak mengubah format `localStorage` (`portfolio_nav_tracker_favo_v1`) maupun format Export/Import JSON, dan tidak menambah fitur produk baru di tahap ini.
- **Anti-Goals:** Tidak boleh ada console error, 404 pada modul, perubahan nilai KPI/NAV, atau rusaknya kompatibilitas data pengguna lama.

---

## 4. Daftar Tiket (*Vertical Slices*)

Aturan eksekusi: **Sequential (Single-Writer)** pada `index.html` sesuai `AGENTS.md`.

| ID | Judul Tiket | File Target | Kriteria Selesai (Acceptance Criteria) | Status |
| :---: | :--- | :--- | :--- | :---: |
| **T1** | Ekstrak Konstanta, Template & Schema Normalizer ke `./js/state.js` | `js/state.js`, `index.html` | Semua konstanta, `getInitialTemplateData`, `mergeWithDefaults`, dan `ensureYearStructure` di-import dari `./js/state.js` via relative path; data awal & migrasi state identik 100%. | `done` |
| **T2** | Ekstrak Formatters, WIB Helpers, `localStorage` & Firebase Sync ke `./js/storage.js` | `js/storage.js`, `index.html` | Helper format Rupiah/angka/WIB/anti-XSS, `loadInitialState`, `saveToLocalStorage`, dan Firebase cloud sync berjalan lewat `./js/storage.js`; `STORAGE_KEY` & Export/Import JSON backward-compatible 100%. | `done` |
| **T3** | Ekstrak Market Auto-Sync Fetchers ke `./js/market.js` | `js/market.js`, `index.html` | Seluruh fetcher bursa (`TradingView`, `Google Finance`, `Yahoo`, `Stooq`) & `fetchMarketQuotes` berada di `./js/market.js`; `window.syncMarketData` & `scheduleDailyMarketCloseSync` tetap berjalan mulus dengan penanganan error yang aman. | `done` |
| **T4** | QA Review 5-Axis, Verifikasi `/browser` & Update `ARCHITECTURE.md` | `docs/ARCHITECTURE.md`, semua modul | Lolos `code-review-and-quality` (0 `Critical`/`Required`); uji `/browser` di server lokal: 0 console error, 0 404, seluruh modul `./js/*.js` HTTP 200, 6 tab + Dark/Light mode + KPI NAV + Export JSON + reload persistence terverifikasi; peta baris `docs/ARCHITECTURE.md` diperbarui. | `done` |
