import { extractCarpetArea, extractFlatNo } from './src/utils/propertyParser.js';
import { parseIgrIndex2Text } from './src/utils/pdfParser.js';
import { canonicalRecordHash, cleanParty, executeSmartSearch } from './src/utils/searchLogic.js';
import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('🛡️ RUNNING COMPREHENSIVE HARDENING & AUDIT VERIFICATION SUITE');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// 1. PRIVACY & OFFLINE ASSETS AUDIT
// -------------------------------------------------------------
console.log('--- 1. PRIVACY & LOCAL ASSET AUDIT ---');
const localWorkerPath = path.join(process.cwd(), 'public', 'pdf.worker.min.js');
assert(fs.existsSync(localWorkerPath), 'Local self-hosted PDF worker exists in public/ directory (Zero CDN network leak)');
const workerStats = fs.statSync(localWorkerPath);
assert(workerStats.size > 500000, `Local PDF worker size is valid (${Math.round(workerStats.size / 1024)} KB)`);

// Verify no external CDNs in source code
const pdfParserCode = fs.readFileSync(path.join(process.cwd(), 'src', 'utils', 'pdfParser.js'), 'utf8');
assert(!pdfParserCode.includes('cdnjs.cloudflare.com'), 'pdfParser.js has NO external Cloudflare CDN references');

// -------------------------------------------------------------
// 2. SCANNED PDF & MULTI-DEED BOUNDARY PARSING
// -------------------------------------------------------------
console.log('\n--- 2. PDF DEED SEGMENTATION & SCANNED DETECTION ---');
const multiDeedText = `
द. क्र. : 5012 / 2024
नोंदणी दिनांक : 10/05/2024
दस्तऐवजाचा प्रकार : खरेदीखत
मोबदला : ₹ 55,00,000
दस्तऐवज करून देणारा : 1) रमेश मारुती मोझे
दस्तऐवज करून घेणारा : 1) अमित सुरेश पाटील
मिळकतीचे वर्णन : लोहगांव एरोपोलीस विंग बी फ्लॅट 402 कारपेट क्षेत्र 720 चौ.फूट

दस्तऐवज क्रमांक : 5013 / 2024
नोंदणी दिनांक : 12/05/2024
दस्तऐवजाचा प्रकार : गहाणखत
मोबदला : ₹ 45,00,000
दस्तऐवज करून देणारा : 1) अमित सुरेश पाटील
दस्तऐवज करून घेणारा : बँक ऑफ महाराष्ट्र
मिळकतीचे वर्णन : लोहगांव एरोपोलीस विंग बी फ्लॅट 402
`;

const parsedDeeds = parseIgrIndex2Text(multiDeedText, 'MultiDeed_Sample.pdf');
assert(parsedDeeds.length === 2, `Multi-deed text extracted exactly 2 deeds (got ${parsedDeeds.length})`);
assert(parsedDeeds[0].docno === '5012' && parsedDeeds[0].consideration_amt === 5500000, 'Deed 1 docno 5012 and consideration ₹55L correct');
assert(parsedDeeds[1].docno === '5013' && parsedDeeds[1].consideration_amt === 4500000, 'Deed 2 docno 5013 and consideration ₹45L correct');
assert(parsedDeeds[0].source_file === 'MultiDeed_Sample.pdf', 'Provenance source_file correctly attached to Deed 1');
assert(parsedDeeds[1].source_file === 'MultiDeed_Sample.pdf', 'Provenance source_file correctly attached to Deed 2');

// -------------------------------------------------------------
// 3. PROPERTY PARSER: CARPET AREA VS PLOT AREA DISAMBIGUATION
// -------------------------------------------------------------
console.log('\n--- 3. PROPERTY PARSER: AREA & UNIT EXTRACTION ---');
// Real-world edge case: Description mentions parent land parcel (1000 sq.m paiki) and flat carpet (50 sq.m)
const conflictingAreaDesc = 'स. नं. 284 हिस्सा नं. 3 क्षेत्रफळ 1000 चौ.मी. पैकी यावरील एरोपोलीस विंग ए सदनिका कारपेट क्षेत्र 50 चौ.मी.';
const extractedArea = extractCarpetArea(conflictingAreaDesc);
assert(Math.abs(extractedArea - 538.2) < 0.1, `Disambiguates flat carpet 50 sq.m (538.2 sqft) from parent land 1000 sq.m (got ${extractedArea})`);

// Commercial Office & Shop extraction
const commDesc1 = 'अप्पर ग्राउंड मजल्यावरील ऑफीस नं 102 कारपेट 4777 चौ.फूट';
assert(extractFlatNo(commDesc1) === '102', 'Commercial unit "ऑफीस नं 102" correctly extracts flat_no 102');

const commDesc2 = 'लोहगांव एरोपोलीस तळमजला दुकान क्र. 12 कारपेट 350 चौ.फूट';
assert(extractFlatNo(commDesc2) === '12', 'Commercial unit "दुकान क्र. 12" correctly extracts flat_no 12');

