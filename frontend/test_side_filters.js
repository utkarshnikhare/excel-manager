import fs from 'fs';
import { executeSmartSearch } from './src/utils/searchLogic.js';

const deeds = JSON.parse(fs.readFileSync('public/lohgaon_deeds.json', 'utf8'));

// Test: Search "dnyandeep"
const step1 = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' }
], 'AND');
console.log('Step 1: "dnyandeep" matches:', step1.length);
step1.forEach(d => console.log(`- Doc ${d.docno} (${d.registrationdate}): ${d.society} | Flat ${d.flat_no} | Seller: ${d.sellerparty.slice(0, 30)}`));

// Test: Search "dnyandeep" AND side filter "bhosale"
const step2 = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'ALL', query: 'bhosale' }
], 'AND');
console.log('\nStep 2: "dnyandeep" AND "bhosale" matches:', step2.length);
step2.forEach(d => console.log(`- Doc ${d.docno} (${d.registrationdate}): ${d.society} | Flat ${d.flat_no}`));

// Test: Search "dnyandeep" AND side filter Society "Skyways Esfera"
const step3 = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'society', query: 'Skyways Esfera' }
], 'AND');
console.log('\nStep 3: "dnyandeep" AND Society "Skyways Esfera" matches:', step3.length);
step3.forEach(d => console.log(`- Doc ${d.docno} (${d.registrationdate}): ${d.society} | Flat ${d.flat_no}`));

// Test: Search "dnyandeep" AND side filter Flat "106"
const step4 = executeSmartSearch(deeds, [
  { column: 'ALL', query: 'dnyandeep' },
  { column: 'flat_no', query: '106' }
], 'AND');
console.log('\nStep 4: "dnyandeep" AND Flat "106" matches:', step4.length);
step4.forEach(d => console.log(`- Doc ${d.docno} (${d.registrationdate}): ${d.society} | Flat ${d.flat_no}`));
