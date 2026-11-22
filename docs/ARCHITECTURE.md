# ARCHITECTURE.md — Peta Kode & Blueprint Modularisasi

Dokumen referensi *on-demand* untuk Developer, UI/UX Designer, dan QA sebelum mengedit `index.html` atau modul `./js/*`. Seluruh modularisasi Tahap 1, 2, 3A, dan 3B telah **selesai** — `index.html` kini murni shell HTML (2.233 baris) dan seluruh logika JS berada di `./js/*.js`.

---

## 1. Peta Lokasi `index.html` (2.233 Baris — Pure HTML Shell Pasca Tahap 3B)

### A. Head, Styling & Navigasi
| Bagian | Rentang Baris | Isi Utama |
| :--- | :---: | :--- |
| Head & CDN Libraries | `1–50` | Strict CSP `<meta>`, PWA `manifest.json`, Pre-compiled `./css/tailwind.min.css`, Chart.js v4.4.4 (SRI), Lucide Icons v0.460.0 (SRI) |
| External Stylesheet | `51–52` | `<link rel="stylesheet" href="./css/styles.css" />` *(Tahap 1)* |
| Header & Tab Navigation | `53–200` | Navbar, tombol tema Dark/Light, tombol 6 tab (`#tab-btn-*`) |

### B. Konten 6 Tab, Modals & Entry Point
| Bagian | Rentang Baris | Elemen Utama |
| :--- | :---: | :--- |
| Tab 1: Portfolio & Kinerja | `201–477` | `#tab-panel-portfolio` — ringkasan NAV, unit penyertaan, tabel holdings, alokasi |
| Tab 2: Dividen & Proyeksi | `478–745` | `#tab-panel-dividends` — jadwal dividen, proyeksi tahunan, realisasi dividen |
| Tab 3: Mutasi Dana | `746–965` | `#tab-panel-mutations` — top up & withdraw unitization |
| Tab 4: Grafik & Historis | `966–1172` | `#tab-panel-analytics` — performa bulanan/tahunan, benchmark IHSG/LQ45 |
| Tab 5: Jurnal TP / CL | `1173–1268` | `#tab-panel-journal` — catatan realized profit/loss |
| Tab 6: Kalkulator Average | `1269–1399` | `#tab-panel-calculator` — simulasi average down/up & chart target |
| Modals & Toast Container | `1400–2226` | `#modal-buy`, `#modal-sell`, `#modal-dividend`, `#modal-dividend-schedule`, `#modal-bulk-price`, `#modal-cash`, `#modal-edit-holding`, `#modal-manual-journal`, `#modal-cloud`, `#modal-confirm`, `#modal-year-rollover`, `#modal-baseline`, `#modal-import`, `#toast-container` |
| ES Module Entry Point | `2231` | `<script type="module" src="./js/app.js"></script>` *(Tahap 3B)* |

### C. Peta Modul JavaScript (`./js/**`, 12 Modul ES6 Aktif)
| Modul | Peran Utama | Tahap |
| :--- | :--- | :---: |
| `./js/nav-engine.js` | Pure functions: `computeMetrics`, `calculateIPOTBuyFee`, `calculateIPOTSellFee` | Tahap 1 |
| `./js/state.js` | Konstanta (`STORAGE_KEY`, `MONTH_*`, preset dividen), template awal, normalizer & `ensureYearStructureForState` | Tahap 2 |
| `./js/storage.js` | Format IDR/persen, `escapeHTML`, timezone WIB, `localStorage` load/save, `createCloudSyncController` | Tahap 2 |
| `./js/market.js` | Fetcher live harga saham BEI, IHSG & LQ45 (`fetchMarketQuotes`) | Tahap 2 |
| `./js/charts.js` | Helper warna tema chart, `destroyChart`, `renderAllocationChart`, `renderBenchmarkBars` | Tahap 3A |
| `./js/ui/journal.js` | Tab 5: CRUD & renderer Jurnal Realized P/L | Tahap 3A |
| `./js/ui/calculator.js` | Tab 6: Simulasi Average Down/Up & chart proyeksi | Tahap 3A |
| `./js/ui/mutations.js` | Tab 3: Top Up / Withdraw Unit Penyertaan & chart arus kas | Tahap 3A |
| `./js/ui/analytics.js` | Tab 4: Benchmark IHSG/LQ45, tabel bulanan/tahunan, rollover tahun & 3 chart | Tahap 3B |
| `./js/ui/dividends.js` | Tab 2: Kalender 12 bulan, jadwal DPS, simulasi DRIP 10Y, realisasi & 4 chart | Tahap 3B |
| `./js/ui/portfolio.js` | Tab 1: Buy/Sell/Edit/Bulk/Cash/Baseline CRUD & renderer portofolio + rekap dividen | Tahap 3B |
| `./js/app.js` | Master orchestrator: state runtime, `appContext`, Market Auto-Sync scheduler, navigasi tab, theme, Export/Import JSON, `window.renderAll` & `initApp()` | Tahap 3B |

