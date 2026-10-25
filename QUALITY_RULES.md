# QUALITY_RULES.md — Engineering, Security, Privacy & Data-Integrity Mandates
**Project:** Smart Excel & Multi-File Data Intelligence Manager  
**Scope:** Adversarial Quality Assurance, Attack Simulation, Performance & Reliability Standards  
**Status:** ACTIVE & BINDING  

---

## 1. Zero-Trust Verification & Testing Standards
1. **Evidence-Driven Claims:** Never state a test passed, a benchmark achieved a latency, or a bug was fixed unless the command was executed and the output was directly recorded.
2. **Strict Test Classification:**
   - **Unit Tests:** Pure algorithmic and function-level assertions running in Node.js.
   - **Integration Tests:** Cross-module workflows (e.g., ingest -> normalize -> search -> highlight -> export).
   - **Browser End-to-End Tests:** Real headless/GUI browser execution (DOM rendering, event dispatching, canvas/WASM workers, IndexedDB).
   - **Stress & Concurrency Tests:** Simulated independent browser profiles/tabs evaluating memory, CPU, and event loop starvation.
3. **Assertion Integrity:** Never weaken assertions, delete tests, or alter expected ground truth to force a green test suite.
4. **Failure Transparency:** All failed scenarios, timeouts, unhandled rejections, and low-confidence recognitions must be reported with full reproduction steps.

---

## 2. Privacy & Air-Gapped Client-Side Invariance
1. **Zero External Data Exfiltration:** No uploaded spreadsheet, CSV, PDF, or image file — nor any extracted metadata, party names, financial figures, or search queries — may be transmitted to external servers, cloud OCR APIs, analytics, or telemetry endpoints.
2. **Self-Hosted Runtime Assets:** All workers (`pdf.worker.min.js`, `worker.min.js`), WebAssembly binaries (`tesseract-core*.wasm`), and language models (`*.traineddata.gz`) must resolve exclusively to the application's local origin.
3. **No External Network Leaks:** CDN links (`cdnjs`, `jsdelivr`, `unpkg`, `tessdata.projectnaptha.com`) are strictly forbidden.
4. **Anonymized Testing Fixtures:** Test suites and attack payloads must never contain real user sensitive financial records, PAN/Aadhaar identifiers, or unredacted confidential deeds.

---

## 3. Data Integrity & Financial Precision
1. **Numeric & Identifier Preservation:**
   - Leading zeros in document numbers (e.g., `'00123'`) and phone numbers (`'09820011223'`) must never be stripped or coerced to integers.
   - Negative financial numbers (e.g., balance `-500`) must be preserved as valid numbers and never corrupted by formula neutralization.
2. **Formula Injection (CWE-1236) Defense:**
   - Any string cell beginning with `=`, `+`, `-`, `@`, tab (`\t`), or carriage return (`\r`) must be safely neutralized upon CSV/XLSX export using a leading apostrophe (`'`).
   - Formula defense must be applied only to text strings, without corrupting true numeric values.
3. **Deed Disambiguation & Chain-of-Title Safety:**
   - Distinct properties with identical unit numbers across different wings (e.g., Wing A Flat 504 vs Wing B Flat 504) or disjoint survey numbers (e.g., Survey 42 vs Survey 99) must NEVER be merged into a single property timeline.
   - Cross-file duplicates must retain all originating source filenames in a provenance list (`_sourceFiles`) rather than discarding audit history.
   - Nominal deeds (Gift, Release, License, POA) with consideration ₹ 0 must never corrupt or artificially reset the property's latest sale appreciation or CAGR metrics.

---

## 4. Optical Character Recognition (OCR) Ground-Truth Rules
1. **Measured Accuracy vs Assumptions:** Character Error Rate (CER), Word Error Rate (WER), and field-level extraction accuracy must only be reported when benchmarked against a verified ground-truth labelled dataset.
2. **Unvalidated Fixture Disclaimer:** In the absence of representative physical scanned government Index-II deeds (such as 150 DPI skewed paper scans), OCR capabilities on physical deeds must be explicitly categorized as **NOT OPERATIONALLY VALIDATED**.
3. **Fail-Safe UI Design:** The application must never hallucinate structured deeds from noisy or blank scans. Low-confidence recognition must produce clear, human-verifiable advisory notices.
4. **Memory & Concurrency Bounds:** Multi-page scanned PDF processing must be bounded (e.g., max 10 pages) with worker termination hooks to prevent browser tab crashes.

---

## 5. Security & Browser Hardening
1. **Cross-Site Scripting (XSS):** No untrusted file content, filename, party name, or OCR token may be rendered via `dangerouslySetInnerHTML` or raw unescaped HTML. Highlighting must use safe React components.
2. **Safe File Parsing:** Malformed ZIP archives, corrupted PDFs, huge CSV lines, and image bombs must be handled with bounded memory and structured error recovery, preserving already-loaded datasets.
3. **Storage Quota & Recovery:** IndexedDB failures (quota exceeded, private browsing restrictions, corrupted records) must be surfaced to the user with clear diagnostics and without data loss of the current in-memory state.
