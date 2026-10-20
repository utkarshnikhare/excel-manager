import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const userUploadedDir = 'C:/Users/Admin/.gemini/antigravity/brain/f6ddc5b3-9d5e-4971-a7a1-9399c972ad06/.user_uploaded';
const files = fs.readdirSync(userUploadedDir).filter(f => f.endsWith('.xls'));

console.log('Processing files:', files);

// Function to extract society/project name from Marathi text
function extractSociety(desc) {
  if (!desc) return 'Other / Open Land';
  if (/स्कायवेज|skyways/i.test(desc)) return 'Skyways Esfera';
  if (/एरोपोलीस|एरोपोलिस|aeropolis/i.test(desc)) return 'Aeropolis';
  if (/प्राईड|प्राइड|आशियाना|aashiyana|pride/i.test(desc)) return 'Pride Aashiyana';
  if (/गुडविल|गुडव्हील|goodwill/i.test(desc)) return 'Goodwill Nirmiti';
  if (/ट्रिया|हिलोम|triaa|hillome/i.test(desc)) return 'Triaa Hillome';
  if (/साई शांती|shanti park/i.test(desc)) return 'Sai Shanti Park';
  if (/मॅजेस्टिक|majestic/i.test(desc)) return 'Majestic';
  if (/मोझे|moze/i.test(desc)) return 'Moze Associates';
  if (/सदनिका|फ्लॅट|फलॅट|flat/i.test(desc)) return 'Residential Flat';
  return 'Lohgaon Property';
}

function extractCarpetArea(desc) {
  if (!desc) return null;
  const sqftMatch = desc.match(/([\d\.]+)\s*चौ\.?\s*फुट/i);
  if (sqftMatch) return parseFloat(sqftMatch[1]);
  const sqmMatch = desc.match(/([\d\.]+)\s*चौ\.?\s*मी/i);
  if (sqmMatch) return Math.round(parseFloat(sqmMatch[1]) * 10.7639 * 100) / 100;
  return null;
}

function extractFlatNo(desc) {
  if (!desc) return null;
  const match = desc.match(/(?:फलॅट|फ्लॅट|सदनिका|गाळा|office|flat)\s*(?:नं|क्र|नं\.|क्र\.)?\s*([A-Za-z0-9\-]+)/i);
  return match ? match[1] : null;
}

