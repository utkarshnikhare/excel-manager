import fs from 'fs';

const p = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f6ddc5b3-9d5e-4971-a7a1-9399c972ad06\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(p, 'utf8').trim().split('\n');
const obj = JSON.parse(lines[289]);
console.log('Keys:', Object.keys(obj));
console.log('Content length:', obj.content ? obj.content.length : 'none');
if (obj.content) {
  console.log('Ends with:', obj.content.substring(obj.content.length - 200));
}
