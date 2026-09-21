# Fitur: Google Workspace Integration & CV Memory Engine
## Milestone 2: Google Workspace Integration & CV Memory Engine

Dokumen ini memuat detail arsitektur teknis, daftar berkas komponen, panduan pengujian otomatis, dan *manual testing checklist* untuk integrasi Google Workspace (OAuth2, Google Drive API v3, parser PDF/Google Docs, dan sinkronisasi berkala).

---

### 1. Arsitektur & Alur Data

Fitur ini menghubungkan antarmuka Side Panel ekstensi ke ekosistem Google Workspace menggunakan token OAuth 2.0 yang dikelola via `chrome.identity` (Manifest V3) dan REST API Google Drive v3.

```mermaid
flowchart TD
    subgraph BrowserContext["Peramban (Chrome / Edge MV3)"]
        SidePanel["Side Panel (Vue 3 UI)"]
        BackgroundSW["Background Service Worker"]
        LocalStorage[("chrome.storage.local<br/>(job_seek_cv_profile & settings)")]
    end

    subgraph AuthLayer["Google Auth & Identity"]
        ChromeIdentity["chrome.identity (getAuthToken / launchWebAuthFlow)"]
        UserInfoEndpoint["Google OAuth2 UserInfo API"]
    end

    subgraph GoogleDrive["Google Drive API v3"]
        DriveList["Drive API: files.list<br/>(Query: PDF & Google Docs)"]
        DriveMeta["Drive API: files.get<br/>(modifiedTime, md5Checksum, size)"]
        DocExport["Drive API: files.export<br/>(mimeType=text/plain)"]
        PdfDownload["Drive API: files.get?alt=media<br/>(ArrayBuffer binary)"]
    end

    subgraph ParsingEngine["CV Parser & Memory Engine"]
        PdfParser["PDF.js Engine<br/>(TextContent Extraction)"]
        DocsParser["Text Sanitizer & Heuristic Structurer"]
        TaxonomyMatcher["Taxonomy Matcher<br/>(Frontend, Backend, DevOps, etc.)"]
    end

    %% Auth Flow
    SidePanel -->|1. Trigger Login / Check Auth| BackgroundSW
    BackgroundSW -->|2. Request Token| ChromeIdentity
    ChromeIdentity -->|3. Access Token| BackgroundSW
    BackgroundSW -->|4. Get Profile (Email, Name, Avatar)| UserInfoEndpoint
    BackgroundSW -->|5. Save Auth State| LocalStorage

    %% File Selection & Parsing Flow
    SidePanel -->|6. List CV Documents| DriveList
    SidePanel -->|7. Select CV Document| DriveMeta
    DriveMeta -->|Google Docs| DocExport
    DriveMeta -->|PDF| PdfDownload
    DocExport --> DocsParser
    PdfDownload --> PdfParser
    PdfParser & DocsParser --> TaxonomyMatcher
    TaxonomyMatcher -->|8. Structured CVProfile| LocalStorage
    LocalStorage -.->|9. Reactive CV Display| SidePanel

    %% Sync & Change Detection
    SidePanel -->|10. Click 'Sync CV'| DriveMeta
    DriveMeta -->|Check: remote modifiedTime > local lastModified| BackgroundSW
    BackgroundSW -->|If Newer: Re-download & Re-parse| TaxonomyMatcher
```

#### Kontrak Komponen & State
* **`GoogleAuthService` (`src/services/googleAuth.ts`)**:
  - Mengelola siklus token OAuth2 (`getValidToken`), penanganan auto-refresh, pengambilan profil (`fetchUserProfile`), pembatalan token (`invalidateToken`), dan alur *logout*.
  - Mendukung *Chrome Identity*, *Custom Client ID*, dan *Mode Simulasi / Demo* untuk pengujian offline tanpa kredensial GCP.
* **`GoogleDriveService` (`src/services/googleDrive.ts`)**:
  - `listFiles()`: Menyaring dokumen dengan query `trashed = false and (mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document')` terurut waktu revisi terbaru.
  - `getFileMetadata()`: Mengambil metadata `id, name, mimeType, modifiedTime, md5Checksum, size`.
  - `downloadFileContent()`: Mengekspor teks plain untuk Google Docs dan mengunduh binary buffer untuk PDF.
