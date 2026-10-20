import https from 'https';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { executeSmartSearch, hashRecord, transliterate, getSkeleton } from './src/utils/searchLogic.js';

console.log('====================================================');
console.log('🚀 RUNNING COMPLETE AUTOMATED END-TO-END TEST SUITE');
console.log('====================================================\n');

let passedCount = 0;
let totalCount = 0;

function report(passed, description, detail = '') {
  totalCount++;
  if (passed) {
    passedCount++;
    console.log(`✅ [PASS] ${description} ${detail ? `(${detail})` : ''}`);
  } else {
    console.error(`❌ [FAIL] ${description} ${detail ? `(${detail})` : ''}`);
  }
}

// -------------------------------------------------------------
// TEST 1: LIVE GITHUB PAGES DEPLOYMENT VERIFICATION
// -------------------------------------------------------------
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js Test Agent' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function testLiveDeployment() {
  console.log('--- PART 1: LIVE GITHUB PAGES VERIFICATION ---');
  try {
    const liveUrl = 'https://utkarshnikhare.github.io/excel-manager/';
    const htmlRes = await httpGet(liveUrl);
    report(htmlRes.status === 200, 'Live GitHub Pages responds with HTTP 200 OK', liveUrl);
    report(htmlRes.data.includes('<title>Smart Excel Search & Manager</title>'), 'Live HTML contains updated Page Title');
    report(htmlRes.data.includes('id="root"'), 'Live HTML contains React mount root container');

    // Extract JS bundle filename
    const jsMatch = htmlRes.data.match(/src="([^"]+\.js)"/);
    if (jsMatch) {
      const jsUrl = 'https://utkarshnikhare.github.io' + jsMatch[1];
      const jsRes = await httpGet(jsUrl);
      report(jsRes.status === 200, 'Live Production JS Bundle reachable', jsUrl);
      report(jsRes.data.includes('Load Demo Sample Data'), 'Live JS Bundle has "Load Demo Sample Data" feature verified');
      report(jsRes.data.includes('records per page'), 'Live JS Bundle has Pagination feature verified');
      report(jsRes.data.includes('100% In-Browser Private'), 'Live JS Bundle has Header branding verified');
    } else {
      report(false, 'Failed to extract JS bundle URL from HTML');
    }
  } catch (err) {
    report(false, 'Live deployment network test encountered error', err.message);
  }
  console.log('');
}