---

## 2. Blueprint Modularisasi Bertahap (Native ES Modules)

Saat memecah `index.html`, gunakan **native ES Modules** tanpa bundler agar tetap 100% statis untuk **GitHub Pages & Vercel**. Semua import wajib menggunakan **relative path (`./...`)**.

```text
dashboard-portfolio-saham/
├── index.html               # Shell HTML + Strict CSP + <script type="module" src="./js/app.js">
├── manifest.json            # PWA Web App Manifest (relative paths)
├── sw.js                    # PWA Service Worker (Network-First + offline cache fallback)
├── AGENTS.md                # Aturan operasional multi-agent
├── assets/
│   └── icon.svg             # Ikon aplikasi PWA
├── css/
│   ├── tailwind.min.css     # Pre-compiled static Tailwind CSS (tanpa runtime CDN)
│   └── styles.css           # Custom styling & utility tambahan
├── js/
│   ├── state.js             # Constants, STORAGE_KEY, state, presets & allowlisted normalizer
│   ├── nav-engine.js        # Pure functions: computeMetrics, NAV, IPOT fees
│   ├── storage.js           # localStorage, Firebase sync, Backup Reminder, AES-GCM Crypto
│   ├── market.js            # TradingView/Yahoo/Google/Stooq sync + timeout & ticker sanitizer
│   ├── charts.js            # Chart.js helpers, upsertChart() reuse & chart renderers
│   ├── ui/
│   │   ├── portfolio.js     # Tab 1 actions, Buying Power separation & lazy table row renderer
│   │   ├── dividends.js     # Tab 2 actions & renderer
│   │   ├── mutations.js     # Tab 3 actions & renderer
│   │   ├── analytics.js     # Tab 4 actions & renderer
│   │   ├── journal.js       # Tab 5 actions & renderer
│   │   └── calculator.js    # Tab 6 actions & renderer
│   └── app.js               # Master orchestrator, Event Delegation (CSP-safe), Keyboard Shortcuts, initApp
├── tests/
│   ├── test-runner.html     # Browser unit test runner
│   └── core.test.js         # 14 unit tests (NAV, fees, id-ID format, XSS, backup, AES-GCM)
├── api/                     # (Opsional — khusus Vercel Serverless Functions)
│   └── market.js            # Proxy harga saham IDX/IHSG dengan env vars aman
└── docs/
    ├── ARCHITECTURE.md      # Dokumen peta arsitektur ini
    ├── HANDOFF.md           # Living Handoff Document untuk transfer sesi/akun/AI
    └── specs/               # Design doc, spec & tiket dari fase PM
```

### Urutan Migrasi yang Aman (Low-Risk)
1. **Tahap 1 — Pure Logic & Styles:** Pindahkan `css/styles.css` dan `js/nav-engine.js` (fungsi murni tanpa dependensi DOM) → paling aman dan langsung bisa diuji terpisah.
2. **Tahap 2 — Data & Network:** Pindahkan `js/state.js`, `js/storage.js`, dan `js/market.js`.
3. **Tahap 3 — Charts & UI per Tab:** Pindahkan `js/charts.js` lalu pecah renderer/aksi per tab ke `js/ui/*.js`. Setelah tahap ini, `/teamwork` dapat menjalankan beberapa Developer secara paralel pada file tab berbeda tanpa konflik.

---

## 3. Catatan Penting Deploy Ganda (GitHub Pages & Vercel)

1. **Relative Path Wajib:** Gunakan `./css/styles.css` dan `./js/app.js` (JANGAN `/css/...` atau `/js/...`) agar tidak 404 di subpath GitHub Pages (`/dashboard-portfolio-saham/`) maupun root Vercel (`/`).
2. **Pengujian Lokal ES Modules (`CORS`):** Browser memblokir `<script type="module">` jika dibuka langsung lewat protokol `file://`. Setelah mulai memecah ke `./js/*.js`, uji lokal lewat server HTTP statis (atau preview deployment Vercel/GitHub Pages).
3. **Pola Fallback Vercel `/api/market.js`:** Jika kelak membuat proxy serverless di Vercel, panggil `./api/market` terlebih dahulu dengan `try/catch`; jika gagal/404 (di GitHub Pages), otomatis *fallback* ke fetcher client-side yang sudah ada.