function cleanParties(str) {
  if (!str) return '';
  return str.replace(/[\{\}\"\[\]]/g, '').replace(/--/g, ' ').replace(/\s+/g, ' ').trim();
}

let allRows = [];
const byYear = {};
const seenDocs = new Set();

for (const f of files) {
  const p = path.join(userUploadedDir, f);
  const buf = fs.readFileSync(p);
  const isUtf16 = buf[0] === 0xff && buf[1] === 0xfe;
  const str = isUtf16 ? buf.toString('utf16le') : buf.toString('utf8');
  
  const wb = XLSX.read(str, { type: 'string', raw: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

  for (const r of rows) {
    if (!r.docno && !r.registrationdate) continue;
    
    // Deduplicate by docno + srocode + registrationdate
    const dedupeKey = `${r.srocode}_${r.docno}_${r.registrationdate}`;
    if (seenDocs.has(dedupeKey)) continue;
    seenDocs.add(dedupeKey);

    const society = extractSociety(r.propertydescription);
    const carpetSqft = extractCarpetArea(r.propertydescription);
    const flatNo = extractFlatNo(r.propertydescription);
    const consAmt = parseFloat(r.consideration_amt) || 0;
    const mktVal = parseFloat(r.marketvalue) || 0;
    const stampDuty = parseFloat(r.stampdutypaid) || 0;
    const regFee = parseFloat(r.registrationfees) || 0;
    
    let rateSqft = null;
    if (carpetSqft && carpetSqft > 100 && consAmt > 100000) {
      rateSqft = Math.round(consAmt / carpetSqft);
    }

    const dateParts = String(r.registrationdate || '').split('/');
    let year = 'Unknown';
    if (dateParts.length === 3) {
      year = dateParts[2].trim();
    }

    const enrichedRow = {
      docno: r.docno,
      registrationdate: r.registrationdate,
      society: society,
      flat_no: flatNo || '',
      carpet_sqft: carpetSqft || '',
      rate_per_sqft: rateSqft || '',
      consideration_amt: consAmt,
      marketvalue: mktVal,
      stampdutypaid: stampDuty,
      registrationfees: regFee,
      docname: r.docname,
      sellerparty: cleanParties(r.sellerparty),
      purchaserparty: cleanParties(r.purchaserparty),
      propertydescription: r.propertydescription,
      sroname: r.sroname,
      srocode: r.srocode,
      areaname: r.areaname || 'लोहगांव'
    };

    allRows.push(enrichedRow);
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(enrichedRow);
  }
}

// Sort allRows by registrationdate descending (newest first)
allRows.sort((a, b) => {
  const pA = String(a.registrationdate).split('/').reverse().join('-');
  const pB = String(b.registrationdate).split('/').reverse().join('-');
  return pB.localeCompare(pA);
});

console.log(`Successfully compiled ${allRows.length} unique property deeds!`);
console.log('Years distribution:', Object.keys(byYear).map(y => `${y}: ${byYear[y].length} deeds`));

const societies = {};
allRows.forEach(r => societies[r.society] = (societies[r.society] || 0) + 1);
console.log('Top Societies:', societies);

// Calculate totals
let totalCons = allRows.reduce((sum, r) => sum + r.consideration_amt, 0);
let totalStamp = allRows.reduce((sum, r) => sum + r.stampdutypaid, 0);
console.log(`Total Value: ₹${(totalCons / 10000000).toFixed(2)} Crores`);
console.log(`Total Stamp Duty: ₹${(totalStamp / 10000000).toFixed(2)} Crores`);

// Create final multi-sheet workbook
const finalWb = XLSX.utils.book_new();

// Sheet 1: All Deeds
const allSheet = XLSX.utils.json_to_sheet(allRows);
XLSX.utils.book_append_sheet(finalWb, allSheet, 'All_3500_Deeds');

// Sheets by major years
const sortedYears = Object.keys(byYear).sort().reverse();
for (const y of sortedYears) {
  if (byYear[y].length >= 50) {
    const yrSheet = XLSX.utils.json_to_sheet(byYear[y]);
    XLSX.utils.book_append_sheet(finalWb, yrSheet, `Deeds_${y}`);
  }
}

// Write to:
// 1. root Lohgaon_Property_Records.xlsx
// 2. frontend/public/Lohgaon_Property_Records.xlsx
// 3. frontend/dist/Lohgaon_Property_Records.xlsx

const rootPath = path.resolve('..', 'Lohgaon_Property_Records.xlsx');
const publicPath = path.resolve('public', 'Lohgaon_Property_Records.xlsx');
const distPath = path.resolve('dist', 'Lohgaon_Property_Records.xlsx');

XLSX.writeFile(finalWb, rootPath);
XLSX.writeFile(finalWb, publicPath);
if (fs.existsSync('dist')) {
  XLSX.writeFile(finalWb, distPath);
}

// Also save clean JSON for ultra-fast instant 50ms loading in web app
const jsonString = JSON.stringify(allRows);
fs.writeFileSync(path.resolve('public', 'lohgaon_deeds.json'), jsonString);
if (fs.existsSync('dist')) {
  fs.writeFileSync(path.resolve('dist', 'lohgaon_deeds.json'), jsonString);
}

console.log('Successfully wrote multi-sheet Excel files and JSON to:');
console.log('-', rootPath);
console.log('-', publicPath);
console.log('-', path.resolve('public', 'lohgaon_deeds.json'));
