# Panduan Publikasi Ekstensi ke Chrome Web Store & Microsoft Edge Add-ons

Dokumen ini memuat panduan lengkap langkah demi langkah untuk mempublikasikan **Job Seek Assistant** ke **Chrome Web Store** dan **Microsoft Edge Add-ons**, termasuk perbedaan biaya pendaftaran, berkas yang wajib di-zip, persyaratan privasi, dan justifikasi perizinan (*permissions justification*).

---

## 💰 Perbandingan Biaya & Persyaratan Akun

| Platform | Biaya Pendaftaran (*Registration Fee*) | Tipe Akun & Syarat | Waktu Review Rata-rata |
| :--- | :---: | :--- | :---: |
| **Microsoft Edge Add-ons** | **GRATIS ($0 / Free)** | Akun Microsoft (Outlook / Live / Office 365) via [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) | 1 – 3 Hari Kerja |
| **Chrome Web Store** | **$5 USD (Sekali bayar seumur hidup)** | Akun Google dengan 2-Factor Authentication (2FA) aktif via [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) | 2 – 5 Hari Kerja |

> [!NOTE]
> Karena ekstensi ini dibangun di atas standar **Manifest V3 Chromium**, berkas ZIP hasil build yang sama dapat langsung diunggah ke kedua toko tanpa perlu mengubah kode sumber.

---

## 📦 Berkas yang Perlu Di-Zip

### 1. File ZIP Otomatis (Direkomendasikan)
Setiap kali Anda menjalankan perintah:
```bash
npm run build
```
Plugin `vite-plugin-zip-pack` akan secara otomatis memaketkan seluruh isi folder `dist/` ke dalam file siap rilis:
```
release/crx-job-seek-assistant-1.0.0.zip
```
Berkas ZIP di atas **langsung siap diunggah** ke Chrome Web Store dan Microsoft Edge Partner Center.

---

### 2. Struktur Isi di Dalam Berkas ZIP
> [!IMPORTANT]
> **Aturan Utama ZIP Toko Ekstensi**: Berkas `manifest.json` harus berada di **akar terluar (root)** di dalam berkas ZIP, **BUKAN** terbungkus di dalam folder `dist/`.

Isi yang **WAJIB ADA** di dalam file ZIP:
```text
crx-job-seek-assistant-1.0.0.zip
├── manifest.json              <-- File manifest V3 utama (wajib di root ZIP)
├── service-worker-loader.js   <-- Loader service worker background
├── logo.png                   <-- Ikon utama ekstensi
├── public/
│   └── logo.png
├── src/
│   └── sidepanel/
│       └── index.html         <-- HTML antarmuka Side Panel
└── assets/
    ├── *.js                   <-- Bundle JavaScript terkompilasi (Vue, composables, services)
    └── *.css                  <-- Bundle Tailwind CSS terkompresi
```

