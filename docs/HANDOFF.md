# HANDOFF.md — Living Project State & Transfer Context

Dokumen konteks hidup (*living handoff document*) untuk proyek **Portfolio NAV Tracker** (`dashboard-portfolio-saham`). Selalu diperbarui setiap kali satu fase atau commit selesai agar sesi/akun/AI baru dapat langsung melanjutkan pekerjaan tanpa membuang kuota token.

---

## 1. Quick Resume Prompt (Copy-Paste di Akun / AI Baru)

```text
Baca AGENTS.md, docs/ARCHITECTURE.md, docs/DESIGN.md, dan docs/HANDOFF.md. Semua konteks proyek terbaru ada di sana. Sekarang kita siap masuk ke backlog berikutnya (Prioritas 4: Fitur Baru) atau task spesifik yang saya sebutkan di bawah ini.
```

*(Untuk transfer mendadak di tengah sesi sebelum commit, jalankan juga skill `/handoff` agar snapshot percakapan sementara tersimpan di `%TEMP%`.)*

---

## 2. Status Terkini Proyek (Last Updated: 2026-11-22)

- **Branch:** `main` (working tree bersih, seluruh perubahan sudah ter-commit).
- **Arsitektur:** 100% statis (native ES Modules, tanpa build step wajib), kompatibel penuh **GitHub Pages & Vercel** menggunakan relative path (`./...`).
- **Unit Test:** `tests/test-runner.html` & `tests/core.test.js` — **14/14 ALL PASS** (Seam 1–6: `computeMetrics`, IPOT fees, `id-ID` number parser/formatter, `escapeHTML`, backup reminder, AES-GCM crypto).

### Riwayat Commit Utama Terakhir
| Commit | Ringkasan Perubahan |
| :--- | :--- |
| `806654b` | Standardisasi format angka Indonesia (`id-ID`: titik `.` ribuan, koma `,` desimal) di seluruh input & output. |
| `b6f0ef0` | Fix tombol Edit & Hapus (ikon Lucide SVG) menghilang saat search/filter/sort parsial di Tab Portofolio. |
| `7046b1f` | **Prioritas 1 (Enhancement Performa):** Pre-compiled Tailwind CSS (`./css/tailwind.min.css`), PWA offline-first (`./manifest.json`, `./sw.js`, `./assets/icon.svg`), Chart.js in-place reuse (`upsertChart()`), dan lazy table row render (`renderPortfolioTableRows()`). |
| `1cf55df` | **Prioritas 2 (UI/UX Polish):** Pemisahan jelas **Invested Saham** vs **Uninvested Cash / Buying Power (RDN)** di KPI card & 2-row `<tfoot>`, bar horizontal P/L, dual progress bar Rebalancing (`Bobot Aktual vs Target`), sticky `<thead>`, dan Keyboard Shortcuts (`/`, `1`–`6`, `R`, `Esc`) + `aria-label`. |
| `a5e9d63` | **Prioritas 3 (Improvement Security):** Migrasi 121 inline event handler ke event delegation (`data-onclick`, `data-onchange`, `data-oninput`, `data-onsubmit`), Strict CSP `<meta>` tanpa `'unsafe-inline'` di `script-src`, SRI (`integrity` + `crossorigin`) pada CDN Chart.js & Lucide, timeout 5 detik & sanitasi ticker di `js/market.js`, allowlist `mergeWithDefaults` di `js/state.js`, Backup Reminder (`>30 hari`), serta **Encrypted JSON Export/Import (Web Crypto PBKDF2-SHA256 + AES-256-GCM)**. |
| `0895203` | **Copy Polish Bahasa Indonesia & Update Aturan Carbon:** Perapian 5 titik *copy* Tab Portofolio (`Total Valuasi Portofolio`, sub-teks `Saham • Kas` tanpa kotak *pill*, `Saldo Kas (RDN)`, `Subtotal Saham` & `Total Portofolio (Saham + Kas)`, serta Status Bar Sinkronisasi `Diperbarui ... • TradingView (8/8)` & `Bursa Tutup/Buka`) + penambahan panduan opsional **Carbon / Orchestrator Carbon** (dengan fallback otomatis ke Neon) di `AGENTS.md`. |
| `c158a26` | **Upgrade `AGENTS.md` (6-Stage Lifecycle, Phase/Model Guard & `frontend-design`) + Global Cursor Pointer Fix:** Penambahan Pre-Flight Model & Phase Guard, matriks 6 Tahap Product Lifecycle anti-tumpang-tindih skill (termasuk opsi `frontend-design` & aturan QA wajib pada Quick Task), serta aturan CSS global `cursor: pointer` untuk seluruh `<button>`, `[data-onclick]`, `<select>`, `checkbox`, `radio`, dan `summary` di `css/styles.css`. |
| `1832e7d` | **Design System SSOT (`docs/DESIGN.md`) & Revamp UI 13 Modal:** Pembuatan `docs/DESIGN.md` (Obsidian FinTech Surface: `#0C1117` canvas, `#141C24` surface, hairline border, Emerald `#10B981`, aturan `tabular-nums` vs `font-mono`, dan Pre-compiled Tailwind Guard), penambahan komponen semantik `.modal-*` di `css/styles.css`, serta perombakan seluruh 13 modal di `index.html`, input `#bulk-price-list` di `js/ui/portfolio.js`, dan state tombol tab aktif di `js/app.js`. |
| `HEAD` | **Tahap 1 Skill Routing Update (`graphify` + `reverse-engineer-anything`):** Perluasan cakupan `graphify` untuk pemetaan *external knowledge corpus* (URL/PDF/screenshot/riset) serta pendaftaran skill global `reverse-engineer-anything` (`morluto/rea`) khusus dekompilasi binary/APK/WASM & forensik bundle eksternal tertutup di `AGENTS.md`. |

