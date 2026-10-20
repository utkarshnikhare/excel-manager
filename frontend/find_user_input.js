import fs from 'fs';

const p = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f6ddc5b3-9d5e-4971-a7a1-9399c972ad06\\.system_generated\\logs\\transcript_full.jsonl';
const raw = fs.readFileSync(p, 'utf8');
const lines = raw.trim().split('\n');

lines.forEach((line, i) => {
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'USER_INPUT') {
      console.log(`Line ${i}: type=${obj.type}, len=${obj.content?.length}, preview=${obj.content?.substring(0, 80)}`);
    }
  } catch (e) {}
});
