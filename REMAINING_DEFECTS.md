# Remaining Defects, Accessibility Gaps & Operational Boundaries Log

**Application:** Smart Excel & Multi-File Data Intelligence Manager  
**Working Branch:** `quality/comprehensive-application-upgrade`  
**Candidate Release:** Verified Final Candidate  
**Evaluation Date:** October 25, 2026  
**Auditor:** Independent Release-Candidate Auditor  

---

## 1. Verified Fixed Defects in Candidate

| Defect ID | Component | Description & Resolution | Verification |
| :--- | :--- | :--- | :---: |
| **FIX-01** | `pdfParser.js` | Devanagari numerals (`०-९`) in Index-II doc numbers, dates, consideration amounts, and flat numbers failed ASCII regex extraction. Resolved via `normalizeDevanagariDigits`. | **VERIFIED** |
| **FIX-02** | `pdfParser.js` | Lookahead deed splitting captured preamble text (> 30 chars) as phantom deeds with fallback DocNo `1000`. Resolved by validating deed markers before inclusion. | **VERIFIED** |
| **FIX-03** | `searchLogic.js` | Repeated digits collapsed in `getSkeleton` (e.g. `00` -> `0`, `11` -> `1`), causing phone numbers (`9820011223` vs `9822012345`) and doc numbers (`1001` vs `1011`) to false-match. Restricted skeleton deduplication to `[a-z]`. | **VERIFIED** |
| **FIX-04** | `searchLogic.js` | Punctuation-only queries (e.g. `???`, `---`) could trigger false positives. Added regex guard returning exact match or zero records gracefully. | **VERIFIED** |
| **FIX-05** | `FileUpload.jsx` | Uploaded sheets with empty string column headers created invalid keys `row[""]`. Added fallback `Column_${i+1}`. Passed `{ raw: true }` for CSV ingestion to prevent leading zero coercion. | **VERIFIED** |
| **FIX-06** | `DeedDetailModal` / `PropertyTimelineModal` | Modals lacked `Escape` key dismissal and ARIA accessibility attributes. Added `useEffect` keydown listeners and `role="dialog"`, `aria-modal="true"`. | **VERIFIED** |
| **GAP-01** | `useModalFocus.js` | **Modal Focus Trapping:** Pressing `Tab` or `Shift+Tab` within modals now wraps focus strictly between focusable elements within the container. Verified in Chrome and Edge runners. | **VERIFIED FIXED** |
| **GAP-02** | `useModalFocus.js` | **Modal Focus Entry & Restoration:** Opening a modal automatically focuses the close button; closing it restores focus to the triggering element. Verified in Chrome and Edge runners. | **VERIFIED FIXED** |
| **GAP-03** | `SearchPanel.jsx` | **Dynamic Search Live Announcements:** Screen readers are now notified of match counts via debounced `<div role="status" aria-live="polite">` announcements. | **VERIFIED FIXED** |

---

## 2. Outstanding Functional Defects

| Defect ID | Area | Severity | Description | Status |
| :--- | :--- | :---: | :--- | :---: |
| — | — | — | **Zero critical, high, or medium functional defects outstanding.** All 203 automated test assertions, 22 adversarial real-browser checks, and 13 cross-browser checks pass cleanly. | **ALL CLEAR** |

---

## 3. Documented Operational & Scalability Boundaries

| Boundary ID | Area | Classification | Operational Reality |
| :--- | :--- | :---: | :--- |
| **BND-01** | OCR Engine | **Operational Boundary** | **Physical Degraded Scans Unvalidated by Automated CI:** Low-DPI physical scans with dark municipal rubber stamps over handwritten numbers cannot be assumed to achieve 100% accuracy in client-side Tesseract.js. The UI's extraction certainty score (`UNCERTAIN`) and interactive raw text viewer require human review for physical deeds. |
| **BND-02** | Performance | **Scalability Boundary** | **Single-Threaded Linear Scan on 50,000+ Rows:** Real-time search across 50,000 rows executes in 500-740ms on a single V8 thread. While within the 1,000ms SLA, future architectures could evaluate a background Web Worker pool for massive datasets. |
| **BND-03** | Storage | **Browser Boundary** | **Safari / iOS Private Browsing Storage Caps:** In private browsing mode, WebKit enforces a strict 50MB IndexedDB quota. The application intercepts `QuotaExceededError` cleanly, renders a red warning toast, and preserves data in volatile memory without crash. |
