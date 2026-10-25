# Post-Release Adversarial Browser QA & Production Reliability Audit Report

**Application:** Smart Excel & Multi-File Data Intelligence Manager  
**Repository:** https://github.com/utkarshnikhare.github.io/excel-manager (https://github.com/utkarshnikhare/excel-manager)  
**Production URL:** https://utkarshnikhare.github.io/excel-manager/  
**Production Baseline Commit:** `7a95548179bb63b52a70dc8b46c0889fc184463d` (`7a95548`)  
**Audit Branch:** `audit/post-release-adversarial-browser-qa`  
**Execution Environment:** Windows 10/11, Google Chrome (`C:\Program Files\Google\Chrome\Application\chrome.exe`), Node.js v22.23.2, Puppeteer-Core  
**Audit Date:** 2026-10-25  

---

## 1. Executive Summary

Following the authorized release of commit `7a95548` to production, an independent adversarial browser quality audit was executed.

Rather than relying solely on Node.js unit tests or synthetic in-memory assertions, this audit executed automated real-browser testing using installed Google Chrome through the Chrome DevTools Protocol (CDP). Both the live production deployment and a local production build preview were evaluated across seven core test areas:
1. **Area A: Visible Browser UI, Viewports & Responsive Layout**
2. **Area B: Security, XSS Defense & In-Browser Formula Sanitization**
3. **Area C: Data Integrity, IndexedDB Persistence & Quota Defense**
4. **Area D: Property Chain-of-Title, Non-Conveyance Role Disambiguation & Financial Appreciation**
5. **Area E: PDF/OCR Parsing Resilience & Corrupt Stream Handling**
6. **Area F: Privacy, Network Traffic Isolation & Zero-CDN Architecture**
7. **Area G: Browser Performance, V8 Heap Memory & DOM Scalability**

### Key Findings & Outcome
- **Vulnerabilities Previously Remediated (Verified Intact):**
  - Formula Injection (CWE-1236) remains completely blocked across all column headers and cell values (`=`, `+`, `-`, `@`, `|`, `%`, whitespace prefixes, DDE payloads) while preserving valid negative numbers and phone numbers.
  - DOM/Reflected XSS remains neutralized via strict text-node rendering.
  - Corrupted PDF binary streams are caught gracefully without React application crashes.
- **Defects Discovered in Live Production Baseline (`7a95548`):**
  1. `DEFECT-PRIV-01` (Severity: P2 — Medium): Outbound network calls to Google Fonts CDN (`fonts.googleapis.com` & `fonts.gstatic.com`) triggered by an `@import` in `src/App.css`, violating the air-gapped Zero-CDN privacy design.
  2. `DEFECT-UI-01` (Severity: P2 — Medium): The Property Timeline modal omitted rendering the calculated Capital Appreciation (+70%) and CAGR (9.78%) cards in the DOM.
  3. `DEFECT-UI-02` (Severity: P3 — Low): IndexedDB storage quota exhaustion warning toast was styled with hardcoded green (`#16a34a`) instead of warning/error red.
- **Remediation & Current Audit Status:**
  - All three defects were fixed on branch `audit/post-release-adversarial-browser-qa`.
  - Automated unit and integration regression suite: **135 / 135 passed (100%)**.
  - ESLint: **0 errors, 0 warnings**.
  - Vite production bundle: Built cleanly in **803 ms**.
  - Real Google Chrome E2E adversarial suite: **22 / 22 passed (100%)**, zero external network requests, zero uncaught console errors, and 8.77 MB V8 heap footprint.

---

## 2. Pre-Audit Verification & Production Baseline

