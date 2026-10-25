import assert from 'assert';
import { getPartyRoleLabels, compilePropertyTimeline } from './src/utils/propertyTimeline.js';

console.log('================================================================');
console.log('🛡️ ADVERSARIAL QA & SECURITY REGRESSION TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function test(name, fn) {
  totalCount++;
  try {
    fn();
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
  
  // If purely numeric (e.g. "-500", "4500000", "-12.34"), preserve without corrupting
  if (!isNaN(Number(str)) && !/^\s*0[0-9]+/.test(str)) {
    return str;
  }
  
  // Check if string (or trimmed string) starts with formula triggers (=, +, -, @, \t, \r, \n, |, %)
  const trimmed = str.replace(/^[\s\uFEFF\xA0]+/, '');
  if (/^[=+\-@\t\r\n|%]/.test(trimmed)) {
    return `'${str}`;
  }
  return str;
};

test('Neutralizes formula with leading space ( =cmd)', () => {
  const res = sanitizeExportValueHardened(' =cmd|"/C calc"!A0');
  assert.strictEqual(res.startsWith("'"), true);
});

test('Neutralizes formula with multiple leading spaces (   =1+1)', () => {
  const res = sanitizeExportValueHardened('   =1+1');
  assert.strictEqual(res.startsWith("'"), true);
});

test('Neutralizes formula with leading line feed (\\n=cmd)', () => {
  const res = sanitizeExportValueHardened('\n=cmd|"/C calc"!A0');
  assert.strictEqual(res.startsWith("'"), true);
});

test('Neutralizes formula with DDE pipe trigger (|calc.exe)', () => {
  const res = sanitizeExportValueHardened('|calc.exe');
  assert.strictEqual(res.startsWith("'"), true);
});

test('Neutralizes HYPERLINK formula', () => {
  const res = sanitizeExportValueHardened('=HYPERLINK("https://attacker.example","click")');
  assert.strictEqual(res.startsWith("'"), true);
});

test('Neutralizes WEBSERVICE formula', () => {
  const res = sanitizeExportValueHardened('=WEBSERVICE("https://attacker.example")');
  assert.strictEqual(res.startsWith("'"), true);
});

test('Preserves legitimate negative integer without modification', () => {
  const res = sanitizeExportValueHardened(-500);
  assert.strictEqual(res, -500);
});

test('Preserves legitimate negative string without single quote prefix', () => {
  const res = sanitizeExportValueHardened('-500');
  assert.strictEqual(res, '-500');
  assert.strictEqual(res.startsWith("'"), false);
});

test('Preserves legitimate leading-zero phone number as string', () => {
  const res = sanitizeExportValueHardened('09820011223');
  assert.strictEqual(res, '09820011223');
  assert.strictEqual(res.startsWith("'"), false);
});

test('Sanitizes malicious column headers on export', () => {
  const maliciousHeader = '=cmd|"/C calc"!A0';
  const sanitizedHeader = sanitizeExportValueHardened(maliciousHeader);
  assert.strictEqual(sanitizedHeader.startsWith("'"), true);
});

// -------------------------------------------------------------
// 2. EXTENDED MAHARASHTRA PROPERTY TIMELINE ROLES
// -------------------------------------------------------------
console.log('\n--- 2. Extended Maharashtra Property Deed Classification ---');

test('Partition Deed (वाटपपत्र) labels Co-Sharer and Allottee as non-conveyance', () => {
  const roles = getPartyRoleLabels('वाटपपत्र (Partition Deed)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('Co-Sharer') || roles.role1Label.includes('सहहिस्सेदार'));
  assert(roles.role2Label.includes('Allottee') || roles.role2Label.includes('वाटप'));
  assert.strictEqual(roles.verb, 'PARTITIONED WITH');
});

test('Rectification Deed (दुरुस्तीपत्र) labels Executing & Claimant Parties', () => {
  const roles = getPartyRoleLabels('दुरुस्तीपत्र (Rectification Deed)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('Executing') || roles.role1Label.includes('दुरुस्ती'));
  assert(roles.role2Label.includes('Claimant') || roles.role2Label.includes('मिळवणारा'));
  assert.strictEqual(roles.verb, 'RECTIFIED WITH');
});

test('Exchange Deed (अदलाबदल) labels First Party & Second Party', () => {
  const roles = getPartyRoleLabels('अदलाबदल (Exchange Deed)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('First Party') || roles.role1Label.includes('प्रथम'));
  assert(roles.role2Label.includes('Second Party') || roles.role2Label.includes('द्वितीय'));
  assert.strictEqual(roles.verb, 'EXCHANGED WITH');
});

test('Development Agreement (विकास करार) labels Landowner and Developer', () => {
  const roles = getPartyRoleLabels('विकास करार (Development Agreement)');
  assert.strictEqual(roles.isConveyance, false);
  assert(roles.role1Label.includes('Landowner') || roles.role1Label.includes('मालक'));
  assert(roles.role2Label.includes('Developer') || roles.role2Label.includes('विकासक'));
  assert.strictEqual(roles.verb, 'ASSIGNED RIGHTS TO');
});

test('Partition / Rectification deeds do not distort sale price appreciation', () => {
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

console.log('\n================================================================');
console.log(`🎉 REGRESSION TESTS SUMMARY: ${passCount}/${totalCount} PASSED`);
console.log('================================================================\n');

if (passCount !== totalCount) {
  process.exit(1);
}
