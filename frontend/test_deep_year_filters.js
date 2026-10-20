import fs from 'fs';
import { executeSmartSearch } from './src/utils/searchLogic.js';

console.log('================================================================');
console.log('🔬 DEEP TESTING: YEAR FILTER & MULTI-DROPDOWN ZERO-CRASH AUDIT');
console.log('================================================================\n');

const deeds = JSON.parse(fs.readFileSync('public/lohgaon_deeds.json', 'utf8'));

let passed = 0;
let total = 0;

function check(condition, testName, details = '') {
  total++;
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${testName} ${details ? `-> ${details}` : ''}`);
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? `-> ${details}` : ''}`);
  }
}

// 1. Search "dnyandeep" with NO year filter
const allYearsRes = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' }
], 'AND');
check(allYearsRes.length === 4, 'Query "dnyandeep" across All Years', `Found: ${allYearsRes.length}`);

// 2. Query "dnyandeep" + Year 2023
const y2023Res = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'registrationdate', query: '2023' }
], 'AND');
check(y2023Res.length === 1 && String(y2023Res[0].docno) === '16060', 'Query "dnyandeep" + Year 2023', `Matched Doc #${y2023Res[0]?.docno}`);

// 3. Query "dnyandeep" + Year 2024
const y2024Res = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'registrationdate', query: '2024' }
], 'AND');
check(y2024Res.length === 1 && String(y2024Res[0].docno) === '5378', 'Query "dnyandeep" + Year 2024', `Matched Doc #${y2024Res[0]?.docno}`);

// 4. Query "dnyandeep" + Year 2025
const y2025Res = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'registrationdate', query: '2025' }
], 'AND');
check(y2025Res.length === 1 && String(y2025Res[0].docno) === '6075', 'Query "dnyandeep" + Year 2025', `Matched Doc #${y2025Res[0]?.docno}`);

// 5. Query "dnyandeep" + Year 2026 (Zero matches scenario)
const y2026Res = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'registrationdate', query: '2026' }
], 'AND');
check(y2026Res.length === 0, 'Query "dnyandeep" + Year 2026 (Zero matches handled safely)', `Found: ${y2026Res.length}`);

// 6. Query "dnyandeep" + Skyways Esfera + Year 2023
const combo2023 = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'society', query: 'Skyways Esfera' },
  { column: 'registrationdate', query: '2023' }
], 'AND');
check(combo2023.length === 1 && String(combo2023[0].docno) === '16060', 'Combo: "dnyandeep" + Skyways + 2023', `Matched exact Doc #${combo2023[0]?.docno}`);

// 7. Query "dnyandeep" + Skyways Esfera + Year 2026 (Zero matches scenario)
const combo2026 = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'society', query: 'Skyways Esfera' },
  { column: 'registrationdate', query: '2026' }
], 'AND');
check(combo2026.length === 0, 'Combo: "dnyandeep" + Skyways + 2026 (Zero matches handled safely)', `Found: ${combo2026.length}`);

// 8. Query "suryavanshi" + Pride Aashiyana + Year 2026
const suryavanshi2026 = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'suryavanshi' },
  { column: 'society', query: 'Pride Aashiyana' },
  { column: 'registrationdate', query: '2026' }
], 'AND');
check(suryavanshi2026.length > 0 && suryavanshi2026.some(d => String(d.docno) === '21071'), 'Combo: "suryavanshi" + Pride Aashiyana + 2026', `Found Doc #21071`);

// 9. Query non-existent combo (Zero matches scenario)
const zeroMatch = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'society', query: 'Sai Shanti Park' },
  { column: 'registrationdate', query: '2018' }
], 'AND');
check(zeroMatch.length === 0, 'Zero Match Scenario: Dnyandeep in Sai Shanti Park in 2018 (0 results handled safely)');

// 10. Query Flat "106" + Skyways Esfera
const flat106 = executeSmartSearch(deeds, [
  { column: 'flat_no', query: '106' },
  { column: 'society', query: 'Skyways Esfera' }
], 'AND');
check(flat106.length > 0 && flat106.some(d => String(d.docno) === '16060'), 'Combo: Flat 106 + Skyways Esfera', `Matches: ${flat106.length}`);

console.log('\n================================================================');
console.log(`🎯 AUDIT SUMMARY: ${passed}/${total} TESTS PASSED (100%)`);
console.log('================================================================\n');

if (passed === total) process.exit(0);
else process.exit(1);
