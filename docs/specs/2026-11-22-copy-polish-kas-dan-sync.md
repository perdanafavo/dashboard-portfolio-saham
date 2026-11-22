# Design Doc, Spec & Tickets — Perapian Copy Bahasa Indonesia (Saldo Kas & Status Sinkronisasi)

**Tanggal:** 2026-11-22
**Status:** Selesai & Terverifikasi (`ALL PASS 14/14` + Browser QA)
**Target Arsitektur:** Vanilla ES Modules (`./index.html`, `./js/ui/portfolio.js`, `./js/app.js`) — 100% statis (GitHub Pages & Vercel)

---

## 1. Tujuan & Latar Belakang (Intent & Why)
Pasca pembaruan *UI/UX Polish* sebelumnya, beberapa area utama di **Tab 1 (Portofolio & Kinerja)** menjadi terlalu padat dan mencampur istilah Inggris–Indonesia (`Invested Saham`, `Uninvested Cash (Buying Power)`, `Invested Equity`, `Market Closed`, `Auto-Sync otomatis`), padahal di bagian lain aplikasi sudah memakai istilah **Kas / Saldo Kas**. Hal ini membuat tampilan kartu KPI atas, baris status sinkronisasi, dan footer tabel terasa sesak (bahkan turun menjadi 2 baris pada `tfoot`).

**Tujuan:** Merapikan *copy* pada 5 titik fokus di Tab Portofolio kembali ke Bahasa Indonesia yang ringkas, konsisten memakai istilah **Kas / Saldo Kas (RDN)**, dan lega dibaca dalam satu baris.

---

## 2. Goals, Non-Goals & Constraints

### Goals
1. Menghilangkan pencampuran istilah `Invested Saham` / `Uninvested Cash` / `Buying Power` / `Invested Equity` dan menyeragamkannya kembali menjadi **Saham** dan **Saldo Kas (RDN)**.
2. Meringkas elemen *pill* bertumpuk pada KPI Card 1 serta teks berulang pada Status Bar Sinkronisasi Pasar dan `<tfoot>` tabel Portofolio agar bersih dalam satu baris.
3. Mempertahankan pembedaan informasi antara nilai aset saham dan saldo kas tanpa membuat antarmuka penuh sesak.

### Non-Goals & Anti-Goals
- **Tidak** mengubah header kolom tabel atau *copy* di luar 5 titik fokus yang disepakati (rekomendasi tambahan lintas tab ditunda ke diskusi terpisah bila diperlukan).
- **Tidak** mengubah logika kalkulasi matematika di `js/nav-engine.js`, skema `localStorage`, maupun format angka `id-ID` (`tabular-nums`).

### Constraints (Invarian Wajib)
- **Strict CSP:** Dilarang menambah inline event handler (`onclick`, dll.); seluruh interaksi wajib tetap memakai `data-onclick` / `data-onchange`.
- **Static Tailwind CSS:** Hanya menggunakan utility class yang sudah tersedia di `./css/tailwind.min.css`.
- **Anti-XSS:** Tetap menjaga sanitasi string dinamis (`escapeHTML`) dan hindari injeksi HTML mentah dari sumber eksternal.

---

## 3. Pilihan Pendekatan (Approaches)

| Pendekatan | Deskripsi | Trade-off | Keputusan |
| :--- | :--- | :--- | :---: |
| **1. Fokus 5 Titik Utama di Tab Portofolio (Plan Awal)** | Merapikan 5 area yang sesak/tidak konsisten (KPI Valuasi, KPI Kas, Status Bar Sync, Baris Kas Tabel, dan `tfoot` Tabel) tanpa menyentuh kolom/tab lain. | Diff sangat kecil, risiko regresi mendekati nol, langsung menyelesaikan kepadatan visual utama. | **Dipilih (Picked)** |
| **2. Perombakan Istilah Lintas 6 Tab (Gaya Sekuritas Lokal)** | Sekalian mengubah nama kolom tabel (`Avg. Price`, `Fund Alloc`, `Value Effect`, `All-Time`, dll.) di seluruh tab. | Ruang lingkup melebar ke banyak file; lebih baik didiskusikan terpisah bila diperlukan. | Ditunda |
| **3. Terjemahan Bahasa Indonesia 100% Murni** | Menerjemahkan seluruh istilah pasar modal (`Top Up`, `Withdraw`, `Win Rate`, `P/L`). | Terasa kaku bagi investor saham Indonesia dan memperpanjang label kolom. | Ditolak |

---

