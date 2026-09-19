# User Stories Document
## Project: Job Seek Assistant (Chrome & Edge Extension)

---

### Epic 1: Google Workspace Connection & CV Management

#### US-1.1: Hubungkan Akun Google Workspace
**Sebagai** pelamar kerja,  
**Saya ingin** menghubungkan ekstensi ke akun Google Workspace saya,  
**Agar** ekstensi dapat mengakses CV di Google Drive dan mengirim email lamaran melalui Gmail.

* **Acceptance Criteria**:
  * **Scenario 1.1.1: Berhasil otentikasi pertama kali**
    * **Given** pengguna telah memasang ekstensi dan membuka halaman Pengaturan/Side Panel,
    * **When** pengguna mengklik tombol "Hubungkan Akun Google",
    * **Then** dialog OAuth2 Google muncul meminta izin scope Drive (baca) dan Gmail (kirim/draf),
    * **And** setelah disetujui, token tersimpan aman di peramban dan status akun berubah menjadi "Terhubung" disertai info email pengguna.
  * **Scenario 1.1.2: Pengguna membatalkan login**
    * **Given** dialog OAuth2 Google terbuka,
    * **When** pengguna menutup dialog atau menolak izin,
    * **Then** ekstensi menampilkan notifikasi peringatan yang jelas dan status tetap "Belum Terhubung".

#### US-1.2: Memilih dan Menyimpan CV dari Google Drive ke Memori Lokal
**Sebagai** pelamar kerja,  
**Saya ingin** memilih file CV saya dari Google Drive dan menyimpannya dalam memori lokal ekstensi,  
**Agar** ekstensi dapat langsung menggunakannya untuk analisis kapan saja tanpa perlu mengunduh ulang.

* **Acceptance Criteria**:
  * **Scenario 1.2.1: Pemilihan dan ekstraksi teks CV**
    * **Given** akun Google Workspace terhubung,
    * **When** pengguna mengklik "Pilih CV dari Google Drive",
    * **Then** daftar file (atau Google Picker) menampilkan dokumen PDF/Docx/Google Docs pengguna,
    * **And** saat file dipilih, sistem mengunduh, mengekstrak isi teks CV, dan menyimpannya ke `chrome.storage.local` bersama metadata (`fileId`, `fileName`, `lastModified`, `parsedAt`).
  * **Scenario 1.2.2: Pratinjau CV yang tersimpan**
    * **Given** CV telah tersimpan di memori lokal,
    * **When** pengguna membuka tab/menu "Profil & CV",
    * **Then** ditampilkan ringkasan nama file, tanggal sinkronisasi, dan pratinjau cuplikan teks profil/pengalaman kerja.

#### US-1.3: Memperbarui / Sinkronisasi CV
**Sebagai** pelamar kerja yang baru saja mengedit CV di Google Drive,  
**Saya ingin** menekan tombol sinkronisasi untuk memperbarui data CV di ekstensi,  
**Agar** analisis lowongan kerja selalu menggunakan versi pengalaman terbaru saya.

* **Acceptance Criteria**:
  * **Scenario 1.3.1: Deteksi perubahan dan pembaruan memori**
    * **Given** file CV di Google Drive memiliki `modifiedTime` yang lebih baru daripada `lastModified` di memori lokal,
    * **When** pengguna mengklik tombol "Sync CV" (atau sistem melakukan verifikasi berkala),
    * **Then** ekstensi mengunduh versi terbaru, mengekstrak kembali teksnya, memperbarui penyimpanan lokal, dan menampilkan notifikasi "CV berhasil diperbarui".

---

### Epic 2: Web Job Extraction & Content Analysis

#### US-2.1: Ekstraksi Otomatis Halaman Lowongan Kerja Aktif
**Sebagai** pelamar kerja,  
**Saya ingin** ekstensi otomatis mendeteksi dan mengambil informasi lowongan dari tab browser yang sedang saya buka,  
**Agar** saya tidak perlu menyalin-menempel (*copy-paste*) deskripsi pekerjaan yang panjang secara manual.

