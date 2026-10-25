# Security & Privacy Vulnerability Findings — Post-Release Adversarial Browser QA

**Project:** Smart Excel & Multi-File Data Intelligence Manager  
**Production URL:** https://utkarshnikhare.github.io/excel-manager/  
**Production Baseline Commit:** `7a95548179bb63b52a70dc8b46c0889fc184463d`  
**Audit Branch:** `audit/post-release-adversarial-browser-qa`  
**Auditor:** Skeptical Principal Software Architect & Adversarial QA Engineer  
**Date:** 2026-10-25  

---

## Executive Summary

Following the deployment of release commit `7a95548`, an adversarial quality and security audit was executed using real Google Chrome automation (`puppeteer-core`) directly against the live GitHub Pages production deployment as well as local production-build previews.

The audit verified that previous high-severity attack vectors remain completely neutralized:
1. **CWE-1236 Formula Injection:** Neutralized across all column headers and cell values (`=`, `+`, `-`, `@`, `|`, `%`, whitespace prefixes, DDE payloads) while preserving valid negative numbers and phone numbers.
2. **DOM / Reflected XSS:** Neutralized across data cells and headers; malicious `<script>` and `<img>` error payloads are sanitized and treated as harmless plain text.
3. **Data Spill via File Export:** Clean rows generation properly quotes and neutralizes CSV and XLSX cell formulas.

However, real browser network inspection and component validation uncovered **three defects**, categorized below:
- **1 Privacy Leak (Severity: P2 - Medium)**: Outbound third-party network requests to Google Fonts violating the air-gapped Zero-CDN architecture.
- **1 Functional Omission (Severity: P2 - Medium)**: Property Timeline modal omitted rendering the calculated Capital Appreciation (+70%) and CAGR (9.78%) metric cards.
- **1 Visual Feedback Bug (Severity: P3 - Low)**: IndexedDB storage quota exhaustion warning toast rendered in green (`#16a34a`) instead of error red (`#dc2626`).

All three defects have been remediated, verified in real Chrome browser runs (100% pass rate across 22 test cases), and backed by automated regression tests (135/135 passing).

---

## Detailed Vulnerability & Defect Inventory

### DEFECT-PRIV-01: Third-Party Network Requests Leaking Client Metadata to Google Fonts CDN
- **Vulnerability Type:** Information Disclosure / Architectural Privacy Violation (CWE-200 / CWE-359)
- **Severity:** P2 (Medium)
- **Discovered In:** Production live deployment (`https://utkarshnikhare.github.io/excel-manager/`)
- **Root Cause:**
  Line 1 of `frontend/src/App.css` contained an external font import:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  ```
- **Observed Browser Telemetry:**
  During initial page load and stylesheet parsing, Google Chrome made 10 outbound HTTP/HTTPS requests to:
  - `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`
  - `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2`
  - `https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa25L7SUc.woff2`
- **Security & Privacy Impact:**
  While zero user document data or Excel contents were transmitted, the user's IP address, browser User-Agent, referer, and timestamp were transmitted to Google's CDN servers. This violates the core design principle that the application must be 100% self-contained, air-gappable, and free of external runtime CDN dependencies.
- **Remediation Implemented:**
  Removed the `@import` declaration from `frontend/src/App.css` and configured high-performance native system font fallbacks:
  ```css
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  ```
- **Verification Result:**
  Re-tested in Google Chrome via `run_real_browser_e2e_adversarial.mjs`. Total external network requests dropped from 10 to **0**. 100% of all network operations are now confined strictly to the application origin (`ZERO_EXTERNAL_NET: PASS`).

---

### DEFECT-UI-01: Property Timeline Modal Omits Growth & Appreciation Metrics
- **Defect Type:** Functional Omission / Incomplete Feature Integration
- **Severity:** P2 (Medium)
- **Discovered In:** Production live deployment (`https://utkarshnikhare.github.io/excel-manager/`)
- **Root Cause:**
  In `frontend/src/utils/propertyTimeline.js`, the core algorithm correctly calculated:
  - `initialPrice`: Initial registered conveyance price (e.g., ₹ 50,00,000)
  - `latestPrice`: Latest registered resale price (e.g., ₹ 85,00,000)
  - `priceAppreciationPct`: +70%
  - `cagrPct`: 9.78% p.a.
  However, in `frontend/src/components/PropertyTimelineModal.jsx`, only Total Registered Consideration and Total Stamp Duty Paid cards were rendered. The appreciation and CAGR cards were never placed in the JSX.
