# AGENTS.md — Portfolio NAV Tracker

Panduan operasional, invarian, alur PM → UI/UX → Developer → QA, routing skill, dan pemilihan model untuk workspace `dashboard-portfolio-saham`.

> **Referensi Arsitektur (Baca *On-Demand*):** Sebelum mengedit `index.html` atau memecah modul, baca `docs/ARCHITECTURE.md` untuk peta rentang baris & blueprint modularisasi.

---

## 1. Konteks Proyek, Deploy & Invarian Kritis

- **Aplikasi:** Portfolio NAV Tracker — Sistem Unit Penyertaan Saham Indonesia (6 tab: Portfolio, Dividends, Mutations, Analytics, Journal, Calculator).
- **Stack:** Static web app (`index.html`, ~6.162 baris), Vanilla JS (native ES Modules), Tailwind CSS, Chart.js, Lucide Icons, `localStorage` (`portfolio_nav_tracker_favo_v1`) + opsional Firebase sync, live market sync (TradingView IDX / Yahoo / Google Finance / Stooq).
- **Deploy Target:** **GitHub Pages & Vercel** (statis, **tanpa build step wajib**).
- **Bahasa & Format UI:** Bahasa Indonesia, format Rupiah (`IDR`) konsisten, angka finansial wajib `tabular-nums`, mendukung Dark & Light mode.

### Invarian Wajib (Tidak Boleh Rusak)
1. **Integritas Matematika NAV & Unit Penyertaan:** Semua kalkulasi NAV/unit, fee IPOT, topup/withdraw, dividen, CAGR/return, dan benchmark harus aman terhadap edge case (`0`, nilai negatif, full withdrawal, `NaN`, `Infinity`, pembagian nol).
2. **Kompatibilitas Data:** Skema `localStorage` (`STORAGE_KEY`) serta fitur JSON Export/Import wajib tetap backward-compatible dengan data pengguna lama.
3. **Kompatibilitas GitHub Pages + Vercel:**
   - Wajib pakai **relative path (`./...`)** untuk semua modul/aset agar tidak 404 di subpath GitHub Pages maupun root Vercel.
   - Jika kelak menambah Vercel Serverless Function (`/api/...`), wajib sediakan **client-side fallback statis** agar GitHub Pages tetap berfungsi penuh.
4. **Keamanan Repo Publik & Anti-XSS:** Jangan pernah hardcode API key/credential privat di kode client (gunakan Vercel Environment Variables bila butuh backend proxy). Sanitasi seluruh input user (emiten, catatan jurnal, data import JSON) sebelum dirender ke DOM; hindari `innerHTML` mentah untuk data dinamis.

---

## 2. Aturan Efisiensi Token, Gate & Anti-Konflik

1. **Jangan Baca Utuh `index.html`:** Gunakan peta baris di `docs/ARCHITECTURE.md` atau pencarian terarah, lalu baca rentang baris spesifik saja.
2. **Gate Perencanaan (`brainstorming`):**
   - **Fitur baru / ubah logika NAV / refactor:** Wajib lewat `brainstorming` → *approval* design doc dari user → `to-spec` → `to-tickets` (menggantikan `superpowers:writing-plans`). Simpan dokumen di `docs/specs/YYYY-MM-DD-<topik>.md`.
   - **Quick task jelas** (typo, warna, tweak CSS kecil): Boleh langsung dieksekusi tanpa dokumen panjang.
3. **Diff Minimal & Modularisasi Bertahap:** Ikuti prinsip `ponytail` (perubahan terkecil, YAGNI). Saat memecah `index.html`, ikuti blueprint native ES Modules di `docs/ARCHITECTURE.md` (`codebase-design`).
4. **Aturan Anti-Konflik `/teamwork`:** Selama kode utama masih di 1 file (`index.html`), maksimal **1 agent penulis** yang mengedit `index.html` pada satu waktu (agent lain fokus riset, desain, spec, atau QA) hingga modul dipecah ke `./js/*.js`.
5. **Hemat Token & Lingkungan Windows:** Gunakan gaya ringkas (`caveman`) di fase Dev/QA dan jalankan `/compact` di antara fase besar. Jangan berasumsi `node`/`git` CLI tersedia di sandbox; verifikasi runtime/UI melalui Browser Subagent (`/browser`).

---

## 3. Struktur Tim Multi-Agent & Routing Skill

Setiap peran hanya memuat skill yang relevan agar konteks tetap bersih.