Prior to beginning this audit, the live environment was inspected:
- **Git HEAD on `main`:** `7a95548179bb63b52a70dc8b46c0889fc184463d`
- **Remote `origin/main`:** In sync with `7a95548`
- **GitHub Pages Deployed Assets:** Verified HTTP 200 on all 12 core assets:
  - `index.html` (HTTP 200)
  - `assets/index-r737a-Mj.js` (HTTP 200)
  - `assets/index-DmsB97n8.css` (HTTP 200)
  - `assets/xlsx-Bme4aJTu.js` (HTTP 200)
  - `assets/pdf-CsDPCop8.js` (HTTP 200)
  - `pdf.worker.min.js` (HTTP 200)
  - `tesseract/tesseract-worker.min.js` (HTTP 200)
  - `tesseract/tesseract-core-simd-lstm.wasm.js` (HTTP 200)
  - `tesseract/tesseract-core-lstm.wasm.js` (HTTP 200)
  - `tesseract/tessdata/mar.traineddata.gz` (HTTP 200)
  - `tesseract/tessdata/eng.traineddata.gz` (HTTP 200)
  - `tesseract/tessdata/osd.traineddata.gz` (HTTP 200)

All audit experiments, synthetic datasets, and code fixes were kept strictly isolated on branch `audit/post-release-adversarial-browser-qa`. Neither `main` nor `origin/main` has been modified during this audit.

---

## 3. Discovered Defects, Root Cause Analysis & Remediations

### Defect 1: DEFECT-PRIV-01 — External Font Requests Violating Zero-CDN Privacy
- **Severity:** P2 (Medium)
- **Symptom:** Opening the deployed application triggered 10 HTTP requests to external domains (`fonts.googleapis.com` and `fonts.gstatic.com`).
- **Root Cause:**
  `frontend/src/App.css` began with:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  ```
- **Remediation:**
  Removed the `@import` statement and updated the root font stack to use zero-network native system fonts:
  ```css
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  ```
- **Empirical Validation:**
  Network monitoring in Google Chrome recorded **0 external requests** across all operations (`ZERO_EXTERNAL_NET: PASS`).

### Defect 2: DEFECT-UI-01 — Property Timeline Modal Omits Growth & Appreciation Cards
- **Severity:** P2 (Medium)
- **Symptom:** Although `propertyTimeline.js` correctly computed `priceAppreciationPct` (+70%) and `cagrPct` (9.78% p.a.), the timeline modal only displayed consideration and stamp duty cards.
- **Root Cause:**
  `frontend/src/components/PropertyTimelineModal.jsx` lacked the JSX container to render the calculated growth metrics.
- **Remediation:**
  Added the "Growth & Capital Appreciation Metrics" card container to `PropertyTimelineModal.jsx`, rendering:
  - Capital Appreciation (+X% or -X%) with initial and latest conveyance prices.
  - Annualized Return (CAGR % p.a.) across verified sale transfers.
- **Empirical Validation:**
  Verified in Google Chrome against `synthetic_property_deeds.xlsx` containing a 2015 sale (₹50L) and a 2021 resale (₹85L). DOM inspection confirmed the presence of `+70%` and CAGR metrics (`TIMELINE_FINANCIAL: PASS`).

### Defect 3: DEFECT-UI-02 — Storage Quota Warning Toast Rendered in Green
- **Severity:** P3 (Low)
- **Symptom:** When IndexedDB quota was exceeded, the warning message `⚠️ Storage restricted / quota full` was displayed in green (`rgb(22, 163, 74)`).
- **Root Cause:**
  `frontend/src/App.jsx#L395` had hardcoded `color: '#16a34a'` on the toast span.
- **Remediation:**
  Updated the toast style to dynamically apply `#dc2626` (red) when `saveToast.includes('⚠️')`.
- **Empirical Validation:**
  Verified under simulated `QuotaExceededError`. The toast message was captured with `color: rgb(220, 38, 38)` (`QUOTA_HANDLING: PASS`).

---

## 4. Operational Boundaries & Real-World Caveats

As part of this rigorous audit, two critical operational boundaries must be made explicit:

