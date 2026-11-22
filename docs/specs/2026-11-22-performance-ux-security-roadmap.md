# Spec & Tickets — Roadmap Prioritas 1 (Performa), Prioritas 2 (Bug & UI/UX Polish), Prioritas 3 (Security)

Tanggal: 2026-11-22
Status: Approved by User (Pendekatan 1 — Eksekusi Bertahap per Prioritas, Tanpa Undo Toast)

---

## Ruang Lingkup & Invarian Wajib
- **Invarian Matematika NAV:** Seluruh fungsi di `./js/nav-engine.js` dan unit test `./tests/math.test.mjs` wajib tetap 100% lulus.
- **Kompatibilitas Data:** Skema `localStorage` (`portfolio_nav_tracker_favo_v1`) dan JSON Export/Import wajib tetap backward-compatible dengan file backup JSON biasa.
- **Kompatibilitas GitHub Pages & Vercel:** Semua path aset (`./css/tailwind.min.css`, `./manifest.json`, `./sw.js`, `./assets/icon.svg`, `./js/*.js`) wajib menggunakan **relative path (`./...`)** dan bekerja tanpa build step wajib saat runtime.

---

## Fase 1 — Prioritas 1: Enhancement Performa

### Tiket P1-1: Pre-compiled Tailwind CSS (`./css/tailwind.min.css`)
- **Tujuan:** Menghilangkan kompilasi runtime `https://cdn.tailwindcss.com` (~350KB JS runtime & layout flash 100–300ms saat load awal) sekaligus menghapus `<script>tailwind.config = ...</script>` inline di `index.html`.
- **Target File:** `./css/tailwind.min.css`, `./index.html`.
- **Kriteria Selesai:** Semua utility classes yang dipakai di `index.html` dan `./js/**/*.js` (termasuk `dark:`, custom colors `canvas`, `surface`, `ink`, `brand`, arbitrary values `bg-[#0C1117]`, `border-white/[0.06]`, dll.) terkompilasi penuh di `./css/tailwind.min.css`.

### Tiket P1-2: Progressive Web App (`./manifest.json`, `./sw.js`, `./assets/icon.svg`)
- **Tujuan:** Membuat aplikasi installable di Home Screen HP/Desktop dan mendukung *offline-first* caching untuk aset statis.
- **Target File:** `./manifest.json`, `./sw.js`, `./assets/icon.svg`, `./index.html`, `./js/app.js`.
- **Kriteria Selesai:** Manifest terhubung dengan path relatif, Service Worker terdaftar otomatis dengan strategi *Network-First with Cache Fallback* untuk `.html`/`.js`/`.css` agar update kode langsung terlihat saat online tetapi tetap berfungsi penuh saat offline.

### Tiket P1-3: Optimasi Render Chart.js (Instance Reuse) & Partial Table Filtering
- **Tujuan:**
  1. Reuse instance Chart.js (`chart.data = ...; chart.options = ...; chart.update('none')`) alih-alih `chart.destroy()` + `new Chart()` pada setiap perubahan input/state di `./js/charts.js`, `./js/ui/dividends.js`, `./js/ui/mutations.js`, `./js/ui/analytics.js`, dan `./js/ui/calculator.js`.
  2. Memisahkan filter search & sort tabel Portofolio (`renderPortfolioTableRows()`) di `./js/ui/portfolio.js` agar mengetik di kotak pencarian tidak menggambar ulang Chart Alokasi, Benchmark, Rekap Dividen, dan Rebalancing.
  3. Scoped `lucide.createIcons()` dan `syncNumInputs()` pada elemen kontainer yang berubah.

---

## Fase 2 — Prioritas 2: Fixing Bug & UI/UX Polish (Tanpa Undo Toast)

### Tiket P2-1: Pemisahan Jelas Uninvested Cash / Buying Power vs Nilai Saham
- **Tujuan:** Memperjelas hirarki visual antara **Nilai Aset Saham (Invested Equity)** vs **Uninvested Cash / Buying Power (Saldo Kas RDN)** di KPI Cards, ringkasan tabel portofolio, dan indikator daya beli.
- **Target File:** `./index.html`, `./js/ui/portfolio.js`.

### Tiket P2-2: Visual Drift Bar, Horizontal P/L Bar & Sticky Table Header
- **Tujuan:**
  1. Menambahkan bar visual perbandingan *Actual Weight vs Target Weight* di tabel Rebalancing Assistant (`./js/ui/portfolio.js`).
  2. Menambahkan mini horizontal bar P/L proporsional pada kolom Floating P/L di tabel Portofolio (`./js/ui/portfolio.js`).
  3. Menambahkan `sticky top-0 z-10` dengan background solid/blur pada `<thead>` tabel-tabel panjang (`./index.html`).

### Tiket P2-3: Keyboard Shortcuts Global & A11y / Inline Number Polish
- **Tujuan:**
  1. Shortcut keyboard global saat fokus tidak berada di dalam `<input>` / `<textarea>` / `<select>`:
     - `/` : Fokus ke kotak pencarian emiten (`#portfolio-search-input`)
     - `1`–`6` : Pindah cepat antar 6 tab utama
     - `r` atau `R` : Trigger `syncMarketPrices(false)`
     - `Escape` : Tutup modal aktif atau bersihkan pencarian emiten
  2. Menambahkan badge petunjuk shortcut (`/` di search box, `1`–`6` di tab/tooltip) dan `aria-label` pada seluruh tombol ikon (`pencil`, `trash-2`, tombol tutup modal).

---

## Fase 3 — Prioritas 3: Improvement Security

### Tiket P3-1: Subresource Integrity (SRI) & Pinning CDN + Network Timeout Hardening
- **Tujuan:**
  1. Pin versi `chart.js@4.4.4` dan `lucide` ke versi spesifik lengkap dengan hash `integrity="sha384-..."` dan `crossorigin="anonymous"` di `./index.html`.
  2. Tambahkan `AbortController` timeout (5.000 ms) dan strict ticker validation (`^[A-Z0-9]{2,8}$`) pada `fetchTradingViewIDX` di `./js/market.js`.
  3. Strict property allowlist & prototype-pollution guard pada `mergeWithDefaults` di `./js/state.js`.

### Tiket P3-2: Backup Reminder (>30 Hari) & Encrypted JSON Export/Import (Web Crypto AES-GCM)
- **Tujuan:**
  1. Menyimpan timestamp `lastBackupAt` di `localStorage` setiap kali user melakukan Export JSON, dan menampilkan pengingat halus jika belum pernah backup atau sudah `> 30 hari`.
  2. Menambahkan opsi **Password-Encrypted Backup (`.enc.json`)** menggunakan native **Web Crypto API (`PBKDF2` 100.000 iterasi + `AES-256-GCM`)**, serta mendukung dekripsi otomatis saat Import JSON jika file terdeteksi berformat terenkripsi (`encrypted: true`).

### Tiket P3-3: Event Delegation (`addEventListener`) & Strict Content-Security-Policy (CSP)
- **Tujuan:**
  1. Mengganti seluruh atribut inline `onclick`, `onchange`, `oninput`, `onsubmit`, `ondragover`, `ondragleave`, `ondrop` di `./index.html` dan `./js/ui/*.js` dengan sistem event delegation terpusat (`data-click`, `data-change`, `data-input`, `data-submit`).
  2. Menambahkan `<meta http-equiv="Content-Security-Policy" ...>` di `./index.html` tanpa `'unsafe-inline'` pada `script-src`.
