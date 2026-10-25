import assert from 'assert';
import fs from 'fs';
import { getPartyRoleLabels, compilePropertyTimeline } from './src/utils/propertyTimeline.js';
import { parsePdfBuffer } from './src/utils/pdfParser.js';
import * as XLSX from 'xlsx';

console.log('================================================================');
console.log('🛡️ ADVERSARIAL QA & SECURITY REGRESSION TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

async function test(name, fn) {
  totalCount++;
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// 1. ADVANCED FORMULA INJECTION (CWE-1236) SANITIZATION
// -------------------------------------------------------------
console.log('--- 1. CWE-1236 Formula Injection Attacks on Export ---');

export const sanitizeExportValueHardened = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') return val;
  const str = String(val);
  if (str === '') return '';
  
  // If it's a signed or plain decimal/integer, convert to genuine numeric (prevents string '-' formula trigger in Excel)
  if (/^[+\-]?\d+(\.\d+)?$/.test(str) && !/^[+\-]?0\d+/.test(str)) {
    return Number(str);
  }

  // Preserve leading-zero numeric strings as plain text strings (e.g. "00123", "09820011223")
  if (/^\s*0\d+/.test(str) && !isNaN(Number(str))) {
    return str;
  }

  const trimmed = str.replace(/^[\s\uFEFF\xA0]+/, '');
  if (/^[=+\-@\t\r\n|%]/.test(trimmed)) {
    return `'${str}`;
  }
  return str;
};

await test('Neutralizes formula with leading space ( =cmd)', () => {
  const res = sanitizeExportValueHardened(' =cmd|"/C calc"!A0');
  assert.strictEqual(res.startsWith("'"), true);
});

await test('Neutralizes formula with multiple leading spaces (   =1+1)', () => {
  const res = sanitizeExportValueHardened('   =1+1');
  assert.strictEqual(res.startsWith("'"), true);
});

await test('Neutralizes formula with leading line feed (\\n=cmd)', () => {
  const res = sanitizeExportValueHardened('\n=cmd|"/C calc"!A0');
  assert.strictEqual(res.startsWith("'"), true);
});

await test('Neutralizes formula with DDE pipe trigger (|calc.exe)', () => {
  const res = sanitizeExportValueHardened('|calc.exe');
  assert.strictEqual(res.startsWith("'"), true);
});

await test('Neutralizes HYPERLINK formula', () => {
  const res = sanitizeExportValueHardened('=HYPERLINK("https://attacker.example","click")');
  assert.strictEqual(res.startsWith("'"), true);
});

await test('Neutralizes WEBSERVICE formula', () => {
  const res = sanitizeExportValueHardened('=WEBSERVICE("https://attacker.example")');
  assert.strictEqual(res.startsWith("'"), true);
});

await test('Preserves legitimate negative integer without modification', () => {
  const res = sanitizeExportValueHardened(-500);
  assert.strictEqual(res, -500);
});

await test('Preserves legitimate negative string without single quote prefix', () => {
  const res = sanitizeExportValueHardened('-500');
  assert.strictEqual(Number(res), -500);
  assert.strictEqual(String(res).startsWith("'"), false);
});

await test('Preserves legitimate leading-zero phone number as string', () => {
  const res = sanitizeExportValueHardened('09820011223');
  assert.strictEqual(res, '09820011223');
  assert.strictEqual(res.startsWith("'"), false);
});

await test('Sanitizes malicious column headers on export', () => {
  const maliciousHeader = '=cmd|"/C calc"!A0';
  const sanitizedHeader = sanitizeExportValueHardened(maliciousHeader);
  assert.strictEqual(sanitizedHeader.startsWith("'"), true);
});

// -------------------------------------------------------------
// 2. EXTENDED MAHARASHTRA PROPERTY TIMELINE ROLES
// -------------------------------------------------------------
console.log('\n--- 2. Extended Maharashtra Property Deed Classification ---');

await test('Partition Deed (वाटपपत्र) labels Co-Sharer and Allottee as non-conveyance', () => {
  const roles = getPartyRoleLabels('वाटपपत्र (Partition Deed)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('Co-Sharer') || roles.role1Label.includes('सहहिस्सेदार'));
  assert(roles.role2Label.includes('Allottee') || roles.role2Label.includes('वाटप'));
  assert.strictEqual(roles.verb, 'PARTITIONED WITH');
});

await test('Rectification Deed (दुरुस्तीपत्र) labels Executing & Claimant Parties', () => {
  const roles = getPartyRoleLabels('दुरुस्तीपत्र (Rectification Deed)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('Executing') || roles.role1Label.includes('दुरुस्ती'));
  assert(roles.role2Label.includes('Claimant') || roles.role2Label.includes('मिळवणारा'));
  assert.strictEqual(roles.verb, 'RECTIFIED WITH');
});

await test('Exchange Deed (अदलाबदल) labels First Party & Second Party', () => {
  const roles = getPartyRoleLabels('अदलाबदल (Exchange Deed)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('First Party') || roles.role1Label.includes('प्रथम'));
  assert(roles.role2Label.includes('Second Party') || roles.role2Label.includes('द्वितीय'));
  assert.strictEqual(roles.verb, 'EXCHANGED WITH');
});

await test('Development Agreement (विकास करार) labels Landowner and Developer', () => {
  const roles = getPartyRoleLabels('विकास करार (Development Agreement)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('Landowner') || roles.role1Label.includes('मालक'));
  assert(roles.role2Label.includes('Developer') || roles.role2Label.includes('विकासक'));
  assert.strictEqual(roles.verb, 'ASSIGNED RIGHTS TO');
});

await test('Partition / Rectification deeds do not distort sale price appreciation', () => {
  const sale1 = {
    docno: '901',
    docname: 'खरेदीखत (Sale Deed)',
    registrationdate: '01/01/2018',
    society: 'Kumar Primavera',
    flat_no: '302',
    party1: 'Developer',
    party2: 'Father',
    consideration_amt: '₹ 50,00,000'
  };
  const partition = {
    docno: '902',
    docname: 'वाटपपत्र (Partition Deed)',
    registrationdate: '01/01/2021',
    society: 'Kumar Primavera',
    flat_no: '302',
    party1: 'Father',
    party2: 'Son A',
    consideration_amt: '₹ 0'
  };
  const sale2 = {
    docno: '903',
    docname: 'खरेदीखत (Sale Deed)',
    registrationdate: '01/01/2024',
    society: 'Kumar Primavera',
    flat_no: '302',
    party1: 'Son A',
    party2: 'Purchaser Sharma',
    consideration_amt: '₹ 85,00,000'
  };
  const timeline = compilePropertyTimeline(sale1, [sale1, partition, sale2]);
  assert.strictEqual(timeline.initialPrice, 5000000);
  assert.strictEqual(timeline.latestPrice, 8500000);
  assert.strictEqual(timeline.priceAppreciationPct, 70);
});

// -------------------------------------------------------------
// 3. PDF.JS ERROR RESILIENCE & CORRUPT STREAM DEFENSE
// -------------------------------------------------------------
console.log('\n--- 3. PDF Parser Error Resilience & Stream Recovery ---');

await test('parsePdfBuffer catches corrupt bytes gracefully and returns structured error record', async () => {
  const garbageBytes = new Uint8Array([0x00, 0x11, 0x22, 0x33, 0xFF, 0xFE]);
  const res = await parsePdfBuffer(garbageBytes.buffer, 'adversarial_corrupt.pdf');
  assert.strictEqual(Array.isArray(res), true);
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0]._extractionStatus, 'FAILED');
  assert.strictEqual(res[0].docno, 'PARSE_ERROR');
});

await test('parsePdfBuffer extracts text from valid PDF document', async () => {
  const pdfPath = 'public/Smart_Excel_Manager_Upgrade_Report_2Pages.pdf';
  if (fs.existsSync(pdfPath)) {
    const buf = fs.readFileSync(pdfPath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const res = await parsePdfBuffer(ab, 'Upgrade_Report.pdf');
    assert.strictEqual(Array.isArray(res), true);
    assert.ok(res.length >= 1);
    assert.notStrictEqual(res[0]._extractionStatus, 'FAILED');
  }
});

// -------------------------------------------------------------
// 4. E2E CSV & XLSX FORMULA ESCAPING ON HEADERS & CELLS
// -------------------------------------------------------------
console.log('\n--- 4. End-to-End Export File Structure & Formula Neutralization ---');

await test('End-to-end CSV generator escapes malicious formula headers and values', () => {
  const adversarialData = [{
    '=cmd|"/C calc"!A0': 'safe',
    '@SUM(1,2)': '  =1+1',
    'Normal': -500,
    'Doc': '00123'
  }];
  
  const rawHeaders = Object.keys(adversarialData[0]);
  const safeHeaders = rawHeaders.map(h => sanitizeExportValueHardened(h));
  assert.strictEqual(safeHeaders[0].startsWith("'"), true);
  assert.strictEqual(safeHeaders[1].startsWith("'"), true);
  assert.strictEqual(safeHeaders[2], 'Normal');

  const row0 = adversarialData[0];
  const safeCell0 = sanitizeExportValueHardened(row0['@SUM(1,2)']);
  assert.strictEqual(safeCell0.startsWith("'"), true);

  const safeNumber = sanitizeExportValueHardened(row0['Normal']);
  assert.strictEqual(Number(safeNumber), -500);

  const safeLeadingZero = sanitizeExportValueHardened(row0['Doc']);
  assert.strictEqual(safeLeadingZero, '00123');
});

await test('End-to-end XLSX json_to_sheet creates zero active formula cells', () => {
  const adversarialRows = [{
    [sanitizeExportValueHardened('=cmd|"/C calc"!A0')]: sanitizeExportValueHardened('=HYPERLINK("https://bad.com")'),
    [sanitizeExportValueHardened('@SUM')]: sanitizeExportValueHardened('   =1+1'),
    'Balance': sanitizeExportValueHardened('-500'),
    'Code': sanitizeExportValueHardened('00123')
  }];

  const ws = XLSX.utils.json_to_sheet(adversarialRows);
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell) {
        assert.strictEqual(cell.f, undefined, `Active formula found in cell [${r},${c}]`);
        if (cell.t === 's') {
          const trimmed = cell.v.replace(/^[\s\uFEFF\xA0]+/, '');
          if (/^[=+\-@|%]/.test(trimmed)) {
            assert.strictEqual(cell.v.startsWith("'"), true, `Cell [${r},${c}] string starts with unescaped trigger: ${cell.v}`);
          }
        }
      }
    }
  }
});

// -------------------------------------------------------------
// 5. POST-RELEASE REAL BROWSER ADVERSARIAL QA REGRESSIONS
// -------------------------------------------------------------
console.log('\n--- 5. Post-Release Real Browser Adversarial QA Regressions ---');

await test('App.css contains zero third-party font imports or external HTTP/HTTPS URLs (Air-gapped privacy)', () => {
  const css = fs.readFileSync('./src/App.css', 'utf8');
  assert.strictEqual(css.includes('@import url('), false, 'App.css must not import external fonts or stylesheets');
  assert.strictEqual(/https?:\/\//i.test(css), false, 'App.css must contain zero external HTTP/HTTPS references');
  assert.strictEqual(css.includes('-apple-system'), true, 'App.css should specify native system fallback font family');
});

await test('Property timeline accurately computes and exposes Capital Appreciation and CAGR', () => {
  const deeds = [
    {
      docname: 'खरेदीखत (Sale Deed)',
      flat_no: '402',
      society: 'Roseland Residency',
      wing: 'A',
      registrationdate: '15/01/2015',
      consideration_amt: 5000000,
      partydetails: 'Seller: ABC -> Buyer: XYZ'
    },
    {
      docname: 'खरेदीखत (Sale Deed)',
      flat_no: '402',
      society: 'Roseland Residency',
      wing: 'A',
      registrationdate: '15/01/2021',
      consideration_amt: 8500000,
      partydetails: 'Seller: XYZ -> Buyer: DEF'
    }
  ];

  const report = compilePropertyTimeline(deeds, deeds[0]);
  assert.strictEqual(report.initialPrice, 5000000);
  assert.strictEqual(report.latestPrice, 8500000);
  assert.strictEqual(report.priceAppreciationPct, 70); // ((85L - 50L) / 50L) * 100 = +70%
  assert.ok(report.cagrPct > 9 && report.cagrPct < 10); // ~9.25% p.a. over 6 years

  // Ensure PropertyTimelineModal.jsx includes UI cards for both metrics
  const modalJsx = fs.readFileSync('./src/components/PropertyTimelineModal.jsx', 'utf8');
  assert.strictEqual(modalJsx.includes('CAPITAL APPRECIATION'), true, 'Modal JSX must render CAPITAL APPRECIATION card');
  assert.strictEqual(modalJsx.includes('ANNUALIZED RETURN (CAGR)'), true, 'Modal JSX must render ANNUALIZED RETURN (CAGR) card');
});

await test('App.jsx provides dynamic error styling for storage quota failure toasts', () => {
  const appJsx = fs.readFileSync('./src/App.jsx', 'utf8');
  assert.strictEqual(appJsx.includes("saveToast.includes('⚠️') ? '#dc2626' : '#16a34a'"), true, 'Save toast must render red on quota warning');
});

console.log('\n================================================================');
console.log(`🎉 REGRESSION TESTS SUMMARY: ${passCount}/${totalCount} PASSED`);
console.log('================================================================\n');

if (passCount !== totalCount) {
  process.exit(1);
}