| Peran | Tanggung Jawab Utama | Skill & Tools Utama | Output / Artefak |
| :--- | :--- | :--- | :--- |
| **1. PM (Product Manager)** | Klarifikasi masalah, batas ruang lingkup, edge case finansial, prioritas | `brainstorming` → `to-spec` → `to-tickets` (opsional `/grill-me`) | Design doc, spec & tiket *vertical-slice* di `docs/specs/` |
| **2. UI/UX & Frontend Designer** | Hirarki visual dashboard FinTech, chart, layout responsif, komponen modern | `ui-ux-pro-max`, `frontend-design` / `taste-skill`, `modern-web-guidance` | Keputusan layout, palet/tipografi, spesifikasi komponen & interaksi |
| **3. Developer** | Implementasi fitur, logika NAV/state, refactor modul, integrasi library | `ponytail`, `codebase-design`, `Context7`, `caveman` | Perubahan kode bersih dengan diff minimal & aman |
| **4. QA & Code Reviewer** | Polish UI, audit a11y/form/focus, review kualitas 5-axis, investigasi bug, cek visual | `impeccable` (`polish`, `harden`), `web-design-guidelines`, `code-review-and-quality`, `systematic-debugging`, `/browser` | Temuan berlabel (`Critical`/`Required`/`Optional`/`Nit`) & bukti visual |

> **Catatan Debugging:** Saat menemukan bug atau perilaku tak terduga, wajib ikuti Iron Law `systematic-debugging` — temukan *root cause* sebelum menulis perbaikan.

---

## 4. Rekomendasi Model per Peran & Task

| Peran / Jenis Task | Rekomendasi Tier Model | Alasan |
| :--- | :--- | :--- |
| **Orchestrator / Coordinator (`/teamwork`)** | **Medium / Pro Standar** *(Pro/High untuk refactor besar)* | Tajam memecah dependensi & menjaga invarian tanpa boros kuota saat koordinasi; hindari Flash/Flash Lite |
| **PM (Spec & Breakdown Tiket)** | **Medium** (mis. Gemini Pro/Medium) | Cukup kuat untuk strukturisasi produk & edge case tanpa boros kuota |
| **UI/UX Designer (Layout & Visual FinTech)** | **Medium → Pro** | Butuh selera visual, konsistensi desain, dan kepekaan UX |
| **Developer — Logika Inti (NAV, Math, State, Refactor)** | **Pro / High** | Nol toleransi bug pada perhitungan finansial & arsitektur |
| **Developer — Tugas Rutin (CSS, Copy, Edit Kecil)** | **Flash** | Cepat, hemat token, presisi untuk diff terarah |
| **QA — Review Arsitektur, Security & Bug Kompleks** | **Medium / Pro** | Menangkap celah logika, race condition, dan edge case halus |
| **QA — Audit Linter / A11y (`web-design-guidelines`)** | **Flash** | Cek checklist mekanis secara cepat dan murah |
| **Research / Verifikasi Browser (`/browser`)** | **Flash / Flash Lite** | Navigasi, screenshot, dan inspeksi DOM tidak butuh model berat |

---

## 5. Protokol Eksekusi & Handoff

- **Fitur Kecil–Sedang:** Jalankan berurutan (PM → UI/UX → Dev → QA) dalam satu sesi, lalu `/compact` di tiap pergantian fase.
- **Fitur Besar / Paralel:** Gunakan `/teamwork` (Swarm) dengan koordinator membagi tiket sesuai peran & batas *single-writer* pada `index.html`.
- **Format Handoff Ringkas** (jangan teruskan seluruh riwayat chat):
  1. **Tiket / Tujuan:** 1–3 kalimat ruang lingkup & kriteria selesai (atau link ke `docs/specs/...`).
  2. **Target File & Lokasi:** Path file + rentang baris / nama fungsi dari `docs/ARCHITECTURE.md`.
  3. **Batasan:** Invarian NAV, data, keamanan, dan relative path yang tidak boleh dilanggar.
  4. **Output yang Diminta:** Diff kode, temuan review berlabel severity, atau bukti verifikasi browser.

---

## 6. Definition of Done (Sebelum Deploy GitHub Pages / Vercel)

- [ ] **Fungsional & Matematika:** Kalkulasi NAV, unit penyertaan, fee, mutasi, dan dividen terverifikasi termasuk kasus `0`, negatif, dan data kosong.
- [ ] **Kompatibilitas Data & Deploy:** Load/save `localStorage` & Export/Import JSON aman; semua path bersifat relatif (`./`) dan berjalan tanpa error di GitHub Pages & Vercel.
- [ ] **UI, Aksesibilitas & Keamanan:** Rapi di desktop & mobile, Dark/Light mode konsisten, angka memakai `tabular-nums`, input ter-sanitasi (bebas XSS), lolos `web-design-guidelines` & `impeccable harden`.
- [ ] **Kualitas Kode & Runtime:** Lolos `code-review-and-quality` tanpa temuan `Critical`/`Required`, dan nol error console saat diuji lewat `/browser`.
