# Panduan Setup: Google Cloud Console OAuth 2.0
## Project: Job Seek Assistant (Chrome & Edge Extension)

Dokumen ini memandu pengembang dan pengguna untuk menyiapkan kredensial Google OAuth 2.0 resmi jika ingin menghubungkan ekstensi ke akun Google Workspace pribadi secara langsung di luar mode simulasi/demo.

---

### 1. Prasyarat
* Akun Google (Gmail atau Google Workspace).
* Akses ke [Google Cloud Console](https://console.cloud.google.com/).
* Ekstensi yang sudah terpasang di Chrome (`chrome://extensions/`).

---

### 2. Langkah-Langkah Konfigurasi di Google Cloud Console

#### Langkah 1: Buat Proyek Google Cloud Baru
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Klik dropdown proyek di bagian atas, lalu pilih **New Project**.
3. Beri nama proyek, misalnya: `Job-Seek-Assistant-Ext`.
4. Klik **Create**.

#### Langkah 2: Aktifkan Google Drive API
1. Pada menu navigasi sebelah kiri, buka **APIs & Services** > **Library**.
2. Cari `Google Drive API`, klik dan tekan **Enable**.

#### Langkah 3: Konfigurasi OAuth Consent Screen
1. Buka **APIs & Services** > **OAuth consent screen**.
2. Pilih User Type **External** (atau **Internal** jika menggunakan Google Workspace organisasi) lalu klik **Create**.
3. Isi informasi aplikasi:
   * **App name**: `Job Seek Assistant`
   * **User support email**: Email Anda
   * **Developer contact email**: Email Anda
4. Klik **Save and Continue**.
5. Pada bagian **Scopes**, klik **Add or Remove Scopes**, lalu tambahkan:
   * `.../auth/drive.readonly` (Lihat berkas Google Drive)
   * `.../auth/userinfo.email` (Lihat alamat email pengguna)
   * `.../auth/userinfo.profile` (Lihat info profil pengguna)
6. Klik **Save and Continue**.
7. Pada bagian **Test users**, tambahkan alamat email Google Anda sendiri sebagai *test user*.
8. Simpan hingga selesai.

#### Langkah 4: Buat OAuth Client ID

##### Metode A: Menggunakan Extension ID (Rekomendasi untuk Developer Unpacked)
1. Buka **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
2. Pilih Application type: **Chrome extension** (jika tersedia) atau **Web application**.
3. Jika memilih **Chrome extension**:
   * Masukkan **Item ID**: Dapatkan ID ekstensi Anda dari halaman `chrome://extensions/` (string 32 karakter, misalnya `abcdefghijklmnop...`).
4. Jika memilih **Web application** (Metode fleksibel):
   * Tambahkan URI Pengalihan Resmi (*Authorized redirect URI*):
     `https://<YOUR_EXTENSION_ID>.chromiumapp.org/`
5. Salin nilai **Client ID** yang dihasilkan (contoh: `1234567890-abcdef.apps.googleusercontent.com`).

---

### 3. Memasukkan Client ID ke Ekstensi

Terdapat dua cara memasukkan Client ID:

1. **Melalui Antarmuka Pengaturan Ekstensi (Paling Mudah)**:
   * Buka Side Panel ekstensi Job Seek Assistant.
   * Masuk ke tab **Pengaturan**.
   * Buka bagian **Opsi Pengembang & Mode Simulasi**.
   * Masukkan Client ID ke dalam kolom **Custom Google OAuth Client ID**.
   * Klik **Simpan Konfigurasi AI & Pengaturan**.
   * Klik tombol **Hubungkan Akun Google Workspace**. Dialog login Google akan terbuka.

2. **Melalui Berkas `manifest.config.ts`**:
   * Buka berkas `manifest.config.ts`.
   * Ganti nilai `oauth2.client_id` dengan Client ID Anda.
   * Jalankan `npm run build` dan muat ulang ekstensi di peramban.

---

### 4. Mode Simulasi / Demo (Tanpa Setup GCP)
Bagi pengguna atau evaluator yang ingin mencoba seluruh fitur pemilihan berkas Drive dan sinkronisasi tanpa konfigurasi cloud, cukup aktifkan opsi:
* Buka Tab **Pengaturan** > **Opsi Pengembang** > Centang **Mode Simulasi Google Drive (Demo)**.
* Sistem akan langsung terhubung ke lingkungan simulasi dan menyediakan dokumen contoh CV format PDF dan Google Docs.
