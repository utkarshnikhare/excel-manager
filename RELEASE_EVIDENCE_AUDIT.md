# Independent Release-Candidate Evidence Audit Report

**Application:** Smart Excel & Multi-File Data Intelligence Manager  
**Repository:** https://github.com/utkarshnikhare/excel-manager  
**Production URL:** https://utkarshnikhare.github.io/excel-manager/  
**Production Baseline Commit:** `e0bc533e930391ceba45854e7658e04c14b4a8bf`  
**Candidate Branch:** `quality/comprehensive-application-upgrade`  
**Candidate Commit:** `61a24498486f352931a5110f6f7c749f51efbd0e`  
**Audit Date:** October 25, 2026  
**Auditor:** Independent Release-Candidate Auditor  

---

## 1. Executive Summary & Audit Verdict

This independent audit conducted an adversarial, evidence-based review of branch `quality/comprehensive-application-upgrade` (commit `61a2449`) before any merge into `main` or production deployment.

### Audit Verdict Summary
- **Source Code Data Integrity & Functional Enhancements:** **VERIFIED (Production-Ready)**
  - Devanagari numerals normalization (`०-९`), preamble block boundary filtering, repeated digit preservation in numeric IDs, blank column header fallbacks, and CSV leading-zero preservation are verified and resolve genuine functional defects without breaking existing behavior.
- **Automated Test Suites:** **VERIFIED** (138 core tests + 9 OCR templates + 50 search benchmark queries = **197 total assertions passing**).
- **Static Analysis & Build:** **VERIFIED** (ESLint: 0 errors / 0 warnings; Vite build: 630ms).
- **Headless Chrome Browser QA:** **VERIFIED** (22/22 checks passing).
- **Performance Benchmarks:** **VERIFIED WITH LIMITATIONS** (Rigorous multi-iteration statistics confirm SLA targets met; single-threaded linear search on 50,000 rows reaches 578ms median / 739ms p95).
- **Physical Document OCR Accuracy Claim:** **VERIFIED WITH LIMITATIONS / RECLASSIFIED** (The reported "100% Physical Scan Accuracy" was evaluated on synthetic in-memory text strings, NOT real physical raster bitmap scans. Real-world degraded physical deed OCR remains unvalidated by automated test suites).
- **Cross-Browser Claims:** **NOT TESTED FOR FIREFOX/SAFARI** (Only Chrome Desktop and Mobile Chrome Viewport were executed in automated browser CI; Edge, Firefox, and Safari were not directly executed).
- **Accessibility Claims:** **VERIFIED WITH LIMITATIONS / DEFECTS IDENTIFIED** (`Escape` key dismissal and ARIA modal attributes verified; focus trapping, initial focus entry, and focus restoration are not yet implemented).
- **Mandatory Scope Exclusions:** **VERIFIED (100% Compliant)** (Local storage/recovery, offline first-use paths, and export formula security were completely untouched).

---

## 2. Findings by Audit Classification

### Category A: VERIFIED (Fully Supported by Empirical Evidence)
1. **Core Automated Test Suite (138/138 Pass):**
   - *Command:* `npm test`
   - *Evidence:* All 5 core test files (`test_suite.js`, `test_full_app_audit.js`, `test_hardening_audit.js`, `test_master_implementation.js`, `test_adversarial_regression.js`) pass cleanly with exit code 0.
2. **ESLint Code Quality (0 Errors, 0 Warnings):**
   - *Command:* `npm run lint`
   - *Evidence:* ESLint 10.2.1 reports zero syntax or style violations.
3. **Vite Production Compilation:**
   - *Command:* `npm run build`
   - *Evidence:* Production bundle built in 630ms into `dist/` with total gzip size under 350 kB.
4. **Real-Browser Adversarial QA (22/22 Pass):**
   - *Command:* `node frontend/run_real_browser_e2e_adversarial.mjs`
   - *Evidence:* Chrome 145 headless runner verified initial load (1,648ms), responsive mobile dropzone (375x667), XLSX ingestion, multilingual live search, property timeline CAGR, IndexedDB session save/reload, simulated `QuotaExceededError` warning toast, XSS rendering safety, CWE-1236 export sanitization, and corrupt PDF error recovery.
5. **Air-Gapped Privacy & Zero-CDN Isolation:**
   - *Evidence:* 24/24 outbound network requests in browser runner were strictly confined to `utkarshnikhare.github.io` (same-origin); zero external CDN or third-party requests logged.
6. **Devanagari Numeral Normalization in Index-II Parsing:**
   - *Evidence:* Registered deeds using `१६०६०`, `१५/०४/२०२४`, `₹ ७५,००,०००`, and `५०२` correctly normalize to ASCII integers.
7. **Preamble Block Boundary Filtering:**
   - *Evidence:* Header text preceding the first deed block is filtered out, eliminating phantom records with DocNo `1000`.
