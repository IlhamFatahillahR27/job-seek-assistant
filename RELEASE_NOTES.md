# Catatan Rilis / Release Notes 📋

## [1.0.1] - 2026-09-21

### 🐛 Perbaikan Bug (Bug Fixes)
- **Perbaikan Crash Ekstraksi PDF CV (`pdfjs-dist` v6)**:
  - Mengimplementasikan polyfill in-memory untuk standar ECMAScript TC39 `Uint8Array.prototype.toHex` dan `Math.sumPrecise`.
  - Mencegah error runtime `hashOriginal.toHex is not a function` yang memicu parser jatuh ke *fallback binary string extractor* (yang menghasilkan teks biner terkompresi acak).
  - Mengisolasi dan menormalisasi buffer data binary ke dalam instance murni `Uint8Array` baru sebelum dikirim ke `pdfjsLib.getDocument`, mencegah penolakan Node.js `Buffer` oleh PDF.js.
- **Perbaikan Ekstraksi Deskripsi Lowongan Jobstreet / SEEK (`JobstreetScraper`)**:
  - Menyesuaikan perubahan arsitektur DOM Jobstreet yang telah bertransisi ke platform terpadu SEEK (`jobstreet.co.id`, `id.jobstreet.com`, `seek.com.au`).
  - Menambahkan dukungan selector kontainer modern: `[data-automation="jobAdDetails"]`, `[data-automation="job-details-job-highlights"]`, serta panel *split-view* `[data-automation="jobDetailsPage"]` dan `[data-automation="splitViewDetails"]`.
  - Menambahkan ekstraksi otomatis poin utama lowongan (*Job Highlights* / keuntungan).
  - Memperbaiki `splitRequirements` agar mengenali pemisahan persyaratan dalam bentuk teks paragraf inline (seperti `Persyaratan: ...` atau `Kualifikasi: ...`).
  - Memperbaiki mekanisme fallback di `extractJobFromDocument` sehingga string penanda kosong tidak memblokir ekstraktor cadangan (`UniversalScraper`).
- **Penyempurnaan Heuristik Parsing CV (`CVParserService`)**:
  - **Pembersihan Headline**: Menghilangkan nomor kontak, email, dan nama kota yang terpisah oleh karakter `|` atau `•`, sehingga menyisakan posisi kerja/profesi murni (contoh: *Full Stack Engineer*).
  - **Dukungan Baris Pengalaman Ganda**: Memperbaiki pembacaan format 2 baris (baris institusi/perusahaan di atas baris posisi dan rentang waktu) agar nama institusi tidak lagi tertukar dengan nama negara atau lokasi.
  - **Dukungan Format Bulan Dua Sisi**: Memperbarui `dateRegex` agar mampu mengenali rentang waktu dengan bulan pada tanggal awal dan akhir (contoh: *Jan 2022 - Apr 2023*, *Apr 2021 - Sept 2021*).
  - **Isolasi Batas Seksi (Section Boundaries)**: Mencegah data pendidikan (misal: *Diploma 3 2018 - 2021*) masuk ke dalam daftar pengalaman kerja secara tidak sengaja.
  - **Pengenalan Pelatihan & Sertifikasi**: Memperluas deteksi seksi untuk mengenali *Professional Training*, *Pelatihan*, *Courses*, dan *Kursus*.
  - **Taksonomi Keahlian Modern**: Menambahkan kosakata teknologi terkini seperti *Laravel*, *Next.js*, *Nuxt.js*, *NestJS*, *Figma*, *UI/UX*, *System Analysis*, *BPMN*, *ERD*, dan *Supabase*.

### 🚀 Peningkatan Fitur (Enhancements)
- **Ekstraksi Cerdas Lowongan Berbasis Gemini AI (AI Smart Job Extraction)**:
  - Mengimplementasikan fitur pembacaan konten lowongan berbasis AI menggunakan model penalaran Google Gemini (`GeminiClientService.extractJobWithAI`).
  - Menyerap seluruh teks visual halaman web (`innerText` dan wadah utama) tanpa bergantung pada class CSS acak atau struktur DOM yang sering berubah pada portal kerja modern seperti Jobstreet / SEEK.
  - **Mekanisme Auto AI Fallback**: Ketika ekstraksi cepat (DOM scraper) mendeteksi deskripsi yang tidak lengkap atau tidak ditemukan, sistem secara otomatis beralih memanggil Gemini AI untuk memproses halaman secara cerdas.
  - **Tombol Khusus UI**: Menambahkan tombol *"✨ Ekstrak AI"* di samping tombol *"Ekstrak Halaman"* pada Side Panel, serta tombol *"Ekstrak Cerdas AI ✨"* di kolom deskripsi pekerjaan.
  - **Lencana Transparansi Metode**: Menampilkan status metode ekstraksi (*AI Extracted* atau *DOM Scraper*) pada kartu pratinjau lowongan.