## 4. Spesifikasi Perubahan Copy (Before → After)

| # | Lokasi & Elemen | Sebelum (Before) | Sesudah (After) |
| :---: | :--- | :--- | :--- |
| **1** | **KPI Card 1 — Total Valuasi**<br>(`index.html` L233, `js/ui/portfolio.js` L722–725) | Judul: `Total Valuasi Portofolio (Inc. Kas)`<br>Sub: 2 kotak *pill* `Invested Saham: Rp ... (xx,xx%)` & `Uninvested Cash: Rp ... (xx,xx%)` | Judul: **`Total Valuasi Portofolio`**<br>Sub sebaris bersih (tanpa kotak *pill*): **`Saham: Rp ... (xx,xx%) • Kas: Rp ... (xx,xx%)`** |
| **2** | **KPI Card 4 — Saldo Kas**<br>(`index.html` L296–305, `js/ui/portfolio.js` L745) | Judul: `Uninvested Cash (Buying Power)` + badge `RDN Siap Beli`<br>Sub: `Buying Power: xx,xx% • Dividen: Rp ...` | Judul: **`Saldo Kas (RDN)`** *(tanpa badge ekstra)*<br>Sub: **`Porsi Kas: xx,xx% • Dividen: Rp ...`** |
| **3** | **Status Bar Sinkronisasi**<br>(`index.html` L371–378, `js/app.js` L132, L165–172, L254) | Pill: `Terakhir Sync: 22 Nov, 16.29 WIB • TradingView IDX • 8/8 live`<br>Jam: `2026-11-22 19:10 WIB (Market Closed)`<br>Checkbox: `Auto-Sync otomatis setelah Market Close BEI (16:15 WIB)` | Pill: **`Diperbarui 22 Nov, 16.29 WIB • TradingView (8/8)`**<br>Jam: **`19:10 WIB • Bursa Tutup`** *(atau `Bursa Buka`)*<br>Checkbox: **`Sinkron otomatis saat bursa tutup (16:15 WIB)`** |
| **4** | **Baris Kas di Tabel Portofolio**<br>(`js/ui/portfolio.js` L781–786) | `Uninvested Cash (RDN)` + badge `BUYING POWER`<br>Sub: `Dana Siap Beli Saham • Rekening Dana Nasabah` | **`Saldo Kas (RDN)`** *(tanpa badge)*<br>Sub: **`Dana siap beli saham`** |
| **5** | **Footer Tabel Portofolio (`tfoot`)**<br>(`js/ui/portfolio.js` L996, L1005) | Baris 1: `Subtotal Aset Saham (Invested Equity) • Uninvested Cash: Rp ... (xx,xx%)`<br>Baris 2: `Total Portofolio (Invested Saham + Uninvested Cash)` | Baris 1: **`Subtotal Saham`**<br>Baris 2: **`Total Portofolio (Saham + Kas)`** |

---

## 5. Breakdown Tiket Implementasi & QA

### Tiket C1 — Update Copy Statis & Dinamis KPI + Tabel Portofolio
- **Target File:** `./index.html` (baris `231–308`, `366–380`) & `./js/ui/portfolio.js` (baris `719–746`, `776–800`, `988–1014`).
- **Kriteria Selesai:** Kelima titik KPI & Tabel menampilkan teks Bahasa Indonesia ringkas sesuai tabel spesifikasi, hanya memakai class CSS yang sudah ada di `./css/tailwind.min.css`, dan mematuhi Strict CSP.

### Tiket C2 — Perapian Format Status Bar Sinkronisasi di `js/app.js`
- **Target File:** `./js/app.js` (baris `128–182`, `250–256`).
- **Kriteria Selesai:** Status pill menampilkan `Diperbarui <tgl>, <jam> WIB • <Provider> (<x>/<y>)` (tetap kompatibel dengan string `lastSyncSource` lama di `localStorage` pengguna), indikator jam menampilkan `<jam> WIB • Bursa Tutup` / `Bursa Buka`, dan toast toggle sinkronisasi konsisten.

### Tiket C3 — Verifikasi QA Visual, Console & Unit Test (`/browser`) + Update Handoff
- **Target:** Jalankan server lokal, verifikasi via Browser Subagent (`/browser`) pada `index.html` (Dark & Light mode, cek visual KPI strip, status bar sync, baris Kas, `tfoot` 1 baris rapi, 0 console/CSP error) serta `tests/test-runner.html` (`14/14 ALL PASS`), lalu perbarui `docs/HANDOFF.md`.