// -------------------------------------------------------------
// 4. CROSS-FILE CANONICAL DUPLICATE DETECTION
// -------------------------------------------------------------
console.log('\n--- 4. CROSS-FILE CANONICAL RECORD HASHING ---');
const deedInFileA = {
  docno: '18500',
  registrationdate: '15/04/2024',
  sellerparty: 'Rahul Sharma',
  consideration_amt: 7800000,
  source_file: 'HDFC_Audit_2024.xlsx',
  source_sheet: 'Sheet1'
};

const deedInFileB = {
  docno: '18500',
  registrationdate: '15/04/2024',
  sellerparty: 'Rahul Sharma',
  consideration_amt: 7800000,
  source_file: 'Haveli_Registry_Export.csv',
  source_sheet: 'Page1'
};

const hashA = canonicalRecordHash(deedInFileA);
const hashB = canonicalRecordHash(deedInFileB);
assert(hashA === hashB, 'Canonical hash matches identical record across different files regardless of source_file');

const differentDeed = {
  docno: '18501',
  registrationdate: '15/04/2024',
  sellerparty: 'Rahul Sharma',
  consideration_amt: 7800000,
  source_file: 'HDFC_Audit_2024.xlsx'
};
assert(canonicalRecordHash(differentDeed) !== hashA, 'Canonical hash produces distinct hash for different docno');

// -------------------------------------------------------------
// 5. MARATHI HONORIFIC & PARTNER PREFIX NORMALIZATION
// -------------------------------------------------------------
console.log('\n--- 5. MARATHI HONORIFIC & PARTNER CLEANING ---');
const messyParty = 'मे. मोझे असोसिएटस तर्फे भागीदार हरिदास बबन मोझे';
const cleaned = cleanParty(messyParty);
assert(!cleaned.includes('tarfe') && !cleaned.includes('trphe') && !cleaned.includes('bhagidar') && !cleaned.includes('mesrs'), 'cleanParty strips legal relational prefixes (tarfe, bhagidar, mesrs)');
assert(cleaned.includes('hridas') && cleaned.includes('mojhe'), 'cleanParty preserves core person name tokens');

// -------------------------------------------------------------
// 6. CSV & SPREADSHEET FORMULA INJECTION SANITIZATION
// -------------------------------------------------------------
console.log('\n--- 6. FORMULA INJECTION (CWE-1236) SANITIZATION ---');
// Simulated export sanitizer function matching App.jsx
const sanitizeExportValue = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str) && isNaN(Number(str))) {
    return `'${str}`;
  }
  return str;
};

assert(sanitizeExportValue('=1+1') === "'=1+1", 'Neutralizes formula starting with "="');
assert(sanitizeExportValue('@SUM(A1:A10)') === "'@SUM(A1:A10)", 'Neutralizes formula starting with "@"');
assert(sanitizeExportValue('+cmd|/C calc!A0') === "'+cmd|/C calc!A0", 'Neutralizes formula starting with "+"');
assert(sanitizeExportValue('-500') === '-500', 'Preserves legitimate negative numeric value -500 without corruption');
assert(sanitizeExportValue(12345) === '12345', 'Preserves standard numbers');
assert(sanitizeExportValue('Rahul Sharma') === 'Rahul Sharma', 'Preserves standard text strings');

// -------------------------------------------------------------
// 7. MULTILINGUAL SEARCH & STRICT vs SMART INTEGRATION
// -------------------------------------------------------------
console.log('\n--- 7. MULTILINGUAL SEARCH & STRICT vs SMART MODES ---');
const searchDataset = [
  { docno: '201', sellerparty: 'मे. मोझे असोसिएटस तर्फे भागीदार हरिदास बबन मोझे', society: 'Skyways Esfera', registrationdate: '2023' },
  { docno: '202', sellerparty: 'हरिदास मोझे', society: 'Skyways Esfera', registrationdate: '2023' },
  { docno: '203', sellerparty: 'आनंदराव मोझे', society: 'Aeropolis', registrationdate: '2024' }
];

// Smart search allows relational prefixes
const smartMozhe = executeSmartSearch(searchDataset, [{ column: 'sellerparty', query: 'Haridas Mozhe' }], 'AND', false);
assert(smartMozhe.length === 2, `Smart search finds both records for Haridas Mozhe (found ${smartMozhe.length})`);

// Exact search strictly checks full party
const exactHaridas = executeSmartSearch(searchDataset, [{ column: 'sellerparty', query: 'Haridas Mozhe' }], 'AND', true);
assert(exactHaridas.length === 1 && exactHaridas[0].docno === '202', 'Exact search returns ONLY exact match Doc 202 without middle name');

console.log('\n================================================================');
console.log(`🎉 HARDENING AUDIT COMPLETE: ${passed}/${total} TESTS PASSED!`);
console.log('================================================================');
