# AGENTS.md — Portfolio NAV Tracker

Panduan operasional, invarian, alur **6 Tahap Product Lifecycle** (PM sebagai Product Owner → UI/UX → Frontend → Backend/Core → QA → Security), routing skill anti-tumpang-tindih, dan pemilihan model untuk workspace `dashboard-portfolio-saham`.

> **Referensi Arsitektur, Design System & Status Proyek (Baca *On-Demand*):**
> - Baca `docs/HANDOFF.md` di awal sesi baru untuk langsung mengetahui status commit terakhir, *gotchas* teknis (Strict CSP, Tailwind statis), dan backlog berikutnya.
> - Baca `docs/ARCHITECTURE.md` sebelum mengedit `index.html` atau modul `./js/*`.
> - Baca `docs/DESIGN.md` (*Single Source of Truth* Visual & Komponen UI) sebelum mengubah styling HTML/CSS, modal, atau membuat komponen UI baru.

---

## 1. Konteks Proyek, Deploy & Invarian Kritis

- **Aplikasi:** Portfolio NAV Tracker — Sistem Unit Penyertaan Saham Indonesia (6 tab: Portfolio, Dividends, Mutations, Analytics, Journal, Calculator).
- **Stack:** Static web app (`index.html` + `./js/*.js`), Vanilla JS (native ES Modules), Tailwind CSS, Chart.js, Lucide Icons, `localStorage` (`portfolio_nav_tracker_favo_v1`) + opsional Firebase sync, live market sync (TradingView IDX / Yahoo / Google Finance / Stooq).
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

1. **Pre-Flight Source-of-Truth Check (Model & Phase Guard — Wajib di Awal Tugas):**
   Sebelum mengeksekusi tugas apa pun, agent wajib mencocokkan **Tahap Tugas (Bagian 3)** dan **Model UI Aktif** terhadap tabel **Bagian 4**:
   - **Phase Guard:** Pastikan posisi tahap jelas (Tahap 1–6). Untuk fitur/refactor non-trivial tanpa spec yang disetujui di `docs/specs/`, tolak loncat langsung ke Tahap 4 (Coding).
   - **Model Guard — Terlalu Ringan (Hard Stop):** Jika model aktif di bawah rekomendasi Bagian 4 untuk tugas berisiko tinggi (misal posisi di **Argon Low / Hydrogen**, tapi tugas menyentuh logika inti NAV, matematika finansial, migrasi skema, atau refactor besar yang mensyaratkan **Neon Medium/High** atau **Carbon**), **TAHAN eksekusi kode**, tampilkan peringatan di baris pertama, dan minta user menaikkan model (atau izinkan delegasi ke subagent `pro`).
   - **Model Guard — Terlalu Mahal (Pengingat Hemat Kuota):** Jika model aktif jauh di atas kebutuhan tugas (misal posisi tertinggal di **Carbon / Neon**, tapi user hanya diskusi PM, tanya jawab, atau tweak teks 1–5 baris), tetap layani permintaan namun tampilkan **1 baris pengingat hemat kuota** di awal/akhir pesan untuk menurunkan model ke **Argon / Hydrogen**.
   - **Subagent & Swarm Enforcement:** Setiap pemanggilan `invoke_subagent` atau `/teamwork` wajib mem-pin tier model secara eksplisit (`flash` untuk `/browser`, `flash_lite` untuk audit mekanis, `pro` untuk logika inti).
