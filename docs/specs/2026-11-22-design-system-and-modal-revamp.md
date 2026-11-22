# Spec & Tiket: Design System SSOT (`docs/DESIGN.md`) & Revamp UI 13 Modal

- **Tanggal:** 2026-11-22
- **Tahap Lifecycle:** Tahap 3 — Defining & Designing (`to-spec` + `to-tickets` + `frontend-design`)
- **Status:** Menunggu Sign-Off User untuk Eksekusi Tahap 4 (Development)
- **Pemilik:** PM (Product Owner) & UI/UX Designer

---

## 1. Latar Belakang & Tujuan (Intent & Why)

Setelah dashboard utama (6 tab: Portofolio, Dividen, Mutasi, Grafik, Jurnal, Kalkulator) di-revamp ke bahasa desain **Obsidian FinTech Surface** (`dark:bg-[#0C1117]` canvas, `dark:bg-[#141C24]` surface, hairline border `rgba(238,242,246,0.08)`, tipografi `Plus Jakarta Sans` dengan `tabular-nums`, dan aksen utama Emerald `#10B981`), seluruh **13 modal dialog** di `index.html` (baris `1517–2369`) masih tertinggal menggunakan styling generasi lama:
- Surface modal masih memakai `dark:bg-slate-900 border-slate-800 rounded-2xl` dan kotak input/preview `dark:bg-slate-950 border-slate-800`.
- Angka finansial di dalam modal (harga, lembar, fee IPOT, net amount, DPS) masih memakai `font-mono` alih-alih `font-sans tabular-nums`.
- Tombol CTA utama dan focus ring masih terpecah-pecah (`bg-indigo-600`, `bg-sky-600`, `bg-amber-500`, `bg-emerald-600 text-white`) tanpa hirarki semantik yang konsisten.
- Selain itu, fungsi `switchTab()` di `js/app.js` (baris `334–342`) masih me-reset tombol tab aktif dengan `bg-emerald-600 text-white` dan `dark:hover:bg-slate-900` lama.

Agar inkonsistensi visual tidak terulang di masa depan — sekaligus melindungi proyek dari risiko class Tailwind baru yang ter-purge karena aplikasi memakai **Pre-compiled Static Tailwind (`./css/tailwind.min.css`)** — kita juga membutuhkan **`docs/DESIGN.md`** sebagai *Single Source of Truth* (SSOT) sistem desain yang dirujuk oleh `AGENTS.md` dan `docs/ARCHITECTURE.md`.

---

## 2. Goals, Non-Goals & Constraints

### Goals
1. Membuat **`docs/DESIGN.md`** yang mengunci token warna (Dark & Light mode), aturan tipografi (`tabular-nums` vs `font-mono`), komponen semantik CSS, dan aturan *Pre-compiled Static Tailwind Guard*.
2. Menambahkan komponen CSS semantik modal (`.modal-shell`, `.modal-header`, `.modal-close-btn`, `.modal-label`, `.modal-input`, `.modal-select`, `.modal-preview-box`, `.modal-subbox`, `.modal-btn-primary`, `.modal-btn-danger`, `.modal-btn-secondary`, `.modal-callout-*`) di **`css/styles.css`**.
3. Merombak tampilan seluruh **13 modal** di **`index.html`** + baris input dinamis `#bulk-price-list` di **`js/ui/portfolio.js`** + state tab aktif di **`js/app.js`** agar 100% seragam dengan dashboard utama di Dark Mode maupun Light Mode.
4. Memperbarui **`AGENTS.md`** dan **`docs/ARCHITECTURE.md`** agar mencantumkan `docs/DESIGN.md` sebagai acuan wajib sebelum mengubah UI.

### Non-Goals
- Tidak mengubah rumus kalkulasi NAV, unit penyertaan, fee beli/jual IPOT (PMK 131/2024), proyeksi dividen, maupun skema `localStorage` (`portfolio_nav_tracker_favo_v1`).
- Tidak mengubah ID elemen DOM (`id="..."`) atau atribut delegasi event (`data-onclick`, `data-oninput`, `data-onchange`, `data-onsubmit`) yang sudah ada.
- Tidak mengubah perilaku klik backdrop di `#modal-confirm` (tetap wajib klik tombol *Batal* / *Ya, Lanjutkan* atau tekan `Esc`).