### 3. Berkas yang **TIDAK BOLEH** Ikut Ter-zip
Jangan pernah menyertakan berkas berikut ke dalam ZIP rilis:
- ❌ Folder `node_modules/`
- ❌ Folder `src/` mentah (TypeScript & file `.vue` mentah)
- ❌ Folder `tests/` dan fixtures pengujian
- ❌ Folder `plans/` dan `docs/`
- ❌ File `.git/`, `.gitignore`, `.vscode/`
- ❌ File konfigurasi: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`

---

## 🌐 1. Panduan Publikasi ke Microsoft Edge Add-ons (GRATIS)

### Langkah 1: Pendaftaran Akun Developer
1. Buka portal [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge).
2. Masuk menggunakan akun Microsoft Anda.
3. Daftarkan diri sebagai pengembang (*Developer*). Pendaftaran akun individu **100% Gratis tanpa biaya apa pun**.
4. Lengkapi profil pengembang (nama tampilan penerbit, email kontak, dan negara).

### Langkah 2: Mengunggah Paket Ekstensi
1. Pada dashboard Partner Center, klik **"Create new extension"**.
2. Unggah file ZIP rilis: `release/crx-job-seek-assistant-1.0.0.zip`.
3. Sistem Microsoft Edge akan secara otomatis memvalidasi `manifest.json`.

### Langkah 3: Melengkapi Listing Toko (Store Listing)
1. **Description**:
   - Jelaskan fitur utama: Analisis kecocokan lowongan dengan Gemini AI, grounding CV dari Google Drive, generator email lamaran multi-gaya dan multi-bahasa, serta integrasi Gmail.
2. **Visual Assets**:
   - **Extension Icon**: Berkas PNG ukuran 128x128 piksel (`public/logo.png`).
   - **Screenshots**: Minimal 1 tangkapan layar (resolusi disarankan: 1280x800 atau 640x400 piksel) yang menampilkan antarmuka Side Panel.
3. **Category**: Pilih kategori **Productivity** atau **Search Tools**.
4. **Support Contact**: Masukkan URL repository GitHub atau email kontak Anda.

### Langkah 4: Kebijakan Privasi (*Privacy Policy*)
1. Masukkan URL Kebijakan Privasi (contoh: halaman GitHub Pages atau link file Markdown privasi di repository Anda).
2. Nyatakan bahwa ekstensi **tidak mengumpulkan data pengguna ke server pihak ketiga**, dan seluruh data (token OAuth & teks CV) disimpan secara eksklusif di penyimpanan lokal peramban (`chrome.storage.local`).

### Langkah 5: Kirim untuk Ditinjau (*Submit*)
- Klik tombol **"Publish"**. Peninjauan oleh tim Microsoft Edge biasanya memakan waktu 1–3 hari kerja.

---

## 🌐 2. Panduan Publikasi ke Chrome Web Store (Biaya $5 USD)

### Langkah 1: Pembayaran Akun Pengembang Google
1. Buka [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
2. Masuk menggunakan Akun Google Anda (pastikan verifikasi 2 langkah / 2FA sudah aktif).
3. Anda akan diminta membayar **biaya pendaftaran satu kali sebesar $5 USD** melalui kartu debit/kredit via Google Payments.
4. Setelah pembayaran berhasil, akun pengembang Anda langsung aktif secara permanen.

### Langkah 2: Mengunggah Paket Ekstensi
1. Klik tombol **"Add new item"** di pojok kanan atas.
2. Tarik (*drag & drop*) berkas ZIP: `release/crx-job-seek-assistant-1.0.0.zip`.
3. Tunggu hingga proses verifikasi manifes selesai.

### Langkah 3: Melengkapi Deskripsi & Metadata Toko
1. **Item details**:
   - **Name**: Job Seek Assistant
   - **Summary (maks 132 karakter)**: *AI job application assistant with grounded CV analysis, web scraping, and Gmail dispatch.*
   - **Description**: Cantumkan detail fitur, dukungan portal karir (LinkedIn, Glints, Jobstreet, Indeed), dan cara kerja isolasi konteks anti-halusinasi.
   - **Category**: **Productivity / Workflow**.
2. **Graphic Assets**:
   - **Store Icon**: 128x128 PNG.
   - **Screenshots**: Minimal 1 screenshot ukuran 1280x800 piksel.
   - *(Opsional)* Marquee Promo Tile: 440x280 piksel.

### Langkah 4: Justifikasi Perizinan (*Privacy & Permission Justification*)
Chrome Web Store mewajibkan penjelasan alasan teknis penggunaan setiap permission pada tab **Privacy practices**:

| Permission / Host | Justifikasi Singkat yang Harus Diisi di Dashboard |
| :--- | :--- |
| `sidePanel` | *Digunakan untuk menyajikan antarmuka pengguna interaktif di samping tab browsing aktif tanpa menutupi konten halaman lowongan kerja.* |
| `storage` | *Menyimpan profil CV kandidat, riwayat analisis, preferensi bahasa, dan cache draf email secara aman di penyimpanan lokal peramban pengguna.* |
| `activeTab` | *Mengizinkan ekstensi membaca teks lowongan kerja pada halaman tab yang sedang aktif ketika pengguna menekan tombol 'Ambil Data Halaman Ini'.* |
| `identity` | *Menjalankan otentikasi Google OAuth 2.0 untuk integrasi Google Drive (membaca CV) dan Gmail API (menyimpan draf/mengirim email).* |
| `https://generativelanguage.googleapis.com/*` | *Menghubungkan ekstensi ke Google Gemini AI untuk analisis kecocokan pekerjaan dan pembuatan email lamaran.* |
| `https://www.googleapis.com/*` | *Mengakses Google Drive API v3 untuk mengunduh dan menyinkronkan dokumen CV pengguna.* |
| `https://gmail.googleapis.com/*` | *Mengakses Gmail API v1 untuk membuat draf pesan atau mengirim email lamaran kerja atas izin pengguna.* |