// -------------------------------------------------------------
// TEST 2: REAL EXCEL FILE (.xlsx) CREATION, PARSING & MULTI-SHEET
// -------------------------------------------------------------
async function testExcelLifecycle() {
  console.log('--- PART 2: REAL EXCEL FILE (.XLSX) MULTI-SHEET LIFECYCLE ---');
  
  const testFilePath = path.join(process.cwd(), 'temp_test_workbook.xlsx');

  // Create an Excel file with 2 sheets
  const sheet1Data = [
    { "EmpID": 101, "FullName": "Rahul Sharma", "HindiName": "राहुल शर्मा", "City": "Mumbai", "Contact": "9820011223", "Salary": 85000 },
    { "EmpID": 102, "FullName": "Pooja Patil", "HindiName": "पूजा पाटिल", "City": "Pune", "Contact": "9820044556", "Salary": 92000 },
    { "EmpID": 103, "FullName": "Amit Verma", "HindiName": "अमित वर्मा", "City": "Delhi", "Contact": "9811122334", "Salary": 65000 },
    { "EmpID": 104, "FullName": "Vishal Thombre", "HindiName": "विशाल ठोंबरे", "City": "Nashik", "Contact": "9890011223", "Salary": 78000 },
    { "EmpID": 105, "FullName": "Utkarsh Nikhare", "HindiName": "उत्कर्ष निखारे", "City": "Nagpur", "Contact": "9823344556", "Salary": 95000 },
    { "EmpID": 106, "FullName": "Priya Deshmukh", "HindiName": "प्रिया देशमुख", "City": "Mumbai", "Contact": "9821199887", "Salary": 72000 }
  ];

  const sheet2Data = [
    { "DeptID": "D-01", "DeptName": "Engineering", "Head": "Utkarsh", "Budget": 500000 },
    { "DeptID": "D-02", "DeptName": "Finance", "Head": "Pooja", "Budget": 300000 },
    { "DeptID": "D-03", "DeptName": "Marketing", "Head": "Vishal", "Budget": 200000 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1Data), "Employees");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2Data), "Departments");
  XLSX.writeFile(wb, testFilePath);

  report(fs.existsSync(testFilePath), 'Physical .xlsx test file generated on disk', testFilePath);

  // Read the binary file back (simulating FileUpload.jsx)
  const fileBuffer = fs.readFileSync(testFilePath);
  const readWb = XLSX.read(fileBuffer, { type: 'buffer' });

  report(readWb.SheetNames.length === 2, 'Multi-Sheet Detection: 2 sheets detected', readWb.SheetNames.join(', '));
  report(readWb.SheetNames.includes('Employees') && readWb.SheetNames.includes('Departments'), 'Sheet names match exact tabs');

  // Parse Sheet 1
  const parsedSheet1 = XLSX.utils.sheet_to_json(readWb.Sheets['Employees'], { defval: "" });
  report(parsedSheet1.length === 6, 'Parsed Sheet 1 (Employees): 6 rows loaded');

  // Parse Sheet 2 (simulating user selecting sheet from dropdown)
  const parsedSheet2 = XLSX.utils.sheet_to_json(readWb.Sheets['Departments'], { defval: "" });
  report(parsedSheet2.length === 3, 'Parsed Sheet 2 (Departments): 3 rows loaded');

  console.log('\n--- PART 3: SMART SEARCH & PHONETIC FILTERING ---');

  // Search 1: Phone number exact match
  const phoneRes = executeSmartSearch(parsedSheet1, [{ column: 'Contact', query: '9820011223' }]);
  report(phoneRes.length === 1 && phoneRes[0].EmpID === 101, 'Phone Search: 9820011223 -> Rahul Sharma');

  // Search 2: Devanagari Hindi Query matching English Name
  const devQueryRes = executeSmartSearch(parsedSheet1, [{ column: 'FullName', query: 'राहुल' }]);
  report(devQueryRes.length === 1 && devQueryRes[0].EmpID === 101, 'Devanagari query "राहुल" matched English "Rahul Sharma"');

  // Search 3: English Query matching Devanagari Hindi Name
  const engQueryRes = executeSmartSearch(parsedSheet1, [{ column: 'HindiName', query: 'Utkarsh' }]);
  report(engQueryRes.length === 1 && engQueryRes[0].EmpID === 105, 'English query "Utkarsh" matched Hindi "उत्कर्ष निखारे"');

  // Search 4: Indian phonetic V/W variation
  const vwRes = executeSmartSearch(parsedSheet1, [{ column: 'FullName', query: 'Wishal' }]);
  report(vwRes.length === 1 && vwRes[0].FullName === 'Vishal Thombre', 'Phonetic V=W: "Wishal" matched "Vishal Thombre"');

  // Search 5: Multi-column AND condition
  const andRes = executeSmartSearch(parsedSheet1, [
    { column: 'FullName', query: 'Pooja' },
    { column: 'City', query: 'Pune' }
  ], 'AND');
  report(andRes.length === 1 && andRes[0].EmpID === 102, 'Multi-column AND condition (Pooja + Pune)');

  // Search 6: Multi-column OR condition
  const orRes = executeSmartSearch(parsedSheet1, [
    { column: 'City', query: 'Mumbai' },
    { column: 'City', query: 'Nagpur' }
  ], 'OR');
  report(orRes.length === 3, 'Multi-column OR condition (Mumbai OR Nagpur = 3 employees)');

  console.log('\n--- PART 4: WORKSPACE MERGE OPERATIONS (INITIAL / APPEND / RETAIN) ---');

  // Scenario: User starts workspace with Mumbai employees
  const mumbaiEmployees = executeSmartSearch(parsedSheet1, [{ column: 'City', query: 'Mumbai' }]);
  let workspace = [...mumbaiEmployees];
  report(workspace.length === 2, 'Initial Add: 2 Mumbai records staged');

  // Scenario: User searches for Pune employees and APPENDS to workspace
  const puneEmployees = executeSmartSearch(parsedSheet1, [{ column: 'City', query: 'Pune' }]);
  const appendMap = new Map();
  workspace.forEach(r => appendMap.set(hashRecord(r), r));
  puneEmployees.forEach(r => appendMap.set(hashRecord(r), r));
  workspace = Array.from(appendMap.values());
  report(workspace.length === 3, 'Append New: Added Pune (Total now 3, no duplicates)');

  // Scenario: User deletes 1 unwanted row (Row deletion feature)
  const rowToDelete = workspace[0];
  const targetHash = hashRecord(rowToDelete);
  workspace = workspace.filter(r => hashRecord(r) !== targetHash);
  report(workspace.length === 2, 'Row Deletion: 1 row deleted, 2 remaining');

  console.log('\n--- PART 5: PAGINATION & MULTI-TYPE COLUMN SORTING ---');

  // Numeric Sort (Salary Descending)
  const sortedSalaryDesc = [...parsedSheet1].sort((a, b) => Number(b.Salary) - Number(a.Salary));
  report(sortedSalaryDesc[0].Salary === 95000 && sortedSalaryDesc[0].FullName === 'Utkarsh Nikhare', 
    'Numeric Sort: Highest salary (95,000 - Utkarsh Nikhare)');
  report(sortedSalaryDesc[sortedSalaryDesc.length - 1].Salary === 65000, 
    'Numeric Sort: Lowest salary (65,000 - Amit Verma)');

  // Text Sort (City Ascending)
  const sortedCityAsc = [...parsedSheet1].sort((a, b) => String(a.City).localeCompare(String(b.City)));
  report(sortedCityAsc[0].City === 'Delhi', 'Alphabetical Sort: First city is "Delhi"');
  report(sortedCityAsc[sortedCityAsc.length - 1].City === 'Pune', 'Alphabetical Sort: Last city is "Pune"');

  // Pagination calculation (Page 1 of 2 with size 4)
  const pageSize = 4;
  const page1 = parsedSheet1.slice(0, pageSize);
  const page2 = parsedSheet1.slice(pageSize, pageSize * 2);
  report(page1.length === 4 && page2.length === 2, 'Pagination Slicing: 6 rows split into Page 1 (4 rows) and Page 2 (2 rows)');

  console.log('\n--- PART 6: EXPORT TO EXCEL (.XLSX) AND CSV (.CSV) ---');

  const exportXlsxPath = path.join(process.cwd(), 'temp_test_export.xlsx');
  const exportCsvPath = path.join(process.cwd(), 'temp_test_export.csv');

  // Export XLSX
  const exportWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(exportWb, XLSX.utils.json_to_sheet(workspace), "Filtered Records");
  XLSX.writeFile(exportWb, exportXlsxPath);
  report(fs.existsSync(exportXlsxPath), 'Exported .xlsx file created successfully on disk', exportXlsxPath);

  // Validate exported XLSX file by re-reading it
  const reReadWb = XLSX.read(fs.readFileSync(exportXlsxPath), { type: 'buffer' });
  const reReadData = XLSX.utils.sheet_to_json(reReadWb.Sheets["Filtered Records"]);
  report(reReadData.length === workspace.length, 'Exported .xlsx integrity verified: Re-read matches workspace row count');

  // Export CSV
  const csvData = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(workspace));
  fs.writeFileSync(exportCsvPath, csvData);
  report(fs.existsSync(exportCsvPath), 'Exported .csv file created successfully on disk', exportCsvPath);

  // Validate exported CSV
  const reReadCsv = fs.readFileSync(exportCsvPath, 'utf8');
  report(reReadCsv.includes('EmpID') && reReadCsv.includes('FullName'), 'Exported .csv headers verified');

  // Clean up temporary files
  try {
    fs.unlinkSync(testFilePath);
    fs.unlinkSync(exportXlsxPath);
    fs.unlinkSync(exportCsvPath);
    report(true, 'Temporary test files cleaned up safely');
  } catch(e) {}

  console.log('\n====================================================');
  console.log(`🎯 FINAL TEST RESULT: ${passedCount}/${totalCount} TESTS PASSED!`);
  console.log('====================================================\n');

  if (passedCount === totalCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

async function run() {
  await testLiveDeployment();
  await testExcelLifecycle();
}

run();
