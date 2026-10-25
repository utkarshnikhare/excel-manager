// Real Estate Chain-of-Title & Chronological Property Transaction Timeline Compiler
// 100% Client-Side In-Memory Execution

import { normalizeDevanagariDigits, formatINR } from './propertyParser.js';

// Normalize property identifiers for composite identity matching
export function normalizeUnitId(str) {
  if (!str) return '';
  return normalizeDevanagariDigits(String(str))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Extract Wing/Building/Tower identifier to keep distinct towers with same flat numbers separate
export function extractWingIdentifier(record) {
  if (!record) return '';
  if (record.wing) return String(record.wing).trim().toLowerCase();
  const desc = String(record.propertydescription || record.PropertyDescription || '');
  const match = desc.match(/(?:विंग|wing|building|इमारत|tower|टावर)\s*[:\-]?\s*([a-z0-9]+)/i);
  return match ? match[1].toLowerCase().trim() : '';
}

// Extract Survey / Gat / CTS identifier for cross-verification
export function extractSurveyIdentifier(record) {
  if (!record) return '';
  const desc = String(record.propertydescription || record.PropertyDescription || '');
  const match = desc.match(/(?:सर्व्हे|सर्वे|survey|s\.?\s*no|गट|gat|cts|सी\.?\s*टी\.?\s*एस)(?:\s*(?:no\.?|नं\.?|क्रमांक|number))?\s*[:\-]?\s*([0-9\/\-]+)/i);
  return match ? match[1].trim() : '';
}

// Get contextual party role labels according to deed type
export function getPartyRoleLabels(docName) {
  const d = String(docName || '').toLowerCase();
  if (/गहाण|तारण|mortgage/i.test(d)) {
    return {
      role1Label: 'Borrower / Mortgagor (गहाण ठेवणारा)',
      role2Label: 'Lender / Mortgagee / Bank (गहाण घेणारा)',
      verb: 'PLEDGED TO',
      isConveyance: false
    };
  }
  if (/बक्षीस|दान|gift/i.test(d)) {
    return {
      role1Label: 'Donor (देणारा पक्षकार)',
      role2Label: 'Donee (घेणारा पक्षकार)',
      verb: 'GIFTED TO',
      isConveyance: false
    };
  }
  if (/हक्कसोड|सोडपत्र|release/i.test(d)) {
    return {
      role1Label: 'Releasor (हक्क सोडणारा)',
      role2Label: 'Releasee (हक्क मिळवणारा)',
      verb: 'RELEASED TO',
      isConveyance: false
    };
  }
  if (/लिव्ह|लायसन्स|भाडे|lease|license/i.test(d)) {
    return {
      role1Label: 'Licensor / Landlord (परवाना देणारा)',
      role2Label: 'Licensee / Tenant (परवाना घेणारा)',
      verb: 'LICENSED TO',
      isConveyance: false
    };
  }
  if (/कुलमुखत्यार|poa|power\s*of\s*attorney/i.test(d)) {
    return {
      role1Label: 'Principal (कुलमुखत्यार देणारा)',
      role2Label: 'Attorney / Agent (कुलमुखत्यार)',
      verb: 'APPOINTED',
      isConveyance: false
    };
  }
  return {
    role1Label: 'Transferor / Seller (देणारा पक्षकार)',
    role2Label: 'Transferee / Purchaser (घेणारा पक्षकार)',
    verb: 'TRANSFERRED TO',
    isConveyance: true
  };
}

// Find all transactions matching the target property's composite coordinates
export function findMatchingPropertyRecords(arg1, arg2) {
  // Gracefully accept either (dataset, targetRecord) or (targetRecord, dataset)
  let dataset = Array.isArray(arg1) ? arg1 : Array.isArray(arg2) ? arg2 : [];
  let targetRecord = !Array.isArray(arg1) ? arg1 : !Array.isArray(arg2) ? arg2 : null;

  if (!dataset || dataset.length === 0 || !targetRecord) return [];

  const targetSociety = String(targetRecord.society || '').toLowerCase().trim();
  const targetFlat = normalizeUnitId(targetRecord.flat_no);

  if (!targetFlat) {
    // If no flat number exists, return only the record itself to avoid false grouping
    return [targetRecord];
  }

  const targetWing = extractWingIdentifier(targetRecord);
  const targetSurvey = extractSurveyIdentifier(targetRecord);

  return dataset.filter(row => {
    // Flat/Unit must match
    const rowFlat = normalizeUnitId(row.flat_no);
    if (!rowFlat || rowFlat !== targetFlat) return false;

    // Wing disambiguation: If both specify a wing and they conflict, do not merge!
    const rowWing = extractWingIdentifier(row);
    if (targetWing && rowWing && targetWing !== rowWing) return false;

    // Society matching
    const rowSociety = String(row.society || '').toLowerCase().trim();
    if (targetSociety && rowSociety) {
      if (rowSociety === targetSociety) {
        // If societies match, also verify conflicting surveys don't belong to completely different properties
        const rowSurvey = extractSurveyIdentifier(row);
        if (targetSurvey && rowSurvey && targetSurvey !== rowSurvey) {
          // If survey numbers are completely different (e.g. 42 vs 99), keep separate
          return false;
        }
        return true;
      }
      if (rowSociety.includes(targetSociety) || targetSociety.includes(rowSociety)) return true;
    }

    return false;
  });
}

// Parse date string (DD/MM/YYYY or YYYY) into sortable Date object
export function parseRecordDate(dateStr) {
  if (!dateStr || dateStr === '—') return new Date(1970, 0, 1);
  const str = String(dateStr).trim();
  const dmyMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
  }
  const ymdMatch = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    return new Date(parseInt(ymdMatch[1], 10), parseInt(ymdMatch[2], 10) - 1, parseInt(ymdMatch[3], 10));
  }
  const yearMatch = str.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 0, 1);
  }
  return new Date(1970, 0, 1);
}