* **Acceptance Criteria**:
  * **Scenario 2.1.1: Ekstraksi dari portal kerja populer (LinkedIn, Glints, Jobstreet, Indeed)**
    * **Given** pengguna sedang membuka halaman detail lowongan di salah satu platform yang didukung,
    * **When** pengguna membuka Side Panel ekstensi dan mengklik "Analisa Halaman Ini",
    * **Then** content script mengekstrak Judul Posisi, Nama Perusahaan, Lokasi, Deskripsi Pekerjaan, Persyaratan, dan Kontak Email jika ada,
    * **And** rincian tersebut ditampilkan secara rapi di antarmuka Side Panel.
  * **Scenario 2.1.2: Ekstraksi dari situs karir umum / custom**
    * **Given** pengguna berada di halaman karir perusahaan independen,
    * **When** pengguna mengklik "Analisa Halaman Ini",
    * **Then** sistem menjalankan *readability fallback* untuk menyaring elemen navigasi/footer dan mengambil badan utama deskripsi pekerjaan.
  * **Scenario 2.1.3: Penyesuaian manual oleh pengguna**
    * **Given** teks telah diekstrak,
    * **When** pengguna merasa ada bagian teks yang kurang atau berlebih,
    * **Then** pengguna dapat mengedit form teks lowongan langsung sebelum menekan tombol analisis.

---

### Epic 3: AI-Powered Relevance & Gap Analysis

#### US-3.1: Analisis Kecocokan dan Gap Pengalaman dengan Gemini AI
**Sebagai** pelamar kerja,  
**Saya ingin** melihat skor relevansi dan analisis kesenjangan (*gap analysis*) antara lowongan kerja dan CV saya,  
**Agar** saya dapat memutuskan apakah posisi tersebut layak dilamar serta mengetahui bagian mana yang perlu diperkuat.

* **Acceptance Criteria**:
  * **Scenario 3.1.1: Analisis berhasil dengan detail menyeluruh**
    * **Given** CV telah tersimpan di memori dan teks lowongan telah diekstrak,
    * **When** pengguna mengklik tombol "Mulai Analisa Relevansi",
    * **Then** Gemini AI memproses perbandingan dengan aturan *grounding* ketat,
    * **And** Side Panel menampilkan:
      1. Skor Relevansi dalam persentase (0–100%) dengan indikator visual (Tinggi/Sedang/Rendah).
      2. Ringkasan kesesuaian profil.
      3. Daftar keterampilan yang cocok (*Matched Skills & Experiences*).
      4. Daftar kualifikasi yang belum terpenuhi (*Missing / Skill Gaps*).
      5. Saran strategi penonjolan keahlian saat wawancara.
  * **Scenario 3.1.2: Pencegahan halusinasi kualifikasi**
    * **Given** lowongan membutuhkan keterampilan "Golang & Kubernetes" sedangkan di CV pengguna hanya ada "Node.js & Docker",
    * **When** AI melakukan analisis,
    * **Then** AI wajib memasukkan "Golang & Kubernetes" ke dalam kolom *Skill Gaps* dan TIDAK BOLEH mengklaim bahwa pengguna menguasainya.

---

### Epic 4: Personalized Email Generation

#### US-4.1: Rekomendasi Template Email Lamaran
**Sebagai** pelamar kerja,  
**Saya ingin** AI menyusun rekomendasi Subject dan Body email lamaran yang disesuaikan dengan posisi tersebut dan pengalaman saya,  
**Agar** saya memiliki draf profesional yang siap kirim tanpa harus menulis dari awal.

* **Acceptance Criteria**:
  * **Scenario 4.1.1: Pemilihan gaya komunikasi (*tone*)**
    * **Given** analisis lowongan telah selesai,
    * **When** pengguna beralih ke tab "Buat Email Lamaran",
    * **Then** AI menyajikan pilihan draf email dengan minimal 3 opsi gaya:
      * *Formal Corporate* (Formal dan baku)
      * *Tech / Achievement-Focused* (Berfokus pada dampak proyek relevan)
      * *Concise Recruiter Pitch* (Ringkas dan langsung ke inti)
    * **And** setiap opsi memiliki Subject Line yang menarik dan Body Email yang sudah terisi data posisi & perusahaan.
  * **Scenario 4.1.2: Konsistensi fakta pada draf email**
    * **Given** draf email dibuat oleh AI,
    * **When** draf diperiksa oleh pengguna,
    * **Then** seluruh klaim pengalaman, angka pencapaian, dan gelar di dalam email bersumber 100% dari data CV pengguna.

#### US-4.2: Masukan Perubahan & Penyuntingan Iteratif (Iterative AI Refinement)
**Sebagai** pelamar kerja,  
**Saya ingin** memberikan masukan perubahan kepada AI atau mengedit draf secara langsung,  
**Agar** hasil akhir email sesuai persis dengan intonasi dan preferensi spesifik saya sebelum dikirimkan.

