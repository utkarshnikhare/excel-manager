import fs from 'fs';

const p = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f6ddc5b3-9d5e-4971-a7a1-9399c972ad06\\.system_generated\\logs\\transcript_full.jsonl';
const raw = fs.readFileSync(p, 'utf8');
const idx = raw.indexOf('ctl00_MainContent_GrdResult');
console.log('Index of ctl00_MainContent_GrdResult in raw file:', idx);
if (idx !== -1) {
  console.log('Found around idx:', raw.substring(idx - 100, idx + 200));
}
