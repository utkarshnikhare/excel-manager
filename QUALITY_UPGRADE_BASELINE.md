# Quality Upgrade Baseline & Starting State Assessment

**Project:** Smart Excel & Multi-File Data Intelligence Manager  
**Baseline Production Commit:** `e0bc533e930391ceba45854e7658e04c14b4a8bf`  
**Working Branch:** `quality/comprehensive-application-upgrade`  
**Deployment URL:** https://utkarshnikhare.github.io/excel-manager/  
**Assessment Date:** 2026-10-25  
**Evaluation Environment:** Windows 10/11, Node.js v22.23.2, Google Chrome 141 (CDP / `puppeteer-core`), React 19, Vite 8  

---

## 1. Verified Starting State

1. **Repository Synchronization:**
   - Local `main`: `e0bc533e930391ceba45854e7658e04c14b4a8bf`
   - Remote `origin/main`: `e0bc533e930391ceba45854e7658e04c14b4a8bf`
   - GitHub Pages `gh-pages`: Commit `2048ae7` (delivering bundle `index-DWgbF0FO.js` & `index-zE_MClZq.css`)
2. **Current Baseline Quality Gates:**
   - Automated test suites: **138 / 138 passing (100%)**
   - ESLint: **0 errors, 0 warnings**
   - Vite production build: **Clean build in 685 ms**
   - Real-browser adversarial suite: **22 / 22 passing (100%)**
   - External network calls: **0** (100% self-contained air-gapped architecture)
3. **Architecture Overview:**
   - **Frontend UI:** React 19 single-page application with modular functional components (`FileUpload`, `SearchPanel`, `DataTable`, `PropertyTimelineModal`, `DeedDetailModal`, `KPIDashboard`).
   - **Spreadsheet Ingestion:** SheetJS (`xlsx`) client-side in-memory parsing for `.xlsx`, `.xls`, and `.csv`.
   - **Document PDF Engine:** Mozilla PDF.js (`pdfjs-dist`) Web Worker extracting selectable text streams from Index-II digital deeds.
   - **OCR Subsystem:** Tesseract.js WASM runtime with locally stored language models (`mar.traineddata.gz`, `eng.traineddata.gz`) for Marathi and English document image OCR.
   - **Data Normalization & Property Logic:** `propertyParser.js` and `propertyTimeline.js` compiling chain-of-title histories and financial metrics.
   - **Multilingual Search:** `searchLogic.js` with cross-script Devanagari-Latin phonetic transliteration, skeleton indexing, and multi-condition filtering.

---

## 2. Explicitly Excluded Workstreams (Strict Scope Boundaries)

In accordance with master project directives, the following three workstreams are strictly isolated and preserved without modification:

1. **EXCLUSION A — Local Storage and Recovery:**
   - Preserved files: `frontend/src/utils/workspaceStorage.js` (`saveWorkspace`, `loadWorkspace`, `clearWorkspace`, `openDatabase`) and related persistence state in `App.jsx`.
   - Boundary: No storage redesigns, schema alterations, or replacement of browser IndexedDB mechanisms.
2. **EXCLUSION B — Offline First-Use Experience:**
   - Preserved paths: `public/tesseract/*`, `public/pdf.worker.min.js`, and existing initial asset fetching URLs (`/excel-manager/tesseract/...`).
   - Boundary: No service workers, PWA manifests, or new caching layers. The requirement for an initial online asset download on cold first-visit remains documented and preserved.
3. **EXCLUSION C — Security and Privacy Assurance Workstream:**
   - Preserved implementations: Formula injection (CWE-1236) sanitizers (`sanitizeExportValueHardened`, export quotes), XSS sanitization, zero-CDN system font stack, and origin confinement.
   - Boundary: Existing security and privacy controls remain locked and verified via regression tests without architectural redesigns.

---

## 3. Comprehensive Weakness & Opportunity Analysis

Across the in-scope workstreams, the following weaknesses and upgrade targets have been identified:

### Area A: OCR & Document Extraction Accuracy
- **Current Limitation:** When a PDF is uploaded, if selectable text extraction yields sparse or noisy characters, the application does not have a formal heuristic to differentiate between complete selectable digital text, hybrid documents (digital cover + scanned annexures), and pure bitmap scans.
- **Field Certainty Gap:** Extracted fields (registration number, dates, consideration, party names) are displayed without an explicit certainty/confidence indicator or extracted status flag.
- **Inspection Gap:** Users currently cannot view the raw extracted text side-by-side with the structured parsed record to independently verify parsing accuracy.
- **Marathi Numerals & Complex Ligatures:** Devanagari numerals (०-९) in Marathi documents sometimes appear in currency strings or date formats (`१५/०१/२०२४`) and require robust normalization.

### Area B: Multilingual Search Quality
- **Exact vs Fuzzy Semantics:** In Person Search, smart search matches first and last name, but users need clear visual feedback when an exact match filter is active versus phonetic transliteration.
- **Diacritics & Whitespace:** Leading/trailing Unicode whitespace (`\uFEFF`, `\xA0`) and Devanagari punctuation (danda `।`, double danda `॥`) should be gracefully handled without altering underlying stored values.
- **Leading Zeros Preservation:** Numeric identifiers with leading zeros (e.g. registration `00123`, telephone `09820011223`) must never be cast to floating point numbers.
- **Empty States:** The search panel needs a clear, informative empty-results state providing actionable query adjustment suggestions.

### Area C: Data Ingestion & Format Compatibility
- **Header Normalization:** Multiple blank headers, trailing empty columns, or duplicate headers (e.g. two columns named `"Status"`) must be disambiguated deterministically (`Status`, `Status_1`) without throwing errors or discarding data.
- **Type Coercion Safeguards:** Auto-detecting dates from Excel numeric serials (e.g. `44927` $\rightarrow$ `2023-01-01`) while ensuring phone numbers and numeric document IDs are not accidentally coerced to date formats.
- **Multi-Sheet Selection:** Ensure smooth UX when switching between different worksheets in multi-sheet workbooks.

### Area D: Property Timeline & Financial Correctness
- **Edge-Case Date Chronology:** Verify that deeds with identical registration dates are sorted deterministically, leap-year date intervals are accurately measured, and non-conveyance deeds (Partition, Rectification, Mortgage, Gift, Release) are clearly annotated with party roles without affecting consideration appreciation.
- **Presentation of Financial Basis:** When CAGR or appreciation is shown, clearly present the underlying sale pairs (e.g. Sale 2018 ₹50L $\rightarrow$ Resale 2024 ₹85L) so users understand the calculation's provenance.

### Area E: Performance, UI/UX & Accessibility
- **Large Dataset Rendering:** Ensure tables with thousands of rows don't freeze the DOM; provide optimized pagination and virtualized-style view transitions.
- **UI Consistency & Polish:** Keyboard accessibility (Escape key closing modals, visible focus rings, aria labels), refined dark/light theme contrast, and responsive viewports (320px–375px mobile dropzone and table cards).
