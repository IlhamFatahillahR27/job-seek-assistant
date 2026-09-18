/**
 * Google Drive API v3 Service
 * Handles listing PDF/Docs files, fetching metadata, exporting Google Docs to plain text,
 * downloading PDF binary content, and demo mock fallback.
 */

import type { GoogleDriveFileItem } from '@/types/cv'

export interface DownloadedDriveFile {
  fileId: string
  fileName: string
  mimeType: string
  modifiedTime?: string
  checksum?: string
  content: string | ArrayBuffer
}

// Demo mock files for offline testing and evaluation without GCP setup
export const DEMO_DRIVE_FILES: GoogleDriveFileItem[] = [
  {
    id: 'demo_drive_file_001',
    name: 'Ilham_Fatahillah_Resume_2026.pdf',
    mimeType: 'application/pdf',
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
    size: '142850',
    iconLink: 'https://ssl.gstatic.com/docs/doclist/images/icon_10_pdf_list.png',
  },
  {
    id: 'demo_drive_file_002',
    name: 'CV_Senior_Frontend_Engineer.gdoc',
    mimeType: 'application/vnd.google-apps.document',
    modifiedTime: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    size: '45120',
    iconLink: 'https://ssl.gstatic.com/docs/doclist/images/icon_11_document_list.png',
  },
  {
    id: 'demo_drive_file_003',
    name: 'Curriculum_Vitae_TechLead_ID.pdf',
    mimeType: 'application/pdf',
    modifiedTime: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
    size: '185300',
    iconLink: 'https://ssl.gstatic.com/docs/doclist/images/icon_10_pdf_list.png',
  },
]

export const DEMO_DOC_TEXT = `ILHAM FATAHILLAH
Senior Frontend Engineer & Web Architect
Jakarta, Indonesia | ilham.fatahillah@email.com | +62 812-3456-7890 | linkedin.com/in/ilhamfatahillah

RINGKASAN PROFESIONAL
Senior Frontend Engineer dengan lebih dari 5 tahun pengalaman dalam membangun aplikasi web modern berskala besar, sistem desain, dan ekstensi peramban. Sangat mahir dalam arsitektur Vue 3, TypeScript, Tailwind CSS, Vite, dan optimasi performa web serta integrasi AI APIs.

KEAHLIAN TEKNIS
- Bahasa Pemrograman: TypeScript, JavaScript (ES6+), HTML5, CSS3, SQL
- Frontend & Framework: Vue.js 3 (Composition API), Pinia, React.js, Tailwind CSS, Vite, Micro-frontend
- Arsitektur & Tooling: Google Chrome Extensions (Manifest V3), REST APIs, GraphQL, WebSockets, Vitest, Playwright
- Cloud, AI & DevOps: Google Cloud Platform (Drive & Gmail API), Gemini API, Docker, Git, CI/CD GitHub Actions

PENGALAMAN KERJA

Senior Frontend Engineer | Tech Titan Nusantara (Jakarta, ID)
Januari 2022 - Sekarang
- Memimpin pengembangan antarmuka platform SaaS enterprise dengan Vue 3 dan TypeScript yang melayani lebih dari 100.000 pengguna aktif harian.
- Meningkatkan kecepatan render halaman hingga 45% dan menurunkan bundle size hingga 30% menggunakan code splitting dan tree-shaking Vite.
- Mengarsiteki komponen UI modular yang digunakan oleh 4 tim produk lintas divisi.
- Membimbing 5 engineer junior dan menginisiasi standar code review serta testing otomatis dengan Vitest.

Frontend Engineer | Inovasi Digital Corp (Bandung, ID)
Maret 2020 - Desember 2021
- Mengembangkan aplikasi single-page (SPA) berbasis Vue 2 & 3 untuk solusi e-commerce B2B.
- Berkolaborasi aktif dengan tim UX dan Product Manager untuk mewujudkan desain responsif berkecepatan tinggi.
- Mengintegrasikan payment gateway dan backend GraphQL dengan reliabilitas 99.9%.

PENDIDIKAN
Sarjana Komputer (S.Kom) - Teknik Informatika
Universitas Indonesia, Depok (2016 - 2020) | IPK: 3.82 / 4.00

SERTIFIKASI & PENGHARGAAN
- Google Cloud Certified Associate Cloud Engineer (2023)
- Meta Frontend Developer Professional Certificate (2022)`