- **Filter Eksklusif Model Penalaran Logis (Logical Thinking Models)**:
  - Menyaring daftar model dari `ModelService.ListModels` agar hanya menampilkan model penalaran logis Gemini yang mendukung pembuatan teks terstruktur (`generateContent`).
  - Menyaring dan memblokir seluruh model non-penalaran teks: pembuatan gambar (*Imagen*), pembuatan video (*Veo*), sintesis suara (*TTS/Audio/Speech*), dan *embedding*.
  - Menandai model penalaran tingkat lanjut (*Thinking Models*) dengan lencana visual `🧠 [Thinking]` dan menempatkannya di urutan teratas pada opsi dropdown pengaturan.
  - Memperbarui daftar opsi model cadangan (*fallback options*) di UI Pengaturan menjadi: `Gemini 2.0 Flash`, `Gemini 2.0 Flash Thinking`, `Gemini 2.5 Flash`, `Gemini 2.5 Pro`, `Gemini 1.5 Pro`, dan `Gemini 1.5 Flash`.
- **Indikator Versi Antarmuka (UI Version Badge)**:
  - Menambahkan lencana versi halus `v1.0.1` pada bilah atas (*header*) Side Panel.

### 🛡️ Privasi & Keamanan Data (Privacy & Data Security)
- **Anonimisasi Menyeluruh Mode Demo (Neutral Persona: Test User)**:
  - Mengubah seluruh data tiruan pada otentikasi Google Workspace simulasi (`GoogleAuthService`), form input CV manual awal, dan teks isi CV tiruan menjadi persona pengujian standar netral: **Test User** (`test.user@example.com`).
  - Memperbarui katalog berkas mock Google Drive (`DEMO_DRIVE_FILES`) menjadi `Test_User_Resume_2026.pdf` untuk mengeliminasi penggunaan nama pribadi pengembang maupun nama orang nyata.
  - Menghapus pengecekan nama pribadi hardcode pada generator draf email simulasi (`EmailGeneratorService`), menggantinya dengan ekstraksi nama kandidat dinamis dari dokumen CV dan penyesuaian tanda tangan penutup draf adaptif.
- **Proteksi Berkas Referensi**:
  - Menambahkan direktori `reference/` dan berkas PDF lokal ke `.gitignore` agar berkas pribadi tidak ter-commit ke repositori git publik.

---

## [1.0.0] - 2026-09-19

### Peluncuran Perdana (Initial Release)
- **Chrome & Edge Side Panel Manifest V3**: Antarmuka responsif Vue 3 & Tailwind CSS dengan tab Analisa, Email Generator, Profil & CV, dan Pengaturan.
- **Google Drive CV Memory**: Otentikasi Google Workspace OAuth2 via `chrome.identity` dengan pembacaan berkas PDF dan Google Docs serta deteksi perubahan berkas (*auto-sync*).
- **Active Web Job Scraper**: Ekstraktor lowongan real-time untuk LinkedIn Jobs, Glints, Jobstreet, Indeed, dan situs karir independen dengan proteksi anti-prompt injection.
- **Gemini AI Match & Gap Analysis**: Evaluasi kecocokan kandidat berbasis grounding anti-halusinasi dengan skor relevansi 0–100%, matched skills, skill gaps, dan tips wawancara.
- **Multi-Tone & Multi-Language Email Generator**: Pembuatan draf email lamaran dalam 3 gaya (Formal, Impact, Concise) dan 3 opsi bahasa (Indonesia, English, Auto) dengan fitur perbaikan bertahap (*iterative refinement*).
- **Dual Gmail Dispatch**: Integrasi penyimpanan ke Draf Gmail atau pengiriman langsung via Gmail API dengan opsi melampirkan berkas CV PDF asli.
- **Simulasi Mode Demo Penuh**: Pengujian menyeluruh tanpa konfigurasi GCP atau API Key.
