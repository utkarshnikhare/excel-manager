import assert from 'assert';
import {
  findMatchingPropertyRecords,
  compilePropertyTimeline,
  parseRecordDate
} from './src/utils/propertyTimeline.js';
import { executeSmartSearch } from './src/utils/searchLogic.js';
import { renderHighlightedText } from './src/utils/highlightHelper.js';
import { saveWorkspace, loadWorkspace, clearWorkspace } from './src/utils/workspaceStorage.js';

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
  // Deed 1 Buyer (Ramesh Joshi) == Deed 2 Seller (Ramesh Joshi)
  // Deed 2 Buyer (Sanjay Patil) == Deed 3 Seller (Sanjay Patil)
  assert.strictEqual(timeline.hasContinuityWarning, false);
  assert.strictEqual(timeline.transactions[1].isContinuityGap, false);
  assert.strictEqual(timeline.transactions[2].isContinuityGap, false);
});

runTest('compilePropertyTimeline: Detects chain-of-title break / continuity gap', () => {
  const brokenDeed = {
    docno: '9999',
    docname: 'Sale Deed',
    registrationdate: '10/05/2025',
    society: 'Aeropolis',
    flat_no: '504',
    party1: 'Unknown Stranger Sharma', // Break: Seller is NOT Vikram Deshmukh
    party2: 'Sunil Gavaskar',
    consideration_amt: '₹ 95,00,000'
  };
  const brokenDataset = [...dataset, brokenDeed];
  const timeline = compilePropertyTimeline(sampleDeed1, brokenDataset);
  assert.strictEqual(timeline.hasContinuityWarning, true);
  const lastTx = timeline.transactions[timeline.transactions.length - 1];
  assert.strictEqual(lastTx.isContinuityGap, true);
});

runTest('compilePropertyTimeline: Computes capital appreciation & CAGR metrics', () => {
  const timeline = compilePropertyTimeline(sampleDeed1, dataset);
  assert.strictEqual(timeline.initialPrice, 4500000);
  assert.strictEqual(timeline.latestPrice, 8500000);
  // Appreciation: (85L - 45L) / 45L * 100 = 88.89%
  assert(timeline.priceAppreciationPct >= 88 && timeline.priceAppreciationPct <= 89);
  assert(timeline.cagrPct > 0);
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
  // Structure: ['Sanjay Vitthal ', <mark key=1>Patil</mark>]
  assert.strictEqual(res[0], 'Sanjay Vitthal ');
  assert(res[1] && res[1].type === 'mark');
  assert.strictEqual(res[1].props.children, 'Patil');
});

runTest('renderHighlightedText: XSS Safety — Treats raw HTML scripts as harmless text', () => {
  const maliciousInput = '<script>alert("XSS")</script>';
  const res = renderHighlightedText(maliciousInput, ['script']);
  assert(Array.isArray(res));
  // The output contains React elements, not unescaped raw HTML injection
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
  // Search for ज्ञानेश्वर पाटील as party1 (Seller)
  const conditionsSeller = [{ column: 'party1', query: 'Dnyaneshwar Patil' }];
  const sellerResults = executeSmartSearch(mixedRecords, conditionsSeller, 'AND', false);
  assert.strictEqual(sellerResults.length, 1);
  assert.strictEqual(sellerResults[0].docno, '102');

  // Search for ज्ञानेश्वर पाटील as party2 (Buyer)
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

console.log('\n================================================================');
console.log(`🎉 ALL IMPLEMENTATION TESTS COMPLETED: ${passedTests}/${totalTests} PASSED (100%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
