# AI Rules & Guidelines — Job Seek Assistant

Aturan ini wajib dipatuhi oleh asisten AI dalam mengelola dan memodifikasi repositori `job-seek-assistant`:

## 1. Aturan Pembaruan Dokumentasi (`/docs/`, `README.md`, `RELEASE_NOTES.md`)

- **DILARANG** secara otomatis memperbarui atau mengubah berkas dokumentasi berikut:
  - Direktori `docs/**` (panduan testing, panduan publishing, dsb.)
  - `README.md`
  - `RELEASE_NOTES.md`
  selama proses perancangan, koding, penanganan bug, maupun uji coba awal.
- **HANYA PERBARUI** berkas-berkas di atas **JIKA DAN HANYA JIKA** pengguna telah secara eksplisit menyatakan bahwa implementasi/perbaikan telah **diverifikasi** (misalnya pengguna menginfokan *"sudah verified"*, *"verified"*, *"sudah ku-test dan aman"*, atau memberikan perintah langsung untuk memperbarui dokumen).
- Selama pengguna belum menyatakan "verified", batasi perubahan hanya pada kode program (`src/**`), pengujian (`tests/**`), dan berkas konfigurasi teknis yang relevan.

## 2. Aturan Pembaruan Kebijakan Privasi (`PRIVACY_POLICY.md`)

- **HANYA PERBARUI** berkas `PRIVACY_POLICY.md` jika terdapat perubahan yang berdampak langsung pada privasi pengguna dan kepatuhan izin, seperti:
  - Perubahan atau penambahan `permissions` atau `host_permissions` pada `manifest.config.ts`.
  - Perubahan cara penyimpanan lokal (`chrome.storage`), transmisi data, atau pengolahan data sensitif pengguna (CV, email, profil akun Google).
  - Penambahan layanan eksternal atau API pihak ketiga baru.
- Jika perubahan hanya menyangkut perbaikan bug tampilan, refactoring kode internal, logika scraper, atau fitur yang tidak mengubah perlakuan data privasi, **DILARANG** mengubah `PRIVACY_POLICY.md`.
