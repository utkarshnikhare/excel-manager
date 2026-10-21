import { transliterate, getSkeleton, levenshtein, hashRecord, executeSmartSearch } from './src/utils/searchLogic.js';
import { extractCarpetArea, extractFlatNo, extractSociety } from './src/utils/propertyParser.js';
import { parseIgrIndex2Text } from './src/utils/pdfParser.js';

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

// 13. Elimination of False Positives: "ashwini" vs "yashvant", "kesavan", "vishwanath", "viresh vinod"
const falsePositiveDataset = [
  { DocNo: '5540', DocName: 'अँग्रीमेंट टू सेल', PurchaserParty: '{"संदीप रघुनाथ लोखंडे--","अश्विनी संदीप लोखंडे--"}' },
  { DocNo: '8084', DocName: 'असाईनमेंट डीड', PurchaserParty: '{"अश्विनी संदीप लोखंडे--","संदीप रघुनाथ लोखंडे--"}' },
  { DocNo: '11675', DocName: 'अँग्रीमेंट टू सेल', PurchaserParty: '{शामलयशवंतपवार,यशवंतरघुनाथपवार}' },
  { DocNo: '8633', DocName: 'अँग्रीमेंट टू सेल', PurchaserParty: '{"औथिकेसवन कुमार--","उषा कुमार--"}' },
  { DocNo: '862', DocName: 'Agreement Relating to Deposit of Title Deeds', PurchaserParty: '{VISHWANATHNAMDEOCHAUDHARI}' },
  { DocNo: '916', DocName: 'Agreement Relating to Deposit of Title Deeds', PurchaserParty: '{VIRESHVINODKALEDHONKAR}' }
];

const ashwiniAgrement = executeSmartSearch(falsePositiveDataset, [
  { column: 'PurchaserParty', query: 'ashwini' },
  { column: 'DocName', query: 'agrement' }
], 'AND');
assert(ashwiniAgrement.length === 1 && ashwiniAgrement[0].DocNo === '5540', 'Strict Match: "ashwini" + "agrement" returns EXACTLY 1 record (DocNo 5540) eliminating 28 false positives');

const ashwiniAssignment = executeSmartSearch(falsePositiveDataset, [
  { column: 'PurchaserParty', query: 'ashwini' },
  { column: 'DocName', query: 'assignment' }
], 'AND');
assert(ashwiniAssignment.length === 1 && ashwiniAssignment[0].DocNo === '8084', 'Strict Match: "ashwini" + "assignment" returns EXACTLY 1 record (DocNo 8084)');

// 14. Fix Verification: Range Filter with Indian Currency & Commas
const rangeTestDataset = [
  { DocNo: '1', consideration_amt: '75,00,000' },
  { DocNo: '2', consideration_amt: '₹ 4,50,000' },
  { DocNo: '3', consideration_amt: 'N/A' },
  { DocNo: '4', consideration_amt: '—' }
];
const rangeUnder5L = executeSmartSearch(rangeTestDataset, [{ isRange: true, column: '_price_range_', min: 100000, max: 500000 }]);
assert(rangeUnder5L.length === 1 && rangeUnder5L[0].DocNo === '2', 'Range Filter: 75,00,000 and N/A rejected; ₹ 4,50,000 correctly matched');

// 15. Fix Verification: Delimiter-Agnostic Identifier Searches
const delimiterDataset = [
  { Phone: '+91 98200 11223', Date: '15-04-2024', Vehicle: 'MH-12-AB-1234', Unit: 'A-102' }
];
assert(executeSmartSearch(delimiterDataset, [{ column: 'Phone', query: '9820011223' }]).length === 1, 'Delimiter-Agnostic: "9820011223" matches "+91 98200 11223"');
assert(executeSmartSearch(delimiterDataset, [{ column: 'Date', query: '15/04/2024' }]).length === 1, 'Delimiter-Agnostic: "15/04/2024" matches "15-04-2024"');
assert(executeSmartSearch(delimiterDataset, [{ column: 'Vehicle', query: 'MH12AB1234' }]).length === 1, 'Delimiter-Agnostic: "MH12AB1234" matches "MH-12-AB-1234"');
assert(executeSmartSearch(delimiterDataset, [{ column: 'Unit', query: 'A102' }]).length === 1, 'Delimiter-Agnostic: "A102" matches "A-102"');

// 16. Fix Verification: Indian Phonetic Labial Anusvara & 'x' Normalization
assert(getSkeleton(transliterate('संभाजी')) === getSkeleton('Sambhaji'), 'Phonetic: "संभाजी" matches "Sambhaji" (m before bh)');
assert(getSkeleton(transliterate('मुंबई')) === getSkeleton('Mumbai'), 'Phonetic: "मुंबई" matches "Mumbai" (m before b)');
assert(getSkeleton('Laxman') === getSkeleton('Lakshman'), 'Phonetic: "Laxman" matches "Lakshman" (x == ks)');
assert(getSkeleton('Laxman') === getSkeleton(transliterate('लक्ष्मण')), 'Phonetic: "Laxman" matches "लक्ष्मण"');

// 17. Fix Verification: Property Intelligence Parser (English sqft, Devanagari numerals, Dynamic Societies)
assert(extractCarpetArea('Flat 504, Carpet Area 820 sq.ft') === 820, 'Property Parser: Extracts English "820 sq.ft"');
assert(extractCarpetArea('सदनिका नं. ५०४, क्षेत्रफळ ६५० चौ.फूट') === 650, 'Property Parser: Extracts Devanagari numerals "६५० चौ.फूट" -> 650');
assert(extractFlatNo('सदनिका नं. ५०४') === '504', 'Property Parser: Extracts Devanagari flat "सदनिका नं. ५०४" -> 504');
assert(extractFlatNo('Shop No. G-05') === 'G-05', 'Property Parser: Extracts "Shop No. G-05"');
assert(extractSociety('Skyline Residency Co-op Housing Society') === 'Skyline Residency Co-op Housing Society', 'Property Parser: Dynamically extracts society from description');

// 18. Fix Verification: Multi-Deed PDF Parser
const multiDeedText = `
दस्तऐवज क्र. : 101 / 2024
नोंदणी दिनांक : 10/01/2024
मोबदला : ₹ 50,00,000
दस्तऐवज करून देणारा : Vendor A
दस्तऐवज करून घेणारा : Buyer A

दस्तऐवज क्र. : 102 / 2024
नोंदणी दिनांक : 15/01/2024
मोबदला : ₹ 60,00,000
दस्तऐवज करून देणारा : Vendor B
दस्तऐवज करून घेणारा : Buyer B
`;
const pdfDeeds = parseIgrIndex2Text(multiDeedText, 'Batch.pdf');
assert(pdfDeeds.length === 2 && pdfDeeds[0].docno === '101' && pdfDeeds[1].docno === '102', 'Multi-Deed PDF: Successfully extracts all deeds from multi-record text');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
