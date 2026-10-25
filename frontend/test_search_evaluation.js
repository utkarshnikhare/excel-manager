/**
 * test_search_evaluation.js
 * 
 * 50 Labelled Ground-Truth Search Queries Evaluation Suite for
 * Smart Excel & Multi-File Data Intelligence Manager.
 * 
 * Evaluates precision, recall, and cross-lingual correctness across 9 query families:
 * 1. English Exact Match
 * 2. Devanagari Exact Match
 * 3. Cross-Script English -> Marathi Transliteration
 * 4. Cross-Script Marathi -> English Transliteration
 * 5. Indian Phonetic Equivalences (V/W, SH/S, PH/F, DNY/JNY/GY)
 * 6. Devanagari Contextual Anusvara (m vs n before labials)
 * 7. Delimiter-Agnostic Identifiers (Dates, Phones, Alphanumerics)
 * 8. Devanagari Numerals & Numeric Normalization
 * 9. Bidirectional Legal Deed Synonym Resolution
 */

import { executeSmartSearch } from './src/utils/searchLogic.js';

console.log('================================================================');
console.log('🔍 RUNNING 50 LABELLED SEARCH EVALUATION BENCHMARK');
console.log('================================================================\n');

// Realistic Test Dataset with diverse scripts, names, deeds, and formats
const testDataset = [
  { id: 1, docno: '1001', sellerparty: 'Ramesh Vitthal Kulkarni', purchaserparty: 'Anita Sudhir Joshi', docname: 'Sale Deed', registrationdate: '15/04/2024', phone: '9822012345', flat_no: '502', consideration_amt: 7500000 },
  { id: 2, docno: '1002', sellerparty: 'रमेश विठ्ठल कुलकर्णी', purchaserparty: 'अनिता सुधीर जोशी', docname: 'खरेदीखत', registrationdate: '15-04-2024', phone: '+91 98220 12345', flat_no: '502', consideration_amt: 7500000 },
  { id: 3, docno: '1003', sellerparty: 'Vishal Thombre', purchaserparty: 'Sambhaji Rao Kadam', docname: 'Agreement for Sale', registrationdate: '10/01/2024', phone: '9820011223', flat_no: 'A-101', consideration_amt: 5200000 },
  { id: 4, docno: '1004', sellerparty: 'विशाल ठोंबरे', purchaserparty: 'संभाजीराव कदम', docname: 'करारनामा', registrationdate: '10/01/2024', phone: '98200-11223', flat_no: 'A101', consideration_amt: 5200000 },
  { id: 5, docno: '1005', sellerparty: 'Dnyaneshwar Shinde', purchaserparty: 'Pooja Patil', docname: 'Gift Deed', registrationdate: '22/09/2023', phone: '9422001122', flat_no: 'B-804', consideration_amt: 0 },
  { id: 6, docno: '1006', sellerparty: 'ज्ञानेश्वर शिंदे', purchaserparty: 'पूजा पाटील', docname: 'बक्षीसपत्र', registrationdate: '22/09/2023', phone: '9422001122', flat_no: 'B804', consideration_amt: 0 },
  { id: 7, docno: '1007', sellerparty: 'Amit Sharma', purchaserparty: 'Lakshman Phadke', docname: 'Mortgage Deed', registrationdate: '12/03/2024', phone: '9890012345', flat_no: 'C-201', consideration_amt: 4500000 },
  { id: 8, docno: '1008', sellerparty: 'अमित शर्मा', purchaserparty: 'लक्ष्मण फडके', docname: 'गहाणखत', registrationdate: '12/03/2024', phone: '9890012345', flat_no: 'C201', consideration_amt: 4500000 },
  { id: 9, docno: '1009', sellerparty: 'Suresh Chandra Mathur', purchaserparty: 'Vijay Prabhakar Deshmukh', docname: 'Leave and License', registrationdate: '05/02/2024', phone: '9158001122', flat_no: 'D-304', consideration_amt: 35000 },
  { id: 10, docno: '1010', sellerparty: 'सुरेश चंद्र माथूर', purchaserparty: 'विजय प्रभाकर देशमुख', docname: 'लिव्ह अँड लायसन्स', registrationdate: '05/02/2024', phone: '9158001122', flat_no: 'D304', consideration_amt: 35000 },
  { id: 11, docno: '1011', sellerparty: 'Sunil Jagtap', purchaserparty: 'Milind Salunke', docname: 'Release Deed', registrationdate: '18/11/2023', phone: '9823055443', flat_no: '1204', consideration_amt: 100000 },
  { id: 12, docno: '1012', sellerparty: 'सुनील जगताप', purchaserparty: 'मिलिंद साळुंके', docname: 'हक्कसोडपत्र', registrationdate: '18/11/2023', phone: '9823055443', flat_no: '1204', consideration_amt: 100000 },
  { id: 13, docno: '1013', sellerparty: 'Pramod Werma', purchaserparty: 'Fadke Builders', docname: 'Development Agreement', registrationdate: '30/08/2023', phone: '9881002233', flat_no: 'Shop-1', consideration_amt: 15000000 },
  { id: 14, docno: '1014', sellerparty: 'प्रमोद वर्मा', purchaserparty: 'फडके बिल्डर्स', docname: 'विकास करार', registrationdate: '30/08/2023', phone: '9881002233', flat_no: 'Shop 1', consideration_amt: 15000000 },
  { id: 15, docno: '1015', sellerparty: 'Ashwini Kute', purchaserparty: 'Trupti Mane', docname: 'Assignment Deed', registrationdate: '14/06/2023', phone: '9921003344', flat_no: 'Flat 12', consideration_amt: 8500000 },
  { id: 16, docno: '1016', sellerparty: 'अश्विनी कुटे', purchaserparty: 'तृप्ती माने', docname: 'असाईनमेंट डीड', registrationdate: '14/06/2023', phone: '9921003344', flat_no: 'Flat 12', consideration_amt: 8500000 }
];

