import XLSX from 'xlsx';
import assert from 'assert';

console.log('--- EXCEL EXPORT ROUNDTRIP & INTEGRITY VERIFICATION ---');

const sanitizeExportValue = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/^[=+\-@\t\r]/.test(str) && isNaN(Number(str))) {
    return `'${str}`;
  }
  return str;
};

const testRecords = [
  {
    docno: '00123',
    party: 'ज्ञानेश्वर विठ्ठल पाटील',
    phone: '09820011223',
    balance: -500,
    price: 4500000,
    bad1: '=cmd|"/C calc"!A0',
    bad2: '@SUM(1,2)',
    bad3: '+10+20'
  }
];

const cleanRows = testRecords.map(row => {
  const obj = {};
  for (let k of Object.keys(row)) {
    obj[k] = sanitizeExportValue(row[k]);
  }
  return obj;
});

const ws = XLSX.utils.json_to_sheet(cleanRows);
const wb = XLSX.utils.book_new();

// Test sheet name sanitization
const rawSheetName = 'My/Illegal*Sheet:Name?TooLong12345678901234567890';
const sanitizedSheetName = String(rawSheetName)
  .replace(/[\\/?*\[\]:]/g, '_')
  .slice(0, 31) || "Sheet1";

assert.strictEqual(sanitizedSheetName.length <= 31, true);
assert.strictEqual(/[/\\?*\[\]:]/.test(sanitizedSheetName), false);

XLSX.utils.book_append_sheet(wb, ws, sanitizedSheetName);

const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
const wbRead = XLSX.read(buf, { type: 'buffer' });
const wsRead = wbRead.Sheets[sanitizedSheetName];
const dataRead = XLSX.utils.sheet_to_json(wsRead);

const r = dataRead[0];
console.log('Re-read record:', r);

assert.strictEqual(r.docno, '00123', 'Leading zeros must be preserved');
assert.strictEqual(r.party, 'ज्ञानेश्वर विठ्ठल पाटील', 'Devanagari Unicode must be preserved');
assert.strictEqual(Number(r.balance), -500, 'Legitimate negative numbers must not be corrupted');
assert.strictEqual(Number(r.price), 4500000, 'Numeric consideration must be preserved');
assert(r.bad1.startsWith("'="), 'Formula starting with = must be neutralized');
assert(r.bad2.startsWith("'@"), 'Formula starting with @ must be neutralized');
assert(r.bad3.startsWith("'+"), 'Formula starting with + must be neutralized');

console.log('✅ PASS: Excel Export Roundtrip & Integrity verified successfully!');
