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

  return dataset.filter(row => {
    // Flat/Unit must match
    const rowFlat = normalizeUnitId(row.flat_no);
    if (!rowFlat || rowFlat !== targetFlat) return false;

    // Society must match or be closely related
    const rowSociety = String(row.society || '').toLowerCase().trim();
    if (targetSociety && rowSociety) {
      if (rowSociety === targetSociety) return true;
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

  // Sort chronologically (oldest deed first)
  const sorted = [...records].sort((a, b) => {
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

    // Check for ownership continuity gaps between resale transactions
    let isChainGap = false;
    let gapNote = '';

    if (index > 0 && previousPurchaser && /खरेदीखत|sale\s*deed|करार|agreement|resale/i.test(docName)) {
      const prevNorm = previousPurchaser.toLowerCase().replace(/[^a-z0-9]/g, '');
      const currSellerNorm = seller.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // If current seller doesn't contain previous buyer's name tokens
      if (prevNorm.length >= 4 && currSellerNorm.length >= 4 && !currSellerNorm.includes(prevNorm.slice(0, 6))) {
        isChainGap = true;
        gapNote = `Chain Continuity Note: Seller in this deed does not appear to match the buyer from previous registered deed (${sorted[index - 1].docno || 'prior'}). A prior unrecorded transfer or intermediate heirship transfer may exist.`;
        gaps.push({ deedIndex: index + 1, docno: deed.docno, note: gapNote });
      }
    }

    if (/खरेदीखत|sale\s*deed|करार|agreement|resale/i.test(docName)) {
      previousPurchaser = buyer;
    }

    return {
      stepIndex: index + 1,
      docno: deed.docno || '—',
      docNo: deed.docno || '—',
      registrationdate: date,
      docname: docName,
      sellerparty: seller,
      seller,
      purchaserparty: buyer,
      buyer,
      consideration_amt: cons,
      formattedConsideration: formatINR(cons),
      stampdutypaid: stamp,
      formattedStampDuty: formatINR(stamp),
      sroname: deed.sroname || '—',
      propertydescription: deed.propertydescription || '—',
      source_file: deed.source_file || '—',
      source_sheet: deed.source_sheet || '—',
      isChainGap,
      isContinuityGap: isChainGap,
      gapNote
    };
  });

  const rep = targetRecord || sorted[0];

  const initialDeed = sorted[0];
  const latestDeed = sorted[sorted.length - 1];
  const initialPrice = typeof initialDeed?.consideration_amt === 'number'
    ? initialDeed.consideration_amt
    : parseFloat(String(initialDeed?.consideration_amt || 0).replace(/[^0-9.]/g, '')) || 0;
  const latestPrice = typeof latestDeed?.consideration_amt === 'number'
    ? latestDeed.consideration_amt
    : parseFloat(String(latestDeed?.consideration_amt || 0).replace(/[^0-9.]/g, '')) || 0;

  let priceAppreciationPct = 0;
  if (initialPrice > 0 && latestPrice > 0) {
    priceAppreciationPct = Math.round(((latestPrice - initialPrice) / initialPrice) * 10000) / 100;
  }

  const dateOldest = parseRecordDate(initialDeed?.registrationdate);
  const dateNewest = parseRecordDate(latestDeed?.registrationdate);
  const yearsDiff = Math.max(1, (dateNewest.getTime() - dateOldest.getTime()) / (365.25 * 24 * 3600 * 1000));
  let cagrPct = 0;
  if (initialPrice > 0 && latestPrice > initialPrice && yearsDiff >= 1) {
    cagrPct = Math.round((Math.pow(latestPrice / initialPrice, 1 / yearsDiff) - 1) * 10000) / 100;
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
