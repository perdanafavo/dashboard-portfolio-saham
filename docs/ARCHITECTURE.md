# ARCHITECTURE.md — Peta Kode & Blueprint Modularisasi

Dokumen referensi *on-demand* untuk Developer, UI/UX Designer, dan QA sebelum mengedit `index.html` atau melakukan pemecahan modul. Jangan baca `index.html` secara utuh (4.630 baris) — lompat langsung ke rentang baris di bawah ini.

---

## 1. Peta Lokasi `index.html` (4.630 Baris — Pasca Modularisasi Tahap 1, 2 & 3A)

### A. Head, Styling & Navigasi
| Bagian | Rentang Baris | Isi Utama |
| :--- | :---: | :--- |
| Head & CDN Libraries | `1–50` | Tailwind CSS CDN + config, Chart.js v4.4.4, Lucide Icons |
| External Stylesheet | `51–52` | `<link rel="stylesheet" href="./css/styles.css" />` *(ekstraksi Tahap 1)* |
| Header & Tab Navigation | `53–200` | Navbar, tombol tema Dark/Light, tombol 6 tab (`#tab-btn-*`) |

### B. Konten 6 Tab & Modals (HTML)
| Bagian | Rentang Baris | Elemen Utama |
| :--- | :---: | :--- |
| Tab 1: Portfolio & Kinerja | `201–477` | `#tab-panel-portfolio` — ringkasan NAV, unit penyertaan, tabel holdings, alokasi |
| Tab 2: Dividen & Proyeksi | `478–745` | `#tab-panel-dividends` — jadwal dividen, proyeksi tahunan, realisasi dividen |
| Tab 3: Mutasi Dana | `746–965` | `#tab-panel-mutations` — top up & withdraw unitization |
| Tab 4: Grafik & Historis | `966–1172` | `#tab-panel-analytics` — performa bulanan/tahunan, benchmark IHSG/LQ45 |
| Tab 5: Jurnal TP / CL | `1173–1268` | `#tab-panel-journal` — catatan realized profit/loss |
| Tab 6: Kalkulator Average | `1269–1399` | `#tab-panel-calculator` — simulasi average down/up & chart target |
| Modals (Custom UI) | `1400–2226` | `#modal-buy`, `#modal-sell`, `#modal-dividend`, `#modal-dividend-schedule`, `#modal-bulk-price`, `#modal-cash`, `#modal-edit-holding`, `#modal-manual-journal`, `#modal-cloud`, `#modal-confirm`, `#modal-year-rollover`, `#modal-baseline`, `#modal-import` |

### C. Logika Aplikasi (`<script type="module">`, Baris `2231–4628`)
| # | Bagian | Rentang Baris | Fungsi / Simbol Kunci & Modul Eksternal |
| :---: | :--- | :---: | :--- |
| 1 | Imports & Runtime State | `2231–2290` | Import `./js/nav-engine.js`, `./js/state.js`, `./js/storage.js`, `./js/market.js`, `./js/charts.js`, `./js/ui/journal.js`, `./js/ui/calculator.js`, `./js/ui/mutations.js`; `let state = loadInitialState()` |
| 2 | Core Financial Engine (Wrapper) | `2292–2295` | Delegasi ke `./js/nav-engine.js` (`computeMetrics`, `calculateIPOTBuyFee`, `calculateIPOTSellFee`) |
| 3 | Formatting, WIB & Storage (Wrappers) | `2297–2346` | Delegasi ke `./js/storage.js` + `showToast()`, `commitStateChange()` |
| 5 | Market Auto-Sync UI & Scheduler | `2348–2522` | Delegasi fetcher ke `./js/market.js` (`fetchMarketQuotes`); UI status & `scheduleDailyMarketCloseSync()` |
| 6 | Tab Navigation, Modals, `appContext` & Portfolio CRUD | `2524–3103` | `window.switchTab`, `appContext`, inisialisasi `createJournalUI` / `createCalculatorUI` / `createMutationsUI`, aksi beli/jual/edit holding/cash/baseline |
| 7 | Dividend Actions | `3105–3265` | `window.setDividendQuickDate`, CRUD dividen & jadwal |
| 8 | Analytics Actions | `3267–3364` | `window.onAnalyticsYearChange`, benchmark inputs, snapshot bulanan, rollover tahun *(Mutations & Journal didelegasikan ke `./js/ui/*`)* |
| 9 | JSON Export/Import/Reset | `3366–3493` | Backup JSON export/import/reset & cloud modal *(Calculator didelegasikan ke `./js/ui/calculator.js`)* |
| 10 | Chart Wrappers & Tab 1 Renderer | `3495–3763` | Wrapper `./js/charts.js` (`destroyChart`, `renderAllocationChart`, `renderBenchmarkBars`), `renderPortfolioTab()`, `renderPortfolioDividendRecap()` |
| 11 | Tab 2 Renderer (Dividends) | `3765–4362` | `renderDividendsTab()`, `renderActualDividendsSection()` |
| 13 | Tab 4 Renderer (Analytics) | `4364–4582` | `renderAnalyticsTab()` *(Tab 3 Renderer didelegasikan ke `./js/ui/mutations.js`)* |
| 15 | Master Render & Init | `4584–4628` | `window.renderAll`, `initApp()` *(Tab 5 & 6 Renderers didelegasikan ke `./js/ui/journal.js` & `./js/ui/calculator.js`)* |

*(Catatan: Penomoran komentar asli di `index.html` dipertahankan; rentang baris di atas sudah diperbarui pasca Modularisasi Tahap 1, Tahap 2 & Tahap 3A.)*

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
