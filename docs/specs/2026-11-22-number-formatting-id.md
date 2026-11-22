# Design Doc, Spec & Tickets — Standarisasi Formatting Angka Indonesia (`id-ID`) untuk Input & Output

**Tanggal:** 2026-11-22
**Status:** Selesai & Terverifikasi (`ALL PASS 14/14` + Browser QA)
**Target Arsitektur:** Vanilla ES Modules (`./js/*.js` + `index.html`), 100% statis (GitHub Pages & Vercel)

---

## 1. Tujuan & Latar Belakang (Intent & Why)
Saat ini tampilan angka (*output*) dan kolom pengisian (*input*) di **Portfolio NAV Tracker** belum seragam:
- Sebagian besar *output* sudah memakai format Indonesia (`id-ID`: ribuan `.`, desimal `,`), tetapi beberapa label grafik Chart.js, tooltip, dan jumlah digit desimal (Lot, Avg Price, Persentase) masih belang.
- Hampir seluruh *input* di 6 tab dan 10 modal masih memakai `<input type="number">` bawaan browser yang tidak menampilkan titik ribuan (contoh: `15552000`, rawan salah hitung nol) serta memaksa tanda titik (`.`) untuk desimal (contoh: `3961.36`, `0.19`, `1130.9663`).

**Tujuan:** Menyeragamkan seluruh **Input (Live Auto-Format saat mengetik)** dan **Output (Tabel, KPI, Grafik Chart.js, Modal Preview)** ke format Indonesia (`id-ID`: ribuan `.`, desimal `,`) di seluruh modul sekaligus.

---

## 2. Goals, Non-Goals & Constraints

### Goals
1. **Live Auto-Format Input (`Opsi A`):**
   - Saat user mengetik angka ribuan/jutaan di kolom input mana pun, titik ribuan (`.`) otomatis muncul secara *real-time* tanpa merusak posisi kursor (*caret-preserving*).
   - Untuk kolom desimal, menekan tombol koma (`,`) ataupun tombol titik (`.`) di numpad/keyboard otomatis diterima sebagai koma desimal (`,`).
   - Mendukung nilai negatif (`signed-dec`) khusus pada tabel historis bulanan/tahunan (misal return `-4,25%` atau net withdraw tahunan).
2. **Unified Parser & Setter di `storage.js`:**
   - Fungsi `parseIDNumber(raw)` yang aman mengubah string berformat `"15.552.000"`, `"3.961,36"`, `"-4,25"`, maupun angka JS/string titik `"3961.36"` (saat initial load/paste) menjadi `Number` murni.
   - Fungsi `formatIDInputValue(val, mode, maxDecimals)` / `setIDInputValue(elOrId, val, opts)` untuk mengisi nilai input dari JavaScript dalam format `id-ID`.
3. **Konsistensi Presisi Output & Chart.js:**
   - Seluruh sumbu Y dan tooltip Chart.js di `charts.js`, `analytics.js`, `mutations.js`, dan `dividends.js` menampilkan angka dan persentase berformat `id-ID` (`12,5%`, `1.250`, `Rp 15.552.000`).
   - Standarisasi digit desimal di seluruh tab (lihat Tabel Standar Presisi di Bagian 4).

### Non-Goals & Anti-Goals
- **Jangan** memformat input **Tahun** (seperti `#rollover-new-year` = `2026`) dengan titik ribuan (`2.026`).
- **Jangan** mengubah struktur data di `localStorage` (`portfolio_nav_tracker_favo_v1`) atau JSON Export/Import — data yang disimpan di state tetap `Number` JavaScript murni.
- **Jangan** merusak posisi kursor saat user menyisipkan atau menghapus angka di tengah input.

---

## 3. Pilihan Pendekatan (Approaches)

| Pendekatan | Deskripsi | Trade-off | Keputusan |
| :--- | :--- | :--- | :---: |
| **1. Central Engine di `storage.js` + Declarative `data-num-input` di Semua Modul** | Menambahkan parser, live input formatter (1 global event listener `input`), dan helper setter di `storage.js`, lalu menerapkan ke `index.html` dan 6 modul `./js/ui/*.js` sekaligus. | Menyentuh `index.html` + semua modul UI dalam satu batch, namun langsung 100% konsisten tanpa efek belang antar tab. | **Dipilih (Picked)** |
| **2. Override `HTMLInputElement.prototype.value`** | Memanipulasi getter/setter DOM `.value` secara tersembunyi. | Rawan bug pada `selectionStart` (kursor) dan kompatibilitas browser. | Ditolak |
| **3. Rollout Bertahap per Tab** | Menerapkan di 1–2 tab terlebih dahulu. | Pengalaman mengetik tidak konsisten saat berpindah tab. | Ditolak |

---

## 4. Spesifikasi Teknis & Standar Presisi

### A. Standar Presisi Angka (Input & Output)

