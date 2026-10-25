/**
 * test_ocr_certainty_calibration.js
 * 
 * Adversarial OCR & Extraction Certainty Calibration Regression Suite.
 * Validates that confidence scores and certainty tiers ('HIGH', 'MEDIUM', 'UNCERTAIN')
 * are genuinely calibrated against missing critical fields, misleading associations,
 * and high-OCR-confidence / low-parser-completeness anomalies.
 */

import { parseIgrIndex2Text } from './src/utils/pdfParser.js';

console.log('================================================================');
console.log('🛡️ RUNNING OCR CERTAINTY CALIBRATION & ADVERSARIAL SAFEGUARDS SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Test 1: Missing Document Number (Primary Identifier Defect)
// -------------------------------------------------------------
console.log('--- TEST 1: Missing Document Number (docno) ---');
const textWithoutDocNo = `महाराष्ट्र शासन नोंदणी व मुद्रांक विभाग
नोंदणी दिनांक : 15/04/2024
दस्तऐवजाचा प्रकार : खरेदीखत
दुय्यम निबंधक : हवेली क्र. ३
मोबदला : ₹ 45,00,000
दस्तऐवज करून देणारा : श्री. रमेश जोशी
दस्तऐवज करून घेणारा : श्री. सुरेश काळे
मिळकतीचे वर्णन : फ्लॅट क्र. 302, विंग ए, समृद्धी पार्क, कोथरूड, पुणे, चटई क्षेत्र 710 चौ.फूट.`;

const [deedNoDoc] = parseIgrIndex2Text(textWithoutDocNo, 'missing_docno.pdf');
assert(deedNoDoc._fieldConfidence.docno === 'INFERRED_DEFAULT', 'Field confidence marks docno as INFERRED_DEFAULT');
assert(deedNoDoc._confidenceScore <= 65, `Confidence score penalized for missing primary key (actual: ${deedNoDoc._confidenceScore}%)`);
assert(deedNoDoc._extractionCertainty !== 'HIGH', `Extraction certainty is barred from HIGH when docno is missing (actual: ${deedNoDoc._extractionCertainty})`);

// -------------------------------------------------------------
// Test 2: Misleading Field Association (Duplicate Seller & Buyer)
// -------------------------------------------------------------
console.log('\n--- TEST 2: Misleading Field Association (Duplicate Parties) ---');
const textWithDuplicateParties = `दस्तऐवज क्र. : 4520 / 2024
नोंदणी दिनांक : 18/06/2024
दस्तऐवजाचा प्रकार : खरेदीखत
दुय्यम निबंधक : हवेली क्र. ५
मोबदला : ₹ 55,00,000
दस्तऐवज करून देणारा : श्री. रमेश विठ्ठल कुलकर्णी
दस्तऐवज करून घेणारा : श्री. रमेश विठ्ठल कुलकर्णी
मिळकतीचे वर्णन : सदनिका क्र. 404, पंचवटी संकुल, बाणेर, पुणे, क्षेत्र 800 चौ.फूट.`;

const [deedDupParties] = parseIgrIndex2Text(textWithDuplicateParties, 'duplicate_parties.pdf');
assert(deedDupParties._fieldConfidence.parties === 'SUSPICIOUS_DUPLICATE', 'Parties flagged as SUSPICIOUS_DUPLICATE when seller equals buyer');
assert(deedDupParties._confidenceScore < 80, `Score penalized for misleading duplicate party association (actual: ${deedDupParties._confidenceScore}%)`);
assert(deedDupParties._extractionCertainty !== 'HIGH', `Certainty barred from HIGH on duplicate party attribution (actual: ${deedDupParties._extractionCertainty})`);

// -------------------------------------------------------------
// Test 3: Complete Absence of Parties (Unattributed Deed)
// -------------------------------------------------------------
console.log('\n--- TEST 3: Complete Absence of Parties ---');
const textWithoutParties = `दस्तऐवज क्र. : 8821 / 2024
नोंदणी दिनांक : 02/08/2024
दस्तऐवजाचा प्रकार : खरेदीखत
दुय्यम निबंधक : हवेली क्र. ९
मोबदला : ₹ 60,00,000
मिळकतीचे वर्णन : भूखंड क्र. 15, सर्व्हे क्र. 22, वाकड, पुणे, क्षेत्र 1200 चौ.फूट.`;

const [deedNoParties] = parseIgrIndex2Text(textWithoutParties, 'no_parties.pdf');
assert(deedNoParties._fieldConfidence.parties === 'MISSING', 'Parties correctly flagged as MISSING');
assert(deedNoParties._confidenceScore <= 65, `Confidence score penalized by 35 points for missing parties (actual: ${deedNoParties._confidenceScore}%)`);
assert(deedNoParties._extractionCertainty !== 'HIGH', 'Deed without any parties cannot be HIGH certainty');

// -------------------------------------------------------------
// Test 4: Severely Degraded / Incomplete Scan Text
// -------------------------------------------------------------
console.log('\n--- TEST 4: Severely Degraded / Unreadable Values ---');
const textDegraded = `दस्तऐवज ... धुसर
नोंदणी ... अस्पष्ट
मोबदला : काही नाही
मिळकतीचे वर्णन : ...`;

const [deedDegraded] = parseIgrIndex2Text(textDegraded, 'degraded_scan.pdf');
assert(deedDegraded._extractionCertainty === 'UNCERTAIN', `Degraded text triggers UNCERTAIN certainty (actual: ${deedDegraded._extractionCertainty})`);
assert(deedDegraded._confidenceScore < 50, `Degraded text confidence score < 50% (actual: ${deedDegraded._confidenceScore}%)`);

// -------------------------------------------------------------
// Test 5: Clean Registered Deed (High Clarity Baseline)
// -------------------------------------------------------------
console.log('\n--- TEST 5: Clean High-Clarity Registered Deed ---');
const textClean = `दस्तऐवज क्र. : 12900 / 2024
नोंदणी दिनांक : 10/05/2024
दस्तऐवजाचा प्रकार : खरेदीखत (Sale Deed)
दुय्यम निबंधक : हवेली क्र. १७, पुणे
मोबदला : ₹ 85,00,000
बाजारभाव : ₹ 80,00,000
दस्तऐवज करून देणारा : श्री. प्रमोद नारायण वर्तक
दस्तऐवज करून घेणारा : श्रीमती. कविता प्रमोद वर्तक
मिळकतीचे वर्णन : फ्लॅट क्र. 701, विंग बी, कुमार पॅराडाईज, कल्याणी नगर, पुणे, चटई क्षेत्र 950 चौ.फूट.`;

const [deedClean] = parseIgrIndex2Text(textClean, 'clean_deed.pdf');
assert(deedClean._extractionCertainty === 'HIGH', 'Clean complete deed earns HIGH certainty');
assert(deedClean._confidenceScore === 100, 'Clean complete deed achieves 100% confidence');
assert(deedClean._fieldConfidence.docno === 'EXTRACTED', 'docno is EXTRACTED');
assert(deedClean._fieldConfidence.parties === 'EXTRACTED', 'parties are EXTRACTED');

// -------------------------------------------------------------
// Test 6: Composite OCR Safeguards Logic (Simulating ocrScannedPdf)
// -------------------------------------------------------------
console.log('\n--- TEST 6: Composite OCR Certainty Safeguards ---');

function evaluateCompositeOcr(avgConfidence, parsedRec) {
  const parserScore = parsedRec._confidenceScore || 0;
  const parserCertainty = parsedRec._extractionCertainty || 'UNCERTAIN';

  const isCompositeHigh = (avgConfidence >= 80 && parserScore >= 80 && parserCertainty === 'HIGH');
  const isCompositeMedium = (!isCompositeHigh && avgConfidence >= 55 && parserScore >= 50 && parserCertainty !== 'UNCERTAIN');
  const compositeCertainty = isCompositeHigh ? 'HIGH' : isCompositeMedium ? 'MEDIUM' : 'UNCERTAIN';
  const isLowConfidence = avgConfidence < 60 || parserScore < 60 || compositeCertainty === 'UNCERTAIN';

  return { compositeCertainty, isLowConfidence };
}

// Case 6A: High OCR token confidence (90%) but Low parser completeness (missing fields)
const compAnomaly = evaluateCompositeOcr(90, deedDegraded);
assert(compAnomaly.compositeCertainty === 'UNCERTAIN', 'High OCR confidence (90%) with unextracted fields evaluates to UNCERTAIN');
assert(compAnomaly.isLowConfidence === true, 'isLowConfidence flag is properly set to true');

// Case 6B: Low OCR token confidence (45%) with clean text (e.g. noisy background)
const compLowOcr = evaluateCompositeOcr(45, deedClean);
assert(compLowOcr.compositeCertainty === 'UNCERTAIN', 'Low OCR confidence (45%) downgrades composite certainty to UNCERTAIN');
assert(compLowOcr.isLowConfidence === true, 'Low OCR token confidence triggers isLowConfidence');

// Case 6C: Both OCR token confidence and parser completeness are high
const compHighBoth = evaluateCompositeOcr(88, deedClean);
assert(compHighBoth.compositeCertainty === 'HIGH', 'High OCR (88%) + High parser (100%) evaluates to HIGH certainty');
assert(compHighBoth.isLowConfidence === false, 'Clean composite extraction sets isLowConfidence to false');

console.log('\n================================================================');
console.log(`🎯 CERTAINTY CALIBRATION SUMMARY: ${passed}/${passed + failed} PASSED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
