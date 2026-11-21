# Spec & Tiket: Modularisasi Tahap 1 — Fondasi CSS & NAV Engine

- **Tanggal:** 2026-11-21
- **Status:** `done` (T1, T2, dan T3 selesai & terverifikasi di browser)
- **Strategi:** Strangler Pattern (ekstrak fondasi dulu, verifikasi 0 regresi, baru bangun fitur baru)
- **Referensi Arsitektur:** `docs/ARCHITECTURE.md`

---

## 1. Problem Statement

Saat ini seluruh kode **Portfolio NAV Tracker** (HTML, CSS, dan 15 bagian JavaScript) menyatu dalam satu file `index.html` sepanjang ~6.162 baris. Akibatnya:
- Sulit menambah fitur baru atau memperbaiki bug secara aman tanpa risiko merusak bagian lain.
- Konsumsi konteks/token AI boros karena harus memindai file tunggal yang sangat panjang.
- Agent tidak dapat bekerja paralel dengan aman karena semua perubahan menabrak satu file yang sama.
- Logika inti finansial (perhitungan NAV, Unit Penyertaan, dan Fee IPOT) bercampur dengan kode tampilan (DOM), sehingga rawan tersentuh tidak sengaja saat mengubah UI.

## 2. Solution

Memecah **Tahap 1 (Fondasi)** terlebih dahulu secara aman tanpa mengubah perilaku aplikasi sedikit pun (*zero behavior change*):
1. Memisahkan seluruh custom CSS ke modul eksternal `./css/styles.css`.
2. Memisahkan mesin perhitungan inti (NAV, Unit Penyertaan, dan Fee IPOT beli/jual) ke modul ES murni `./js/nav-engine.js` yang tidak bergantung pada DOM atau state global.
3. Menghubungkan kembali keduanya ke `index.html` memakai **relative path (`./...`)** agar tetap berjalan lancar di **GitHub Pages** maupun **Vercel** tanpa build step.

## 3. User Stories

1. Sebagai pengguna Portfolio NAV Tracker, saya ingin tampilan Dark/Light mode, angka `tabular-nums`, dan tata letak seluruh 6 tab tetap 100% identik setelah pemisahan CSS, agar pengalaman penggunaan tidak terganggu.
2. Sebagai pengguna Portfolio NAV Tracker, saya ingin hasil perhitungan NAV/unit, Total Ekuitas, Total Unit, Unrealized/Realized P&L, Dividen, dan Fee IPOT (beli/jual) tetap akurat sama persis seperti sebelumnya, agar data portofolio saya tidak pernah salah hitung.
3. Sebagai pengguna Portfolio NAV Tracker, saya ingin data lama di `localStorage` (`portfolio_nav_tracker_favo_v1`), fitur Export/Import JSON, serta sinkronisasi Firebase tetap berjalan normal tanpa kehilangan data.
4. Sebagai pengguna yang men-deploy aplikasi ke GitHub Pages maupun Vercel, saya ingin aplikasi langsung jalan tanpa konfigurasi build tambahan dan tanpa error 404 aset.
5. Sebagai pemilik proyek yang ingin menambah fitur baru di masa depan, saya ingin logika perhitungan NAV terisolasi rapi di file tersendiri agar aman diuji dan tidak sengaja rusak saat mengubah tampilan.

## 4. Implementation Decisions

1. **Native ES Modules Tanpa Build Step:**
   - Memanfaatkan `<script type="module">` yang sudah ada di `index.html` sehingga browser langsung memuat `./js/nav-engine.js` tanpa bundler (Vite/Webpack).
2. **Relative Path Wajib (`./`):**
   - Semua referensi file baru menggunakan `./css/styles.css` dan `./js/nav-engine.js` (bukan `/css/...`) agar kompatibel dengan subpath GitHub Pages (`username.github.io/repo/`) sekaligus root Vercel.