- **User Impact:**
  Users evaluating title chains could see the individual deeds and totals, but were deprived of the automated capital appreciation percentage and annualized return (CAGR) calculation.
- **Remediation Implemented:**
  Integrated a dedicated "Growth & Capital Appreciation Metrics" container in `frontend/src/components/PropertyTimelineModal.jsx` rendering:
  - Capital Appreciation (+X% or -X%) with starting and ending prices (`formatINR(initialPrice) → formatINR(latestPrice)`).
  - Annualized Return (CAGR % p.a.) across verified sale transfers when `cagrPct > 0`.
- **Verification Result:**
  Verified in Google Chrome (`run_real_browser_e2e_adversarial.mjs`). Real DOM inspection confirmed the presence of `+70%` appreciation and annualized return (`TIMELINE_FINANCIAL: PASS`).

---

### DEFECT-UI-02: Storage Quota Failure Toast Rendered in Success Green
- **Defect Type:** Misleading User Feedback / Accessibility Violation
- **Severity:** P3 (Low)
- **Discovered In:** Production live deployment (`https://utkarshnikhare.github.io/excel-manager/`)
- **Root Cause:**
  In `frontend/src/App.jsx#L395`:
  ```jsx
  {saveToast && (
    <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 700 }}>
      {saveToast}
    </span>
  )}
  ```
  The color `#16a34a` (green) was hardcoded for all toast messages. When IndexedDB threw a `QuotaExceededError`, the toast text was `⚠️ Storage restricted / quota full`, but it was rendered with green text (`rgb(22, 163, 74)`).
- **User Impact:**
  Users experiencing browser storage exhaustion could mistake the green toast for a successful session save, leading to false confidence that their data was saved.
- **Remediation Implemented:**
  Updated toast styling to dynamically evaluate warning/error states:
  ```jsx
  {saveToast && (
    <span style={{
      fontSize: '0.78rem',
      color: saveToast.includes('⚠️') ? '#dc2626' : '#16a34a',
      fontWeight: 700
    }}>
      {saveToast}
    </span>
  )}
  ```
- **Verification Result:**
  Verified in real browser under simulated `QuotaExceededError`. The toast message was captured with color `rgb(220, 38, 38)` (red) instead of green (`QUOTA_HANDLING: PASS`).

---

## Adversarial Attack Verification Matrix

| Attack / Adversarial Vector | Test Method | Live Baseline (`7a95548`) | Audit Branch (`audit/post-release...`) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CWE-1236 Formula Header Injection** (`=cmd|...`, `@SUM`) | File Export (CSV/XLSX) + Re-parse | ✅ Escaped with single quote | ✅ Escaped with single quote | Mitigated |
| **CWE-1236 Formula Cell Injection** (`=HYPERLINK`, `   =1+1`) | File Export (CSV/XLSX) + Re-parse | ✅ Escaped with single quote | ✅ Escaped with single quote | Mitigated |
| **Legitimate Negative Numeric Integrity** (`-500`, `-12.34`) | File Export + Numeric Verification | ✅ Preserved as genuine number | ✅ Preserved as genuine number | Verified |
| **Leading-Zero Text Integrity** (`00123`, `09820011223`) | File Export + String Verification | ✅ Preserved without quote | ✅ Preserved without quote | Verified |
| **Reflected / In-DOM XSS** (`<script>`, `<img onerror>`) | Real Chrome DOM Inspection | ✅ Escaped, 0 script exec | ✅ Escaped, 0 script exec | Mitigated |
| **Third-Party CDN Privacy Leaks** | Chrome DevTools Network Logging | ❌ 10 requests to Google Fonts | ✅ 0 external requests (100% air-gapped) | **Fixed** |
| **Property Financial Appreciation Metric** | Real Browser Timeline Modal | ❌ Omitted from UI cards | ✅ Rendered (+70% & CAGR) | **Fixed** |
| **Storage Quota Failure Visual Feedback** | Real Browser QuotaExceeded Mock | ❌ Warning rendered green | ✅ Warning rendered red (`#dc2626`) | **Fixed** |

---

## Remediation Status

All 3 identified issues are fully resolved on branch `audit/post-release-adversarial-browser-qa`.
Automated regression tests have been added to `test_adversarial_regression.js`, bringing the total automated test count to **135/135 passing (100%)** with clean ESLint (0 errors, 0 warnings) and clean Vite build.