### Constraints (Invarian Wajib)
- **Strict CSP:** Dilarang menambahkan inline `style="..."` atau inline `on*="..."`.
- **Pre-compiled Static Tailwind Guard:** Seluruh styling baru untuk modal didefinisikan melalui class semantik di `css/styles.css` (atau menggunakan utility class yang sudah terkompilasi di `css/tailwind.min.css`).
- **Relative Paths:** Semua path referensi wajib tetap relatif (`./...`).

---

## 3. Pendekatan yang Dipilih (Approaches)

| Pendekatan | Ringkasan & Trade-off | Keputusan |
| :--- | :--- | :---: |
| **Opsi A — Semantic Modal Component System di `css/styles.css` + `docs/DESIGN.md`** | Mendefinisikan class komponen modal terpusat di `css/styles.css` berbasis CSS variables (`--bg-canvas`, `--bg-surface`, `--border-hairline`, `--accent-primary`) lalu menerapkannya ke 13 modal di `index.html`. **Bebas risiko Tailwind purge, HTML jauh lebih bersih, mudah dipelihara.** | **DIPILIH (Disetujui User)** |
| **Opsi B — Ganti Utility Class Tailwind Manual di Tiap Tag HTML** | Mengganti string class panjang di 60+ input & 13 kontainer modal secara manual. **Repetitif, rawan terlewat, dan berisiko class tidak ada di `tailwind.min.css`.** | Ditolak |

---

## 4. Spesifikasi Teknis Desain (`frontend-design` Contract)

### A. Token Warna & Surface (Dark & Light Mode)
- **Modal Backdrop:** `fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto`
- **`.modal-shell`:**
  - Light: `background: #FFFFFF`, `border: 1px solid rgba(226, 232, 240, 0.9)`, `box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.18)`
  - Dark: `background: var(--bg-surface)` (`#141C24`), `border: 1px solid var(--border-hairline)` (`rgba(238, 242, 246, 0.08)`), `box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.65)`
  - Border radius: `0.75rem` (`rounded-xl`, `12px`) — selaras dengan kartu metrik dan panel tab utama.
- **`.modal-header`:**
  - Padding `1rem 1.25rem` (`px-5 py-4`), border-bottom hairline (`#E2E8F0` di Light, `rgba(238,242,246,0.08)` di Dark).
- **`.modal-input` & `.modal-select`:**
  - Light: `background: #F8FAFC` (`slate-50`), `border: 1px solid rgba(226, 232, 240, 0.9)`, `color: #0F172A`
  - Dark: `background: var(--bg-canvas)` (`#0C1117`), `border: 1px solid rgba(238, 242, 246, 0.08)`, `color: var(--text-primary)` (`#EEF2F6`)
  - Focus state: `outline: none; border-color: #10B981; box-shadow: 0 0 0 1px #10B981;`
  - Radius: `0.5rem` (`rounded-lg`, `8px`) — selaras dengan input di Tab 3 Mutasi & Tab 6 Kalkulator.
- **`.modal-preview-box` (Kotak Live Trade Confirmation & Preview Kalkulasi):**
  - Light: `background: #F8FAFC`, `border: 1px solid rgba(226, 232, 240, 0.85)`
  - Dark: `background: var(--bg-canvas)` (`#0C1117`), `border: 1px solid rgba(238, 242, 246, 0.08)`
  - Radius: `0.75rem` (`12px`), padding `0.875rem` (`14px`).
- **`.modal-subbox` (Rincian Komponen Fee PMK 131/2024 di dalam Preview):**
  - Light: `background: #FFFFFF`, `border: 1px solid rgba(226, 232, 240, 0.75)`
  - Dark: `background: var(--bg-surface)` (`#141C24`), `border: 1px solid rgba(238, 242, 246, 0.06)`
- **Tombol Aksi Modal (`.modal-btn-*`):**
  - `.modal-btn-primary`: `background: #10B981`, `color: #020617` (`slate-950`), `font-weight: 700`, hover `#059669` / `#34D399`, radius `0.5rem` (`8px`). Digunakan untuk semua aksi simpan/konfirmasi utama (`#modal-buy`, `#modal-dividend`, `#modal-dividend-schedule`, `#modal-bulk-price`, `#modal-cash`, `#modal-edit-holding`, `#modal-manual-journal`, `#modal-year-rollover`, `#modal-baseline`, `#modal-import`).
  - `.modal-btn-danger`: `background: #E11D48` (`rose-600`), `color: #FFFFFF`, `font-weight: 700`, hover `#F43F5E`, radius `0.5rem` (`8px`). Digunakan khusus untuk aksi jual/destruktif (`#modal-sell` "Eksekusi Jual" & `#modal-confirm` "Ya, Lanjutkan").
  - `.modal-btn-secondary`: Light `background: #F1F5F9; color: #334155; border: 1px solid #E2E8F0`, Dark `background: rgba(255,255,255,0.04); color: #EEF2F6; border: 1px solid rgba(238,242,246,0.08)`, hover subtle. Digunakan untuk tombol "Batal" / "Tutup".

