# DESIGN.md — Sistem Desain & Kontrak Komponen UI (Obsidian FinTech Surface)

Dokumen *Single Source of Truth* (SSOT) untuk arah visual, token warna (Dark & Light mode), tipografi finansial, komponen CSS semantik di `./css/styles.css`, serta aturan **Pre-compiled Static Tailwind Guard**. Wajib dibaca oleh UI/UX Designer, Frontend Developer, dan QA sebelum mengubah `index.html`, `./css/styles.css`, atau renderer DOM di `./js/ui/*.js`.

---

## 1. Arah Estetika: Obsidian FinTech Surface

- **Karakter Visual:** Presisi terminal finansial institusional (Bloomberg / Linear-inspired) dengan kontras tenang untuk pemantauan data portofolio berdurasi panjang.
- **Prinsip Utama:**
  1. **Flat Hairline Surfaces:** Hindari bayangan tebal berlapis atau gradien dekoratif berlebihan di kartu data. Gunakan permukaan datar (`#141C24` di Dark, `#FFFFFF` di Light) yang dipisahkan oleh garis *hairline* tipis (`rgba(238, 242, 246, 0.08)` di Dark, `#E2E8F0` di Light).
  2. **Satu Aksen Fungsional per Konteks:**
     - **Emerald (`#10B981`):** Aksi primer (Beli, Simpan, Konfirmasi), pertumbuhan NAV/TWR, dan status profit (*Unrealized / Realized Gain*).
     - **Rose (`#F43F5E` / `#E11D48`):** Aksi jual saham, aksi destruktif (Hapus/Reset), dan status rugi (*Loss*).
     - **Amber (`#F59E0B`):** Komponen biaya/fee sekuritas, proyeksi yield/dividen, dan tutup buku tahunan (*Rollover*).
     - **Sky (`#0EA5E9`):** Kalibrasi baseline NAV, koreksi data emiten, dan informasi sinkronisasi.
  3. **Kepadatan Terstruktur:** Angka utama menjadi titik fokus; label sekunder berukuran `11px–12px` (`text-xs`) dengan warna *muted* (`#8E9BA8` di Dark, `slate-500` di Light).

---

## 2. Token Warna Inti (`:root` di `./css/styles.css`)

| Token / Peran | Dark Mode (Default) | Light Mode | Penggunaan Utama |
| :--- | :--- | :--- | :--- |
| **Canvas (Latar Utama & Input)** | `#0C1117` (`--bg-canvas`) | `#F8FAFC` (`slate-50`) | Background `<body>`, field input form, dan kotak preview kalkulasi di dalam modal |
| **Surface (Kartu & Modal Shell)** | `#141C24` (`--bg-surface`) | `#FFFFFF` (`white`) | Panel kartu dashboard, tabel, header, dan kontainer utama modal (`.modal-shell`) |
| **Hairline Border** | `rgba(238, 242, 246, 0.08)` (`--border-hairline`) | `rgba(226, 232, 240, 0.85)` (`slate-200/80`) | Garis batas kartu, pemisah kolom metrik, header modal, dan border input |
| **Text Primary** | `#EEF2F6` (`--text-primary`) | `#0F172A` (`slate-900`) | Judul, nominal Rupiah utama, nilai NAV/Unit |
| **Text Muted** | `#8E9BA8` (`--text-muted`) | `#64748B` (`slate-500`) | Label metrik, subjudul modal, keterangan bantu |
| **Accent Primary** | `#10B981` (`--accent-primary`) | `#10B981` (`emerald-500/600`) | Tombol CTA utama, focus ring input (`focus:ring-[#10B981]`), indikator aktif |

---

## 3. Aturan Tipografi & Format Angka

1. **Font Sans (`Plus Jakarta Sans`):** Font default seluruh antarmuka.
2. **Wajib `tabular-nums` (`font-variant-numeric: tabular-nums`) untuk Seluruh Angka Finansial:**
   - Semua nominal Rupiah (`Rp`), Harga Unit (`NAV/Unit` 4 desimal), Jumlah Unit Penyertaan, Lembar, Lot, Persentase (`%`), Fee, dan Tanggal **wajib** memakai `font-sans tabular-nums` (atau class `.modal-input` / `.tabular-nums`).
   - **Jangan** gunakan `font-mono` untuk angka Rupiah atau input nominal di tabel maupun di dalam modal.