* **`CVParserService` (`src/services/cvParser.ts`)**:
  - Parsing PDF binary menggunakan engine `pdfjs-dist` dengan mekanisme fallback stream reader jika worker peramban dibatasi CSP.
  - Pemetaan heuristik teks CV ke model `CVProfile`: deteksi *Headline*, taksonomi keahlian multi-kategori (Frontend, Backend, Database, Cloud/DevOps, Testing, Leadership), ekstraksi pengalaman kerja berbasis rentang tanggal, dan deteksi riwayat pendidikan.
* **`CVSyncService` (`src/services/cvSync.ts`)**:
  - Perbandingan timestamp atomik (`modifiedTime` Google Drive vs `driveModifiedTime` lokal).
  - Melakukan re-fetch dan update lokal jika ditemukan perubahan, atau memberikan notifikasi *up-to-date* jika berkas belum berubah.

---

### 2. Daftar Perubahan File

| Path File | Aksi | Tanggung Jawab |
|---|---|---|
| [`manifest.config.ts`](file:///D:/pribadi/Projects/job-seek-assistant/manifest.config.ts) | MODIFIKASI | Menambahkan izin `'identity'` dan konfigurasi blok `oauth2` Manifest V3 |
| [`package.json`](file:///D:/pribadi/Projects/job-seek-assistant/package.json) | MODIFIKASI | Menambahkan pustaka parser PDF resmi `pdfjs-dist` |
| [`src/types/settings.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/types/settings.ts) | MODIFIKASI | Menambahkan properti `googleClientId`, `googleAccessToken`, `useDemoDriveMode` |
| [`src/types/cv.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/types/cv.ts) | MODIFIKASI | Menambahkan metadata Drive (`mimeType`, `checksum`, `driveModifiedTime`, `lastSyncCheck`) dan antarmuka `GoogleDriveFileItem`, `CVSyncResult` |
| [`src/types/messages.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/types/messages.ts) | MODIFIKASI | Menambahkan kontrak pesan Chrome untuk Google Auth, Drive listing, fetching, dan syncing |
| [`src/services/googleAuth.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/services/googleAuth.ts) | BARU | Service otentikasi Google Workspace, token manager, dan user profile retrieval |
| [`src/services/googleDrive.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/services/googleDrive.ts) | BARU | Service komunikasi ke endpoint Google Drive API v3 (search, export, download) |
| [`src/services/cvParser.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/services/cvParser.ts) | BARU | Parser ekstraksi teks PDF & Google Docs serta penataan model struktur CV |
| [`src/services/cvSync.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/services/cvSync.ts) | BARU | Service deteksi perubahan berbasis timestamp dan pembaruan memori CV |
| [`src/background/index.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/background/index.ts) | MODIFIKASI | Mendaftarkan listener `chrome.runtime.onMessage` untuk Google Auth dan Drive Sync |
| [`src/composables/useStorageState.ts`](file:///D:/pribadi/Projects/job-seek-assistant/src/composables/useStorageState.ts) | MODIFIKASI | Menyediakan composable reaktif `useGoogleAuth` dan `useDriveCV` |
| [`src/sidepanel/components/Header.vue`](file:///D:/pribadi/Projects/job-seek-assistant/src/sidepanel/components/Header.vue) | MODIFIKASI | Menambahkan indikator status koneksi Google Workspace di header Side Panel |
| [`src/sidepanel/views/SettingsView.vue`](file:///D:/pribadi/Projects/job-seek-assistant/src/sidepanel/views/SettingsView.vue) | MODIFIKASI | Mengaktifkan kartu Google Workspace: login/logout, avatar, demo mode switch, dan custom client ID |
| [`src/sidepanel/views/CVProfileView.vue`](file:///D:/pribadi/Projects/job-seek-assistant/src/sidepanel/views/CVProfileView.vue) | MODIFIKASI | Antarmuka pemilihan berkas Drive modal, tombol sync berkala, dan kartu status CV aktif |
| [`tests/mocks/chrome.ts`](file:///D:/pribadi/Projects/job-seek-assistant/tests/mocks/chrome.ts) | MODIFIKASI | Menambahkan mock lengkap untuk `chrome.identity` API |
| [`tests/unit/google-auth.spec.ts`](file:///D:/pribadi/Projects/job-seek-assistant/tests/unit/google-auth.spec.ts) | BARU | Pengujian unit otentikasi Google, profil, logout, demo mode, dan launchWebAuthFlow |
| [`tests/unit/cv-parser.spec.ts`](file:///D:/pribadi/Projects/job-seek-assistant/tests/unit/cv-parser.spec.ts) | BARU | Pengujian unit parser dokumen teks, ekstraksi keahlian, pengalaman, dan pendidikan |
| [`tests/unit/cv-sync.spec.ts`](file:///D:/pribadi/Projects/job-seek-assistant/tests/unit/cv-sync.spec.ts) | BARU | Pengujian unit deteksi pembaruan Drive vs memori lokal dan refresh otomatis |
| [`docs/setup/google-oauth-setup.md`](file:///D:/pribadi/Projects/job-seek-assistant/docs/setup/google-oauth-setup.md) | BARU | Panduan langkah konfigurasi OAuth Client ID di Google Cloud Console |

---

### 3. Panduan Pengujian Otomatis (Automated Testing Guide)

Jalankan seluruh suite unit test:
```bash
npm run test
```

Verifikasi kompilasi TypeScript dan bundler Vite:
```bash
npm run build
```

Cakupan pengujian:
1. **Google Auth**:
   - Pengambilan token interaktif dan non-interaktif (`chrome.identity.getAuthToken`).
   - Pengambilan profil dari Google UserInfo API (`email`, `name`, `picture`).
   - Pembatalan token (*revocation*) dan pembersihan state saat logout.
   - Skenario *Demo Mode* tanpa kredensial cloud eksternal.
2. **CV Parser**:
   - Ekstraksi teks dan penataan profil dari teks dokumen Google Docs.
   - Pengelompokan keahlian multi-kategori (Frontend, Backend, Cloud, Testing, dll.).
   - Ekstraksi blok pengalaman kerja dan gelar pendidikan.
   - Penanganan fallback teks biner bila terjadi limitasi worker PDF.js.
3. **CV Sync & Change Detection**:
   - Deteksi revisi berkas Google Drive ketika `remote.modifiedTime > local.lastModified`.
   - Konfirmasi status up-to-date ketika berkas tidak mengalami modifikasi.
   - Pencegahan sinkronisasi untuk berkas yang diinput secara manual.
   - Penyimpanan atomik hasil sinkronisasi ke `chrome.storage.local`.

---

### 4. Panduan Pengujian Manual (Manual Testing Checklist)

| No | Skenario Pengujian | Tindakan Penguji | Hasil yang Diharapkan |
|---|---|---|---|
| 1 | **Verifikasi Build Ekstensi** | Jalankan `npm run build`, muat folder `dist/` di `chrome://extensions/` | Ekstensi termuat tanpa badge error merah; izin `identity` dan `storage` terdaftar. |
| 2 | **Aktivasi Mode Simulasi (Demo)** | Buka Side Panel -> Tab **Pengaturan** -> Buka *Opsi Pengembang* -> Aktifkan *Mode Simulasi Google Drive (Demo)* | Akun demo `test.user@example.com` langsung terhubung; badge header berubah menjadi hijau "Google". |
| 3 | **Pemilihan CV dari Google Drive** | Buka Tab **Profil & CV** -> Klik tombol **Pilih CV dari Google Drive** | Modal terbuka menampilkan daftar berkas CV demo (PDF dan Google Docs) terurut tanggal terbaru. |
| 4 | **Pencarian Berkas di Drive** | Masukkan kata kunci pencarian (misal: "Resume") pada kotak pencarian modal Drive | Daftar berkas tersaring secara instan sesuai kata kunci yang dimasukkan. |
| 5 | **Impor & Parsing Berkas CV** | Klik tombol **Pilih** pada salah satu berkas (misal: `Test_User_Resume_2026.pdf`) | Indikator proses muncul; modal tertutup; kartu status CV aktif menampilkan judul berkas, badge "Google Drive", puluhan keahlian terdeteksi, dan cuplikan pengalaman. Badge header menampilkan "CV Ada". |
| 6 | **Pemeriksaan Pembaruan & Sync CV** | Klik tombol **Periksa & Sync CV** pada kartu CV aktif | Ikon berputar; sistem membandingkan timestamp dan menampilkan notifikasi "CV di memori lokal sudah menggunakan versi terbaru". |
| 7 | **Logout Akun Google** | Buka Tab **Pengaturan** -> Klik tombol **Putuskan Koneksi Google** | Status berubah menjadi "Belum Terhubung", info profil dibersihkan, dan badge header menampilkan "No Sync". |
| 8 | **Input CV Manual (Fallback)** | Di Tab **Profil & CV**, klik **Input / Paste CV Manual**, isi form, lalu klik simpan | CV manual tersimpan dengan badge hijau "Input Manual" tanpa terpengaruh status Google Drive. |