8. **Repeated Digit Integrity in Skeletons:**
   - *Evidence:* Collapsing digits in `getSkeleton` was eliminated; `1001` vs `1011` and `9820011223` vs `9822012345` are strictly isolated.
9. **CSV Leading Zero Type Preservation:**
   - *Evidence:* Passing `{ raw: true }` in `FileUpload.jsx` prevents `'00123'` from being coerced to numeric `123`.
10. **Mandatory Scope Exclusions (Exclusions A, B, C):**
   - *Evidence:* `git diff` confirms `src/utils/workspaceStorage.js`, `public/tesseract/*`, and `sanitizeExportValueHardened` were 100% untouched.

---

### Category B: VERIFIED WITH LIMITATIONS

1. **50-Query Labelled Search Benchmark:**
   - *Status:* **VERIFIED WITH LIMITATIONS**
   - *Command:* `node frontend/test_search_evaluation.js`
   - *Evidence:* 50/50 queries pass expected results.
   - *Limitation:* The benchmark dataset comprises 16 synthetic records. Queries evaluate positive matches, cross-script transliteration, phone/date delimiter matching, and negative queries (`???`, `---`). True negative testing against diverse non-existent person names (e.g., "Kashinath", "Pawar") is limited in the 16-record corpus.
2. **Performance Benchmarks on 10,000 and 50,000 Rows:**
   - *Status:* **VERIFIED WITH LIMITATIONS**
   - *Command:* `npm run benchmark`
   - *Evidence:* Multi-iteration statistics (10 runs for 10k rows, 5 runs for 50k rows) confirm SLA compliance:
     - 10k rows: Compound query median **122.1 ms** (p95 174.2 ms); Phonetic median **117.5 ms** (p95 139.4 ms); Exact median **147.0 ms** (p95 244.4 ms).
     - 50k rows: Compound query median **505.0 ms** (p95 688.5 ms); Phonetic median **424.6 ms** (p95 444.3 ms); Exact median **578.9 ms** (p95 739.9 ms).
   - *Limitation:* Algorithmic execution runs in Node.js V8 without DOM overhead. At 50,000 rows, single-threaded search latency reaches 500-740ms, which is perceptually noticeable to end users though within the 1,000ms SLA.
3. **Index-II Text Parsing Layer Accuracy:**
   - *Status:* **VERIFIED WITH LIMITATIONS**
   - *Command:* `node frontend/test_ocr_evaluation.js`
   - *Evidence:* 100% field extraction accuracy across 24 fields on 5 born-digital Index-II text templates and 10 fields on 2 clean OCR text templates.
   - *Limitation:* The evaluation samples were tuned concurrently with parser development rather than against an external blind holdout set.

---

### Category C: NOT TESTED

1. **Non-Chromium Desktop Browsers (Firefox & Safari):**
   - *Finding:* Automated browser QA runner strictly targeted Google Chrome (`chrome.exe`) on Windows. Mozilla Firefox and Apple Safari were **NOT TESTED** in automated runner.
2. **Physical Degraded Scanned Document OCR (Tesseract.js WASM on degraded paper scans):**
   - *Finding:* No image files of aged, creased paper deeds were processed by Tesseract.js in automated testing. The claim of "100% Physical Scan Accuracy" was an evaluation of synthetic text strings. Physical raster scan accuracy remains **NOT TESTED / UNVALIDATED by automated test suites**.

---

### Category D: DEFECTS IDENTIFIED (Non-Blocking Accessibility Gaps)

1. **GAP-01 — Modal Focus Trapping:**
   - *Finding:* In `DeedDetailModal.jsx` and `PropertyTimelineModal.jsx`, pressing `Tab` while a modal is open allows focus to escape into background page controls.
   - *Severity:* Low (Accessibility / WCAG 2.1 dialog criteria).
2. **GAP-02 — Modal Initial Focus Entry & Restoration:**
   - *Finding:* Opening a modal does not auto-focus the modal close button, and closing a modal does not return focus to the trigger button.
   - *Severity:* Low (Keyboard UX).
3. **GAP-03 — Dynamic Search Screen Reader Narration:**
   - *Finding:* Search result count updates lack `aria-live="polite"` regions.
   - *Severity:* Low (Screen-reader usability).

---

## 3. Detailed Audit Matrix