| Kategori Data | Mode Input (`data-num-input`) | Maks Desimal Input | Format Output Standar | Contoh Tampilan |
| :--- | :---: | :---: | :--- | :--- |
| **Nominal Rupiah Bulat** (Modal, Kas RDN, Top Up, Dividen, Budget) | `int` | `0` | `formatIDR(val)` (0 desimal) | `15.552.000` / `Rp 15.552.000` |
| **Top Up Tahunan (Tabel Historis)** | `signed-int` | `0` | `formatIDR(val)` | `25.000.000` / `-5.000.000` |
| **Jumlah Lembar & Lot Bulat** (`buy-qty`, `sell-shares`, `calc-*-shares`, `mj-shares`) | `int` | `0` | Lembar: `0` desimal; Lot output: `2` desimal | `14.600` lbr (`146,00` lot) |
| **Harga Saham Pasar** (Buy, Sell, Current, Target, Bulk Price) | `int` (atau `dec` 2 untuk pecahan) | `2` | `formatNum(val, 0)` (atau 2 untuk Avg) | `2.880` |
| **Average Price & DPS Dividen** (`calc-cur-avg`, `edit-holding-avg`, `mj-avg`, `sched-dps-*`) | `dec` | `2` | `formatNum(val, 2)` | `3.961,36` |
| **Harga Unit (NAV) & Jumlah Unit Penyertaan** (`mut-nav-price`, `base-init-nav`, `base-init-units`) | `dec` | `4` | `formatNum(val, 4)` | `1.130,9663` |
| **Persentase Positif** (Target Alokasi %, Growth DPS %, Fee Sekuritas %) | `dec` | `2` (`4` untuk Fee) | `formatNum(val, 2)%` | `12,50%` / `0,19%` |
| **Persentase Return Bulanan/Tahunan** (Tabel Historis Analytics) | `signed-dec` | `2` | `formatPct(val)` | `+12,34%` / `-3,50%` |
| **Indeks Benchmark** (IHSG & LQ45 Start/End) | `dec` | `2` | `formatNum(val, 2)` | `7.520,50` |

### B. Algoritma `parseIDNumber(raw)` & Live Formatter di `storage.js`
1. **`parseIDNumber(raw)`:**
   - Jika `typeof raw === "number"`, kembalikan `Number.isFinite(raw) ? raw : 0`.
   - Jika string mengandung koma `,` (format `id-ID` seperti `"1.234,56"`): hapus semua `.`, ganti `,` menjadi `.`, lalu `Number(...)`.
   - Jika string mengandung lebih dari satu titik (seperti `"15.552.000"`): hapus semua `.`, lalu `Number(...)`.
   - Jika string hanya mengandung satu titik (`"."`):
     - Jika cocok pola ribuan `id-ID` pada field integer (atau 3 digit di belakang titik pada nilai >= 1.000 tanpa konteks desimal), pada input ber-atribut `data-num-input="int"` hapus titiknya; untuk angka JS murni (misal `"3961.36"` atau `"0.19"`), parse sebagai desimal standar.
2. **Aturan Live Auto-Format Saat Mengetik (`formatLiveInputString`):**
   - Pada input `int` / `signed-int`: semua karakter selain digit (dan `-` di awal untuk `signed-int`) dibersihkan, lalu bagian integer diberi titik ribuan setiap 3 digit (`\B(?=(\d{3})+(?!\d))`).
   - Pada input `dec` / `signed-dec`:
     - Saat user menekan `.` atau `,`, jika tindakan terakhir adalah mengetik karakter pemisah desimal (atau belum ada `,` di string), konversi pemisah tersebut menjadi `,`, sedangkan semua `.` lama adalah pemisah ribuan yang dihitung ulang otomatis.
     - Bagian sebelum `,` diformat dengan titik ribuan `.`, bagian setelah `,` dibatasi hingga `data-num-decimals` (default `2`, atau `4` untuk NAV/Unit/Fee).
   - **Pelestarian Posisi Kursor (Caret Preservation):** Hitung jumlah digit (dan tanda `,` / `-`) di sebelah kiri kursor sebelum diformat, lalu tempatkan kembali kursor tepat setelah jumlah digit yang sama sesudah string diformat.

---

## 5. Breakdown Tiket Implementasi (Vertical Slices)

- **Tiket 1 — Core Number Parser, Live Formatter & Unit Tests (`./js/storage.js` & `./tests/nav-engine.test.mjs`):**
  - Implementasi `parseIDNumber`, `formatIDInputValue`, `setNumInputValue`, `getNumInputValue`, dan `initLiveNumberInputs()` di `storage.js`.
  - Tambahkan unit test di `tests/nav-engine.test.mjs` untuk memverifikasi parsing ribuan (`.`), desimal (`,`), negatif, edge case (`""`, `NaN`, `0`), dan pemformatan live string.
- **Tiket 2 — Konversi Atribut Input di `index.html` & Inisialisasi di `app.js`:**
  - Ubah semua `<input type="number">` finansial di `index.html` (Tab 2 Proyeksi DRIP, Tab 3 Mutasi, Tab 4 Benchmark, Tab 6 Kalkulator, dan Modal Beli/Jual/Dividen/Jadwal DPS/Kas/Edit Emiten/Jurnal Manual/Baseline) menjadi `<input type="text" inputmode="..." data-num-input="..." data-num-decimals="...">` (kecuali `#rollover-new-year` tetap `type="number"`).
  - Panggil `initLiveNumberInputs()` saat `initApp()` di `app.js`.
- **Tiket 3 — Integrasi Modul UI (`portfolio.js`, `dividends.js`, `mutations.js`, `analytics.js`, `journal.js`, `calculator.js`) & `charts.js`:**
  - Gunakan `getNumInputValue` / `parseIDNumber` saat membaca input dan `setNumInputValue` / `formatIDInputValue` saat mengisi input (termasuk input inline di tabel Portfolio, Mutasi, dan Analytics).
  - Standarisasi desimal output (`Lot` 2 desimal, `Avg Price` 2 desimal, sumbu Y & tooltip Chart.js memakai `formatNum`/`formatPct`/`formatIDR`).
- **Tiket 4 — Verifikasi QA Visual & Interaktif (`/browser`):**
  - Uji pengetikan live (ribuan `.` & desimal `,`) di Calculator, Mutasi, Portfolio, Analytics, dan Modal, serta pastikan 0 console error dan seluruh unit test lulus.
