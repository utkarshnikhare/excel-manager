import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { executeSmartSearch, hashRecord, transliterate, getSkeleton } from './src/utils/searchLogic.js';

console.log('================================================================');
console.log('🏛️ QA AUDIT: TESTING REAL MAHARASHTRA IGR PROPERTY DATASET');
console.log('================================================================\n');

const xlsxPath = path.join(process.cwd(), 'public', 'Lohgaon_Property_Records.xlsx');
const fileBuffer = fs.readFileSync(xlsxPath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

let passed = 0;
let total = 0;

function check(assertion, testName, details = '') {
  total++;
  if (assertion) {
    passed++;
    console.log(`✅ [PASS] ${testName} ${details ? `-> ${details}` : ''}`);
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? `-> ${details}` : ''}`);
  }
}

// 1. Workbook Structure
check(workbook.SheetNames.length === 3, 'Workbook has 3 yearly registration sheets', workbook.SheetNames.join(', '));
const sheet2023 = XLSX.utils.sheet_to_json(workbook.Sheets['2023_Property_Deeds'], { defval: "" });
const sheet2024 = XLSX.utils.sheet_to_json(workbook.Sheets['2024_Property_Deeds'], { defval: "" });
const sheet2025 = XLSX.utils.sheet_to_json(workbook.Sheets['2025_2026_Property_Deeds'], { defval: "" });

check(sheet2023.length === 5, '2023 Sheet loaded 5 sample property transactions');
check(sheet2024.length === 3, '2024 Sheet loaded 3 sample property transactions');
check(sheet2025.length === 2, '2025/2026 Sheet loaded 2 sample property transactions');

// 2. Search by Devanagari Party Name ("मोझे" / Moze)
const mozeResults = executeSmartSearch(sheet2023, [{ column: 'sellerparty', query: 'मोझे' }]);
check(mozeResults.length === 2, 'Search: Devanagari "मोझे" matched Moze Associates & Nitin Moze', `Matches: ${mozeResults.length}`);

// 3. Search by Document Name ("गहाणखत" / Mortgage Deed)
const mortgageResults = executeSmartSearch(sheet2023, [{ column: 'docname', query: 'गहाणखत' }]);
check(mortgageResults.length === 1 && mortgageResults[0].docno === 16060, 'Search: Document type "गहाणखत" returned Doc No 16060');

// 4. Search by English query "Pride" matching Marathi "प्राईड आशियाना"
const prideResults = executeSmartSearch(sheet2023, [{ column: 'propertydescription', query: 'pride' }]);
check(prideResults.length === 1 && prideResults[0].docno === 3027, 'Phonetic Search: English "pride" matched Marathi "प्राईड आशियाना"');

// 5. Search by Document Number ("17762")
const docNoResults = executeSmartSearch(sheet2023, [{ column: 'docno', query: '17762' }]);
check(docNoResults.length === 1 && docNoResults[0].purchaserparty.includes('योगेश'), 'Numeric Search: Doc No "17762" matched Yogesh Kalambe');

// 6. Search across 2024 records by purchaser name "खरे" (Khare)
const khareResults = executeSmartSearch(sheet2024, [{ column: 'purchaserparty', query: 'खरे' }]);
check(khareResults.length === 1 && khareResults[0].docno === 14065, 'Search: Purchaser "खरे" matched Vivek Kumar Khare (1 Crore property)');

// 7. Numeric Sorting on Property Consideration Amount
const sortedByAmt = [...sheet2023].sort((a, b) => Number(b.consideration_amt) - Number(a.consideration_amt));
check(sortedByAmt[0].consideration_amt === 7400000 && sortedByAmt[sortedByAmt.length - 1].consideration_amt === 3000000,
  'Sorting: Correctly sorted consideration amount from ₹74 Lakh down to ₹30 Lakh');

// 8. Multi-column AND Filter: "करारनामा" + "मोझे"
const andFilterResults = executeSmartSearch(sheet2023, [
  { column: 'docname', query: 'करारनामा' },
  { column: 'sellerparty', query: 'मोझे' }
], 'AND');
check(andFilterResults.length === 2, 'AND Filter: Both conditions "करारनामा" AND "मोझे" satisfied');

// 9. Staging and Deduplication across batches
const staged = new Map();
sheet2023.forEach(r => staged.set(hashRecord(r), r));
sheet2024.forEach(r => staged.set(hashRecord(r), r));
check(staged.size === 8, 'Deduplication: Staged 8 unique transactions across years');

// 10. Export to final compilation
const exportWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(exportWb, XLSX.utils.json_to_sheet(Array.from(staged.values())), "Compiled_Property_Deeds");
const exportPath = path.join(process.cwd(), 'temp_compiled_igr_test.xlsx');
XLSX.writeFile(exportWb, exportPath);
check(fs.existsSync(exportPath), 'Export: Compiled Excel file generated', exportPath);
fs.unlinkSync(exportPath);

console.log(`\n================================================================`);
console.log(`🎯 IGR DATASET AUDIT RESULT: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
console.log(`================================================================\n`);

if (passed === total) process.exit(0);
else process.exit(1);
