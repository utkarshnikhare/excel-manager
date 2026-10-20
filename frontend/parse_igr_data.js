import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const transcriptPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f6ddc5b3-9d5e-4971-a7a1-9399c972ad06\\.system_generated\\logs\\transcript_full.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').trim().split('\n');
let content = '';
for (let i = lines.length - 1; i >= 0; i--) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.content && obj.content.includes('ctl00_MainContent_GrdResult')) {
      content = obj.content;
      console.log(`Found IGR table in transcript step ${i}!`);
      break;
    }
  } catch (e) {}
}

const tableMatches = content.match(/<table cellspacing="0"[^>]*>[\s\S]*?<\/table>/g);

if (!tableMatches || tableMatches.length === 0) {
  console.error('No table found in last message!');
  process.exit(1);
}

console.log(`Found ${tableMatches.length} tables in user message!`);

const sheetNames = ['2023_Records', '2024_Records', '2025_2026_Records', '2018_Records'];
const finalWb = XLSX.utils.book_new();

let totalRows = 0;

tableMatches.forEach((tableHtml, index) => {
  const wb = XLSX.read(tableHtml, { type: 'string' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet);
  const sheetName = sheetNames[index] || `Batch_${index + 1}`;
  
  XLSX.utils.book_append_sheet(finalWb, sheet, sheetName);
  console.log(`Sheet "${sheetName}": ${json.length} records parsed.`);
  totalRows += json.length;
});

const outPath1 = path.join(process.cwd(), 'public', 'Lohgaon_Property_Records.xlsx');
const outPath2 = path.join(process.cwd(), '..', 'Lohgaon_Property_Records.xlsx');
const outJsonPath = path.join(process.cwd(), 'src', 'data', 'igr_sample.json');

fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });

XLSX.writeFile(finalWb, outPath1);
XLSX.writeFile(finalWb, outPath2);

// Also save primary sheet as JSON for instant demo loading
const firstSheetJson = XLSX.utils.sheet_to_json(finalWb.Sheets[sheetNames[0]]);
fs.writeFileSync(outJsonPath, JSON.stringify(firstSheetJson, null, 2), 'utf8');

console.log(`\n🎉 Successfully compiled ${totalRows} total property records across ${tableMatches.length} sheets!`);
console.log(`Saved to: ${outPath1} and ${outPath2}`);
