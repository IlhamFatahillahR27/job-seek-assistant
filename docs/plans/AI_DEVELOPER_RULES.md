# AI Developer & Engineering Rules
## Project: Job Seek Assistant (Chrome & Edge Extension)

Dokumen ini berisi standar wajib, konvensi teknis, dan prosedur kerja bagi setiap AI Agent / Developer yang mengimplementasikan atau memodifikasi fitur dalam repositori ini.

---

### 1. Prinsip Utama & Filosofi Rekayasa
1. **Zero Silent Failure**: Selalu tangani error secara eksplisit. Jangan pernah menelan (*swallow*) error tanpa logging atau feedback ke pengguna.
2. **Security & Privacy First**: Jangan pernah menyimpan token OAuth atau API key ke dalam file repositori (`.git`), atau mengirim data pengguna ke server pihak ketiga selain Google Workspace & Gemini API resmi.
3. **Strict Typings**: Gunakan TypeScript dengan mode `strict: true`. Hindari penggunaan tipe `any`; selalu buat *interfaces* atau *types* yang jelas untuk payload Chrome Messaging, data CV, respons Gemini, dan respons Google API.
4. **Manifest V3 Concurrency & Lifecycle**: Sadari bahwa *Background Service Worker* di Manifest V3 bersifat *ephemeral* (dapat dimatikan peramban setelah beberapa puluh detik idle). Simpan state kritis ke `chrome.storage.local`, jangan bergantung pada variabel memori global di service worker.

---

### 2. Standar Dokumentasi Wajib untuk Setiap Fitur
Setiap AI yang mengembangkan atau memperbarui fitur **WAJIB** membuat atau memperbarui dokumentasi teknis yang diletakkan di `docs/features/<feature-name>.md`. Dokumentasi ini harus memuat:

1. **Arsitektur & Alur Data**:
   * Komponen apa saja yang terlibat (Popup, Side Panel, Content Script, Background Service Worker, API eksternal).
   * Format pesan antar-komponen (*Chrome Message Passing interface*).
2. **Daftar Perubahan File**:
   * File yang ditambahkan, dimodifikasi, atau dihapus beserta tanggung jawabnya.
3. **Panduan Testing Manual (Manual Testing Checklist)**:
   * Langkah demi langkah (*step-by-step*) yang dapat diikuti oleh manusia untuk menguji fitur langsung di browser Chrome/Edge Developer Mode.
   * Kondisi *pre-requisite*, aksi pengujian, hasil yang diharapkan (*expected result*), dan penanganan skenario negatif.
4. **Panduan Testing Otomatis (Automated Testing Guide)**:
   * Perintah untuk menjalankan pengujian unit/integrasi.
   * Rincian test suite dan skenario mock yang digunakan.

---

### 3. Standar Pengujian (Testing Standards)

#### A. Automated Testing (Vitest & Mocking)
* **Framework**: Gunakan `vitest` untuk unit testing logic dan composables.
* **Chrome API Mocking**: Setiap pengujian yang berinteraksi dengan API peramban (`chrome.storage`, `chrome.runtime`, `chrome.identity`, `chrome.tabs`) harus menggunakan mock yang representatif (misalnya `vitest-chrome` atau custom mock fixture di `tests/mocks/chrome.ts`).
* **API Mocking**: Mock panggilan Google Drive, Gmail, dan Gemini API menggunakan *fixtures* respons JSON agar unit test dapat berjalan offline dan konsisten di CI/CD.
* **Coverage Target**: Unit test wajib mencakup:
  * Parser logika (ekstraksi DOM, ekstraksi teks CV).
  * State management / Composables (sinkronisasi CV, filter riwayat lamaran).
  * Payload formatter untuk RFC 2822 MIME email.
  * Parser respons terstruktur dari Gemini AI.

#### B. Manual Verification Protocol
Sebelum menyatakan sebuah tugas atau fitur selesai (*Done*), AI developer harus memastikan:
1. `npm run build` sukses tanpa error TypeScript (`vue-tsc -b`) dan tanpa build warnings fatal.
2. Ekstensi dapat dimuat tanpa error di `chrome://extensions/` (tidak ada badge error merah pada kartu ekstensi).
3. Melakukan simulasi alur end-to-end sesuai skenario penerimaan (*Acceptance Criteria*).

---

### 4. Struktur Kode & Konvensi Arsitektur
Proyek menggunakan arsitektur modular berbasis lapisan tanggung jawab:

```
src/
├── background/         # Background Service Worker (OAuth, Google API proxy, listeners)
├── content/            # Content Scripts (DOM Scraper untuk LinkedIn, Glints, Jobstreet, dll)
├── sidepanel/          # Antarmuka utama asisten (Vue 3 Side Panel)
│   ├── components/     # Komponen UI modular (RelevanceCard, EmailComposer, CVViewer)
│   ├── composables/    # Business logic reaktif (useGemini, useCV, useGmail, useJobScraper)
│   └── views/          # Layar/Tab utama (AnalysisView, EmailView, SettingsView)
├── services/           # Modul komunikasi eksternal murni (GeminiService, DriveService, GmailService)
├── stores/             # State lokal tersinkronisasi dengan chrome.storage
├── types/              # Deklarasi TypeScript untuk seluruh sistem
└── utils/              # Helper murni (MIME builder, DOM sanitizer, text trimmer)
```

---

### 5. Komunikasi Antar Komponen (Chrome Message Passing)
Seluruh pengiriman pesan internal wajib menggunakan kontrak tipe bertipe kuat (*strongly typed messages*):

```typescript
// Contoh kontrak di src/types/messages.ts
export type ExtensionMessage =
  | { type: 'SCRAPE_JOB_PAGE' }
  | { type: 'SCRAPE_JOB_SUCCESS'; payload: JobDetails }
  | { type: 'GOOGLE_AUTH_REQUEST' }
  | { type: 'GOOGLE_AUTH_SUCCESS'; payload: { token: string; email: string } }
  | { type: 'SYNC_CV_REQUEST'; payload: { fileId: string } }
  | { type: 'SEND_GMAIL_REQUEST'; payload: SendEmailPayload }
  | { type: 'API_ERROR'; error: string };
```
Hindari penggunaan string liar (*magic strings*) pada parameter `chrome.runtime.sendMessage`.
