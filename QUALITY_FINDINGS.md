# QUALITY_FINDINGS.md — Adversarial Audit Defects & Vulnerability Tracker
**Application:** Smart Excel & Multi-File Data Intelligence Manager  
**Audit Branch:** `audit/adversarial-reliability-qa`  
**Base Commit:** `73c8fb43c6d1356ccb939a56c2b9970c99f80664`  
**Date of Audit:** October 25, 2026  
**Auditor Mode:** Adversarial Quality Assurance & Security Stress Audit  

---

## Severity Summary

| Severity Level | Count Discovered | Confirmed & Remediated | Status |
| :--- | :---: | :---: | :--- |
| **P0 — Critical** (Severe exploit / data loss) | 0 | 0 | Verified |
| **P1 — High** (Formula injection / storage silent failure) | 3 | 3 | **Remediated & Verified** |
| **P2 — Medium** (Deed role gaps / ESM import error) | 2 | 2 | **Remediated & Verified** |
| **P3 — Low** (UI formatting quirks) | 0 | 0 | None observed |
| **Total Defects** | **5** | **5** | **100% Remediated** |

---

## Detailed Findings Registry

### FINDING-SEC-01: Formula Injection (CWE-1236) via Leading Whitespace, Line Feeds, and DDE Pipe Triggers
- **Severity:** **P1 — High**
- **Affected File & Functions:** [`frontend/src/App.jsx#sanitizeExportValue`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/src/App.jsx#L191)
- **Defect Description:**
  The export sanitizer regex `/^[=+\-@\t\r]/` failed to neutralize several malicious formula triggers:
  1. Formulas prefixed with leading space(s) (` =cmd|"/C calc"!A0` or `   =1+1`) which spreadsheet parsers trim before formula evaluation.
  2. Formulas prefixed with line feeds (`\n=cmd|"/C calc"!A0`) in multi-line cells.
  3. DDE command pipe execution (`|calc.exe`).
- **Reproduction Steps:**
  Run `test_security_attacks.mjs` against the unpatched sanitizer:
  ```javascript
  sanitizeExportValue(' =cmd|"/C calc"!A0'); // Returned: " =cmd|\"/C calc\"!A0" (Unsanitized!)
  sanitizeExportValue('\n=cmd|"/C calc"!A0'); // Returned: "\n=cmd|\"/C calc\"!A0" (Unsanitized!)
  sanitizeExportValue('|calc.exe');            // Returned: "|calc.exe" (Unsanitized!)
  ```
- **Remediation Implemented:**
  Hardened `sanitizeExportValue` to:
  1. Preserve genuine numbers (`typeof === 'number'`, `-500`, `-12.34`) without conversion.
  2. Trim leading whitespace, BOM (`\uFEFF`), and non-breaking spaces (`\xA0`) before testing formula triggers.
  3. Expand trigger set to include line feeds (`\n`), pipes (`|`), and percent signs (`%`): `/^[=+\-@\t\r\n|%]/.test(trimmed)`.
- **Regression Verification:** Verified in [`test_adversarial_regression.js`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/test_adversarial_regression.js#L35-L65) (Pass 100%).

---

### FINDING-SEC-02: Malicious CSV & Excel Column Header Injection on Export
- **Severity:** **P1 — High**
- **Affected File & Functions:** [`frontend/src/App.jsx#handleExportCSV`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/src/App.jsx#L246) and `handleExportExcel`
- **Defect Description:**
  In `handleExportCSV`, column header names were exported raw using `headers.join(',')`. In `handleExportExcel`, property names of `cleanRows` served as the keys passed to `json_to_sheet`. If an uploaded malicious CSV or Excel workbook contained a column named `=cmd|...` or `=HYPERLINK(...)`, the resulting export contained an executable formula in row 1 without sanitization.
- **Reproduction Steps:**
  Export a dataset where `headers = ['=cmd|"/C calc"!A0', 'ValidColumn']`.
  CSV row 1 produced: `=cmd|"/C calc"!A0,ValidColumn`.
- **Remediation Implemented:**
  In `handleExportCSV`:
  ```javascript
  const rows = [rawHeaders.map(h => `"${String(sanitizeExportValue(h)).replace(/"/g, '""')}"`).join(',')];
  ```
  In `handleExportExcel`:
  ```javascript
  cleanObj[sanitizeExportValue(k)] = sanitizeExportValue(row[k]);
  ```
- **Regression Verification:** Verified in [`test_adversarial_regression.js`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/test_adversarial_regression.js#L75-L82).

---

### FINDING-STOR-01: False Success Confirmation on IndexedDB Workspace Persistence Failure
- **Severity:** **P1 — High**
- **Affected File & Functions:** [`frontend/src/App.jsx#handleManualSave`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/src/App.jsx#L71-L79)
- **Defect Description:**
  `handleManualSave` displayed `setSaveToast('✓ Session saved')` unconditionally without checking whether `saveWorkspace(...)` returned `false` (e.g. when quota is exceeded, database is blocked, or user is in private browsing mode). This misled users into believing their records were persisted when storage actually failed.
- **Reproduction Steps:**
  Simulate `saveWorkspace` returning `false`. `handleManualSave` still rendered `✓ Session saved`.
- **Remediation Implemented:**
  ```javascript
  const success = await saveWorkspace({ masterData, fileMeta, stagedData });
  setIsSavingWorkspace(false);
  if (success) {
    setSaveToast('✓ Session saved');
    setTimeout(() => setSaveToast(''), 3000);
  } else {
    setSaveToast('⚠️ Storage restricted / quota full');
    setTimeout(() => setSaveToast(''), 4000);
  }
  ```
- **Regression Verification:** Verified in manual mock inspection and code flow analysis.

---

### FINDING-LEGAL-01: Incomplete Maharashtra Deed Role Classification Skewing Property CAGR
- **Severity:** **P2 — Medium**
- **Affected File & Functions:** [`frontend/src/utils/propertyTimeline.js#getPartyRoleLabels`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/src/utils/propertyTimeline.js#L67-L95)
- **Defect Description:**
  Deeds representing Partition (`वाटपपत्र`), Rectification (`दुरुस्तीपत्र`), Exchange (`अदलाबदल`), and Development Agreements (`विकास करार`) were not explicitly classified. They fell through to the default transferor/transferee mapping with `isConveyance: true`, skewing resale price appreciation and capital appreciation (CAGR) calculations on properties where family partition occurred.
- **Reproduction Steps:**
  Compile property timeline on a property with a Sale deed (₹50L), followed by Partition Deed (₹0), followed by Resale Deed (₹85L). Without classification, partition was counted as a conveyance.
- **Remediation Implemented:**
  Added explicit legal mappings:
  - Partition (`वाटपपत्र`): `Co-Sharer` $\rightarrow$ `Allottee`, `PARTITIONED WITH`, `isConveyance: false`.
  - Rectification (`दुरुस्तीपत्र`): `Executing Party` $\rightarrow$ `Claimant Party`, `RECTIFIED WITH`, `isConveyance: false`.
  - Exchange (`अदलाबदल`): `First Party` $\leftrightarrow$ `Second Party`, `EXCHANGED WITH`, `isConveyance: false`.
  - Development (`विकास करार`): `Landowner` $\rightarrow$ `Developer`, `ASSIGNED RIGHTS TO`, `isConveyance: false`.
- **Regression Verification:** Verified in [`test_adversarial_regression.js`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/test_adversarial_regression.js#L90-L150).

---

### FINDING-MOD-01: PDF.js Extensionless Subpath Resolution in Node.js ESM Test Runner
- **Severity:** **P2 — Medium**
- **Affected File & Functions:** [`frontend/src/utils/pdfParser.js#L81`](file:///C:/Users/Admin/.gemini/antigravity/scratch/excel-manager/frontend/src/utils/pdfParser.js#L81)
- **Defect Description:**
  `await import('pdfjs-dist/build/pdf')` failed under standard Node.js ESM execution with `ERR_MODULE_NOT_FOUND: Did you mean to import "pdfjs-dist/build/pdf.js"?`, hindering CLI test runner integration.
- **Reproduction Steps:**
  Execute `node -e "import('./src/utils/pdfParser.js')"` directly in Node.
- **Remediation Implemented:**
  Changed import target to `'pdfjs-dist/build/pdf.js'`, ensuring cross-runtime compatibility between Node.js and Vite.
- **Regression Verification:** Verified by executing `test_fuzz_ingestion.mjs` cleanly in Node.js.
