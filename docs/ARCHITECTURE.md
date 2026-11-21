# ARCHITECTURE.md — Peta Kode & Blueprint Modularisasi

Dokumen referensi *on-demand* untuk Developer, UI/UX Designer, dan QA sebelum mengedit `index.html` atau melakukan pemecahan modul. Jangan baca `index.html` secara utuh (6.162 baris) — lompat langsung ke rentang baris di bawah ini.

---

## 1. Peta Lokasi `index.html` (6.162 Baris)

### A. Head, Styling & Navigasi
| Bagian | Rentang Baris | Isi Utama |
| :--- | :---: | :--- |
| Head & CDN Libraries | `1–50` | Tailwind CSS CDN + config, Chart.js v4.4.4, Lucide Icons |
| Custom CSS | `51–111` | Style custom, scrollbar, transisi, utilitas tema |
| Header & Tab Navigation | `113–260` | Navbar, tombol tema Dark/Light, tombol 6 tab (`#tab-btn-*`) |

### B. Konten 6 Tab & Modals (HTML)
| Bagian | Rentang Baris | Elemen Utama |
| :--- | :---: | :--- |
| Tab 1: Portfolio & Kinerja | `261–537` | `#tab-panel-portfolio` — ringkasan NAV, unit penyertaan, tabel holdings, alokasi |
| Tab 2: Dividen & Proyeksi | `538–805` | `#tab-panel-dividends` — jadwal dividen, proyeksi tahunan, realisasi dividen |
| Tab 3: Mutasi Dana | `806–1025` | `#tab-panel-mutations` — top up & withdraw unitization |
| Tab 4: Grafik & Historis | `1026–1232` | `#tab-panel-analytics` — performa bulanan/tahunan, benchmark IHSG/LQ45 |
| Tab 5: Jurnal TP / CL | `1233–1328` | `#tab-panel-journal` — catatan realized profit/loss |
| Tab 6: Kalkulator Average | `1329–1459` | `#tab-panel-calculator` — simulasi average down/up & chart target |
| Modals (Custom UI) | `1460–2286` | `#modal-buy`, `#modal-sell`, `#modal-dividend`, `#modal-dividend-schedule`, `#modal-bulk-price`, `#modal-cash`, `#modal-edit-holding`, `#modal-manual-journal`, `#modal-cloud`, `#modal-confirm`, `#modal-year-rollover`, `#modal-baseline`, `#modal-import` |

### C. Logika Aplikasi (`<script type="module">`, Baris `2290–6160`)
| # | Bagian | Rentang Baris | Fungsi / Simbol Kunci |
| :---: | :--- | :---: | :--- |
| 1 | Constants, Presets & Global State | `2296–2654` | `STORAGE_KEY = "portfolio_nav_tracker_favo_v1"`, `loadInitialState()` |
| 2 | Core Financial Engine (NAV & Fee) | `2656–2777` | `computeMetrics()`, `calculateIPOTBuyFee()`, `calculateIPOTSellFee()` |
| 3 | Formatting, WIB & Storage Helpers | `2779–3030` | `formatNum()`, `saveToLocalStorage()`, `saveToCloudIfAvailable()`, `initCloudStorage()` |
| 5 | Market Auto-Sync Engine | `3032–3389` | `fetchTradingViewIDX()`, `fetchGoogleFinanceQuote()`, `fetchYahooChart()`, `fetchStooqQuote()`, `updateMarketSyncStatusUI()` |
| 6 | Tab Navigation, Modals & Portfolio CRUD | `3391–3953` | `window.switchTab`, aksi beli/jual/edit holding/cash/rollover/baseline |
| 7 | Dividend Actions | `3955–4114` | `window.setDividendQuickDate`, CRUD dividen & jadwal |
| 8 | Mutations, Analytics & Journal Actions | `4116–4400` | `window.setMutationQuickAmount`, CRUD mutasi & jurnal |
| 9 | Calculator & JSON Export/Import/Reset | `4402–4589` | `window.loadTickerIntoCalculator`, backup JSON export/import/reset |
| 10 | Chart Helpers & Tab 1 Renderer | `4591–5003` | `getChartTextColor()`, `renderPortfolioTab()`, `renderAllocationChart()`, `renderBenchmarkBars()`, `renderPortfolioDividendRecap()` |
| 11 | Tab 2 Renderer (Dividends) | `5005–5602` | `renderDividendsTab()`, `renderActualDividendsSection()` |
| 12 | Tab 3 Renderer (Mutations) | `5604–5794` | `renderMutationsTab()` |
| 13 | Tab 4 Renderer (Analytics) | `5796–6014` | `renderAnalyticsTab()` |
| 14 | Tab 5 & 6 Renderers (Journal & Calc) | `6016–6115` | `renderJournalTab()`, `renderCalculatorTab()`, `renderCalculatorChart()` |
| 15 | Master Render & Init | `6117–6160` | `window.renderAll`, `initApp()` |

*(Catatan: Penomoran komentar asli di `index.html` melompat dari 3 ke 5; rentang baris di atas sudah diverifikasi langsung dari file sumber.)*

---

## 2. Blueprint Modularisasi Bertahap (Native ES Modules)

Saat memecah `index.html`, gunakan **native ES Modules** tanpa bundler agar tetap 100% statis untuk **GitHub Pages & Vercel**. Semua import wajib menggunakan **relative path (`./...`)**.

```text
dashboard-portfolio-saham/
├── index.html               # Shell HTML + <script type="module" src="./js/app.js">
├── AGENTS.md                # Aturan operasional multi-agent
├── css/
│   └── styles.css           # Ekstraksi dari <style> (baris 51–111)
├── js/
│   ├── state.js             # Constants, STORAGE_KEY, state & presets (bagian 1)
│   ├── nav-engine.js        # Pure functions: computeMetrics, NAV, IPOT fees (bagian 2)
│   ├── storage.js           # localStorage, Firebase sync, JSON Export/Import (bagian 3 & 9)
│   ├── market.js            # TradingView/Yahoo/Google/Stooq sync + optional /api fallback (bagian 5)
│   ├── charts.js            # Chart.js helpers & chart renderers (bagian 10 & 14)
│   ├── ui/
│   │   ├── portfolio.js     # Tab 1 actions & renderer
│   │   ├── dividends.js     # Tab 2 actions & renderer
│   │   ├── mutations.js     # Tab 3 actions & renderer
│   │   ├── analytics.js     # Tab 4 actions & renderer
│   │   ├── journal.js       # Tab 5 actions & renderer
│   │   └── calculator.js    # Tab 6 actions & renderer
│   └── app.js               # Master renderAll, switchTab, initApp (bagian 6 & 15)
├── api/                     # (Opsional — khusus Vercel Serverless Functions)
│   └── market.js            # Proxy harga saham IDX/IHSG dengan env vars aman
└── docs/
    ├── ARCHITECTURE.md      # Dokumen ini
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
