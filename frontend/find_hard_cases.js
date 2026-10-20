import fs from 'fs';
import path from 'path';

const deeds = JSON.parse(fs.readFileSync('public/lohgaon_deeds.json', 'utf8'));

// Criteria for "Hard" cases:
// 1. Long and complex party names (multiple joint holders, PoA, banks)
// 2. Complex Marathi conjunct characters (ज्ञ, श्र, त्र, क्ष, ऋ, etc.)
// 3. Diverse deed types (बक्षीसपत्र, हक्कसोडपत्र, विकास करारनामा, गहाणखत, दुरुस्तीपत्र, असाईनमेंट डीड)
// 4. Edge-case financial values (High value > 1 Cr, Zero consideration with high stamp duty)
// 5. Complex property descriptions with terraces, parking, multiple survey numbers, fractions

const candidates = [];

deeds.forEach((d, idx) => {
  let hardnessScore = 0;
  
  // Party complexity
  const sellerLen = (d.sellerparty || '').length;
  const buyerLen = (d.purchaserparty || '').length;
  const totalPartyLen = sellerLen + buyerLen;
  if (totalPartyLen > 100) hardnessScore += 3;
  if (totalPartyLen > 180) hardnessScore += 3;
  
  // Conjuncts
  const conjunctMatches = (d.sellerparty + d.purchaserparty + d.propertydescription).match(/[ज्ञश्रत्रक्षऋद्धद्वद्मष्टष्ठ]/g);
  if (conjunctMatches) hardnessScore += Math.min(conjunctMatches.length, 5);

  // Non-standard doc types
  if (['बक्षीसपत्र', 'हक्कसोडपत्र', 'दुरुस्तीपत्र', 'विकास करारनामा', 'अमलबजावणी'].some(t => d.docname.includes(t))) {
    hardnessScore += 4;
  } else if (d.docname.includes('गहाणखत')) {
    hardnessScore += 2;
  }

  // Financial edge cases
  if (d.consideration_amt > 10000000) hardnessScore += 3; // > 1 Cr
  if (d.consideration_amt === 0 && d.stampdutypaid > 10000) hardnessScore += 3;

  // Description complexity
  if ((d.propertydescription || '').length > 250) hardnessScore += 2;
  if (/हिस्सा\s*नं|टेरेस|पार्किंग|कारपेट/i.test(d.propertydescription)) hardnessScore += 2;

  candidates.push({ index: idx, deed: d, score: hardnessScore });
});

candidates.sort((a, b) => b.score - a.score);

// Select top 20 diverse hard cases
const selected = [];
const seenDocNames = new Set();
const seenSocieties = new Set();

for (const c of candidates) {
  selected.push(c.deed);
  if (selected.length === 20) break;
}

console.log(`Selected ${selected.length} hardest test cases:`);
selected.forEach((d, i) => {
  console.log(`\nCase #${i + 1}: Doc No ${d.docno} (${d.registrationdate}) - ${d.docname}`);
  console.log(`Society: ${d.society} | Flat: ${d.flat_no} | Area: ${d.carpet_sqft} sq.ft | Rate: ₹${d.rate_per_sqft}/sqft`);
  console.log(`Consideration: ₹${d.consideration_amt} | Stamp: ₹${d.stampdutypaid}`);
  console.log(`Seller: ${d.sellerparty.slice(0, 70)}...`);
  console.log(`Buyer: ${d.purchaserparty.slice(0, 70)}...`);
});

fs.writeFileSync('hard_20_cases.json', JSON.stringify(selected, null, 2));
console.log('\nSaved to hard_20_cases.json');
