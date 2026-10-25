// Real Estate & Maharashtra IGR Property Intelligence Parser

export function normalizeDevanagariDigits(text) {
  if (!text) return '';
  const devDigits = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9' };
  return String(text).replace(/[०-९]/g, ch => devDigits[ch] || ch);
}

export function extractSociety(desc) {
  if (!desc) return 'Other / Open Land';
  const str = String(desc);

  // 1. Dynamic extraction: e.g. "Ganga Florentina Co-op Housing Society", "Amanora Towers", "Skyways Residency"
  // eslint-disable-next-line no-misleading-character-class
  const dynamicMatch = str.match(/([A-Za-z\u0900-\u097F\s]{3,35})\s+(?:co-?op(?:\s+housing)?\s+society|chs|apartment|apartments|residency|complex|heights|towers?|park|enclave|greens?|valley|villa|villas|city)/i);
  if (dynamicMatch) {
    const rawName = dynamicMatch[0].trim();
    const cleaned = rawName.replace(/^(in|at|the|near|of|नाव|नावे)\s+/i, '').trim();
    if (cleaned.length >= 4 && cleaned.length <= 40) {
      return cleaned;
    }
  }

  // 2. Known project landmarks & major builders
  if (/स्कायवेज|skyways/i.test(str)) return 'Skyways Esfera';
  if (/एरोपोलीस|एरोपोलिस|aeropolis/i.test(str)) return 'Aeropolis';
  if (/प्राईड|प्राइड|आशियाना|aashiyana|pride/i.test(str)) return 'Pride Aashiyana';
  if (/गुडविल|गुडव्हील|goodwill/i.test(str)) return 'Goodwill Nirmiti';
  if (/ट्रिया|हिलोम|triaa|hillome/i.test(str)) return 'Triaa Hillome';
  if (/साई शांती|shanti park/i.test(str)) return 'Sai Shanti Park';
  if (/मॅजेस्टिक|majestic/i.test(str)) return 'Majestic';
  if (/मोझे|moze/i.test(str)) return 'Moze Associates';
  if (/अमानोरा|amanora/i.test(str)) return 'Amanora Park Town';
  if (/रोहन|rohan/i.test(str)) return 'Rohan Builders';
  if (/गोदरेज|godrej/i.test(str)) return 'Godrej Properties';
  if (/गंगा|ganga/i.test(str)) return 'Goel Ganga';
  if (/कुमार|kumar/i.test(str)) return 'Kumar Properties';

  if (/सदनिका|फ्लॅट|फलॅट|flat/i.test(str)) return 'Residential Flat';
  return 'Residential Property';
}

export function extractCarpetArea(desc) {
  if (!desc) return null;
  const str = normalizeDevanagariDigits(String(desc));

  // 1. Explicit CARPET area in Marathi sq.ft: e.g. "कारपेट क्षेत्र 629.26 चौ. फुट", "कारपेट 650 चौ.फूट"
  const mrCarpetSqft = str.match(/(?:कारपेट\s*(?:क्षेत्र(?:फळ)?)?)\s*[:\-]?\s*([\d\.]+)\s*(?:चौ\.?\s*फ[ुू]ट|चौ\.?\s*फु)/i);
  if (mrCarpetSqft) return parseFloat(mrCarpetSqft[1]);

  // 2. Explicit CARPET area in English sq.ft: e.g. "Carpet Area 820 sq.ft", "Carpet 750 sqft"
  const enCarpetSqft = str.match(/(?:carpet\s*(?:area)?)\s*[:\-]?\s*([\d\.]+)\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet|sq\s*feet)/i);
  if (enCarpetSqft) return parseFloat(enCarpetSqft[1]);

  // 3. Explicit CARPET area in Marathi sq.mtr: e.g. "कारपेट क्षेत्र 50 चौ.मी."
  const mrCarpetSqm = str.match(/(?:कारपेट\s*(?:क्षेत्र(?:फळ)?)?)\s*[:\-]?\s*([\d\.]+)\s*(?:चौ\.?\s*मी|चौ\.?\s*मिटर)/i);
  if (mrCarpetSqm) return Math.round(parseFloat(mrCarpetSqm[1]) * 10.7639 * 100) / 100;

  // 4. Explicit CARPET area in English sq.mtr: e.g. "Carpet 50 sq.mtr"
  const enCarpetSqm = str.match(/(?:carpet\s*(?:area)?)\s*[:\-]?\s*([\d\.]+)\s*(?:sq\.?\s*m(?:tr)?\.?|sqmt|square\s*meters?)/i);
  if (enCarpetSqm) return Math.round(parseFloat(enCarpetSqm[1]) * 10.7639 * 100) / 100;

  // 5. General Marathi sq.ft: e.g. "650 चौ.फुट", "650 चौ.फूट", or "650 चौ फूट"
  const mrSqftMatch = str.match(/([\d\.]+)\s*(?:चौ\.?\s*फ[ुू]ट|चौ\.?\s*फु)/i);
  if (mrSqftMatch) return parseFloat(mrSqftMatch[1]);

  // 6. General English sq.ft: e.g. "820 sq.ft", "820 sq ft", "820 sqft", "820 square feet"
  const enSqftMatch = str.match(/([\d\.]+)\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet|sq\s*feet)/i);
  if (enSqftMatch) return parseFloat(enSqftMatch[1]);

  // 7. General Marathi sq.mtr (avoiding plot area e.g. "1000 चौ.मी. पैकी"):
  const mrSqmMatch = str.match(/([\d\.]+)\s*(?:चौ\.?\s*मी|चौ\.?\s*मिटर)(?!\s*पैकी)/i);
  if (mrSqmMatch) return Math.round(parseFloat(mrSqmMatch[1]) * 10.7639 * 100) / 100;

  // 8. General English sq.mtr: e.g. "50 sq.mtr", "50 sq mtr", "50 sqmt"
  const enSqmMatch = str.match(/([\d\.]+)\s*(?:sq\.?\s*m(?:tr)?\.?|sqmt|square\s*meters?)(?!\s*out\s*of)/i);
  if (enSqmMatch) return Math.round(parseFloat(enSqmMatch[1]) * 10.7639 * 100) / 100;

  // 9. Explicit area keyword fallback: e.g. "Carpet Area 750"
  const areaMatch = str.match(/(?:carpet\s*area|कारपेट\s*क्षेत्र(?:फळ)?)\s*[:\-]?\s*([\d\.]+)/i);
  if (areaMatch) {
    const val = parseFloat(areaMatch[1]);
    if (val >= 100 && val <= 10000) return val;
  }

  return null;
}

export function extractFlatNo(desc) {
  if (!desc) return '';
  const str = normalizeDevanagariDigits(String(desc));
  // Matches flats, apartments, shops, offices, commercial units, and plots
  const match = str.match(/(?:फलॅट|फ्लॅट|सदनिका|गाळा|ऑफीस|ऑफिस|दुकान|office|flat|shop|unit|plot|bungalow|row\s*house)\s*(?:no\.?|num\.?|number|#|नं\.?|क्र\.?|क्रमांक|नंबर)?\s*([A-Za-z0-9\-\/]+)/i);
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