// 50 Labelled Search Benchmark Test Cases
const labelledQueries = [
  // 1. English Exact Matches (1-5)
  { id: 1, desc: 'English exact name "Ramesh Vitthal Kulkarni"', query: '"Ramesh Vitthal Kulkarni"', col: 'sellerparty', expectedIds: [1] },
  { id: 2, desc: 'English exact name "Anita Sudhir Joshi" matches across scripts', query: '"Anita Sudhir Joshi"', col: 'purchaserparty', expectedIds: [1, 2] },
  { id: 3, desc: 'English exact deed "Sale Deed" with bidirectional synonym resolution', query: '"Sale Deed"', col: 'docname', expectedIds: [1, 2, 3] },
  { id: 4, desc: 'English exact phone "9822012345"', query: '9822012345', col: 'phone', expectedIds: [1, 2] },
  { id: 5, desc: 'English exact docno "1005"', query: '1005', col: 'docno', expectedIds: [5] },

  // 2. Devanagari Exact Matches (6-10)
  { id: 6, desc: 'Devanagari exact name "रमेश विठ्ठल कुलकर्णी"', query: '"रमेश विठ्ठल कुलकर्णी"', col: 'sellerparty', expectedIds: [2] },
  { id: 7, desc: 'Devanagari exact name "अनिता सुधीर जोशी" matches across scripts', query: '"अनिता सुधीर जोशी"', col: 'purchaserparty', expectedIds: [1, 2] },
  { id: 8, desc: 'Devanagari exact deed "खरेदीखत" with bidirectional synonym resolution', query: '"खरेदीखत"', col: 'docname', expectedIds: [1, 2, 3] },
  { id: 9, desc: 'Devanagari exact deed "बक्षीसपत्र" matches Gift Deed and Devanagari', query: '"बक्षीसपत्र"', col: 'docname', expectedIds: [5, 6] },
  { id: 10, desc: 'Devanagari exact deed "गहाणखत" matches Mortgage Deed and Devanagari', query: '"गहाणखत"', col: 'docname', expectedIds: [7, 8] },

  // 3. Cross-Script English -> Marathi Transliteration (11-18)
  { id: 11, desc: 'English query "Ramesh" finds both English and Marathi records', query: 'Ramesh', col: 'sellerparty', expectedIds: [1, 2] },
  { id: 12, desc: 'English query "Kulkarni" matches Marathi "कुलकर्णी"', query: 'Kulkarni', col: 'sellerparty', expectedIds: [1, 2] },
  { id: 13, desc: 'English query "Anita" matches Marathi "अनिता"', query: 'Anita', col: 'purchaserparty', expectedIds: [1, 2] },
  { id: 14, desc: 'English query "Pooja Patil" matches Marathi "पूजा पाटील"', query: 'Pooja Patil', col: 'purchaserparty', expectedIds: [5, 6] },
  { id: 15, desc: 'English query "Vishal" matches Marathi "विशाल"', query: 'Vishal', col: 'sellerparty', expectedIds: [3, 4] },
  { id: 16, desc: 'English query "Thombare" matches Marathi "ठोंबरे"', query: 'Thombare', col: 'sellerparty', expectedIds: [3, 4] },
  { id: 17, desc: 'English query "Deshmukh" matches Marathi "देशमुख"', query: 'Deshmukh', col: 'purchaserparty', expectedIds: [9, 10] },
  { id: 18, desc: 'English query "Sunil Jagtap" matches Marathi "सुनील जगताप"', query: 'Sunil Jagtap', col: 'sellerparty', expectedIds: [11, 12] },

  // 4. Cross-Script Marathi -> English Transliteration (19-26)
  { id: 19, desc: 'Marathi query "रमेश" matches English "Ramesh"', query: 'रमेश', col: 'sellerparty', expectedIds: [1, 2] },
  { id: 20, desc: 'Marathi query "जोशी" matches English "Joshi"', query: 'जोशी', col: 'purchaserparty', expectedIds: [1, 2] },
  { id: 21, desc: 'Marathi query "अमित शर्मा" matches English "Amit Sharma"', query: 'अमित शर्मा', col: 'sellerparty', expectedIds: [7, 8] },
  { id: 22, desc: 'Marathi query "पूजा" matches English "Pooja"', query: 'पूजा', col: 'purchaserparty', expectedIds: [5, 6] },
  { id: 23, desc: 'Marathi query "विशाल" matches English "Vishal"', query: 'विशाल', col: 'sellerparty', expectedIds: [3, 4] },
  { id: 24, desc: 'Marathi query "कदम" matches English "Kadam"', query: 'कदम', col: 'purchaserparty', expectedIds: [3, 4] },
  { id: 25, desc: 'Marathi query "माथूर" matches English "Mathur"', query: 'माथूर', col: 'sellerparty', expectedIds: [9, 10] },
  { id: 26, desc: 'Marathi query "साळुंके" matches English "Salunke"', query: 'साळुंके', col: 'purchaserparty', expectedIds: [11, 12] },

  // 5. Indian Consonant & Name Equivalence (27-32)
  { id: 27, desc: 'V == W: "Wishal" matches "Vishal Thombre"', query: 'Wishal', col: 'sellerparty', expectedIds: [3, 4] },
  { id: 28, desc: 'V == W: "Verma" matches "Werma"', query: 'Verma', col: 'sellerparty', expectedIds: [13, 14] },
  { id: 29, desc: 'SH == S: "Sarma" matches "Sharma"', query: 'Sarma', col: 'sellerparty', expectedIds: [7, 8] },
  { id: 30, desc: 'PH == F: "Phadke" matches "Fadke Builders"', query: 'Phadke', col: 'purchaserparty', expectedIds: [7, 8, 13, 14] },
  { id: 31, desc: 'PH == F: "Fadke" matches "Lakshman Phadke"', query: 'Fadke', col: 'purchaserparty', expectedIds: [7, 8, 13, 14] },
  { id: 32, desc: 'DNY == JNY: "Jnyaneshwar" matches "Dnyaneshwar Shinde"', query: 'Jnyaneshwar', col: 'sellerparty', expectedIds: [5, 6] },

  // 6. Devanagari Contextual Anusvara (33-36)
  { id: 33, desc: 'Anusvara before bh: "संभाजी" transliterates to "sambhaji"', query: 'Sambhaji', col: 'purchaserparty', expectedIds: [3, 4] },
  { id: 34, desc: 'Anusvara before bh: Devanagari "संभाजी" matches English "Sambhaji"', query: 'संभाजी', col: 'purchaserparty', expectedIds: [3, 4] },
  { id: 35, desc: 'X == KS: "Laxman" matches "Lakshman Phadke"', query: 'Laxman', col: 'purchaserparty', expectedIds: [7, 8] },
  { id: 36, desc: 'X == KS: "लक्ष्मण" matches "Laxman"', query: 'लक्ष्मण', col: 'purchaserparty', expectedIds: [7, 8] },

  // 7. Delimiter-Agnostic Identifiers (37-42)
  { id: 37, desc: 'Phone formatted "+91 98220 12345" matched by plain digits "9822012345"', query: '9822012345', col: 'phone', expectedIds: [1, 2] },
  { id: 38, desc: 'Phone with dashes "98200-11223" matched by "9820011223"', query: '9820011223', col: 'phone', expectedIds: [3, 4] },
  { id: 39, desc: 'Date "15-04-2024" matched by "15/04/2024"', query: '15/04/2024', col: 'registrationdate', expectedIds: [1, 2] },
  { id: 40, desc: 'Year lookup "2024" matches all 2024 deeds', query: '2024', col: 'registrationdate', expectedIds: [1, 2, 3, 4, 7, 8, 9, 10] },
  { id: 41, desc: 'Flat delimiter "A101" matches "A-101"', query: 'A101', col: 'flat_no', expectedIds: [3, 4] },
  { id: 42, desc: 'Flat delimiter "B-804" matches "B804"', query: 'B-804', col: 'flat_no', expectedIds: [5, 6] },

  // 8. Numerics, Leading Zeros & Edge Queries (43-46)
  { id: 43, desc: 'Doc number lookup "1001" (with repeated digit integrity)', query: '1001', col: 'docno', expectedIds: [1] },
  { id: 44, desc: 'Doc number lookup "1016"', query: '1016', col: 'docno', expectedIds: [16] },
  { id: 45, desc: 'Punctuation-only query "???" gracefully returns zero records', query: '???', col: 'sellerparty', expectedIds: [] },
  { id: 46, desc: 'Dash-only query "---" gracefully returns zero records', query: '---', col: 'sellerparty', expectedIds: [] },

  // 9. Bidirectional Legal Deed Synonyms (47-50)
  { id: 47, desc: 'Deed synonym: "Sale" matches "Sale Deed", "खरेदीखत", and "Agreement for Sale"', query: 'Sale', col: 'docname', expectedIds: [1, 2, 3] },
  { id: 48, desc: 'Deed synonym: "खरेदीखत" matches "Sale Deed", "खरेदीखत", and "Agreement for Sale"', query: 'खरेदीखत', col: 'docname', expectedIds: [1, 2, 3] },
  { id: 49, desc: 'Deed synonym: "Agreement" matches Agreement for Sale, करारनामा, and Development Agreement', query: 'Agreement', col: 'docname', expectedIds: [3, 4, 13, 14] },
  { id: 50, desc: 'Deed synonym: "बक्षीसपत्र" matches both "Gift Deed" and "बक्षीसपत्र"', query: 'बक्षीसपत्र', col: 'docname', expectedIds: [5, 6] }
];

