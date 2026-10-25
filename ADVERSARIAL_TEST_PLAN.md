# ADVERSARIAL_TEST_PLAN.md — Comprehensive Adversarial & Reliability Test Suite
**Application:** Smart Excel & Multi-File Data Intelligence Manager  
**Target Environment:** Local Node.js + Playwright / Headless Browser + Production Build  
**Status:** READY FOR EXECUTION  

---

## 1. Scope & Test Objectives
To stress-test, fuzz, attack, and audit every critical workflow in the application to uncover:
- File ingestion crashes and memory exhaustion.
- Formula injection vulnerabilities (CWE-1236) on XLSX/CSV export.
- Stored/reflected XSS through untrusted file contents and OCR output.
- Multilingual and Devanagari search false positives and false negatives.
- Property title merging defects (wing, survey, society conflation).
- OCR failures, worker memory leaks, and Devanagari character recognition edge cases.
- Multi-session concurrency bottlenecks and resource starvation under simulated load.

---

## 2. Test Matrix by Phase

| Phase / Suite | Attack / Adversarial Scenario | Tool / Execution Method | Expected Result | Pass Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **P1: File Ingestion Fuzzing** | Corrupt ZIP container (XLSX), zero-byte files, truncated CSV, huge single row (1MB line), binary masquerading as CSV, corrupt PDF cross-reference table. | Automated fuzz script (`test_fuzz_ingestion.mjs`) | Graceful error card; zero uncaught exceptions; already loaded files remain intact. | App remains functional; error message accurately identifies corrupt file. |
| **P2: CWE-1236 Formula Injection** | Cells starting with `=`, `@`, `+`, `-`, `\t`, `\r\n`, `=HYPERLINK`, `=WEBSERVICE`, with leading spaces/control chars. Legitimate negative numbers (`-500`, `-12.5`). | Automated export analyzer (`test_formula_injection.mjs`) | Text formulas prepended with `'`; numbers remain pure numeric. | Re-imported Excel file does not trigger formula execution in Excel/Calc. |
| **P3: XSS & Unsafe Rendering** | Filenames, party names, flat numbers, and OCR text containing `<script>`, `<img src=x onerror=alert(1)>`, `"><svg onload=alert(1)>`. | React component renderer & DOM scanner (`test_xss_safety.mjs`) | Inert text rendering; zero `dangerouslySetInnerHTML` occurrences on untrusted input; zero script executions. | HTML tags rendered as harmless text string literals. |
| **P4: Search Accuracy & False Positives** | Strict vs Smart search on Marathi names, conjunct consonants (`क्ष`, `ज्ञ`), Devanagari vs Arabic numerals, delimiter-separated identifiers (`A-102` vs `A102`), phone numbers with leading zeros. | Automated search test suite (`test_search_adversarial.mjs`) | Strict mode returns only exact matches; smart mode handles phonetic variants; zero false positives on unrelated substrings. | 100% precision on ground-truth queries; explainable results. |
| **P5: Property Timeline Integrity** | Wings A & B with same flat 504; Survey 42 vs Survey 99; Gift deed (₹0) after ₹80L sale; missing dates; resale continuity breaks; cross-file duplicates with different filenames. | Property timeline suite (`test_timeline_adversarial.mjs`) | Disjoint wings & surveys separated; Gift excluded from CAGR; missing date flagged; cross-file duplicates merged with both filenames preserved. | Zero improper property merges; accurate financial metrics. |
| **P6: OCR WASM & Scanned PDF** | Clean printed Marathi, distorted text, 10+ page scanned PDF, cancellation midway, corrupted WASM/model fallback, Devanagari conjuncts. | Tesseract runner (`test_ocr_adversarial.mjs`) | Scanned PDFs capped at 10 pages; worker terminates cleanly; fallback advisory card on low confidence; zero unhandled rejections. | Worker terminated without orphan processes; confidence score attached. |
| **P7: Concurrency Simulation** | 1, 5, 10, 25, 50 simulated concurrent browser sessions uploading datasets, searching, and exporting. | Node multi-context concurrency runner (`test_concurrency_stress.mjs`) | Per-session memory isolation; static assets served from cache; zero data crossover between sessions. | System CPU/RAM telemetry logged; maximum viable concurrency reported. |
| **P8: Scale & Memory Leak Benchmark** | 10k, 25k, 50k row datasets; wide worksheets (50 columns); repeated search cycles; memory before/during/after. | Heap profiler benchmark (`test_scale_memory.mjs`) | Heap usage scales sub-linearly; garbage collection reclaims memory upon file deletion. | Heap retained < 150 MB for 10k rows; zero memory growth across search loops. |
| **P9: Storage Quota & Failure Recovery** | Simulated IndexedDB quota exceeded; corrupted workspace payload; refresh during save. | Storage failure test (`test_storage_recovery.mjs`) | Explicit quota error notification; current in-memory state preserved. | Zero silent failures; user alerted to storage issue. |
| **P10: Mobile & Accessibility Surface** | Viewport down to 320px width; long Marathi names; touch targets; ARIA labels. | CSS layout & DOM inspector | No horizontal screen overflow; modal dialogs dismissible via ESC/close button. | 100% accessible buttons & inputs; responsive layout. |