2. **Jangan Baca Utuh `index.html`:** Gunakan peta baris di `docs/ARCHITECTURE.md` atau pencarian terarah, lalu baca rentang baris spesifik saja.
3. **Gate Perencanaan PM (Product Owner):**
   - **Fitur besar / ubah logika NAV / refactor / entitas baru:** Wajib lewat alur `brainstorming` → `/grill-me` (uji asumsi & edge-case) → `domain-modeling` (kunci istilah & kontrak) → `to-spec` → `to-tickets` → *approval* user. Simpan dokumen di `docs/specs/YYYY-MM-DD-<topik>.md`.
   - **Fitur kecil–sedang / polish UI:** Cukup `brainstorming` → `to-spec` → `to-tickets` → *approval* user (skip `/grill-me` bila tidak ada *trade-off* rumit).
   - **Quick task jelas** (typo, warna, tweak CSS 1–5 baris): Boleh langsung dieksekusi tanpa dokumen spec di `docs/specs/` (skip Tahap 1–3), namun **tetap wajib melewati verifikasi QA singkat (Tahap 5: `/browser` / cek error) serta update `docs/HANDOFF.md` + commit (Tahap 6)**.
4. **Diff Minimal & Modularisasi Bertahap:** Ikuti prinsip `ponytail` (perubahan terkecil, YAGNI) dan arsitektur modular di `docs/ARCHITECTURE.md` (`codebase-design`).
5. **Aturan Anti-Tumpang-Tindih Skill & Anti-Konflik `/teamwork`:**
   - Tiap fase **hanya memuat 1–2 skill paling spesifik** sesuai tabel di Bagian 3 (jangan memuat semua skill UI/dev sekaligus agar hemat kuota).
   - Pada `/teamwork`, maksimal **1 agent penulis** per file (khususnya `index.html`); agent lain bekerja di modul `./js/*.js` terpisah atau fokus riset/desain/QA.
6. **Hemat Token & Lingkungan Windows:** Gunakan gaya ringkas (`caveman`) di fase Dev/QA dan jalankan `/compact` di antara fase besar. Jangan berasumsi `node`/`git` CLI tersedia di sandbox; verifikasi runtime/UI melalui Browser Subagent (`/browser`).

---

## 3. Alur 6 Tahap Product Lifecycle & Routing Skill (Anti-Tumpang-Tindih)

**PM berperan sebagai Product Owner** yang mengawal konsistensi, prioritas, dan *sign-off* lintas stakeholder (UI/UX, Frontend, Backend/Core, QA, Security). Setiap tahap hanya memakai skill yang paling spesifik agar konteks bersih dan tidak saling tumpang-tindih.

| Tahap Product Lifecycle | Pemilik & Stakeholder | Skill & Tools Utama (Wajib / Pilih Spesifik) | Output / Gerbang Lanjut (*Gate*) |
| :--- | :--- | :--- | :--- |
| **1. Discovery & Ideation** *(Riset & Validasi Masalah)* | **PM (Owner)** + User + Research | `brainstorming`, `search_web`, `graphify` *(untuk external knowledge corpus: URL/PDF/screenshot/riset & repo baru/besar tanpa peta)*, `reverse-engineer-anything` *(khusus dekompilasi binary/APK/WASM, minified bundle, atau forensik sistem eksternal tertutup)* | Masalah tervalidasi, referensi standar industri, & alasan jelas (*why*) |
| **2. Planning & Strategy** *(Strategi, Prioritas & Uji Asumsi)* | **PM (Owner)** + Arsitek | `/grill-me` *(wajib untuk fitur besar/berisiko)*, `domain-modeling` *(kunci istilah bisnis & kontrak)* | Keputusan *scope* (in/out), *trade-off* disepakati, & glosarium/kontrak domain terkunci |
| **3. Defining & Designing** *(Spec, Tiket & Prototipe UI/UX)* | **PM (Owner)** + **UI/UX Designer** | • **PM:** `to-spec` → `to-tickets`<br>• **UI/UX** *(pilih 1, jangan digabung)*: `ui-ux-pro-max` *(dashboard/chart/app)* **atau** `design-taste-frontend` *(landing/company site)* **atau** `frontend-design` *(komponen/reshaping UI ringan, hemat token)*<br>• **Prototipe:** `generative_ui` *(opsional prototipe interaktif)* | Spec & tiket *vertical-slice* di `docs/specs/YYYY-MM-DD-*.md` + prototipe disetujui user (**Hard Gate** sebelum coding) |
| **4. Product Development / Execution** *(Pengembangan)* | **Frontend Dev** & **Backend / Core Dev** *(diawasi PM)* | • **Frontend:** `modern-web-guidance` + `antislop`<br>• **Backend / Core:** `implement` + `tdd` + `codebase-design` + `Context7`<br>• **Wajib Semua Dev:** `ponytail` *(diff minimal)* + `caveman` *(ringkas)*<br>• **Investigasi Bug:** `systematic-debugging` *(root cause dulu)* | Kode bersih dengan diff minimal, patuh invarian arsitektur & Strict CSP, serta *unit test* hijau (`ALL PASS`) |
| **5. Testing & Launch** *(Pengujian, Audit & Peluncuran)* | **QA Engineer** + **Security Engineer** + **PM (Sign-off)** | • **QA Kode & Visual:** `code-review-and-quality`, `impeccable` *(polish/harden)*, `web-design-guidelines` *(a11y)*, `/browser`<br>• **Security:** `security-review`<br>• **Launch:** Git commit + deploy | 0 temuan `Critical`/`Required`, 0 *high-confidence* security issue, 0 console error di `/browser`, & *sign-off* PM |
| **6. Post-Launch Evaluation** *(Evaluasi, Handoff & Optimasi)* | **PM (Owner)** + User | Update `docs/HANDOFF.md` & `docs/ARCHITECTURE.md`, `/handoff` *(jika pindah akun/sesi)*, `/compact` | *Living docs* terbarui (commit hash, *gotchas* baru, prioritas backlog) → siap siklus berikutnya |