### Boundary 1: Physical Maharashtra Registration Deed OCR Accuracy
- **Status:** **OPERATIONALLY UNVALIDATED FOR PHYSICAL PAPER SCANS**
- **Detail:** While the application successfully parses digital Index-II PDFs and synthetic/clean high-resolution images, real-world physical Maharashtra government deeds frequently feature low-DPI scans (100–150 DPI), creased paper, heavy watermarks, and broken Devanagari ligatures.
- **Safeguard in Place:** The application surfaces a prominent advisory badge warning users that OCR on scanned documents must be independently verified against physical records.

### Boundary 2: First-Visit Cold Offline Capability
- **Status:** **REQUIRES INITIAL ASSET DOWNLOAD**
- **Detail:** For complete offline functionality, the user must load the application at least once while connected to the internet so that the browser can cache the WASM binaries and language models (`mar.traineddata.gz`, `eng.traineddata.gz`). Subsequent visits function 100% offline.

---

## 5. Automated Regression Test Suite Status

The automated test suite in `frontend/package.json` was executed with all regression additions:

| Test File | Description | Tests Run | Result |
| :--- | :--- | :---: | :---: |
| `test_suite.js` | Transliteration, Phonetic Equivalence, Property Parser, Multi-Deed PDF | 36 | 36/36 Passed |
| `test_full_app_audit.js` | Exact/Smart Search, AND/OR logic, Schema Purity, 10k Scale Benchmark | 24 | 24/24 Passed |
| `test_hardening_audit.js` | Negative numbers, OCR asset checks, CSV quoting, Memory leak limits | 26 | 26/26 Passed |
| `test_master_implementation.js` | Search modes, XSS sanitization, IndexedDB interface, OCR architecture | 27 | 27/27 Passed |
| `test_adversarial_regression.js` | Formula injection (CWE-1236), deed roles, corrupt PDF, zero fonts, CAGR | 22 | 22/22 Passed |
| **TOTAL** | **Comprehensive Automated Quality Gate** | **135** | **135/135 Passed (100%)** |

---

## 6. Real-Browser Performance & Memory Profile

Captured via Chrome DevTools Protocol (`page.metrics()`) during active testing:

```
Browser Performance & Memory Profile:
  JS Heap Used:       8.77 MB
  JS Heap Total:     11.00 MB
  DOM Nodes:         5,498
  Active Listeners:  1,670
  Layout Duration:   112 ms
  Script Duration:   482 ms
  Console Errors:    0
  External Requests: 0
```

---

## 7. Current Git State & Safety Confirmation

- **Active Branch:** `audit/post-release-adversarial-browser-qa`
- **Base Commit:** `7a95548179bb63b52a70dc8b46c0889fc184463d`
- **Modified Files:**
  - `frontend/package.json` (added `puppeteer-core`)
  - `frontend/package-lock.json`
  - `frontend/src/App.css` (removed Google Fonts `@import`, system font fallback)
  - `frontend/src/App.jsx` (dynamic red styling on storage quota warning toast)
  - `frontend/src/components/PropertyTimelineModal.jsx` (added Capital Appreciation & CAGR UI cards)
  - `frontend/test_adversarial_regression.js` (added 3 regression tests)
- **New Audit Assets:**
  - `frontend/run_real_browser_e2e_adversarial.mjs` (repeatable Puppeteer E2E adversarial test runner)
  - `frontend/qa_artifacts/` (synthetic deeds, adversarial datasets, corrupt PDF, and 14 captured screenshots)
  - `POST_RELEASE_QA_REPORT.md` (this report)
  - `SECURITY_FINDINGS.md` (comprehensive defect & security vulnerability report)
  - `BROWSER_TEST_MATRIX.md` (detailed 22-test adversarial browser matrix)
- **Production Safety:**
  - `main` branch has NOT been modified.
  - `origin/main` has NOT been pushed to.
  - Production deployment at `https://utkarshnikhare.github.io/excel-manager/` remains untouched.
