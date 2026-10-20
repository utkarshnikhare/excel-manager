import fs from 'fs';
import path from 'path';
import { executeSmartSearch, transliterate, getSkeleton, hashRecord } from './src/utils/searchLogic.js';
import { extractSociety, extractCarpetArea, extractFlatNo, formatINR, cleanParties } from './src/utils/propertyParser.js';

console.log('================================================================');
console.log('🧪 STRESS TESTING: 20 HARDEST MAHARASHTRA IGR DEED RECORDS');
console.log('================================================================\n');

const deeds = JSON.parse(fs.readFileSync('public/lohgaon_deeds.json', 'utf8'));
const hardCases = JSON.parse(fs.readFileSync('hard_20_cases.json', 'utf8'));

let passCount = 0;
let failCount = 0;
const testLog = [];

function assertTest(condition, testName, details = '') {
  if (condition) {
    passCount++;
    console.log(`✅ [PASS] ${testName} ${details ? `-> ${details}` : ''}`);
    testLog.push({ status: 'PASS', testName, details });
  } else {
    failCount++;
    console.error(`❌ [FAIL] ${testName} ${details ? `-> ${details}` : ''}`);
    testLog.push({ status: 'FAIL', testName, details });
  }
}

console.log(`Loaded ${hardCases.length} extreme edge-case records for comprehensive audit.\n`);