> **Aturan Cepat Pemilihan Tahap:**
> - **Fitur Visual Kompleks / Tab Baru / Rombak Layout:** Jalankan penuh Tahap 1 → 6 (termasuk `/grill-me` + prototipe `generative_ui`).
> - **Fitur Kecil–Sedang / Polish UI:** Ringkas Tahap 1–3 (`brainstorming` → `to-spec` → `to-tickets`, tanpa prototipe), lalu lanjut Tahap 4–6.
> - **Bugfix:** Mulai dengan `systematic-debugging` (cari *root cause*), tambah *regression test* (`tdd`), lalu verifikasi di Tahap 5 (`/browser`).

---

## 4. Rekomendasi Model per Peran & Task (Hydrogen / Argon / Neon / Opsional Carbon)

| Peran / Jenis Task | Rekomendasi Model (UI) | Tier Subagent | Alasan & Strategi Cost-to-Performance |
| :--- | :--- | :--- | :--- |
| **Micro-Tasks (Typo, Copy, Tweak CSS 1–5 baris, Tanya Singkat)** | **Hydrogen** / **Argon (Low)** | `flash_lite` | **Paling irit kuota** untuk perubahan kosmetik yang tidak menyentuh logika |
| **PM (Brainstorming, Spec & Breakdown Tiket)** | **Argon (Medium)** | `inherit` | **Best value:** cukup cerdas menyusun spec & edge case tanpa boros kuota Neon/Carbon |
| **Orchestrator / Coordinator (`/teamwork`)** | **Argon (Medium)** → *Opsional: **Orchestrator Carbon** (fallback **Neon Medium**)* | `inherit` / `pro` | Default Argon untuk 2–3 task terpisah; naik ke Carbon (atau Neon) hanya untuk epic paralel ≥3 modul yang saling berbagi kontrak state/NAV/CSP |
| **UI/UX Designer (Layout & Visual FinTech)** | **Argon (Medium)** → **Neon (Medium)** | `inherit` | Argon Medium untuk komponen/chart; Neon untuk rombak desain penuh |
| **Developer — Modul Terpisah & Fitur Standar** | **Argon (Medium)** | `flash` / `inherit` | Setelah modularisasi selesai, tiap file kecil (<500 baris) sangat aman dikerjakan Argon |
| **Developer — Logika Inti (NAV, Math, Refactor Monolitik)** | **Neon (Medium / High)** | `pro` | Nol toleransi bug pada perhitungan finansial & pemecahan ribuan baris kode |
| **Eskalasi High-Stakes (Bug NAV Mentok, Migrasi Skema Risiko Tinggi, Audit Rilis Penuh)** | *Opsional: **Carbon** (fallback **Neon High / `/boost`**)* | `pro` | Hanya bila tersedia (paket Ultra) dan benar-benar butuh daya nalar puncak; otomatis aman fallback ke Neon jika tidak tersedia |
| **QA — Audit Linter / A11y (`web-design-guidelines`)** | **Hydrogen** / **Argon (Low)** | `flash_lite` / `flash` | Cek checklist mekanis secara cepat dan sangat murah |
| **QA — Review Arsitektur, Security (`security-review`) & Bug Kompleks** | **Argon (Medium)** / **Neon (Medium)** | `inherit` / `pro` | Menangkap celah logika, XSS/taint flow, dan edge case halus |
| **Research / Verifikasi Browser (`/browser`)** | **Otomatis `flash`** | `flash` / `flash_lite` | Subagent browser otomatis memakai model ringan agar hemat kuota utama |

