# Panduan Setup: Google Cloud Console OAuth 2.0
## Project: Job Seek Assistant (Chrome & Edge Extension)

Dokumen ini memandu pengembang dan pengguna untuk menyiapkan kredensial Google OAuth 2.0 resmi jika ingin menghubungkan ekstensi ke akun Google Workspace pribadi secara langsung di luar mode simulasi/demo.

---

### 1. Prasyarat
* Akun Google (Gmail atau Google Workspace).
* Akses ke [Google Cloud Console](https://console.cloud.google.com/).
* Ekstensi yang sudah terpasang di peramban Chrome/Edge (`chrome://extensions/`).

---

### 2. Langkah-Langkah Konfigurasi di Google Cloud Console

#### Langkah 1: Buat Proyek Google Cloud Baru
1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Klik dropdown proyek di bilah atas, lalu pilih **New Project**.
3. Beri nama proyek, misalnya: `Job-Seek-Assistant-Ext`.
4. Klik **Create**.

#### Langkah 2: Aktifkan Google Drive API
1. Pada menu navigasi sebelah kiri, buka **APIs & Services** > **Library**.
2. Cari `Google Drive API`, klik berkas tersebut dan tekan tombol **Enable**.

#### Langkah 3: Konfigurasi OAuth Consent Screen
1. Buka **APIs & Services** > **OAuth consent screen**.
2. Pilih User Type **External** lalu klik **Create**.
3. Isi informasi aplikasi:
   * **App name**: `Job Seek Assistant`
   * **User support email**: Alamat email Google Anda
   * **Developer contact email**: Alamat email Google Anda
4. Klik **Save and Continue**.
5. Pada bagian **Scopes**, klik **Add or Remove Scopes**, lalu centang:
   * `.../auth/drive.readonly` (Membaca berkas CV dari Google Drive)
   * `.../auth/userinfo.email` (Melihat alamat email pengguna)
   * `.../auth/userinfo.profile` (Melihat nama dan foto profil)
6. Klik **Update** dan **Save and Continue**.
7. **PENTING**: Pada bagian **Test users**, klik **Add Users** dan masukkan alamat email Google yang akan Anda gunakan untuk login.
8. Klik **Save and Continue** hingga selesai.

#### Langkah 4: Buat OAuth Client ID (Tipe: Web Application)
1. Buka **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
2. Pilih Application type: **Web application** (Aplikasi Web).
3. Beri nama, misalnya: `Job Seek Assistant Web Client`.
4. Pada bagian **Authorized redirect URIs** (URI Pengalihan Resmi):
   * Buka Side Panel ekstensi Job Seek Assistant di peramban Anda -> Tab **Pengaturan**.
   * Di kartu *Google Workspace*, klik tombol **Salin URI** di sebelah *Authorized Redirect URI Google*.
   * Format URI tersebut adalah: `https://<EXTENSION_ID>.chromiumapp.org/`
   * Klik **+ ADD URI** di Google Cloud Console dan tempelkan (*paste*) URI tersebut.
5. Klik tombol **Create**.
6. Dialog pop-up akan menampilkan **Your Client ID** (contoh: `1234567890-abcdef.apps.googleusercontent.com`). Salin Client ID ini.

---

### 3. Menghubungkan Ekstensi ke Akun Google Anda

1. Buka tab **Pengaturan** di Side Panel ekstensi.
2. Tempelkan Client ID yang disalin tadi ke kolom **Google OAuth 2.0 Client ID (Web Application)**.
3. Klik tombol **Hubungkan Akun Google Workspace**.
4. Jendela otentikasi resmi Google akan muncul:
   * Pilih akun Google Anda (pastikan akun yang dipilih sudah didaftarkan di *Test users* pada Langkah 3).
   * Jika muncul peringatan *"Google hasn't verified this app"*, klik **Advanced** lalu klik **Go to Job Seek Assistant (unsafe)** (ini normal untuk aplikasi dalam tahap pengembangan mandiri).
   * Klik **Continue / Izinkan** untuk menyetujui izin baca berkas Google Drive.
5. Selesai! Status akan berubah menjadi **Terhubung** disertai nama, email, dan foto profil akun Google Anda.

---

### 4. Mode Simulasi / Demo (Alternatif Instan Tanpa GCP)
Bagi Anda yang ingin langsung mencoba seluruh alur impor CV, parsing PDF, dan sinkronisasi tanpa konfigurasi Google Cloud Console:
* Buka Tab **Pengaturan** > Centang **Mode Simulasi Google Drive (Demo)**.
* Ekstensi akan otomatis terhubung ke lingkungan simulasi dan menyediakan dokumen contoh CV siap pakai.