> **Dokumen Spec Terkait:** `docs/specs/2026-11-22-performance-ux-security-roadmap.md`, `docs/specs/2026-11-22-copy-polish-kas-dan-sync.md`, `docs/specs/2026-11-22-design-system-and-modal-revamp.md`

---

## 3. Batasan Teknis & Gotchas (WAJIB Dibaca AI Baru)

1. **Strict CSP — Dilarang Pakai Inline Event Handler:**
   - `index.html` kini memakai `<meta http-equiv="Content-Security-Policy">` tanpa `'unsafe-inline'` pada `script-src`.
   - Semua tombol/input/form baru di HTML maupun template literal JS **WAJIB** memakai atribut `data-onclick="..."`, `data-onchange="..."`, `data-oninput="..."`, atau `data-onsubmit="..."` yang otomatis ditangani `setupDelegatedEvents()` di `js/app.js`. Jangan pernah menulis `onclick="..."` secara langsung!
2. **Pre-compiled Static Tailwind CSS (`./css/tailwind.min.css`):**
   - CDN runtime `cdn.tailwindcss.com` sudah dihapus untuk menghilangkan layout flash.
   - Jika fitur baru menambahkan utility class Tailwind yang **belum ada** di `./css/tailwind.min.css`, tambahkan aturan CSS-nya ke `./css/styles.css` atau regenerasi `./css/tailwind.min.css`.
3. **Invarian Data & Keamanan:**
   - Skema `localStorage` (`portfolio_nav_tracker_favo_v1`) dan JSON Export/Import (baik plaintext maupun terenkripsi AES-GCM) wajib tetap backward-compatible.
   - Semua input user wajib di-sanitasi (`escapeHTML`) sebelum dirender; angka finansial wajib `tabular-nums` dan format `id-ID`.
4. **Lingkungan Windows & PowerShell:**
   - Jika membaca/menulis file via PowerShell 5.1, selalu pakai `[System.Text.UTF8Encoding]::new($false)` agar karakter UTF-8 (`—`, `•`, `↕`, `Rp`) tidak korup menjadi Windows-1252.
   - Uji runtime & unit test melalui server HTTP statis (ES Modules diblokir di `file://`), lalu verifikasi lewat Browser Subagent (`/browser`) pada `index.html` dan `tests/test-runner.html`.

---

## 4. Backlog Berikutnya (Next Up — Prioritas 4: Fitur Baru)

Seluruh Prioritas 1–3 sudah selesai dan terverifikasi. Item backlog selanjutnya yang menunggu fase PM (`/brainstorming`):
1. **Corporate Action Helper:** Fitur Stock Split & Reverse Split (menyesuaikan jumlah lot & harga rata-rata secara otomatis tanpa mengubah total modal & unit penyertaan/NAV).
2. **Export CSV / Excel per Tabel:** Ekspor data Holdings, Mutasi, Dividen, dan Jurnal ke format `.csv` (UTF-8 BOM agar rapi di Excel Indonesia).
3. **Historical NAV Curve Chart:** Grafik pertumbuhan kurva NAV per unit historis dari waktu ke waktu di Tab Analytics.

---

## 5. Suggested Skills untuk Sesi Berikutnya

- **Fase PM / Perencanaan Fitur Baru:** `brainstorming`, `ponytail`
- **Fase Implementasi (Dev):** `tdd` (wajib untuk logika Corporate Action / NAV), `ponytail`, `caveman`
- **Fase Verifikasi (QA & Security):** `code-review-and-quality`, `security-review`, `web-design-guidelines`, `/browser`
- **Transfer Sesi Mendadak:** `/handoff` (terpasang di `C:\Users\AXIOO\.gemini\config\skills\handoff\SKILL.md`)