---

## 5. Protokol Eksekusi, Pengingat Hemat Kuota & Handoff

- **Decision Gate Hemat Kuota (Aturan Mandor / Orchestrator):**
  - **Default = Single Agent + Argon (Medium) / Hydrogen:** Untuk 80% task harian (1–3 file, fitur standar, bugfix jelas, diskusi PM).
  - **Kapan pakai `/teamwork` (Orchestrator):** Hanya jika ada **≥ 2–3 sub-task independen** di file berbeda yang bisa dikerjakan paralel.
    - *Mandor Ringan (`Argon Medium`):* Untuk 2–3 sub-task yang tidak saling mengubah kontrak data.
    - *Mandor Epic (`Orchestrator Carbon`, opsional — fallback `Neon Medium`):* Hanya untuk epic paralel **≥ 3 modul yang saling terkait** (berbagi kontrak `state.js`, `nav-engine.js`, Strict CSP, atau `index.html`). Worker tetap dipin sesuai bobot (`Neon` untuk NAV/math, `Argon` untuk fitur standar, `flash`/`flash_lite` untuk riset/QA) — **jangan** pakai Carbon untuk semua worker.
    - Jangan pakai `/teamwork` untuk task kecil/berurutan (overhead lebih boros).
  - **Kapan pakai `/boost` atau Single Agent Carbon *(opsional, fallback Neon High)*:** Hanya untuk masalah berisiko tinggi atau butuh *deep thinking* (bug NAV/matematika yang rumit/mentok, migrasi skema `localStorage` berisiko tinggi, atau audit arsitektur/security menyeluruh sebelum rilis). **Jangan** dipakai untuk UI standar, copy, atau tweak CSS.
  - **Kapan pakai `ponytail` & `caveman`:** Wajib aktif di setiap fase Dev/QA — `ponytail` menjaga diff kode sekecil mungkin (YAGNI, tanpa abstraksi berlebih + 1–2 baris catatan *skipped/risk* di akhir), sedangkan `caveman` menjaga balasan chat tetap padat (naikkan ke `caveman ultra` untuk batch coding besar atau QA berulang).
- **Fitur Kecil–Sedang:** Jalankan berurutan (PM → UI/UX → Dev → QA) dalam satu sesi, lalu `/compact` di tiap pergantian fase.
- **Fitur Besar / Paralel:** Gunakan `/teamwork` (Swarm) dengan koordinator membagi tiket sesuai peran & batas *single-writer* pada `index.html`.
- **Otomatis Mode `ponytail` + `caveman` di Fase Dev & QA:**
  - Saat mengeksekusi tiket coding (Developer) dan pemeriksaan kode (QA), agent **wajib otomatis menggunakan prinsip `ponytail` (diff minimal) dan gaya bahasa ringkas (`caveman` lite)** — langsung hasil, tanpa basa-basi panjang — meskipun user tidak mengetik `/ponytail` atau `/caveman` (naikkan ke `caveman ultra` untuk batch besar).
  - Kembali ke bahasa penjelasan normal yang ramah saat fase PM / diskusi desain / menjawab pertanyaan user.
