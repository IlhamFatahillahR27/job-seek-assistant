# Release Notes 📋

## [1.0.1] - 2026-09-21

### 🐛 Bug Fixes
- **PDF CV Extraction Crash Fix (`pdfjs-dist` v6)**:
  - Implemented in-memory polyfills for TC39 ECMAScript standards: `Uint8Array.prototype.toHex` and `Math.sumPrecise`.
  - Prevented runtime errors where `hashOriginal.toHex is not a function` triggered the parser to fall back to the binary string extractor (which produced scrambled compressed binary characters).
  - Isolated and normalized binary data buffers into a clean `Uint8Array` instance before passing to `pdfjsLib.getDocument`, preventing PDF.js from rejecting Node.js `Buffer` objects.
- **Jobstreet / SEEK Job Description Extraction Fixes (`JobstreetScraper`)**:
  - Adapted to Jobstreet's DOM architecture transition to the unified SEEK platform (`jobstreet.co.id`, `id.jobstreet.com`, `seek.com.au`).
  - Added support for modern container selectors: `[data-automation="jobAdDetails"]`, `[data-automation="job-details-job-highlights"]`, as well as split-view panels `[data-automation="jobDetailsPage"]` and `[data-automation="splitViewDetails"]`.
  - Added automatic extraction of key job highlights and benefits.
  - Enhanced `splitRequirements` to recognize requirements separated within inline paragraph text (such as `Persyaratan: ...` or `Kualifikasi: ...`).
  - Fixed fallback mechanism in `extractJobFromDocument` so empty marker strings do not block the secondary fallback extractor (`UniversalScraper`).
- **CV Parsing Heuristic Refinements (`CVParserService`)**:
  - **Headline Sanitization**: Stripped contact numbers, email addresses, and city names separated by `|` or `•`, preserving clean job titles/professions (e.g., *Full Stack Engineer*).
  - **Two-Line Experience Header Support**: Improved parsing for two-line headers (institution/company name placed above the role and date range), ensuring company names are no longer mistaken for countries or locations.
  - **Dual-Month Date Range Support**: Updated `dateRegex` to accurately identify date ranges with months on both start and end dates (e.g., *Jan 2022 - Apr 2023*, *Apr 2021 - Sept 2021*).
  - **Section Boundary Isolation**: Prevented education entries (e.g., *Diploma 3 2018 - 2021*) from inadvertently spilling into work experience lists.
  - **Training & Certification Recognition**: Expanded section header detection to recognize *Professional Training*, *Pelatihan*, *Courses*, and *Kursus*.
  - **Modern Skills Taxonomy**: Added modern technology keywords, including *Laravel*, *Next.js*, *Nuxt.js*, *NestJS*, *Figma*, *UI/UX*, *System Analysis*, *BPMN*, *ERD*, and *Supabase*.

### 🚀 Enhancements
- **Gemini AI Smart Job Extraction**:
  - Implemented AI-powered job content extraction using Google Gemini reasoning models (`GeminiClientService.extractJobWithAI`).
  - Ingests the page's full visual text content (`innerText` and main containers) without relying on fragile CSS class names or frequently changing DOM structures on modern job portals like Jobstreet / SEEK.
  - **Automatic AI Fallback**: When quick DOM scraping detects incomplete or missing job descriptions, the system automatically falls back to invoking Gemini AI to intelligently parse the page.
  - **Dedicated UI Buttons**: Added a *"✨ Ekstrak AI"* button alongside *"Ekstrak Halaman"* in the Side Panel, as well as an *"Ekstrak Cerdas AI ✨"* button in the job description field.
  - **Extraction Method Transparency Badge**: Displays the extraction method status (*AI Extracted* or *DOM Scraper*) on the job preview card.
- **Logical Thinking Models Exclusive Filter**:
  - Filtered the model list from `ModelService.ListModels` to only display Gemini logical reasoning models supporting structured text generation (`generateContent`).
  - Filtered out and blocked all non-text reasoning models: image generation (*Imagen*), video generation (*Veo*), speech synthesis (*TTS/Audio/Speech*), and embeddings.
  - Tagged advanced reasoning models (*Thinking Models*) with a visual `🧠 [Thinking]` badge and prioritized them at the top of the settings dropdown.
  - Updated fallback model options in the Settings UI to: `Gemini 2.0 Flash`, `Gemini 2.0 Flash Thinking`, `Gemini 2.5 Flash`, `Gemini 2.5 Pro`, `Gemini 1.5 Pro`, and `Gemini 1.5 Flash`.
- **UI Version Indicator**:
  - Added a subtle `v1.0.1` version badge to the Side Panel header.

### 🛡️ Privacy & Data Security
- **Comprehensive Demo Mode Anonymization (Neutral Persona: Test User)**:
  - Updated all mock data across simulated Google Workspace authentication (`GoogleAuthService`), initial manual CV inputs, and sample CV content to a neutral standard testing persona: **Test User** (`test.user@example.com`).
  - Updated the mock Google Drive catalog (`DEMO_DRIVE_FILES`) to `Test_User_Resume_2026.pdf` to eliminate any personal or real-world names.
  - Removed hardcoded personal name checks in simulated email draft generation (`EmailGeneratorService`), replacing them with dynamic candidate name extraction from CV documents and adaptive closing signatures.
- **Reference File Protection**:
  - Added the `reference/` directory and local PDF files to `.gitignore` to prevent personal files from being committed to public repositories.

---

## [1.0.0] - 2026-09-19

### Initial Release
- **Chrome & Edge Side Panel Manifest V3**: Responsive Vue 3 & Tailwind CSS interface featuring Analysis, Email Generator, Profile & CV, and Settings tabs.
- **Google Drive CV Memory**: Google Workspace OAuth2 authentication via `chrome.identity` with PDF and Google Docs extraction and file modification detection (*auto-sync*).
- **Active Web Job Scraper**: Real-time job extraction for LinkedIn Jobs, Glints, Jobstreet, Indeed, and independent career sites with prompt injection protection.
- **Gemini AI Match & Gap Analysis**: Grounded anti-hallucination candidate match evaluation with 0–100% relevance score, matched skills, skill gaps, and interview tips.
- **Multi-Tone & Multi-Language Email Generator**: Cover email generation in 3 distinct tones (Formal, Impact, Concise) and 3 language options (Indonesian, English, Auto) with iterative prompt refinement.
- **Dual Gmail Dispatch**: Gmail integration supporting draft saving (`users.me.drafts.create`) or direct sending (`users.me.messages.send`) via Gmail API with original PDF CV attachment options.
- **Full Demo Mode Simulation**: Comprehensive end-to-end evaluation without requiring GCP credentials or an API Key.
