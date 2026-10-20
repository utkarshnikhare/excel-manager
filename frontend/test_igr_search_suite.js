import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { executeSmartSearch, hashRecord, transliterate, getSkeleton } from './src/utils/searchLogic.js';
import { extractSociety, extractCarpetArea, extractFlatNo, formatINR } from './src/utils/propertyParser.js';

console.log('================================================================');
console.log('🏛️ QA AUDIT: TESTING REAL 3,498 DEEDS MAHARASHTRA IGR DATASET');
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

// 1. Workbook Structure & Scale
check(workbook.SheetNames.length === 6, 'Workbook contains 6 multi-year registration sheets', workbook.SheetNames.join(', '));
const allDeeds = XLSX.utils.sheet_to_json(workbook.Sheets['All_3500_Deeds'], { defval: "" });
check(allDeeds.length === 3498, 'All_3500_Deeds loaded 3,498 genuine registry deeds', `Count: ${allDeeds.length}`);

// 2. Year distribution sheets
const sheet2026 = XLSX.utils.sheet_to_json(workbook.Sheets['Deeds_2026'], { defval: "" });
const sheet2025 = XLSX.utils.sheet_to_json(workbook.Sheets['Deeds_2025'], { defval: "" });
const sheet2024 = XLSX.utils.sheet_to_json(workbook.Sheets['Deeds_2024'], { defval: "" });
const sheet2023 = XLSX.utils.sheet_to_json(workbook.Sheets['Deeds_2023'], { defval: "" });
const sheet2018 = XLSX.utils.sheet_to_json(workbook.Sheets['Deeds_2018'], { defval: "" });

check(sheet2026.length >= 600, '2026 Sheet loaded deeds', `Count: ${sheet2026.length}`);
check(sheet2025.length >= 800, '2025 Sheet loaded deeds', `Count: ${sheet2025.length}`);
check(sheet2024.length >= 700, '2024 Sheet loaded deeds', `Count: ${sheet2024.length}`);
check(sheet2023.length >= 700, '2023 Sheet loaded deeds', `Count: ${sheet2023.length}`);
check(sheet2018.length >= 500, '2018 Sheet loaded deeds', `Count: ${sheet2018.length}`);

// 3. Smart Property Parser Unit Tests
check(extractSociety('लोहगांव स. नं. 284 स्कायवेज एस्फेरा 2 विंग ए 106') === 'Skyways Esfera', 'Parser: extracts Skyways Esfera');
check(extractSociety('सर्व्हे नं. 284 हिस्सा नं. 7 एरोपोलीस इ विंग फ्लॅट 612') === 'Aeropolis', 'Parser: extracts Aeropolis');
check(extractSociety('सर्वे नं. 284/2 प्राईड आशियाना को ऑप हौसिंग जी-3') === 'Pride Aashiyana', 'Parser: extracts Pride Aashiyana');
check(extractCarpetArea('कारपेट क्षेत्र 58.46 चौ. मी. म्हणजेच 629.26 चौ. फुट') === 629.26, 'Parser: extracts carpet area 629.26 sq.ft');
check(extractFlatNo('पहिल्या मजल्यावरील फलॅट नं 106 यांसी') === '106', 'Parser: extracts Flat No 106');
check(formatINR(3452000000) === '₹ 345.20 Cr', 'Currency Formatter: 345.20 Crores');
check(formatINR(6500000) === '₹ 65.00 L', 'Currency Formatter: 65.00 Lakhs');

// 4. Smart Multi-Tier Phonetic & Devanagari Search on 3,498 Real Records
// Search by Society: Skyways
const skywaysMatches = executeSmartSearch(allDeeds, [{ column: 'society', query: 'Skyways Esfera' }]);
check(skywaysMatches.length === 675, 'Search: Skyways Esfera matched 675 deeds', `Matches: ${skywaysMatches.length}`);

// Search by Society: Pride Aashiyana
const prideMatches = executeSmartSearch(allDeeds, [{ column: 'society', query: 'Pride Aashiyana' }]);
check(prideMatches.length >= 852, 'Search: Pride Aashiyana matched deeds', `Matches: ${prideMatches.length}`);

// Search by Society: Aeropolis
const aeropolisMatches = executeSmartSearch(allDeeds, [{ column: 'society', query: 'Aeropolis' }]);
check(aeropolisMatches.length === 598, 'Search: Aeropolis matched 598 deeds', `Matches: ${aeropolisMatches.length}`);

// Search by Document Number
const doc16060 = executeSmartSearch(allDeeds, [{ column: 'docno', query: '16060' }]);
check(doc16060.length > 0 && String(doc16060[0].docno) === '16060', 'Search: Exact Doc No 16060 located', `Found: ${doc16060.length}`);

// Phonetic search: English query "pride" on Marathi text
const phoneticPride = executeSmartSearch(allDeeds, [{ column: 'propertydescription', query: 'pride' }]);
check(phoneticPride.length > 0, 'Phonetic: English "pride" matched Marathi property descriptions', `Matches: ${phoneticPride.length}`);

// Search by Party Name (Marathi Devanagari "मोझे")
const mozeMatches = executeSmartSearch(allDeeds, [{ column: 'sellerparty', query: 'मोझे' }]);
check(mozeMatches.length > 0, 'Search: Devanagari "मोझे" matches party records', `Matches: ${mozeMatches.length}`);

// Check Total Consideration Value and Total Stamp Duty
const totalValue = allDeeds.reduce((sum, r) => sum + (Number(r.consideration_amt) || 0), 0);
const totalStamp = allDeeds.reduce((sum, r) => sum + (Number(r.stampdutypaid) || 0), 0);
check(totalValue > 3000000000, `Total Registry Worth: ₹ ${(totalValue / 10000000).toFixed(2)} Crores`);
check(totalStamp > 150000000, `Total Stamp Duty Paid: ₹ ${(totalStamp / 10000000).toFixed(2)} Crores`);

console.log('\n================================================================');
console.log(`📊 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
console.log('================================================================');

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