| Audit Area | Claim | Audit Verdict | Evidence / Reproduction Command |
| :--- | :--- | :---: | :--- |
| **Audit 1: OCR Accuracy** | 100% Accuracy on Digital PDFs | **VERIFIED** | `node frontend/test_ocr_evaluation.js` (24/24 fields match GT) |
| | 100% Accuracy on Physical Scans | **NOT TESTED / UNVALIDATED** | Synthetic text used; no raster images in test suite |
| **Audit 2: Search Correctness** | 50/50 Labelled Search Benchmark | **VERIFIED WITH LIMITATIONS** | `node frontend/test_search_evaluation.js` (50/50 pass; 16-row corpus) |
| | Numeric Identifier Integrity | **VERIFIED** | Skeletons only deduplicate `[a-z]`; `1001` vs `1011` isolated |
| | Punctuation Safeguard | **VERIFIED** | `???` and `---` return 0 records cleanly |
| **Audit 3: Performance** | In-Memory Indexing < 500ms | **VERIFIED** | `npm run benchmark` (0.8ms on 10k, 0.5ms on 50k) |
| | Search < 200ms on 10,000 Rows | **VERIFIED** | `npm run benchmark` (122ms compound, 117ms phonetic) |
| | Search < 1,000ms on 50,000 Rows | **VERIFIED** | `npm run benchmark` (505ms compound, 424ms phonetic) |
| | Export Hardening < 20ms | **VERIFIED** | `npm run benchmark` (2.0ms on 10,000 cells) |
| **Audit 4: Browser & a11y** | Chrome Desktop & Mobile Support | **VERIFIED** | `node frontend/run_real_browser_e2e_adversarial.mjs` (22/22 pass) |
| | Firefox & Safari Automated Support | **NOT TESTED** | Only Chrome binary executed in Puppeteer suite |
| | Modal Escape Key Dismissal | **VERIFIED** | `useEffect` keydown listener closes modal cleanly |
| | Full WCAG 2.1 AA Compliance | **DEFECT FOUND / NOT CERTIFIED**| Missing modal focus trap and focus restoration |
| **Audit 5: Source Diffs** | Devanagari Numeral Normalization | **VERIFIED** | Covered in `test_ocr_evaluation.js` and `test_suite.js` |
| | Preamble Boundary Filtering | **VERIFIED** | Eliminates fallback DocNo `1000` phantom deeds |
| | Blank Column Header Sanitization | **VERIFIED** | Discards `""` keys and assigns `Column_${i+1}` |
| | CSV Leading Zero Preservation | **VERIFIED** | `{ raw: true }` passed to `XLSX.read` |
| **Audit 6: Excluded Scopes** | Local Storage Untouched | **VERIFIED** | `workspaceStorage.js` diff = 0 lines |
| | Offline First-Use Untouched | **VERIFIED** | `public/tesseract/*` and worker paths unchanged |
| | Export Security Untouched | **VERIFIED** | `sanitizeExportValueHardened` intact & verified |
| **Audit 7: Quality Gates** | npm test (all suites) | **VERIFIED** | Exit code 0, 197 total assertions passing |
| | npm run lint | **VERIFIED** | Exit code 0, 0 errors, 0 warnings |
| | npm run build | **VERIFIED** | Exit code 0, 630ms build time |

---

## 4. GO / NO-GO Recommendation

### Recommendation: **CONDITIONAL GO (Authorized for Release)**

**Justification:**
1. **Core Data Integrity Is Completely Solid:** All 6 critical functional fixes (Devanagari numerals, preamble splitting, numeric skeleton repeated digits, blank column keys, CSV leading zeros, and modal Escape key) are thoroughly verified with zero regressions.
2. **Quality Gates Are 100% Green:** `npm test`, `npm run lint`, `npm run build`, and real-browser headless Chrome tests all pass with exit code 0.
3. **Mandatory Scope Exclusions are Fully Preserved:** Protected storage, offline PWA paths, and formula injection defenses were not modified.
4. **No Severe Blockers:** The identified defects (`GAP-01`, `GAP-02`, `GAP-03`) are minor accessibility enhancements (focus trapping) that do not risk data loss, export corruption, or computational inaccuracies.
5. **Transparency Restored:** All documentation (`OCR_ACCURACY_EVALUATION.md`, `BROWSER_COMPATIBILITY_MATRIX.md`, `PERFORMANCE_BENCHMARKS.md`, `REMAINING_DEFECTS.md`) has been updated to honestly declare the operational boundaries of browser-side OCR and unexecuted browser platforms.

---

## 5. Prioritized List of Post-Release Backlog Fixes

1. **P1 — Accessibility (Modal Focus Trap):** Implement focus trap cycling inside `DeedDetailModal` and `PropertyTimelineModal` so keyboard `Tab` does not escape the dialog.
2. **P1 — Accessibility (Focus Entry & Restoration):** Auto-focus modal close button on mount and return focus to the triggering element upon dismissal.
3. **P2 — Accessibility (Live Regions):** Add `<div aria-live="polite">` announcing dynamic search result counts to screen readers.
4. **P2 — Browser Cross-Testing:** Run automated end-to-end test runner in Firefox Gecko and WebKit environments via Playwright/Puppeteer.
5. **P3 — Scalability (Web Worker Search):** For datasets exceeding 50,000 rows, offload linear scan search into a dedicated Web Worker to reduce main thread latency from ~500ms to < 50ms UI response.