3. **Penggunaan `font-mono` (`JetBrains Mono`) Dibatasi Khusus Untuk:**
   - Kode Emiten / Ticker Bursa (misal: `BBCA`, `ADRO`, `BMRI`).
   - Badge shortcut keyboard (`<kbd>1</kbd>`..`<kbd>6</kbd>`, `/`, `R`).
   - ID Teknis / Storage Key (`portfolio_nav_tracker_favo_v1`) dan textarea payload JSON mentah.

---

## 4. Kontrak Komponen Modal Semantik (`./css/styles.css`)

Seluruh 13 modal dialog (`#modal-buy`, `#modal-sell`, `#modal-dividend`, `#modal-dividend-schedule`, `#modal-bulk-price`, `#modal-cash`, `#modal-edit-holding`, `#modal-manual-journal`, `#modal-cloud`, `#modal-confirm`, `#modal-year-rollover`, `#modal-baseline`, `#modal-import`) wajib menggunakan sistem class semantik berikut agar konsisten di Dark & Light mode dan bebas dari risiko *Tailwind purge*:

| Class Semantik | Peran & Spesifikasi Visual |
| :--- | :--- |
| `.modal-shell` | Kontainer kartu modal (`rounded-xl`, Light `#FFFFFF` / Dark `#141C24`, hairline border, shadow halus) |
| `.modal-header` | Header modal (`px-5 py-4`, flex justify-between, hairline border-bottom) |
| `.modal-title` | Judul modal (`text-base font-bold`, Light `#0F172A` / Dark `#EEF2F6`) |
| `.modal-subtitle` | Subjudul penjelasan di bawah judul (`text-[11px]`, Light `#64748B` / Dark `#8E9BA8`) |
| `.modal-close-btn` | Tombol ikon `X` penutup modal (`p-1.5 rounded-lg`, warna muted dengan hover halus) |
| `.modal-label` | Label field form (`block text-xs font-semibold mb-1`, Light `#334155` / Dark `#8E9BA8`) |
| `.modal-input` | Input teks/angka/tanggal di modal (`w-full px-3 py-2 rounded-lg text-sm font-sans tabular-nums`, Light `#F8FAFC` / Dark `#0C1117`, hairline border, focus ring `#10B981`). Tambahkan `font-mono uppercase` hanya untuk input kode ticker |
| `.modal-select` | Dropdown `<select>` di modal (visual identik dengan `.modal-input`, `text-xs font-semibold`) |
| `.modal-preview-box` | Kotak ringkasan kalkulasi / *Live Trade Confirmation* (`p-3.5 rounded-xl text-xs font-sans tabular-nums`, Light `#F8FAFC` / Dark `#0C1117`, hairline border) |
| `.modal-subbox` | Sub-kotak rincian komponen fee di dalam `.modal-preview-box` (Light `#FFFFFF` / Dark `#141C24`, hairline border) |
| `.modal-btn-primary` | Tombol submit utama (`px-4 py-2 rounded-lg text-xs font-bold bg-[#10B981] hover:bg-emerald-400 text-slate-950 transition-colors`) |
| `.modal-btn-danger` | Tombol aksi jual / konfirmasi hapus (`px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors`) |
| `.modal-btn-secondary` | Tombol Batal / Tutup (`px-4 py-2 rounded-lg text-xs font-semibold`, Light `#F1F5F9` / Dark `rgba(255,255,255,0.04)`, hairline border) |

---

## 5. Aturan Pre-compiled Static Tailwind Guard & Strict CSP

1. **Jangan Mengandalkan Arbitrary Class Tailwind Baru Tanpa Cek:**
   Karena aplikasi menggunakan file statis `./css/tailwind.min.css` (tanpa runtime CDN), setiap penambahan komponen UI baru atau perubahan warna/layout **wajib**:
   - Memakai class semantik di `./css/styles.css` (seperti `.modal-*`), **ATAU**
   - Memakai utility class yang sudah terbukti ada di `./css/tailwind.min.css` (seperti `dark:bg-[#141C24]`, `dark:bg-[#0C1117]`, `dark:border-white/[0.08]`, `dark:text-[#EEF2F6]`, `dark:text-[#8E9BA8]`, `bg-[#10B981]`).
2. **Kursor Interaktif Global:**
   Seluruh elemen interaktif (`button`, `[role="button"]`, `[data-onclick]`, `select`, `input[type="checkbox"]`, `input[type="date"]`) otomatis mendapat `cursor: pointer` dari `./css/styles.css`.
3. **Strict CSP Compliance:**
   Dilarang menulis inline `style="..."` atau inline event handler (`onclick="..."`). Gunakan class CSS dan atribut delegasi `data-onclick`, `data-oninput`, `data-onchange`, `data-onsubmit`.