* **Acceptance Criteria**:
  * **Scenario 4.2.1: Memberikan instruksi revisi ke AI**
    * **Given** template email telah digenerate,
    * **When** pengguna mengetikkan instruksi perubahan (misal: "Buat kalimat penutup lebih ramah dan sebutkan ketertarikan saya pada produk XYZ") dan menekan "Revisi dengan AI",
    * **Then** AI memperbarui draf sesuai masukan dengan tetap mematuhi batasan fakta CV asli pengguna.
  * **Scenario 4.2.2: Penyuntingan manual inline**
    * **Given** draf email terbuka di editor,
    * **When** pengguna mengedit subject atau badan teks secara manual,
    * **Then** perubahan tersimpan secara instan di state draf lokal dan siap dikirim atau disimpan ke draft.

#### US-4.3: Pemilihan Bahasa pada Draf Email Lamaran
**Sebagai** pelamar kerja,  
**Saya ingin** menentukan bahasa pengantar untuk email lamaran (Bahasa Indonesia, English, atau Otomatis sesuai lowongan),  
**Agar** komunikasi lamaran kerja sesuai dengan bahasa yang diharapkan oleh perusahaan/recruiter.

* **Acceptance Criteria**:
  * **Scenario 4.3.1: Pemilihan bahasa spesifik (Inggris / Indonesia)**
    * **Given** pengguna berada di tab generator email,
    * **When** pengguna memilih bahasa "English" atau "Bahasa Indonesia",
    * **Then** AI menghasilkan subject dan body email sepenuhnya dalam bahasa yang dipilih dengan standar profesional dan tata bahasa yang tepat.
  * **Scenario 4.3.2: Mode Otomatis (Auto-Detect Job Posting Language)**
    * **Given** pengguna memilih mode "Auto",
    * **When** email digenerate,
    * **Then** sistem mendeteksi bahasa dominan dari teks lowongan (misal: lowongan berbahasa Inggris menghasilkan email berbahasa Inggris, lowongan berbahasa Indonesia menghasilkan email berbahasa Indonesia).
  * **Scenario 4.3.3: Preservasi istilah teknis & keahlian**
    * **Given** email digenerate dalam bahasa apa pun,
    * **When** AI menyebutkan keahlian teknis atau nama peran dari CV (contoh: "React Developer", "Data Pipeline", "CI/CD"),
    * **Then** istilah tersebut dipertahankan dalam format aslinya tanpa translasi harfiah yang merusak makna.

---

### Epic 5: Email Dispatch (Draft vs Direct Send via Gmail API)

#### US-5.1: Pilihan Simpan ke Draft atau Kirim Email Langsung
**Sebagai** pelamar kerja,  
**Saya ingin** memiliki kebebasan memilih apakah ingin menyimpan draf ke Gmail atau langsung mengirimkannya dari ekstensi,  
**Agar** saya memiliki fleksibilitas penuh sesuai tingkat keyakinan saya terhadap email tersebut.

* **Acceptance Criteria**:
  * **Scenario 5.1.1: Simpan sebagai Draft di Gmail**
    * **Given** pengguna telah memilih/merevisi template email dan mengisi email recruiter,
    * **When** pengguna mengklik tombol "Simpan ke Draft",
    * **Then** ekstensi mengonstruksi email MIME (beserta lampiran file CV jika dipilih) dan memanggil Gmail API `drafts.create`,
    * **And** muncul konfirmasi sukses disertai tautan atau informasi bahwa draf sudah siap di Gmail pengguna.
  * **Scenario 5.1.2: Pengiriman langsung dengan konfirmasi**
    * **Given** pengguna merasa email sudah sempurna dan ingin langsung mengirimkannya,
    * **When** pengguna mengklik tombol "Kirim Sekarang",
    * **Then** muncul modal konfirmasi keamanan yang merangkum (Email Tujuan, Subject, Lampiran CV),
    * **And** saat pengguna mengonfirmasi "Ya, Kirim", ekstensi memanggil Gmail API `messages.send`,
    * **And** status pengiriman sukses ditampilkan beserta ID pesan Gmail.
  * **Scenario 5.1.3: Penanganan error otentikasi**
    * **Given** token OAuth2 telah kedaluwarsa saat tombol diklik,
    * **When** panggilan API mengembalikan HTTP 401,
    * **Then** ekstensi otomatis meminta refresh token di latar belakang dan mengulangi aksi sekali, atau memberikan petunjuk login ulang tanpa menghilangkan teks email yang sudah diedit pengguna.