// Compile chronological ownership history with gap analysis and financial summaries
export function compilePropertyTimeline(arg1, arg2) {
  // Gracefully accept either (records, targetRecord) or (targetRecord, dataset)
  let records = Array.isArray(arg1) ? arg1 : Array.isArray(arg2) ? arg2 : [];
  let targetRecord = !Array.isArray(arg1) ? arg1 : !Array.isArray(arg2) ? arg2 : null;

  // If targetRecord provided and records is a larger dataset, filter down first
  if (targetRecord && records.length > 0 && !records.every(r => normalizeUnitId(r.flat_no) === normalizeUnitId(targetRecord.flat_no))) {
    records = findMatchingPropertyRecords(records, targetRecord);
  }

  if (!records || records.length === 0) {
    return {
      propertyInfo: null,
      timeline: [],
      transactions: [],
      totalTransactions: 0,
      initialPrice: 0,
      latestPrice: 0,
      priceAppreciationPct: 0,
      cagrPct: 0,
      metrics: { totalDeeds: 0, totalConsideration: 0, totalStampDuty: 0 },
      gaps: [],
      hasAmbiguities: false,
      hasContinuityWarning: false
    };
  }

  // Canonical cross-file duplicate deed detection while preserving all originating source references
  const seenDeeds = new Map();
  for (const r of records) {
    const normDoc = String(r.docno || '').trim().toLowerCase();
    const normDate = String(r.registrationdate || '').trim();
    const normSro = String(r.sroname || '').trim().toLowerCase();
    // Canonical cross-file deed key (independent of filename)
    const canonicalKey = normDoc ? `${normDoc}_${normDate}_${normSro}` : null;

    if (canonicalKey && seenDeeds.has(canonicalKey)) {
      const existing = seenDeeds.get(canonicalKey);
      const incomingSource = r.source_file || 'Spreadsheet';
      if (!existing._sourceFiles.includes(incomingSource)) {
        existing._sourceFiles.push(incomingSource);
      }
    } else {
      const copy = {
        ...r,
        _sourceFiles: r.source_file ? [r.source_file] : []
      };
      if (canonicalKey) {
        seenDeeds.set(canonicalKey, copy);
      } else {
        seenDeeds.set(`anon_${Math.random()}`, copy);
      }
    }
  }
  const dedupedRecords = Array.from(seenDeeds.values());

  // Sort chronologically (oldest deed first)
  const sorted = [...dedupedRecords].sort((a, b) => {
    const dateA = parseRecordDate(a.registrationdate);
    const dateB = parseRecordDate(b.registrationdate);
    return dateA.getTime() - dateB.getTime();
  });

  let totalConsideration = 0;
  let totalStampDuty = 0;
  const gaps = [];
  let previousPurchaser = '';

  const timeline = sorted.map((deed, index) => {
    const cons = typeof deed.consideration_amt === 'number'
      ? deed.consideration_amt
      : parseFloat(String(deed.consideration_amt || 0).replace(/[^0-9.]/g, '')) || 0;
    const stamp = typeof deed.stampdutypaid === 'number'
      ? deed.stampdutypaid
      : parseFloat(String(deed.stampdutypaid || 0).replace(/[^0-9.]/g, '')) || 0;

    totalConsideration += cons;
    totalStampDuty += stamp;

    const seller = String(deed.party1 || deed.sellerparty || 'Not Specified').trim();
    const buyer = String(deed.party2 || deed.purchaserparty || 'Not Specified').trim();
    const docName = String(deed.docname || 'Index-II Registration').trim();
    const date = deed.registrationdate || '—';

    // Flag missing or ambiguous registration dates
    const isDateMissing = !date || date === '—' || !/\d{4}/.test(date);
    if (isDateMissing) {
      gaps.push({
        deedIndex: index + 1,
        docno: deed.docno,
        note: `Registration Date Missing: Deed #${deed.docno} has no recorded registration date. Chronological sequence is estimated.`
      });
    }

    const roleInfo = getPartyRoleLabels(docName);

    // Check for ownership continuity gaps between resale transactions
    let isChainGap = false;
    let gapNote = '';

    if (index > 0 && previousPurchaser && roleInfo.isConveyance) {
      const prevNorm = previousPurchaser.toLowerCase().replace(/[^a-z0-9]/g, '');
      const currSellerNorm = seller.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // If current seller doesn't contain previous buyer's name tokens
      if (prevNorm.length >= 4 && currSellerNorm.length >= 4 && !currSellerNorm.includes(prevNorm.slice(0, 6))) {
        isChainGap = true;
        gapNote = `Chain Continuity Note: Seller in this deed does not appear to match the buyer from previous registered deed (${sorted[index - 1].docno || 'prior'}). A prior unrecorded transfer or intermediate heirship transfer may exist.`;
        gaps.push({ deedIndex: index + 1, docno: deed.docno, note: gapNote });
      }
    }

    if (roleInfo.isConveyance) {
      previousPurchaser = buyer;
    }

    const sourceFileList = deed._sourceFiles && deed._sourceFiles.length > 0 ? deed._sourceFiles : (deed.source_file ? [deed.source_file] : []);
    const sourceFileDisplay = sourceFileList.join(', ') || '—';

    return {
      stepIndex: index + 1,
      docno: deed.docno || '—',
      docNo: deed.docno || '—',
      registrationdate: date,
      isDateMissing,
      docname: docName,
      sellerparty: seller,
      seller,
      purchaserparty: buyer,
      buyer,
      role1Label: roleInfo.role1Label,
      role2Label: roleInfo.role2Label,
      transferVerb: roleInfo.verb,
      isConveyance: roleInfo.isConveyance,
      consideration_amt: cons,
      formattedConsideration: formatINR(cons),
      stampdutypaid: stamp,
      formattedStampDuty: formatINR(stamp),
      sroname: deed.sroname || '—',
      propertydescription: deed.propertydescription || '—',
      source_file: sourceFileDisplay,
      source_files: sourceFileList,
      isCrossFileDuplicate: sourceFileList.length > 1,
      source_sheet: deed.source_sheet || '—',
      isChainGap,
      isContinuityGap: isChainGap,
      gapNote
    };
  });

  const rep = targetRecord || sorted[0];

  // Calculate capital appreciation & CAGR strictly on qualifying arms-length conveyance/sale deeds
  const conveyanceDeeds = sorted.filter(d => {
    const cons = typeof d.consideration_amt === 'number'
      ? d.consideration_amt
      : parseFloat(String(d.consideration_amt || 0).replace(/[^0-9.]/g, '')) || 0;
    const doc = String(d.docname || '');
    return cons > 0 && getPartyRoleLabels(doc).isConveyance;
  });

  let initialPrice = 0;
  let latestPrice = 0;
  let priceAppreciationPct = 0;
  let cagrPct = 0;

  if (conveyanceDeeds.length >= 1) {
    const firstSale = conveyanceDeeds[0];
    const lastSale = conveyanceDeeds[conveyanceDeeds.length - 1];
    initialPrice = typeof firstSale.consideration_amt === 'number'
      ? firstSale.consideration_amt
      : parseFloat(String(firstSale.consideration_amt || 0).replace(/[^0-9.]/g, '')) || 0;
    latestPrice = typeof lastSale.consideration_amt === 'number'
      ? lastSale.consideration_amt
      : parseFloat(String(lastSale.consideration_amt || 0).replace(/[^0-9.]/g, '')) || 0;

    if (conveyanceDeeds.length > 1 && initialPrice > 0 && latestPrice > 0) {
      priceAppreciationPct = Math.round(((latestPrice - initialPrice) / initialPrice) * 10000) / 100;
      const dateOldest = parseRecordDate(firstSale.registrationdate);
      const dateNewest = parseRecordDate(lastSale.registrationdate);
      const yearsDiff = Math.max(0.5, (dateNewest.getTime() - dateOldest.getTime()) / (365.25 * 24 * 3600 * 1000));
      if (latestPrice > initialPrice && yearsDiff >= 1) {
        cagrPct = Math.round((Math.pow(latestPrice / initialPrice, 1 / yearsDiff) - 1) * 10000) / 100;
      }
    }
  }

  return {
    propertyInfo: {
      society: rep.society || 'Residential Property',
      flat_no: rep.flat_no || '—',
      carpet_sqft: rep.carpet_sqft || rep.carpet_area || '—',
      sroname: rep.sroname || '—'
    },
    timeline,
    transactions: timeline,
    totalTransactions: timeline.length,
    initialPrice,
    latestPrice,
    priceAppreciationPct,
    cagrPct,
    metrics: {
      totalDeeds: timeline.length,
      totalConsideration,
      formattedTotalConsideration: formatINR(totalConsideration),
      totalStampDuty,
      formattedTotalStampDuty: formatINR(totalStampDuty)
    },
    gaps,
    hasAmbiguities: gaps.length > 0,
    hasContinuityWarning: gaps.length > 0,
    disclaimer: 'LEGAL NOTICE & LIMITATION STATEMENT: This report compiles available records from the uploaded files only. It is not an official government Search Report, does not certify an unencumbered title, and is not a substitute for a comprehensive 30-year physical search conducted by a licensed legal advocate.'
  };
}
