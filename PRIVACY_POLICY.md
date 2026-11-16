# Privacy Policy for Job Seek Assistant

**Last Updated**: September 2026

## 1. Overview
**Job Seek Assistant** is a client-side open-source browser extension (Manifest V3) designed to help job seekers analyze job postings, evaluate qualification matches against candidate CVs, and generate personalized job application emails. 

Your privacy is of utmost importance. This policy outlines how information is handled within the extension.

---

## 2. Local Storage & Data Privacy
- **Local Storage First**: All candidate CV data, parsed skills, extracted job vacancies, match analysis histories, user settings, and email drafts are stored exclusively on your device using Chrome's local storage API (`chrome.storage.local`).
- **No Third-Party Database or Tracking**: We do not maintain external servers, databases, or analytics services to track, harvest, store, or sell your personal data.

---

## 3. External Services and APIs
The extension communicates directly with official Google APIs using the credentials provided or authorized by you:
1. **Google Gemini API**:
   - Transmits job descriptions and candidate CV text solely for matching analysis and email draft generation.
   - Operates in adherence to Google AI Studio Terms of Service and data privacy guidelines.
2. **Google Drive API v3**:
   - Accesses only the CV documents (PDF or Google Docs) explicitly selected by the user to extract text for analysis and prepare resume attachments.
3. **Google Gmail API v1**:
   - Accesses draft creation (`users.me.drafts.create`) and direct sending (`users.me.messages.send`) endpoints only upon user action (clicking "Simpan ke Draft" or "Kirim Email Langsung").

---

## 4. Permissions & Host Justification
- `sidePanel`: Renders the assistant interface in the browser side panel beside the active job listing.
- `storage`: Preserves application settings, API keys, and CV cache locally on your machine (`chrome.storage.local`).
- `activeTab`: Extracts job title, company name, requirements, and recruiter emails from the currently active tab only when you initiate the extraction action.
- `identity`: Facilitates secure Google OAuth 2.0 authentication for Google Drive and Gmail integrations.
- **Host Permissions** (`https://generativelanguage.googleapis.com/*`, `https://gmail.googleapis.com/*`, `https://www.googleapis.com/*`): Enables direct, client-to-API communication with Google Gemini for AI analysis, Google Drive for CV importing, and Gmail for draft/email dispatch.

---

## 5. No Remote Code Execution
Job Seek Assistant strictly adheres to Manifest V3 security standards. The extension **does not use, fetch, or execute any remote code** (`eval()`, external script tags, or remote CDNs). All logic, dependencies (such as Vue and PDF parsing engines), and assets are packaged and verified locally within the extension bundle.

---

## 6. User Choices & Data Control
- You can clear all cached data at any time through the **Pengaturan** (Settings) tab in the side panel or by uninstalling the extension.
- Google OAuth access can be disconnected or revoked at any time directly in the extension or via your Google Account Permissions page.

---

## 7. Contact & Source Code
Job Seek Assistant is an open-source project. You can inspect the source code, review permissions, or report issues on GitHub:
- **Repository**: [https://github.com/IlhamFatahillahR27/job-seek-assistant](https://github.com/IlhamFatahillahR27/job-seek-assistant)
