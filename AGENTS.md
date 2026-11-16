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

- **WAJIB DI-TRACK & DI-PUSH KE GITHUB**: Berkas `PRIVACY_POLICY.md` adalah dokumen publik resmi yang wajib selalu dilacak oleh Git dan dipush ke GitHub (tidak boleh dimasukkan ke dalam `.gitignore`) sebagai syarat kepatuhan publikasi toko ekstensi peramban (Microsoft Edge Add-ons & Chrome Web Store).
- **WAJIB DIUPDATE OTOMATIS OLEH AI JIKA ADA PERUBAHAN**: AI **wajib** secara proaktif memperbarui berkas `PRIVACY_POLICY.md` setiap kali terdapat perubahan teknis yang berdampak langsung pada privasi pengguna dan kepatuhan izin, seperti:
  - Perubahan atau penambahan `permissions` atau `host_permissions` pada `manifest.config.ts` (misalnya izin `scripting`, `identity`, `storage`, dll.).
  - Perubahan cakupan izin Google OAuth (*scopes* Google Drive / Gmail).
  - Perubahan cara penyimpanan lokal (`chrome.storage`), transmisi data, atau pengolahan data sensitif pengguna (CV, email, profil akun Google).
  - Penambahan layanan eksternal atau API pihak ketiga baru.
  - Pembaruan tanggal *Last Updated* pada berkas tersebut saat klausul privasi mengalami perubahan.
- Jika perubahan hanya menyangkut perbaikan bug tampilan, refactoring kode internal, logika scraper, atau fitur yang tidak mengubah perlakuan data privasi, **DILARANG** mengubah `PRIVACY_POLICY.md`.