### B. Aturan Tipografi di Dalam Modal
- **Angka Finansial & Tanggal (`font-sans tabular-nums`):** Semua input nominal/harga/lot/persen/tanggal dan seluruh angka pada *Live Trade Confirmation Preview* wajib menggunakan `font-sans tabular-nums` (bukan `font-mono`).
- **Kode Emiten & Teknis (`font-mono`):** Hanya input/badge Kode Emiten (`#buy-ticker`, `#sell-ticker-label`, `#div-ticker`, `#sched-ticker-label`, `#edit-holding-ticker`, `#mj-ticker`), Storage Key (`#modal-cloud-userid`), dan textarea JSON (`#import-json-textarea`) yang tetap menggunakan `font-mono`.

---

## 5. Breakdown Tiket Eksekusi (Vertical Slices)

### Tiket 1: Buat `docs/DESIGN.md` & Update Referensi di `AGENTS.md` + `docs/ARCHITECTURE.md`
- **File Target:**
  - `docs/DESIGN.md` *(file baru)*
  - `AGENTS.md` (tambahkan referensi `docs/DESIGN.md` di header referensi *on-demand*, Tahap 3/4/5, dan Definition of Done)
  - `docs/ARCHITECTURE.md` (tambahkan `docs/DESIGN.md` di struktur direktori dan catatan styling)
- **Kriteria Selesai:** `docs/DESIGN.md` mendokumentasikan secara lengkap token warna, tipografi, komponen `.modal-*`, dan aturan *Pre-compiled Static Tailwind Guard*.

### Tiket 2: Implementasi Sistem Class `.modal-*` di `css/styles.css` & Revamp 13 Modal di `index.html` + JS
- **File Target:**
  - `css/styles.css` (tambahkan class semantik `.modal-*`)
  - `index.html` (baris `1517–2369`: terapkan `.modal-shell`, `.modal-header`, `.modal-input`, `.modal-select`, `.modal-preview-box`, `.modal-subbox`, `.modal-btn-*`, serta ubah angka finansial dari `font-mono` ke `font-sans tabular-nums` di ke-13 modal; juga selaraskan tombol tab aktif awal di baris `143`)
  - `js/ui/portfolio.js` (baris `183` pada `updateBuyPreview` dan baris `480–505` pada `openBulkPriceModal`: selaraskan class input `#bulk-price-list` & warna teks preview kas dengan `.modal-input` dan `tabular-nums`)
  - `js/app.js` (baris `334–342` pada `switchTab`: selaraskan class tombol tab aktif & non-aktif dengan warna token `#10B981` / `dark:text-[#8E9BA8]` / `dark:hover:bg-[#141C24]` agar tidak kembali ke `slate-900` lama saat pindah tab)
- **Kriteria Selesai:** Seluruh 13 modal menggunakan token Obsidian FinTech Surface, angka memakai `tabular-nums`, tidak ada sisa `dark:bg-slate-900` / `dark:bg-slate-950` pada modal.

### Tiket 3: Verifikasi QA Visual & Fungsional via `/browser` + Update `docs/HANDOFF.md` & Commit
- **File Target:**
  - Verifikasi di `http://127.0.0.1:8765/` lewat subagent `/browser` (`flash`)
  - `docs/HANDOFF.md`
- **Kriteria Selesai:**
  - Uji buka-tutup dan tampilan Dark Mode & Light Mode pada modal representatif (`#modal-buy`, `#modal-sell`, `#modal-dividend`, `#modal-dividend-schedule`, `#modal-bulk-price`, `#modal-edit-holding`, `#modal-baseline`, `#modal-import`, `#modal-confirm`).
  - Pastikan computed style background `.modal-shell` adalah `rgb(20, 28, 36)` (`#141C24`) di Dark Mode dan `rgb(255, 255, 255)` di Light Mode, `0` console errors, dan seluruh unit test (`tests/test-runner.html`) tetap `14/14 ALL PASS`.