let totalPassed = 0;
let totalFailed = 0;

labelledQueries.forEach(test => {
  const criteria = [{ column: test.col, query: test.query }];
  const results = executeSmartSearch(testDataset, criteria, 'AND', false);
  const matchedIds = results.map(r => r.id).sort((a, b) => a - b);
  const expectedSorted = [...test.expectedIds].sort((a, b) => a - b);

  const isExactMatch = matchedIds.length === expectedSorted.length && 
    matchedIds.every((id, idx) => id === expectedSorted[idx]);

  if (isExactMatch) {
    totalPassed++;
    console.log(`✅ [Q${String(test.id).padStart(2, '0')}] PASS: ${test.desc} -> Found [${matchedIds.join(', ')}]`);
  } else {
    totalFailed++;
    console.log(`❌ [Q${String(test.id).padStart(2, '0')}] FAIL: ${test.desc}`);
    console.log(`     Expected: [${expectedSorted.join(', ')}]`);
    console.log(`     Actual:   [${matchedIds.join(', ')}]`);
  }
});

console.log('\n================================================================');
console.log(`🎯 50 LABELLED SEARCH QUERIES BENCHMARK RESULT:`);
console.log(`   Passed: ${totalPassed} / ${labelledQueries.length} (${((totalPassed / labelledQueries.length) * 100).toFixed(1)}%)`);
console.log(`   Failed: ${totalFailed} / ${labelledQueries.length}`);
console.log('================================================================\n');

if (totalPassed === labelledQueries.length) {
  console.log('🎉 100% SEARCH PRECISION & RECALL BENCHMARK ACHIEVED!\n');
} else {
  process.exit(1);
}