- **Pengingat Otomatis Pergantian Fase & Hemat Kuota (Wajib Ditampilkan Agent di Akhir Pesan):**
  1. **Saat Transisi PM → Dev (Spec Disetujui, Siap Coding):** Tampilkan kotak pengingat singkat:
     - *Mode & Model:* Rekomendasikan apakah cukup **Single Agent (Argon Medium / Hydrogen)**, perlu **`/teamwork`** (Mandor Argon Medium untuk paralel ringan, atau *opsional* **Orchestrator Carbon / fallback Neon Medium** untuk epic ≥3 modul terkait), atau perlu **`/boost` / Neon / *opsional* Carbon** (jika menyentuh logika NAV kritis).
     - *Efisiensi Kode, Bahasa & Compact:* Ingatkan aktifnya **`ponytail` (diff minimal/YAGNI)** + **`caveman`** (`caveman ultra` jika batch panjang), serta ketik **`/compact`** jika diskusi perencanaan sudah >10 pesan.
  2. **Saat Transisi Dev/QA → Selesai (Semua Tiket Beres):** Tampilkan kotak pengingat singkat:
     - *Update Living Handoff:* Pastikan `docs/HANDOFF.md` sudah diperbarui (status commit terakhir, *gotchas* baru, dan sisa backlog) sebelum commit agar sesi/akun/AI berikutnya dapat langsung lanjut tanpa kehilangan konteks. (Untuk pindah akun di tengah sesi, gunakan skill `/handoff`.)
     - *Turunkan Model:* Ingatkan user untuk segera **menurunkan model dari Carbon/Neon kembali ke Argon (Medium) / Hydrogen** agar kuota tidak terbuang untuk obrolan ringan.
     - *Compact / Commit:* Ingatkan `/compact` sebelum mulai topik berikutnya.
- **Format Handoff Ringkas** (jangan teruskan seluruh riwayat chat):
  1. **Tiket / Tujuan:** 1–3 kalimat ruang lingkup & kriteria selesai (atau link ke `docs/specs/...`).
  2. **Target File & Lokasi:** Path file + rentang baris / nama fungsi dari `docs/ARCHITECTURE.md`.
  3. **Batasan:** Invarian NAV, data, keamanan, dan relative path yang tidak boleh dilanggar.
  4. **Output yang Diminta:** Diff kode, temuan review berlabel severity, atau bukti verifikasi browser.

---

## 6. Definition of Done (Sebelum Deploy GitHub Pages / Vercel)

- [ ] **Fungsional & Matematika:** Kalkulasi NAV, unit penyertaan, fee, mutasi, dan dividen terverifikasi (termasuk via unit test `tdd` bila relevan) untuk kasus `0`, negatif, dan data kosong.
- [ ] **Kompatibilitas Data & Deploy:** Load/save `localStorage` & Export/Import JSON aman; semua path bersifat relatif (`./`) dan berjalan tanpa error di GitHub Pages & Vercel.
- [ ] **UI, Design System, Aksesibilitas & Keamanan:** Patuh kontrak `docs/DESIGN.md` (Obsidian FinTech Surface & `.modal-*`), rapi di desktop & mobile, Dark/Light mode konsisten, angka memakai `tabular-nums`, input ter-sanitasi (bebas XSS), lolos `web-design-guidelines`, `impeccable harden`, dan `security-review` tanpa temuan *high-confidence*.
- [ ] **Kualitas Kode & Runtime:** Lolos `code-review-and-quality` tanpa temuan `Critical`/`Required`, dan nol error console saat diuji lewat `/browser`.
