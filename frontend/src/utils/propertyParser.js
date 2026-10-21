// Real Estate & Maharashtra IGR Property Intelligence Parser

export function extractSociety(desc) {
  if (!desc) return 'Other / Open Land';
  const str = String(desc);
  if (/स्कायवेज|skyways/i.test(str)) return 'Skyways Esfera';
  if (/एरोपोलीस|एरोपोलिस|aeropolis/i.test(str)) return 'Aeropolis';
  if (/प्राईड|प्राइड|आशियाना|aashiyana|pride/i.test(str)) return 'Pride Aashiyana';
  if (/गुडविल|गुडव्हील|goodwill/i.test(str)) return 'Goodwill Nirmiti';
  if (/ट्रिया|हिलोम|triaa|hillome/i.test(str)) return 'Triaa Hillome';
  if (/साई शांती|shanti park/i.test(str)) return 'Sai Shanti Park';
  if (/मॅजेस्टिक|majestic/i.test(str)) return 'Majestic';
  if (/मोझे|moze/i.test(str)) return 'Moze Associates';
  if (/सदनिका|फ्लॅट|फलॅट|flat/i.test(str)) return 'Residential Flat';
  return 'Residential Property';
}

export function extractCarpetArea(desc) {
  if (!desc) return null;
  const str = String(desc);
  const sqftMatch = str.match(/([\d\.]+)\s*चौ\.?\s*फुट/i);
  if (sqftMatch) return parseFloat(sqftMatch[1]);
  const sqmMatch = str.match(/([\d\.]+)\s*चौ\.?\s*मी/i);
  if (sqmMatch) return Math.round(parseFloat(sqmMatch[1]) * 10.7639 * 100) / 100;
  return null;
}

export function extractFlatNo(desc) {
  if (!desc) return '';
  const match = String(desc).match(/(?:फलॅट|फ्लॅट|सदनिका|गाळा|office|flat)\s*(?:no\.?|num\.?|number|#|नं\.?|क्र\.?)?\s*([A-Za-z0-9\-]+)/i);
  return match ? match[1] : '';
}

export function cleanParties(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\{\}\"\[\]]/g, '')
    .replace(/--/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatINR(val) {
  const num = Number(val) || 0;
  if (num === 0) return '₹ 0';
  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹ ${(num / 100000).toFixed(2)} L`;
  }
  return `₹ ${num.toLocaleString('en-IN')}`;
}

export function isRealEstateRecord(rawRow) {
  if (!rawRow || typeof rawRow !== 'object') return false;
  return Boolean(
    rawRow.docno || 
    rawRow.propertydescription || 
    rawRow.srocode || 
    rawRow.sroname || 
    rawRow.sellerparty || 
    rawRow.purchaserparty || 
    rawRow.DocNo || 
    rawRow.PropertyDescription || 
    rawRow.SROCode || 
    rawRow.SROName || 
    rawRow.SellerParty || 
    rawRow.PurchaserParty || 
    rawRow.consideration_amt !== undefined || 
    rawRow.stampdutypaid !== undefined ||
    rawRow.marketvalue !== undefined
  );
}

export function enrichRow(rawRow) {
  // If generic spreadsheet (e.g. employee, accounts, sales, inventory): preserve as-is!
  if (!isRealEstateRecord(rawRow)) {
    return { ...rawRow };
  }

  const desc = rawRow.propertydescription || rawRow.PropertyDescription || rawRow.property_description || '';
  const society = rawRow.society || extractSociety(desc);
  const carpetSqft = rawRow.carpet_sqft || extractCarpetArea(desc) || '';
  const flatNo = rawRow.flat_no || extractFlatNo(desc) || '';
  const consAmt = parseFloat(rawRow.consideration_amt || rawRow.Consideration_Amt || rawRow.consideration || 0) || 0;
  const mktVal = parseFloat(rawRow.marketvalue || rawRow.MarketValue || 0) || 0;
  const stampDuty = parseFloat(rawRow.stampdutypaid || rawRow.StampDutyPaid || 0) || 0;
  const regFee = parseFloat(rawRow.registrationfees || rawRow.RegistrationFees || 0) || 0;
  const sellerParty = rawRow.sellerparty || rawRow.SellerParty || '';
  const purchaserParty = rawRow.purchaserparty || rawRow.PurchaserParty || '';

  let rateSqft = rawRow.rate_per_sqft || '';
  if (!rateSqft && carpetSqft && carpetSqft > 100 && consAmt > 100000) {
    rateSqft = Math.round(consAmt / carpetSqft);
  }

  return {
    ...rawRow,
    society,
    flat_no: flatNo,
    carpet_sqft: carpetSqft,
    rate_per_sqft: rateSqft,
    consideration_amt: consAmt,
    marketvalue: mktVal,
    stampdutypaid: stampDuty,
    registrationfees: regFee,
    sellerparty: cleanParties(sellerParty),
    purchaserparty: cleanParties(purchaserParty)
  };
}