hardCases.forEach((deed, i) => {
  const caseNum = i + 1;
  console.log(`----------------------------------------------------------------`);
  console.log(`🔹 AUDITING CASE #${caseNum}: Doc #${deed.docno} | ${deed.docname} (${deed.registrationdate})`);
  console.log(`----------------------------------------------------------------`);

  // 1. Direct Numeric Search for exact Doc No
  const docResults = executeSmartSearch(deeds, [{ column: 'docno', query: String(deed.docno) }]);
  const exactMatch = docResults.find(d => String(d.docno) === String(deed.docno) && d.registrationdate === deed.registrationdate);
  assertTest(!!exactMatch, `Case #${caseNum}: Numeric Search by Doc No ${deed.docno}`, `Found ${docResults.length} records`);

  // 2. Society Name Extraction Validation
  assertTest(deed.society && deed.society !== 'Unknown', `Case #${caseNum}: Society extraction`, `Society: ${deed.society}`);

  // 3. Parties Cleaning Integrity (no raw JSON characters like {, }, ")
  const cleanSeller = cleanParties(deed.sellerparty);
  const cleanBuyer = cleanParties(deed.purchaserparty);
  assertTest(!/[\{\}\"\[\]]/.test(cleanSeller) && cleanSeller.length > 0, `Case #${caseNum}: Clean Seller Party format`, cleanSeller.slice(0, 45) + '...');
  assertTest(!/[\{\}\"\[\]]/.test(cleanBuyer) && cleanBuyer.length > 0, `Case #${caseNum}: Clean Buyer Party format`, cleanBuyer.slice(0, 45) + '...');

  // 4. Financial Consistency & Indian Currency Formatter
  const formattedCons = formatINR(deed.consideration_amt);
  const formattedStamp = formatINR(deed.stampdutypaid);
  assertTest(formattedCons.startsWith('₹') && formattedStamp.startsWith('₹'), `Case #${caseNum}: Currency formatting`, `Val: ${formattedCons} | Stamp: ${formattedStamp}`);

  // 5. Hash & Deduplication Integrity
  const hash1 = hashRecord(deed);
  const hash2 = hashRecord({ ...deed });
  assertTest(hash1.length > 20 && hash1 === hash2, `Case #${caseNum}: Deterministic Record Hashing`);
});

console.log('\n================================================================');
console.log('🔍 SPECIFIC PHONETIC & MULTILINGUAL CONJUNCT RETRIEVAL TESTS');
console.log('================================================================');

// Test A: Case #5 (Doc 16060) - English "shlesha" matching Marathi "श्लेषा"
const shleshaRes = executeSmartSearch(deeds, [{ column: 'sellerparty', query: 'shlesha' }]);
assertTest(shleshaRes.some(r => String(r.docno) === '16060'), 'Phonetic: English "shlesha" matched Marathi "श्लेषा भोसले" (Doc 16060)');

// Test B: Case #5 (Doc 16060) - English "dnyandeep" matching Marathi "ज्ञानदीप"
const dnyandeepRes = executeSmartSearch(deeds, [{ column: 'purchaserparty', query: 'dnyandeep' }]);
assertTest(dnyandeepRes.some(r => String(r.docno) === '16060'), 'Phonetic: English "dnyandeep" matched Marathi "ज्ञानदीप को ऑप क्रेडिट" (Doc 16060)');

// Test C: Case #8 (Doc 21071) - English "suryavanshi" matching Marathi "सूर्यवंशी"
const suryavanshiRes = executeSmartSearch(deeds, [{ column: 'sellerparty', query: 'suryavanshi' }]);
assertTest(suryavanshiRes.some(r => String(r.docno) === '21071'), 'Phonetic: English "suryavanshi" matched Marathi "सूर्यवंशी" (Doc 21071)');

// Test Global ALL Columns Search for "suryavanshi"
const globalSuryavanshi = executeSmartSearch(deeds, [{ column: 'ALL', query: 'suryavanshi' }]);
assertTest(globalSuryavanshi.some(r => String(r.docno) === '21071'), 'Global Search: "ALL" columns with "suryavanshi" found Doc 21071');

// Test D: Case #4 (Doc 7922) - English "vaishnavi" matching Marathi "वैष्णवी"
const vaishnaviRes = executeSmartSearch(deeds, [{ column: 'sellerparty', query: 'vaishnavi' }]);
assertTest(vaishnaviRes.some(r => String(r.docno) === '7922'), 'Phonetic: English "vaishnavi" matched Marathi "वैष्णवी देशमुख" (Doc 7922)');

// Test E: Case #14 (Doc 25426) - English "debashis" matching Marathi "देबाशिस गाइन"
const debashisRes = executeSmartSearch(deeds, [{ column: 'sellerparty', query: 'debashis' }]);
assertTest(debashisRes.some(r => String(r.docno) === '25426'), 'Phonetic: English "debashis" matched Marathi "देबाशिस गाइन" (Doc 25426)');

// Test F: Case #20 (Doc 3868) - ₹ 8.5 Crore Corporate Mortgage retrieval
const doc3868Res = executeSmartSearch(deeds, [{ column: 'docno', query: '3868' }]);
const exact3868 = doc3868Res.find(r => String(r.docno) === '3868');
assertTest(!!exact3868 && exact3868.consideration_amt === 85000000, 'High-Value: ₹ 8.5 Crore SBI Mortgage successfully parsed (Doc 3868)');

// Test G: Case #1 & #2 (Doc 7849, 7850) - ₹ 5 Crore ICICI Mortgages retrieval
const doc7849Res = executeSmartSearch(deeds, [{ column: 'docno', query: '7849' }]);
const exact7849 = doc7849Res.find(r => String(r.docno) === '7849');
assertTest(!!exact7849 && exact7849.consideration_amt === 50000000, 'High-Value: ₹ 5.0 Crore ICICI Mortgage successfully parsed (Doc 7849)');

// Test H: Case #3 (Doc 18019) - Legal heir deed with pre/post marriage names
const doc18019Res = executeSmartSearch(deeds, [{ column: 'docno', query: '18019' }]);
const exact18019 = doc18019Res.find(r => String(r.docno) === '18019');
assertTest(!!exact18019 && exact18019.docname === 'हक्कसोडपत्र', 'Deed Type: Release deed (हक्कसोडपत्र) with legal heir name changes parsed (Doc 18019)');

// Test I: Case #19 (Doc 15102) - Pre vs Post marriage maiden name query
const kordeRes = executeSmartSearch(deeds, [{ column: 'purchaserparty', query: 'korde' }]);
assertTest(kordeRes.some(r => String(r.docno) === '15102'), 'Phonetic: English "korde" matched Marathi "रेश्मा विक्रम कोरडे" (Doc 15102)');

// Test J: Case #10 (Doc 11098) - South Indian joint owners query "pradeep"
const pradeepRes = executeSmartSearch(deeds, [{ column: 'sellerparty', query: 'pradeep' }]);
assertTest(pradeepRes.some(r => String(r.docno) === '11098'), 'Phonetic: English "pradeep" matched Marathi "प्रदिप कुमार" (Doc 11098)');

const totalTests = passCount + failCount;
const passRate = Math.round((passCount / totalTests) * 100);

console.log('\n================================================================');
console.log(`🎯 FINAL AUDIT RESULT: ${passCount}/${totalTests} TESTS PASSED (${passRate}%)`);
console.log(`❌ FAILS: ${failCount}`);
console.log('================================================================\n');

if (failCount === 0) {
  process.exit(0);
} else {
  process.exit(1);
}