export class GoogleDriveService {
  /**
   * Search files in Google Drive (PDF and Google Docs)
   */
  static async listFiles(token: string, searchKeyword?: string): Promise<GoogleDriveFileItem[]> {
    if (token === 'demo_mock_token_12345') {
      if (searchKeyword && searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase().trim()
        return DEMO_DRIVE_FILES.filter((f) => f.name.toLowerCase().includes(kw))
      }
      return [...DEMO_DRIVE_FILES]
    }

    // Build Drive query: non-trashed PDF or Google Docs files
    let q = `trashed = false and (mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document')`
    if (searchKeyword && searchKeyword.trim()) {
      // Escape single quotes for Drive search
      const sanitized = searchKeyword.replace(/'/g, "\\'")
      q += ` and name contains '${sanitized}'`
    }

    const fields = 'files(id, name, mimeType, modifiedTime, size, iconLink)'
    const endpoint = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      q
    )}&orderBy=modifiedTime%20desc&pageSize=25&fields=${encodeURIComponent(fields)}`

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      throw new Error(`Gagal memuat berkas dari Google Drive (${response.status}): ${errText}`)
    }

    const data = await response.json()
    return (data.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      modifiedTime: file.modifiedTime,
      size: file.size,
      iconLink: file.iconLink,
    }))
  }

  /**
   * Get single file metadata
   */
  static async getFileMetadata(
    token: string,
    fileId: string
  ): Promise<GoogleDriveFileItem & { md5Checksum?: string }> {
    if (token === 'demo_mock_token_12345') {
      const found = DEMO_DRIVE_FILES.find((f) => f.id === fileId) || DEMO_DRIVE_FILES[0]
      return {
        ...found,
        md5Checksum: 'demo_checksum_hash_123',
      }
    }

    const fields = 'id, name, mimeType, modifiedTime, size, md5Checksum, iconLink'
    const endpoint = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(
      fields
    )}`

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Gagal mengambil metadata berkas (${response.status}): ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      modifiedTime: data.modifiedTime,
      size: data.size,
      iconLink: data.iconLink,
      md5Checksum: data.md5Checksum,
    }
  }

  /**
   * Download content from Google Drive (plain text for Docs, ArrayBuffer for PDF)
   */
  static async downloadFileContent(
    token: string,
    fileId: string,
    mimeType: string,
    fileName: string
  ): Promise<DownloadedDriveFile> {
    const meta = await this.getFileMetadata(token, fileId)

    if (token === 'demo_mock_token_12345') {
      // In demo mode, return text for docs or create a basic PDF/plain buffer
      return {
        fileId,
        fileName: meta.name || fileName,
        mimeType: meta.mimeType || mimeType,
        modifiedTime: meta.modifiedTime,
        checksum: meta.md5Checksum || 'demo_hash_987',
        content: DEMO_DOC_TEXT,
      }
    }

    // Google Docs -> Export as text/plain
    if (mimeType === 'application/vnd.google-apps.document') {
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`
      const response = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Gagal mengekspor Google Doc (${response.status}): ${response.statusText}`)
      }

      const text = await response.text()
      return {
        fileId,
        fileName: meta.name || fileName,
        mimeType,
        modifiedTime: meta.modifiedTime,
        checksum: meta.md5Checksum,
        content: text,
      }
    }

    // Binary file (PDF) -> Download alt=media as ArrayBuffer
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Gagal mengunduh berkas PDF (${response.status}): ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return {
      fileId,
      fileName: meta.name || fileName,
      mimeType,
      modifiedTime: meta.modifiedTime,
      checksum: meta.md5Checksum,
      content: arrayBuffer,
    }
  }

  /**
   * Download or export a file from Google Drive as a binary PDF ArrayBuffer
   * Specifically designed for email attachments.
   */
  static async downloadFileAsPdf(
    token: string,
    fileId: string,
    mimeType?: string,
    fileName = 'Resume.pdf'
  ): Promise<{ fileName: string; content: ArrayBuffer }> {
    let pdfFileName = fileName
    if (pdfFileName.toLowerCase().endsWith('.gdoc')) {
      pdfFileName = pdfFileName.replace(/\.gdoc$/i, '.pdf')
    } else if (!pdfFileName.toLowerCase().endsWith('.pdf')) {
      pdfFileName = `${pdfFileName}.pdf`
    }

    if (token === 'demo_mock_token_12345') {
      // Return a minimal valid PDF ArrayBuffer for testing & demo mode
      const dummyPdfHeader = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(dummyPdfHeader).buffer
      return {
        fileName: pdfFileName,
        content: buffer,
      }
    }

    // If Google Docs, export directly to application/pdf
    if (mimeType === 'application/vnd.google-apps.document') {
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`
      const response = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(
          `Gagal mengekspor Google Doc ke PDF (${response.status}): ${response.statusText}`
        )
      }

      const buffer = await response.arrayBuffer()
      return {
        fileName: pdfFileName,
        content: buffer,
      }
    }

    // Default binary file download (e.g. PDF)
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Gagal mengunduh berkas PDF (${response.status}): ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    return {
      fileName: pdfFileName,
      content: buffer,
    }
  }
}
