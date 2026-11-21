# Spec & Vertical-Slice Tickets: TDD Suite, Market Sync Feedback, Portfolio Search/Sort, Analytics CAGR, Rebalancing Assistant & Security Review

- **Tanggal:** 2026-11-22
- **Status:** Disetujui User (Siap Eksekusi)
- **Target Deploy:** GitHub Pages & Vercel (100% statis, native ES Modules, tanpa build step)

---

## 1. Tujuan & Ruang Lingkup

Meningkatkan keandalan pengujian otomatis, observabilitas sinkronisasi harga pasar, kemudahan navigasi tabel portofolio, kedalaman metrik analitik multi-tahun, serta menambahkan asisten *rebalancing* berbasis target alokasi tanpa merusak kompatibilitas data `localStorage` (`portfolio_nav_tracker_favo_v1`) maupun arsitektur statis.

### Keputusan Desain yang Disetujui User
1. **TDD Seams (5 Antarmuka Publik):**
   - **Seam 1:** `computeMetrics(state)` (`js/nav-engine.js`) — valuasi, NAV/unit, modal disetor, dividen, edge cases (`0` unit, full withdrawal, nilai negatif/`NaN`).
   - **Seam 2:** `calculateIPOTBuyFee` & `calculateIPOTSellFee` (`js/nav-engine.js`) — fee transaksi beli (~0,1513%) & jual (~0,2513%) beserta pembulatan Rupiah.
   - **Seam 3:** `mergeWithDefaults(raw)` (`js/state.js`) — backward-compatibility data `localStorage` & JSON import lama (termasuk default `targetWeight: 0`).
   - **Seam 4:** `computeAllTimeMetrics(state, metrics)` (`js/nav-engine.js`) — All-Time Capital Gain (Rp & %), All-Time Total Return (incl. Realized Dividends), dan Multi-Year CAGR (%).
   - **Seam 5:** `computeRebalancePlan(holdings, metrics)` (`js/nav-engine.js`) — kalkulasi Bobot Aktual vs Target, Drift (%), Selisih Rupiah, dan rekomendasi aksi (`+X Lot` Beli / `-Y Lot` Jual / `Seimbang`).
2. **Penempatan UI Target Alokasi & Rebalancing (Opsi A):**
   - Tabel utama Portofolio tetap bersih dan ringkas.
   - Panel khusus **"Target Alokasi & Rebalancing Assistant"** ditempatkan sebagai kartu mandiri di bawah Tabel Portofolio pada Tab 1 (`#tab-portfolio`), dilengkapi input cepat `Target %` per emiten, indikator total target alokasi (Saham + Sisa Kas), serta rekomendasi aksi dalam satuan Lot (1 lot = 100 lembar).

---

## 2. Invarian & Batasan Teknis

1. **Zero Build Step & Relative Paths:** Semua import ES Module wajib memakai relative path (`./...` atau `../js/...` dari dalam `tests/`).
2. **Backward Compatibility (`STORAGE_KEY`):** Emiten lama yang belum memiliki properti `targetWeight` otomatis dinormalisasi menjadi `0` oleh `mergeWithDefaults(raw)`.
3. **Anti-XSS & Keamanan:** Seluruh nilai dinamis yang dirender ke DOM wajib melalui `escapeHTML()` atau manipulasi atribut/teks yang aman; tidak boleh ada kredensial privat di kode client.
4. **Format Finansial:** Semua angka Rupiah, persentase, dan lot menggunakan `tabular-nums` dan mendukung penuh Dark & Light mode.

---

## 3. Daftar Tiket Eksekusi (Vertical Slices)

### Tiket 1 — Pure Logic Extensions & Browser-Native TDD Suite (`tdd`)
- **Target File:** `js/nav-engine.js`, `js/state.js`, `tests/test-runner.html`, `tests/core.test.js`
- **Langkah (Red → Green → Refactor):**
  1. Buat `tests/test-runner.html` dan `tests/core.test.js` yang menguji ke-5 Seam (`computeMetrics`, `calculateIPOTBuyFee`/`calculateIPOTSellFee`, `mergeWithDefaults`, `computeAllTimeMetrics`, `computeRebalancePlan`).
  2. Tambahkan normalisasi `targetWeight` (`Number.isFinite(Number(h.targetWeight)) ? Math.min(100, Math.max(0, Number(h.targetWeight))) : 0`) pada `mergeWithDefaults` di `js/state.js`.
  3. Implementasikan fungsi murni `computeAllTimeMetrics(state, metrics)` dan `computeRebalancePlan(holdings, metrics)` di `js/nav-engine.js` (beserta integrasinya di `computeMetrics`).
- **Kriteria Selesai:** Semua assertion pada 5 Seam di `tests/test-runner.html` berstatus **PASS (100% hijau)** dengan 0 error console.