3. **Pure Function + Wrapper Tipis untuk `computeMetrics`:**
   - Di `./js/nav-engine.js`, fungsi diekspor sebagai pure function:
     - `computeMetrics(portfolioState)` — menerima objek state sebagai parameter (tidak membaca variabel global `state` secara langsung), dilengkapi guard defensif untuk nilai `0`, negatif, kosong, `NaN`, `Infinity`, dan pembagian nol.
     - `calculateIPOTBuyFee(tradeAmount, allInPct = 0.19)`
     - `calculateIPOTSellFee(tradeAmount, allInPct = 0.29)`
   - Di `index.html`, dipasang wrapper 1 baris:
     ```js
     const computeMetrics = () => computeMetricsEngine(state);
     ```
     **Alasan:** Semua pemanggil `computeMetrics()` yang tersebar di berbagai tab & modal pada `index.html` tetap bekerja tanpa perlu diubah satu per satu (risiko regresi minimal).
4. **Kompatibilitas Data & Keamanan:**
   - Tidak ada perubahan pada `STORAGE_KEY`, struktur `state`, format Export/Import JSON, maupun integrasi Firebase.
   - Tidak ada data sensitif/API key baru yang ditambahkan.

## 5. Testing & Verification Decisions

- **Prinsip Uji:** Fokus pada perilaku eksternal yang terlihat pengguna (tampilan visual, konsistensi angka NAV/unit/fee, tidak ada console error), bukan detail internal kode.
- **Seam Utama yang Diuji:**
  1. **Visual & CSS Seam:** Memastikan stylesheet `./css/styles.css` termuat (HTTP 200), Dark/Light mode aktif, dan angka finansial memakai `tabular-nums`.
  2. **NAV & Fee Calculation Seam:** Memverifikasi angka KPI utama (Total Ekuitas, NAV/Unit, Total Unit, P&L, Fee Kalkulator IPOT) pada kondisi normal, data kosong/nol, dan mutasi topup/withdraw.
  3. **Runtime Browser Seam (`/browser`):** Aplikasi dibuka melalui **local HTTP server** (bukan klik ganda `file://` karena aturan CORS ES Modules pada browser) untuk memastikan 0 console error dan seluruh 6 tab dapat dibuka normal.

## 6. Out of Scope (Di Luar Tahap 1)

- Memecah modul JS lain (`state.js`, `storage.js`, `market.js`, `charts.js`, atau modul per tab UI) — masuk Tahap 2/3 atau dilakukan saat tab terkait disentuh fitur baru.
- Mengubah desain UI, warna, layout, atau menambah fitur baru.
- Menambah Vercel Serverless Function (`/api/...`) atau mengubah skema `localStorage` / Firebase.

## 7. Further Notes

- **Catatan Pengujian Lokal (`file://` vs HTTP Server):** Setelah `index.html` mengimpor `./js/nav-engine.js` sebagai ES Module, membuka file langsung dengan klik ganda (`file://...`) akan diblokir CORS oleh browser. Untuk uji lokal gunakan local HTTP server (mis. VS Code Live Server / preview server) atau langsung cek lewat preview GitHub Pages / Vercel.
- **Aturan Single-Writer:** Karena T1 dan T2 sama-sama menyentuh `index.html`, keduanya wajib dijalankan **berurutan** (bukan paralel).

---

## 8. Daftar Tiket (Vertical-Slice)

### T1: Ekstrak Custom CSS ke `./css/styles.css`
- **Status:** `done`
- **Blocked by:** None (dapat dimulai langsung)
- **Peran & Model Disarankan:** Developer — Flash
- **Target Lokasi (`docs/ARCHITECTURE.md`):** `index.html` L51–L111 (`<style>...</style>`) → file baru `./css/styles.css`
- **What to build:** Memindahkan seluruh custom CSS (variabel tema Dark/Light, `color-scheme`, `.tabular-nums`, styling date picker, scrollbar, `.no-spin`) ke `./css/styles.css` dan menautkannya dari `<head>` `index.html` menggunakan `<link rel="stylesheet" href="./css/styles.css" />`.
- **Acceptance Criteria:**
  - [x] File `./css/styles.css` berisi seluruh aturan CSS yang sebelumnya ada di `index.html` L51–L111 tanpa ada yang hilang.
  - [x] Blok `<style>...</style>` di `index.html` digantikan oleh `<link rel="stylesheet" href="./css/styles.css" />` (relative path `./`).
  - [x] Tampilan Dark mode, Light mode, `tabular-nums`, dan input angka (`.no-spin`) tetap berfungsi identik.

