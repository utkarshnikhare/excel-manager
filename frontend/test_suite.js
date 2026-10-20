import { transliterate, getSkeleton, levenshtein, hashRecord, executeSmartSearch } from './src/utils/searchLogic.js';

console.log('🧪 RUNNING COMPREHENSIVE AUTOMATED TEST SUITE...\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
  }
}

// 1. Transliteration Tests
assert(transliterate('राहुल') === 'rahul', 'Transliteration: "राहुल" -> "rahul"');
assert(transliterate('पूजा पाटिल') === 'puja patil', 'Transliteration: "पूजा पाटिल" -> "puja patil"');
assert(transliterate('उत्कर्ष') === 'utkrsh', 'Transliteration: "उत्कर्ष" -> "utkrsh"');
assert(getSkeleton(transliterate('उत्कर्ष')) === getSkeleton('Utkarsh'), 'Phonetic match: "उत्कर्ष" matches "Utkarsh"');

// 2. Phonetic Skeleton & Normalization Tests
assert(getSkeleton('Vishal') === getSkeleton('Wishal'), 'Phonetic Equivalence: V == W ("Vishal" vs "Wishal")');
assert(getSkeleton('Sharma') === getSkeleton('Sarma'), 'Phonetic Equivalence: SH == S ("Sharma" vs "Sarma")');
assert(getSkeleton('Verma') === getSkeleton('Werma'), 'Phonetic Equivalence: V == W ("Verma" vs "Werma")');
assert(getSkeleton('Rahul') === 'rhl', 'Skeleton: "Rahul" -> "rhl"');

// 3. Levenshtein Distance Tests
assert(levenshtein('rahul', 'rahul') === 0, 'Levenshtein: Identical strings distance 0');
assert(levenshtein('rahul', 'rahul1') === 1, 'Levenshtein: 1 insertion distance 1');
assert(levenshtein('rhl', 'rl') === 1, 'Levenshtein: skeleton typo distance 1');

// 4. Deterministic Hash Record Tests (Deduplication)
const obj1 = { name: "Utkarsh", city: "Nagpur", id: 101 };
const obj2 = { id: 101, city: "Nagpur", name: "Utkarsh" }; // different key insertion order
assert(hashRecord(obj1) === hashRecord(obj2), 'HashRecord: Order-independent deterministic hash');

// 5. Test Dataset
const sampleData = [
  { ID: "EMP-101", Name: "Rahul Sharma", HindiName: "राहुल शर्मा", City: "Mumbai", Phone: "9820011223" },
  { ID: "EMP-102", Name: "Pooja Patil", HindiName: "पूजा पाटिल", City: "Pune", Phone: "9820044556" },
  { ID: "EMP-103", Name: "Amit Verma", HindiName: "अमित वर्मा", City: "Delhi", Phone: "9811122334" },
  { ID: "EMP-104", Name: "Vishal Thombre", HindiName: "विशाल ठोंबरे", City: "Nashik", Phone: "9890011223" },
  { ID: "EMP-105", Name: "Utkarsh Nikhare", HindiName: "उत्कर्ष निखारे", City: "Nagpur", Phone: "9823344556" }
];

// 6. Search Tests: Raw Phone Number
const phoneResults = executeSmartSearch(sampleData, [{ column: 'Phone', query: '9820011223' }]);
assert(phoneResults.length === 1 && phoneResults[0].ID === 'EMP-101', 'Search: Exact Phone Number lookup ("9820011223")');

// 7. Search Tests: Partial ID
const idResults = executeSmartSearch(sampleData, [{ column: 'ID', query: '105' }]);
assert(idResults.length === 1 && idResults[0].Name === 'Utkarsh Nikhare', 'Search: Numeric ID lookup ("105")');

// 8. Search Tests: Devanagari Hindi Query on English Cell
const hindiToEngResults = executeSmartSearch(sampleData, [{ column: 'Name', query: 'राहुल' }]);
assert(hindiToEngResults.length === 1 && hindiToEngResults[0].ID === 'EMP-101', 'Search: Hindi query "राहुल" matches English cell "Rahul Sharma"');

// 9. Search Tests: English Query on Hindi Cell
const engToHindiResults = executeSmartSearch(sampleData, [{ column: 'HindiName', query: 'Pooja' }]);
assert(engToHindiResults.length === 1 && engToHindiResults[0].ID === 'EMP-102', 'Search: English query "Pooja" matches Hindi cell "पूजा पाटिल"');

// 10. Search Tests: Phonetic V/W variation
const vResults = executeSmartSearch(sampleData, [{ column: 'Name', query: 'Wishal' }]);
assert(vResults.length === 1 && vResults[0].Name === 'Vishal Thombre', 'Search: "Wishal" matches "Vishal Thombre"');

// 11. Search Tests: Multi-column AND logic
const andResults = executeSmartSearch(sampleData, [
  { column: 'Name', query: 'Rahul' },
  { column: 'City', query: 'Mumbai' }
], 'AND');
assert(andResults.length === 1 && andResults[0].ID === 'EMP-101', 'Search: Multi-column AND logic (Rahul in Mumbai)');

// 12. Search Tests: Multi-column OR logic
const orResults = executeSmartSearch(sampleData, [
  { column: 'City', query: 'Nagpur' },
  { column: 'City', query: 'Nashik' }
], 'OR');
assert(orResults.length === 2, 'Search: Multi-column OR logic (Nagpur OR Nashik returns 2 records)');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