### Tiket 2 — Feedback Jelas saat `syncMarketData` & Indikator Sumber Harga
- **Target File:** `js/market.js`, `js/app.js`, `js/ui/portfolio.js`
- **Langkah:**
  1. Perbarui `syncMarketData` di `js/app.js` untuk mencatat daftar ticker yang berhasil diperbarui (`live`) vs yang gagal/memakai harga terakhir (`cache`), serta menyimpan metadata `lastSyncSource` / `lastSyncOk` secara non-destruktif pada tiap holding.
  2. Tampilkan ringkasan jelas pada toast & subjudul status sinkronisasi:
     - Sukses penuh: `"Harga pasar diperbarui (X/X emiten live)"`
     - Parsial: `"X/Y emiten diperbarui • Harga terakhir (cache): TICK1, TICK2"`
     - Gagal semua: `"Gagal memperbarui harga live • Memakai harga terakhir (Y emiten)"`
  3. Tampilkan badge kecil `LIVE` (hijau/cyan) atau `CACHE` (amber/slate) di samping harga pasar pada tabel portofolio setelah sinkronisasi berjalan.
- **Kriteria Selesai:** User langsung mengetahui emiten mana yang gagal/memakai harga cache tanpa harus menebak.

### Tiket 3 — Pencarian Cepat & Sorting Kolom Interaktif di Tabel Portofolio
- **Target File:** `index.html`, `js/ui/portfolio.js`, `js/app.js`
- **Langkah:**
  1. Tambahkan input pencarian cepat (`#portfolio-search-input`) di header kartu Tabel Portofolio (`index.html`) untuk memfilter emiten berdasarkan `ticker`, `name`, atau `sector`.
  2. Jadikan header kolom tabel (`Emiten`, `Bobot %`, `Nilai Pasar`, `Unrealized P/L`) interaktif (klik untuk toggle `asc` → `desc` → `default`) menggunakan state UI ephemeral agar tidak mengubah urutan asli array `state.holdings` di `localStorage`.
- **Kriteria Selesai:** Filter pencarian dan klik sort kolom bekerja instan tanpa merusak aksi Edit/Hapus emiten (aksi Edit/Hapus wajib tetap merujuk pada index asli di `state.holdings`).

### Tiket 4 — Ringkasan All-Time Gain, Total Return & Multi-Year CAGR di Tab Analytics
- **Target File:** `index.html`, `js/ui/analytics.js`, `js/nav-engine.js`
- **Langkah:**
  1. Tambahkan 4 kartu KPI **Ringkasan Performa All-Time (Sejak Awal / 2020)** di bagian paling atas Tab 4 (`#tab-analytics` pada `index.html`):
     - **All-Time Capital Gain (`Rp` & `%` vs Modal Disetor)**
     - **All-Time Total Return (Capital Gain + Dividen Cair `Rp` & `%`)**
     - **Multi-Year Portofolio CAGR (`%/tahun`)**
     - **Outperformance / Alpha vs Benchmark IHSG (`%`)**
  2. Render nilai-nilai tersebut di `js/ui/analytics.js` dari hasil `computeAllTimeMetrics(state, metrics)`.
- **Kriteria Selesai:** Kartu ringkasan All-Time dan CAGR tampil rapi di Tab Analytics dengan format Rupiah/persentase `tabular-nums`.

### Tiket 5 — Fitur Baru: Panel "Target Alokasi & Rebalancing Assistant" (Opsi A)
- **Target File:** `index.html`, `js/ui/portfolio.js`, `js/app.js`
- **Langkah:**
  1. Tambahkan kartu **"Target Alokasi & Rebalancing Assistant"** di bawah Tabel Portofolio pada Tab 1 (`#tab-portfolio` di `index.html`), plus input opsional `Target Alokasi (%)` pada Modal Tambah/Edit Saham.
  2. Di dalam panel Rebalancing Assistant:
     - Tampilkan ringkasan bar status alokasi: `Total Target Saham: XX.X%`, `Target Kas Tersirat: YY.Y%`, dan tombol cepat **"Samakan dengan Bobot Saat Ini"** / **"Reset Target"**.
     - Tampilkan tabel/daftar per emiten: `Emiten`, input inline `Target %` (`0–100%`), `Aktual %`, `Drift (%)`, `Selisih Nilai (Rp)`, serta badge rekomendasi aksi **`Beli +X Lot`** (hijau), **`Jual -Y Lot`** (merah/amber), atau **`On Target`** (netral).
  3. Saat user mengubah nilai `Target %` di panel, simpan langsung ke `state.holdings[i].targetWeight` dan `saveState()`, lalu perbarui rekomendasi lot secara reaktif.
- **Kriteria Selesai:** User dapat mengatur target alokasi tiap saham dengan mudah dan melihat jumlah lot beli/jual yang direkomendasikan secara akurat.

### Tiket 6 — Audit Keamanan Menyeluruh (`security-review`) & Verifikasi Browser (`/browser`)
- **Target File:** `index.html`, `js/**/*.js`, `tests/test-runner.html`
- **Langkah:**
  1. Jalankan audit *taint-flow* mengikuti metodologi skill `security-review` (DOM XSS sinks, `innerHTML`, sanitasi input modal & import JSON, Firebase sync, external scripts/links).
  2. Tutup celah keamanan yang ditemukan (jika ada).
  3. Verifikasi seluruh 6 tiket dan hasil `tests/test-runner.html` melalui subagent `/browser` hingga 0 console errors.
- **Kriteria Selesai:** Lolos `security-review` tanpa temuan *high-confidence*, semua test di `tests/test-runner.html` PASS, dan seluruh fitur baru terverifikasi visual di `/browser`.
