import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  findMatchingPropertyRecords,
  compilePropertyTimeline,
  parseRecordDate,
  getPartyRoleLabels,
  extractWingIdentifier,
  extractSurveyIdentifier
} from './src/utils/propertyTimeline.js';
import { executeSmartSearch } from './src/utils/searchLogic.js';
import { renderHighlightedText } from './src/utils/highlightHelper.js';
import { saveWorkspace, loadWorkspace, clearWorkspace } from './src/utils/workspaceStorage.js';
import {
  getOrCreateOcrWorker,
  terminateOcrWorker,
  renderPdfPageToCanvas,
  recognizeImage,
  ocrScannedPdf
} from './src/utils/ocrEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log('🏆 RUNNING MASTER IMPLEMENTATION & PROPERTY INTELLIGENCE TESTS');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${description}`);
    console.error(`   Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// SUITE 1: PROPERTY RECORD TIMELINE & CHAIN-OF-TITLE ENGINE
// -------------------------------------------------------------
console.log('--- SUITE 1: Property Record Timeline & Chain-of-Title Engine ---');

const sampleDeed1 = {
  docno: '1001',
  docname: 'Agreement for Sale',
  registrationdate: '15/01/2015',
  society: 'Aeropolis',
  flat_no: '504',
  propertydescription: 'Flat No 504 Wing A Survey 42',
  party1: 'M/s Aeropolis Developers (Builder)',
  party2: 'Ramesh Narayan Joshi',
  consideration_amt: '₹ 45,00,000',
  market_value: '₹ 42,00,000',
  carpet_area: '650 sq.ft',
  source_file: 'IGR_2015_Records.xlsx'
};

const sampleDeed2 = {
  docno: '2002',
  docname: 'Sale Deed (Resale)',
  registrationdate: '20/06/2019',
  society: 'Aeropolis Phase 1',
  flat_no: '504',
  propertydescription: 'Flat No 504 Wing A Survey 42',
  party1: 'Ramesh Narayan Joshi',
  party2: 'Sanjay Vitthal Patil',
  consideration_amt: '₹ 62,00,000',
  market_value: '₹ 60,00,000',
  carpet_area: '650 sq.ft',
  source_file: 'IGR_2019_Records.xlsx'
};

const sampleDeed3 = {
  docno: '3003',
  docname: 'Resale Deed',
  registrationdate: '10/11/2024',
  society: 'Aeropolis',
  flat_no: '504',
  propertydescription: 'Flat No 504 Wing A Survey 42',
  party1: 'Sanjay Vitthal Patil',
  party2: 'Vikram Deshmukh',
  consideration_amt: '₹ 85,00,000',
  market_value: '₹ 82,00,000',
  carpet_area: '650 sq.ft',
  source_file: 'IGR_2024_Records.xlsx'
};

const sampleDeedDifferentUnit = {
  docno: '4004',
  docname: 'Sale Deed',
  registrationdate: '12/12/2023',
  society: 'Aeropolis',
  flat_no: '602',
  party1: 'M/s Aeropolis Developers',
  party2: 'Anil Kumar',
  consideration_amt: '₹ 70,00,000',
  source_file: 'IGR_2023_Records.xlsx'
};

const dataset = [sampleDeed2, sampleDeed3, sampleDeedDifferentUnit, sampleDeed1];

runTest('parseRecordDate: Parses Indian DD/MM/YYYY date strings accurately', () => {
  const d = parseRecordDate('15/01/2015');
  assert(d instanceof Date);
  assert.strictEqual(d.getFullYear(), 2015);
  assert.strictEqual(d.getMonth(), 0); // 0-indexed January
  assert.strictEqual(d.getDate(), 15);
});

runTest('findMatchingPropertyRecords: Finds all matching deeds for Society + Flat Unit', () => {
  const matches = findMatchingPropertyRecords(sampleDeed1, dataset);
  assert.strictEqual(matches.length, 3, `Expected 3 matching deeds for Flat 504, got ${matches.length}`);
  const docNumbers = matches.map(m => m.docno);
  assert(docNumbers.includes('1001'));
  assert(docNumbers.includes('2002'));
  assert(docNumbers.includes('3003'));
  assert(!docNumbers.includes('4004'));
});

runTest('compilePropertyTimeline: Orders deeds chronologically from oldest to newest', () => {
  const timeline = compilePropertyTimeline(sampleDeed2, dataset);
  assert.strictEqual(timeline.totalTransactions, 3);
  assert.strictEqual(timeline.transactions[0].docNo, '1001');
  assert.strictEqual(timeline.transactions[1].docNo, '2002');
  assert.strictEqual(timeline.transactions[2].docNo, '3003');
});

runTest('compilePropertyTimeline: Identifies seller and buyer correctly', () => {
  const timeline = compilePropertyTimeline(sampleDeed1, dataset);
  const tx1 = timeline.transactions[0];
  assert(tx1.seller.includes('Aeropolis Developers'));
  assert(tx1.buyer.includes('Ramesh Narayan Joshi'));

  const tx2 = timeline.transactions[1];
  assert(tx2.seller.includes('Ramesh Narayan Joshi'));
  assert(tx2.buyer.includes('Sanjay Vitthal Patil'));
});

runTest('compilePropertyTimeline: Verifies continuous chain-of-title without gap warnings', () => {
  const timeline = compilePropertyTimeline(sampleDeed1, dataset);
  assert.strictEqual(timeline.hasContinuityWarning, false);
  assert.strictEqual(timeline.transactions[1].isContinuityGap, false);
  assert.strictEqual(timeline.transactions[2].isContinuityGap, false);
});

runTest('compilePropertyTimeline: Detects chain-of-title break / continuity gap as advisory', () => {
  const brokenDeed = {
    docno: '9999',
    docname: 'Sale Deed',
    registrationdate: '10/05/2025',
    society: 'Aeropolis',
    flat_no: '504',
    propertydescription: 'Flat No 504 Wing A Survey 42',
    party1: 'Unknown Stranger Sharma', // Break: Seller is NOT Vikram Deshmukh
    party2: 'Sunil Gavaskar',
    consideration_amt: '₹ 95,00,000'
  };
  const brokenDataset = [...dataset, brokenDeed];
  const timeline = compilePropertyTimeline(sampleDeed1, brokenDataset);
  assert.strictEqual(timeline.hasContinuityWarning, true);
  const lastTx = timeline.transactions[timeline.transactions.length - 1];
  assert.strictEqual(lastTx.isContinuityGap, true);
  assert(lastTx.gapNote.includes('Chain Continuity Note'));
});

runTest('compilePropertyTimeline: Computes capital appreciation & CAGR metrics', () => {
  const timeline = compilePropertyTimeline(sampleDeed1, dataset);
  assert.strictEqual(timeline.initialPrice, 4500000);
  assert.strictEqual(timeline.latestPrice, 8500000);
  assert(timeline.priceAppreciationPct >= 88 && timeline.priceAppreciationPct <= 89);
  assert(timeline.cagrPct > 0);
});

// TASK 3: COMPREHENSIVE TIMELINE FIXTURE TESTS
runTest('Dynamic Party Roles: Mortgage Deed labels Mortgagor/Borrower and Mortgagee/Bank', () => {
  const mortgageRoles = getPartyRoleLabels('गहाणखत (Mortgage Deed)');
  assert.strictEqual(mortgageRoles.isConveyance, false);
  assert(mortgageRoles.role1Label.includes('Borrower'));
  assert(mortgageRoles.role2Label.includes('Bank') || mortgageRoles.role2Label.includes('Mortgagee'));
  assert.strictEqual(mortgageRoles.verb, 'PLEDGED TO');
});

runTest('Dynamic Party Roles: Gift Deed labels Donor and Donee', () => {
  const giftRoles = getPartyRoleLabels('बक्षीसपत्र (Gift Deed)');
  assert.strictEqual(giftRoles.isConveyance, false);
  assert(giftRoles.role1Label.includes('Donor'));
  assert(giftRoles.role2Label.includes('Donee'));
  assert.strictEqual(giftRoles.verb, 'GIFTED TO');
});

runTest('Dynamic Party Roles: Release Deed labels Releasor and Releasee', () => {
  const releaseRoles = getPartyRoleLabels('हक्कसोडपत्र (Release Deed)');
  assert.strictEqual(releaseRoles.isConveyance, false);
  assert(releaseRoles.role1Label.includes('Releasor'));
  assert(releaseRoles.role2Label.includes('Releasee'));
  assert.strictEqual(releaseRoles.verb, 'RELEASED TO');
});

runTest('Dynamic Party Roles: Leave & License labels Licensor and Licensee', () => {
  const licenseRoles = getPartyRoleLabels('लिव्ह अॅण्ड लायसन्स करार (Leave & License)');
  assert.strictEqual(licenseRoles.isConveyance, false);
  assert(licenseRoles.role1Label.includes('Licensor'));
  assert(licenseRoles.role2Label.includes('Licensee'));
  assert.strictEqual(licenseRoles.verb, 'LICENSED TO');
});

runTest('Wing Disambiguation: Keeps Wing A Flat 504 and Wing B Flat 504 strictly separate', () => {
  const deedWingA = {
    docno: '5001',
    society: 'Skyline Heights',
    flat_no: '504',
    propertydescription: 'Building A Wing Flat No 504'
  };
  const deedWingB = {
    docno: '5002',
    society: 'Skyline Heights',
    flat_no: '504',
    propertydescription: 'Building B Wing Flat No 504'
  };
  assert.strictEqual(extractWingIdentifier(deedWingA), 'a');
  assert.strictEqual(extractWingIdentifier(deedWingB), 'b');

  const matchesForA = findMatchingPropertyRecords(deedWingA, [deedWingA, deedWingB]);
  assert.strictEqual(matchesForA.length, 1);
  assert.strictEqual(matchesForA[0].docno, '5001');
});

runTest('Society Disambiguation: Keeps Flat 504 in different societies strictly separate', () => {
  const deedSoc1 = {
    docno: '6001',
    society: 'Rohan Abhilasha',
    flat_no: '504'
  };
  const deedSoc2 = {
    docno: '6002',
    society: 'Nyati Elysia',
    flat_no: '504'
  };
  const matches = findMatchingPropertyRecords(deedSoc1, [deedSoc1, deedSoc2]);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].docno, '6001');
});

runTest('Survey Disambiguation: Disjoint Survey numbers in same society are separated', () => {
  const deedSurvey1 = {
    docno: '7001',
    society: 'Greenfield Estate',
    flat_no: '102',
    propertydescription: 'Survey No 42 Plot 102'
  };
  const deedSurvey2 = {
    docno: '7002',
    society: 'Greenfield Estate',
    flat_no: '102',
    propertydescription: 'Survey No 99 Plot 102'
  };
  assert.strictEqual(extractSurveyIdentifier(deedSurvey1), '42');
  assert.strictEqual(extractSurveyIdentifier(deedSurvey2), '99');

  const matches = findMatchingPropertyRecords(deedSurvey1, [deedSurvey1, deedSurvey2]);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].docno, '7001');
});

runTest('Cross-File Duplicate Detection: Preserves source provenance from multiple files', () => {
  const deedInFile1 = {
    docno: '8888',
    registrationdate: '10/10/2021',
    society: 'Aeropolis',
    flat_no: '504',
    propertydescription: 'Wing A Flat 504',
    party1: 'Sanjay Patil',
    party2: 'Vikram Deshmukh',
    source_file: 'Haveli_2021_Records.xlsx'
  };
  const deedInFile2 = {
    docno: '8888',
    registrationdate: '10/10/2021',
    society: 'Aeropolis',
    flat_no: '504',
    propertydescription: 'Wing A Flat 504',
    party1: 'Sanjay Patil',
    party2: 'Vikram Deshmukh',
    source_file: 'Master_Archive_All_Years.xlsx'
  };

  const timeline = compilePropertyTimeline(deedInFile1, [deedInFile1, deedInFile2]);
  assert.strictEqual(timeline.totalTransactions, 1, 'Duplicate deed across two files must collapse into 1 step');
  const tx = timeline.transactions[0];
  assert.strictEqual(tx.isCrossFileDuplicate, true);
  assert(tx.source_file.includes('Haveli_2021_Records.xlsx'));
  assert(tx.source_file.includes('Master_Archive_All_Years.xlsx'));
  assert.strictEqual(tx.source_files.length, 2);
});

runTest('Missing Registration Date: Flags isDateMissing and adds advisory gap warning', () => {
  const undatedDeed = {
    docno: '7777',
    registrationdate: '—', // Missing date
    docname: 'Possession Letter / Allotment',
    society: 'Aeropolis',
    flat_no: '504',
    propertydescription: 'Wing A Flat 504',
    party1: 'Builder Corp',
    party2: 'Ramesh Joshi'
  };
  const timeline = compilePropertyTimeline(sampleDeed1, [sampleDeed1, undatedDeed]);
  const hasDateWarning = timeline.gaps.some(g => g.note.includes('Registration Date Missing'));
  assert.strictEqual(hasDateWarning, true);
});

runTest('Appreciation Calculation: Excludes nominal Gift/Release from latest sale price', () => {
  const giftDeed = {
    docno: '5555',
    docname: 'बक्षीसपत्र (Gift Deed)',
    registrationdate: '15/12/2025',
    society: 'Aeropolis',
    flat_no: '504',
    propertydescription: 'Wing A Flat 504',
    party1: 'Vikram Deshmukh',
    party2: 'Aditya Deshmukh (Son)',
    consideration_amt: '0' // Nominal ₹ 0
  };
  const datasetWithGift = [...dataset, giftDeed];
  const timeline = compilePropertyTimeline(sampleDeed1, datasetWithGift);
  // Total deeds in history = 4 (Sale, Resale, Resale, Gift)
  assert.strictEqual(timeline.totalTransactions, 4);
  // Latest conveyance price remains the last genuine arms-length sale: 85,00,000 (NOT 0)
  assert.strictEqual(timeline.latestPrice, 8500000);
});

// -------------------------------------------------------------
// SUITE 2: IN-CELL SAFE KEYWORD HIGHLIGHTING (100% XSS-SAFE)
// -------------------------------------------------------------
console.log('\n--- SUITE 2: In-Cell Safe Keyword Highlighting (XSS-Safe) ---');

runTest('renderHighlightedText: Returns plain string if text or tokens empty', () => {
  const res1 = renderHighlightedText('Ramesh Patil', []);
  assert.strictEqual(res1, 'Ramesh Patil');

  const res2 = renderHighlightedText('', ['Patil']);
  assert.strictEqual(res2, '');
});

runTest('renderHighlightedText: Highlights matching token without dangerouslySetInnerHTML', () => {
  const res = renderHighlightedText('Sanjay Vitthal Patil', ['Patil']);
  assert(Array.isArray(res));
  assert.strictEqual(res[0], 'Sanjay Vitthal ');
  assert(res[1] && res[1].type === 'mark');
  assert.strictEqual(res[1].props.children, 'Patil');
});

runTest('renderHighlightedText: XSS Safety — Treats raw HTML scripts as harmless text', () => {
  const maliciousInput = '<script>alert("XSS")</script>';
  const res = renderHighlightedText(maliciousInput, ['script']);
  assert(Array.isArray(res));
  const renderedText = res.map(part => typeof part === 'string' ? part : part.props.children).join('');
  assert.strictEqual(renderedText, maliciousInput);
});

// -------------------------------------------------------------
// SUITE 3: PERSON / PARTY SEARCH & PROPERTY UNIT FILTERING
// -------------------------------------------------------------
console.log('\n--- SUITE 3: Dedicated Person & Property Search ---');

const mixedRecords = [
  {
    docno: '101',
    party1: 'मे. कल्पतरू डेव्हलपर्स',
    party2: 'ज्ञानेश्वर विठ्ठल पाटील',
    society: 'कल्पतरू हाइट्स',
    flat_no: '302',
    registrationdate: '2023-04-12'
  },
  {
    docno: '102',
    party1: 'ज्ञानेश्वर पाटील',
    party2: 'अमित कुमार शर्मा',
    society: 'कल्पतरू हाइट्स',
    flat_no: '302',
    registrationdate: '2024-08-19'
  },
  {
    docno: '103',
    party1: 'सुनील गावस्कर',
    party2: 'सचिन तेंडुलकर',
    society: 'क्रिकेट व्ह्यू',
    flat_no: '1001',
    registrationdate: '2022-01-10'
  }
];

runTest('Person Search: Smart Search matches First + Last Name across Devanagari deeds', () => {
  const conditions = [{ column: 'ALL', query: 'Dnyaneshwar Patil' }];
  const results = executeSmartSearch(mixedRecords, conditions, 'AND', false);
  assert.strictEqual(results.length, 2, `Expected 2 records for Dnyaneshwar Patil, got ${results.length}`);
});

runTest('Person Search: Role filter restricts search to party1 or party2', () => {
  const conditionsSeller = [{ column: 'party1', query: 'Dnyaneshwar Patil' }];
  const sellerResults = executeSmartSearch(mixedRecords, conditionsSeller, 'AND', false);
  assert.strictEqual(sellerResults.length, 1);
  assert.strictEqual(sellerResults[0].docno, '102');

  const conditionsBuyer = [{ column: 'party2', query: 'Dnyaneshwar Patil' }];
  const buyerResults = executeSmartSearch(mixedRecords, conditionsBuyer, 'AND', false);
  assert.strictEqual(buyerResults.length, 1);
  assert.strictEqual(buyerResults[0].docno, '101');
});

runTest('Property Unit Search: Isolates specific society and unit across years', () => {
  const conditions = [
    { column: 'society', query: 'कल्पतरू' },
    { column: 'flat_no', query: '302' }
  ];
  const results = executeSmartSearch(mixedRecords, conditions, 'AND', false);
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].flat_no, '302');
  assert.strictEqual(results[1].flat_no, '302');
});

// -------------------------------------------------------------
// SUITE 4: INDEXEDDB WORKSPACE PERSISTENCE INTERFACE
// -------------------------------------------------------------
console.log('\n--- SUITE 4: Native IndexedDB Persistence Interface ---');

runTest('workspaceStorage: Exports saveWorkspace, loadWorkspace, clearWorkspace functions', () => {
  assert.strictEqual(typeof saveWorkspace, 'function');
  assert.strictEqual(typeof loadWorkspace, 'function');
  assert.strictEqual(typeof clearWorkspace, 'function');
});

// -------------------------------------------------------------
// SUITE 5: OFFLINE MARATHI & ENGLISH OCR ARCHITECTURE & LOCAL ASSETS
// -------------------------------------------------------------
console.log('\n--- SUITE 5: Offline Marathi & English OCR Architecture & Local Assets ---');

runTest('ocrEngine: Exports all required offline OCR functions', () => {
  assert.strictEqual(typeof getOrCreateOcrWorker, 'function');
  assert.strictEqual(typeof terminateOcrWorker, 'function');
  assert.strictEqual(typeof renderPdfPageToCanvas, 'function');
  assert.strictEqual(typeof recognizeImage, 'function');
  assert.strictEqual(typeof ocrScannedPdf, 'function');
});

runTest('ocrEngine: Local public/tesseract/ assets exist and meet size thresholds', () => {
  const tessDir = path.join(__dirname, 'public', 'tesseract');
  assert(fs.existsSync(tessDir), 'public/tesseract directory must exist');

  const workerFile = path.join(tessDir, 'worker.min.js');
  assert(fs.existsSync(workerFile), 'worker.min.js must exist');
  assert(fs.statSync(workerFile).size > 50000, 'worker.min.js must be > 50KB');

  const wasmFile = path.join(tessDir, 'tesseract-core-simd-lstm.wasm');
  assert(fs.existsSync(wasmFile), 'tesseract-core-simd-lstm.wasm must exist');
  assert(fs.statSync(wasmFile).size > 2000000, 'tesseract wasm core must be > 2MB');

  const marLang = path.join(tessDir, 'lang-data', 'mar.traineddata.gz');
  assert(fs.existsSync(marLang), 'mar.traineddata.gz must exist');
  assert(fs.statSync(marLang).size > 1500000, 'Marathi traineddata must be > 1.5MB');

  const engLang = path.join(tessDir, 'lang-data', 'eng.traineddata.gz');
  assert(fs.existsSync(engLang), 'eng.traineddata.gz must exist');
  assert(fs.statSync(engLang).size > 1500000, 'English traineddata must be > 1.5MB');
});

runTest('ocrEngine: Source code contains zero remote CDN or external endpoint URLs', () => {
  const ocrCode = fs.readFileSync(path.join(__dirname, 'src', 'utils', 'ocrEngine.js'), 'utf8');
  assert(!ocrCode.includes('cdn.jsdelivr'), 'ocrEngine must not reference jsdelivr');
  assert(!ocrCode.includes('unpkg.com'), 'ocrEngine must not reference unpkg');
  assert(!ocrCode.includes('tessdata.projectnaptha'), 'ocrEngine must not reference projectnaptha');
  assert(!ocrCode.includes('http://'), 'ocrEngine must not make remote http calls');
  assert(!ocrCode.includes('https://'), 'ocrEngine must not make remote https calls');
});

console.log('\n================================================================');
console.log(`🎉 ALL IMPLEMENTATION TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