### Langkah 5: Single Purpose & Data Usage Disclosures
1. **Single Purpose**:
   *Tuliskan*: *"Membantu pencari kerja mengevaluasi kecocokan lowongan kerja terhadap CV dan membuat draf email lamaran kerja terpersonalisasi."*
2. **Data Usage Certification**:
   - Beri tanda centang pada opsi:
     - *"I do not sell or transfer user data to third parties."*
     - *"I do not use or transfer user data for purposes unrelated to the item's single purpose."*
     - *"I do not use or transfer user data to determine creditworthiness or for lending purposes."*
3. **Privacy Policy**: Cantumkan tautan URL kebijakan privasi publik Anda.

### Langkah 6: Kirim untuk Peninjauan (*Submit for Review*)
- Klik tombol **"Submit for review"**. Peninjauan memakan waktu rata-rata 2–5 hari kerja.

---

## 🔒 Draf Kebijakan Privasi (*Privacy Policy Template*)

Kedua toko mewajibkan URL Kebijakan Privasi publik. Anda dapat membuat file `PRIVACY_POLICY.md` di repositori GitHub Anda dan menyalin draf berikut:

```markdown
# Privacy Policy for Job Seek Assistant

Last Updated: September 2026

1. Overview
Job Seek Assistant is a client-side browser extension designed to assist job seekers in analyzing job vacancies and composing application emails. We are committed to protecting your privacy.

2. Data Collection and Storage
- Local Storage Only: All candidate CV profiles, job match history, email drafts, and application settings are stored locally on your device using Chrome's local storage API (`chrome.storage.local`).
- No Third-Party Database: We do not operate external servers to collect, harvest, store, or sell your personal data.

3. External Services and APIs
The extension communicates directly with the following official APIs using your own authorization:
- Google Gemini API: Sends the extracted job description and candidate CV text solely for matching analysis and email draft generation. Data is governed by Google AI Terms of Service.
- Google Drive API: Accesses only the CV files explicitly selected by the user to extract plain text and resume attachments.
- Google Gmail API: Accesses email composition endpoints (`users.me.drafts` and `users.me.messages`) only when you choose to save a draft or send an application email.

4. Permissions Justification
- `sidePanel`: Displays the assistant UI.
- `storage`: Preserves user preferences and CV data locally.
- `activeTab`: Extracts job details from the current tab upon user request.
- `identity`: Manages OAuth tokens for Google Drive and Gmail integrations.

5. Changes to This Policy
Any updates to this policy will be reflected in the extension repository.

6. Contact
For any questions regarding this privacy policy, please open an issue on GitHub.
```

---

## ✅ Checklist Sebelum Submit ke Store

- [ ] Jalankan `npm run test` (pastikan 103 tes lulus 100%).
- [ ] Jalankan `npm run build` (pastikan *zero errors* dan *zero warnings*).
- [ ] Berkas `release/crx-job-seek-assistant-1.0.0.zip` telah terbuat.
- [ ] Periksa isi file zip: pastikan `manifest.json` ada di level akar (*root*).
- [ ] Siapkan minimal 1 screenshot beresolusi 1280x800 piksel.
- [ ] Siapkan icon PNG ukuran 128x128 piksel.
- [ ] Tautan Kebijakan Privasi (*Privacy Policy*) dapat diakses publik.