---

### T2: Ekstrak Pure NAV & Fee Engine ke `./js/nav-engine.js`
- **Status:** `done`
- **Blocked by:** T1 (karena sama-sama mengedit `index.html`, menjaga aturan *single-writer*)
- **Peran & Model Disarankan:** Developer (Logika Inti) — Pro / High
- **Target Lokasi (`docs/ARCHITECTURE.md`):** `index.html` L2290–L2295 (bagian `import`) & L2656–L2777 (Section 2: `computeMetrics`, `calculateIPOTBuyFee`, `calculateIPOTSellFee`) → file baru `./js/nav-engine.js`
- **What to build:** Memindahkan mesin perhitungan NAV, Unit Penyertaan, dan Fee IPOT ke `./js/nav-engine.js` sebagai pure ES Module yang tahan terhadap edge case (`0`, negatif, data kosong, `NaN`, pembagian nol), lalu mengimpornya di `index.html` dengan wrapper `const computeMetrics = () => computeMetricsEngine(state);`.
- **Acceptance Criteria:**
  - [x] File `./js/nav-engine.js` mengekspor `computeMetrics(portfolioState)`, `calculateIPOTBuyFee(tradeAmount, allInPct = 0.19)`, dan `calculateIPOTSellFee(tradeAmount, allInPct = 0.29)` tanpa referensi langsung ke variabel global `state` atau DOM.
  - [x] Semua kalkulasi aman dari pembagian nol, `NaN`, `Infinity`, nilai kosong, maupun full withdrawal.
  - [x] `index.html` mengimpor ketiga fungsi memakai relative path `./js/nav-engine.js` dan menyediakan wrapper `computeMetrics()` agar seluruh pemanggil lama bekerja tanpa perubahan.
  - [x] Tidak ada perubahan pada `STORAGE_KEY`, struktur data `localStorage`, atau Export/Import JSON.

---

### T3: QA, Code Review & Verifikasi Browser Tahap 1
- **Status:** `done`
- **Blocked by:** T1, T2
- **Peran & Model Disarankan:** QA (Review) — Medium/Pro; Verifikasi `/browser` — Flash
- **Target Lokasi:** `./css/styles.css`, `./js/nav-engine.js`, dan diff pada `index.html`
- **What to build:** Melakukan code review kualitas & keamanan (`code-review-and-quality`), memverifikasi kesiapan deploy GitHub Pages & Vercel (relative path), serta menjalankan pengujian visual & fungsional end-to-end di browser melalui local HTTP server.
- **Acceptance Criteria:**
  - [x] Lolos `code-review-and-quality` tanpa temuan `Critical` atau `Required`.
  - [x] Semua path aset/modul menggunakan relative path (`./`) dan tidak ada error 404 maupun error console di browser.
  - [x] Seluruh 6 tab (Portfolio, Dividends, Mutations, Analytics, Journal, Calculator) terbuka normal di Dark & Light mode.
  - [x] Kalkulasi NAV/Unit dan Kalkulator Fee IPOT menghasilkan angka yang konsisten & bebas `NaN`/`Infinity` (termasuk skenario data kosong/nol).
  - [x] Fitur Load/Save `localStorage` dan Export/Import JSON terverifikasi tetap kompatibel.

---

## 9. Definition of Done (Tahap 1)

- [x] Seluruh tiket **T1, T2, dan T3** selesai dan semua acceptance criteria tercentang.
- [x] Nol perubahan perilaku pada fitur pengguna (*zero regression*).
- [x] Siap di-push ke GitHub Pages & Vercel tanpa build step.
