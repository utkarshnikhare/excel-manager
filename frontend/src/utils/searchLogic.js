const devanagariMap = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'e', 'ओ': 'o', 'औ': 'o',
  'ऋ': 'r', 'ॠ': 'r', 'ऍ': 'a', 'ऑ': 'o',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'ळ': 'l', 'क्ष': 'x', 'ज्ञ': 'jn',
  // Matras & modifiers
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'r', 'े': 'e', 'ै': 'e', 'ो': 'o', 'ौ': 'o',
  'ॅ': 'a', 'ॉ': 'o', 'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': '',
  // Devanagari numerals (०-९ to 0-9)
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
  // Nukta consonants
  'क़': 'k', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f'
};

const hasDevanagari = /[\u0900-\u097F]/;
const labialConsonants = new Set(['प', 'फ', 'ब', 'भ', 'म', 'p', 'b', 'm']);

export const normalizeUnicode = (text) => {
  if (!text) return "";
  return String(text).normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
};

export const transliterate = (text) => {
  if (!text) return "";
  const str = normalizeUnicode(text);
  // Fast path: If pure English/ASCII, return lowercased directly
  if (!hasDevanagari.test(str)) {
    return str.toLowerCase();
  }

  let result = "";
  const normalized = str.replace(/[\u094D\u200C\u200D]/g, '').toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    // Contextual anusvara: Before labials (प/फ/ब/भ/म/p/b/m), pronounced as 'm' (e.g. संभाजी -> sambhaji, मुंबई -> mumbai)
    if (char === 'ं' || char === 'ँ') {
      const nextChar = normalized[i + 1];
      if (nextChar && labialConsonants.has(nextChar)) {
        result += 'm';
        continue;
      }
    }
    result += devanagariMap[char] || char;
  }
  return result;
};

// Consonant skeleton with Indian phonetic normalizations (v=w, s=sh, ph=f, dny=jny=gy=jn, th=t, dh=d, bh=b, x=ks)
// Preserves word boundaries (spaces) to prevent false-positive cross-word bleed
export const getSkeleton = (text) => {
  if (!text) return "";
  let normalized = String(text)
    .toLowerCase()
    .replace(/dny|jny|gy/g, 'jn')
    .replace(/x/g, 'ks')
    .replace(/jh|zh/g, 'j')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/sh/g, 's')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/bh/g, 'b')
    .replace(/kh/g, 'k')
    .replace(/gh/g, 'g')
    .replace(/[aeiouy]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.replace(/([a-z0-9])\1+/g, '$1'); 
};

// Comprehensive Bidirectional Legal Deed & Term Translation Dictionary (English ⇄ Marathi/Devanagari)
export const deedSynonyms = {
  'assignment': ['असाईनमेंट', 'असाइनमेंट', 'असाईंमेंट', 'असाईनमेंट डीड', 'assignment'],
  'असाईनमेंट': ['assignment', 'असाईनमेंट', 'असाइनमेंट', 'असाईंमेंट', 'assignment deed'],
  'असाइनमेंट': ['assignment', 'असाइनमेंट', 'असाईनमेंट'],
  'agreement': ['अँग्रीमेंट', 'अॅग्रीमेंट', 'अग्रीमेंट', 'करारनामा', 'करार', 'agreement', 'agrement'],
  'agrement': ['अँग्रीमेंट', 'अॅग्रीमेंट', 'अग्रीमेंट', 'करारनामा', 'करार', 'agreement', 'agrement'],
  'करारनामा': ['agreement', 'agrement', 'करारनामा', 'अँग्रीमेंट', 'अॅग्रीमेंट', 'अग्रीमेंट'],
  'अँग्रीमेंट': ['agreement', 'agrement', 'करारनामा', 'अँग्रीमेंट', 'अॅग्रीमेंट'],
  'अॅग्रीमेंट': ['agreement', 'agrement', 'करारनामा', 'अँग्रीमेंट', 'अॅग्रीमेंट'],
  'अग्रीमेंट': ['agreement', 'agrement', 'करारनामा', 'अँग्रीमेंट', 'अॅग्रीमेंट'],
  'sale': ['खरेदीखत', 'विक्रीखत', 'सेल', 'खरेदी', 'sale'],
  'saledeed': ['खरेदीखत', 'विक्रीखत', 'सेल डीड', 'sale deed', 'saledeed'],
  'खरेदीखत': ['sale deed', 'sale', 'खरेदीखत', 'विक्रीखत', 'सेल डीड'],
  'leaveandlicense': ['लिव्ह अॅड लायसन्सेस', 'लिव्ह अँड लायसन्स', 'लिव्ह अॅन्ड लायसेंसेस', 'लायसन्स', 'leave and licenses', 'leave and license'],
  'license': ['लिव्ह अॅड लायसन्सेस', 'लिव्ह अँड लायसन्स', 'लायसन्स', 'लायसन्सेस', 'license'],
  'लिव्ह': ['leave and license', 'license', 'लिव्ह'],
  'lease': ['लीज', 'भाडेपट्टा', 'पट्टा', 'lease'],
  'लीज': ['lease', 'लीज', 'भाडेपट्टा'],
  'mortgage': ['गहाणखत', 'तारण', 'मॉर्टगेज', 'mortgage'],
  'गहाणखत': ['mortgage', 'गहाणखत', 'मॉर्टगेज'],
  'gift': ['बक्षीसपत्र', 'दानपत्र', 'गिफ्ट', 'gift'],
  'giftdeed': ['बक्षीसपत्र', 'दानपत्र', 'गिफ्ट डीड', 'गिफ्ट'],
  'gift deed': ['बक्षीसपत्र', 'दानपत्र', 'गिफ्ट डीड', 'गिफ्ट'],
  'assignmentdeed': ['असाईनमेंट डीड', 'असाइनमेंट डीड', 'असाईनमेंट'],
  'assignment deed': ['असाईनमेंट डीड', 'असाइनमेंट डीड', 'असाईनमेंट'],
  'releasedeed': ['हक्कसोडपत्र', 'सोडपत्र', 'रिलीज डीड'],
  'release deed': ['हक्कसोडपत्र', 'सोडपत्र', 'रिलीज डीड'],
  'partitiondeed': ['वाटपपत्र', 'पार्टिशन'],
  'partition deed': ['वाटपपत्र', 'पार्टिशन'],
  'mortgagedeed': ['गहाणखत', 'तारण', 'मॉर्टगेज'],
  'mortgage deed': ['गहाणखत', 'तारण', 'मॉर्टगेज'],
  'developmentagreement': ['विकास करार', 'विकसनकरारनामा', 'डेव्हलपमेंट'],
  'development agreement': ['विकास करार', 'विकसनकरारनामा', 'डेव्हलपमेंट'],
  'बक्षीसपत्र': ['gift', 'बक्षीसपत्र', 'दानपत्र', 'गिफ्ट डीड'],
  'release': ['हक्कसोडपत्र', 'सोडपत्र', 'रिलीज', 'release'],
  'हक्कसोडपत्र': ['release', 'हक्कसोडपत्र', 'सोडपत्र', 'रिलीज डीड'],
  'partition': ['वाटपपत्र', 'पार्टिशन', 'partition'],
  'वाटपपत्र': ['partition', 'वाटपपत्र', 'पार्टिशन'],
  'powerofattorney': ['कुलमुखत्यारपत्र', 'पॉवर ऑफ ॲटर्नी', 'power of attorney', 'poa'],
  'poa': ['कुलमुखत्यारपत्र', 'पॉवर ऑफ ॲटर्नी', 'poa'],
  'कुलमुखत्यारपत्र': ['power of attorney', 'poa', 'कुलमुखत्यारपत्र'],
  'development': ['विकास करार', 'डेव्हलपमेंट', 'विकसनकरारनामा', 'development'],
  'विकसनकरारनामा': ['development', 'विकसनकरारनामा', 'विकास करार'],
  'conveyance': ['हस्तांतरण', 'कन्वेयन्स', 'अभिहस्तांतरणपत्र', 'conveyance'],
  'अभिहस्तांतरणपत्र': ['conveyance', 'अभिहस्तांतरणपत्र', 'हस्तांतरण'],
  'reconveyance': ['रिकन्व्हेन्स', 'रिकन्व्हेयन्स', 'reconveyance'],
  'रिकन्व्हेन्स': ['reconveyance', 'रिकन्व्हेन्स'],
  'rectification': ['दुरुस्तीपत्र', 'रेक्टीफिकेशन', 'चुक दुरुस्ती', 'rectification'],
  'चुकदुरुस्ती': ['rectification', 'दुरुस्तीपत्र', 'चुक दुरुस्ती पत्र'],
  'cancellation': ['रद्दबातल', 'कॅन्सलेशन', 'cancellation'],
  'कॅन्सलेशन': ['cancellation', 'रद्दबातल', 'कॅन्सलेशन डीड'],
  'jointventure': ['जॉईट व्हेंचर', 'जॉईंट व्हेंचर', 'joint venture'],
  'जॉईटव्हेंचर': ['joint venture', 'जॉईट व्हेंचर']
};

export const cleanParty = (str) => {
  if (!str) return '';
  const preCleaned = normalizeUnicode(String(str || ''))
    .replace(/(?:मे\.?|मेसर्स|तर्फे|भागीदार|कुलमुखत्यार|कु\.मु\.|उर्फ)/g, ' ');

  return transliterate(preCleaned)
    .toLowerCase()
    .replace(/^[\d\.\-\)\s]+/, '')
    .replace(/^(shri|sri|smt|mr|mrs|dr|adv|ms|advocate|mesrs|messrs|sau|m\/s)\.?\s+/i, '')
    .replace(/\b(tarfe|trphe|bhagidar|partner|poa|urf|alias|s\/o|w\/o|d\/o|c\/o|h\/o)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const levenshtein = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (Math.abs(a.length - b.length) > 2) return 99; // Fast bail-out for lengths differing by > 2

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// Deterministic row hash for accurate deduplication within a file
export const hashRecord = (row) => {
  if (!row || typeof row !== 'object') return '';
  const sortedKeys = Object.keys(row).sort();
  const normalizedObj = {};
  for (let k of sortedKeys) {
    normalizedObj[k] = row[k];
  }
  return JSON.stringify(normalizedObj);
};

// Canonical deduplication hash that strips ephemeral source provenance and internal metadata
// Enables true cross-file duplicate detection (e.g. same deed in FileA.xlsx and FileB.xlsx)
export const canonicalRecordHash = (row) => {
  if (!row || typeof row !== 'object') return '';
  const sortedKeys = Object.keys(row)
    .filter(k => !k.startsWith('_') && k !== 'source_file' && k !== 'source_sheet' && k !== 'row_id')
    .sort();
  const normalizedObj = {};
  for (let k of sortedKeys) {
    const val = row[k];
    normalizedObj[k] = val !== null && val !== undefined ? String(val).trim().toLowerCase() : '';
  }
  return JSON.stringify(normalizedObj);
};

// Pre-indexed search representation on the row (cached lazily & non-enumerable)
// Dynamically scans ALL columns of the row so NO field or data from ANY uploaded file is ever missed
export const getRowSearchBlob = (row) => {
  if (row._searchBlob) return row._searchBlob;
  const rawParts = [];
  const keys = Object.keys(row);
  for (let i = 0; i < keys.length; i++) {
    const col = keys[i];
    if (col.startsWith('_')) continue;
    const val = row[col];
    if (val !== undefined && val !== null && val !== '') {
      const s = String(val).trim();
      if (s.length > 0 && s.length < 5000) {
        rawParts.push(s.toLowerCase());
        // Also add delimiter-cleaned version so formatting like {"name--"} separates cleanly
        if (s.includes('{') || s.includes('}') || s.includes('"') || s.includes('--') || s.includes('[')) {
          const cleanS = s.replace(/[{}"\[\]\(\)\-\-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
          if (cleanS) rawParts.push(cleanS);
        }
      }
    }
  }
  const rawBlob = rawParts.join(' ');
  const transBlob = transliterate(rawBlob);
  const words = Array.from(new Set(transBlob.split(/\s+/).filter(w => w.length >= 2)));
  const wordSkels = words.map(w => getSkeleton(w));
  const skelBlob = wordSkels.join(' ');

  const data = { rawBlob, transBlob, skelBlob, words, wordSkels };
  try {
    Object.defineProperty(row, '_searchBlob', {
      value: data,
      enumerable: false,
      writable: true,
      configurable: true
    });
  } catch {
    row._searchBlob = data;
  }
  return data;
};

// Case-insensitive & normalized column cell retriever (guarantees matching regardless of column casing)
export const getRowCellValue = (row, colName) => {
  if (!row || !colName) return '';
  if (row[colName] !== undefined && row[colName] !== null) return row[colName];

  const lower = String(colName).toLowerCase();
  if (row[lower] !== undefined && row[lower] !== null) return row[lower];

  const clean = lower.replace(/[\s_\-]+/g, '');
  if (row[clean] !== undefined && row[clean] !== null) return row[clean];

  const keys = Object.keys(row);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (k.toLowerCase() === lower || k.toLowerCase().replace(/[\s_\-]+/g, '') === clean) {
      return row[k];
    }
  }
  return '';
};

export const matchSingleCell = (cellValue, prep) => {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return { matched: false, tier: null, score: 0, reason: '' };
  }
  const rawCell = String(cellValue).toLowerCase().trim();
  const cleanCell = rawCell.replace(/[{}"\[\]\(\)\-\-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Strict file matching for source file filters
  if (prep.column === 'source_file') {
    if (rawCell === prep.rawQuery) return { matched: true, tier: 'EXACT', score: 100, reason: 'Exact file' };
    if (rawCell.includes(prep.rawQuery)) return { matched: true, tier: 'EXACT', score: 95, reason: 'File match' };
    return { matched: false, tier: null, score: 0, reason: '' };
  }

  // Delimiter-Agnostic Compact Match (for Phone Numbers, Dates, Vehicles, Alphanumeric IDs)
  // e.g. "9820011223" matches "98200-11223" or "+91 98200 11223"; "15/04/2024" matches "15-04-2024"; "MH12AB1234" matches "MH-12-AB-1234"
  const compactCell = rawCell.replace(/[^a-z0-9]/g, '');
  const compactQuery = prep.rawQuery.replace(/[^a-z0-9]/g, '');
  if (compactQuery.length >= 4 && compactCell.length >= 4) {
    if (compactCell === compactQuery || compactCell.includes(compactQuery)) {
      return { matched: true, tier: 'EXACT', score: 98, reason: 'Identifier match (delimiter-agnostic)' };
    }
  }

  // If Exact Match is requested (either prep.isExact is true or query had quotes)
  if (prep.isExact) {
    // Fast path: direct raw equality or inclusion of raw query
    if (rawCell === prep.rawQuery || cleanCell === prep.cleanQuery) {
      return { matched: true, tier: 'EXACT', score: 100, reason: 'Exact match' };
    }
    if (rawCell.includes(prep.rawQuery) || cleanCell.includes(prep.cleanQuery)) {
      return { matched: true, tier: 'EXACT', score: 95, reason: 'Exact match' };
    }

    // If checking dates (e.g. year "2024" matching "15/04/2024")
    if (prep.column === 'registrationdate' || /^\d{4}$/.test(prep.rawQuery)) {
      if (rawCell.includes(prep.rawQuery)) {
        return { matched: true, tier: 'EXACT', score: 100, reason: 'Date / ID match' };
      }
    }

    // Deed synonym check in exact mode
    if (prep.synonyms && prep.synonyms.length > 0) {
      for (let i = 0; i < prep.synonyms.length; i++) {
        const syn = prep.synonyms[i];
        if (rawCell.includes(syn) || cleanCell.includes(syn)) {
          return { matched: true, tier: 'PHONETIC', score: 85, reason: `Legal deed: ${syn}` };
        }
      }
    }

    const qClean = prep.queryTransClean;
    const qSkel = prep.querySkelClean;
    const cellClean = cleanParty(cleanCell || rawCell);

    // 1. Direct whole cell equality
    if (cellClean === qClean || cleanParty(rawCell) === qClean) {
      return { matched: true, tier: 'EXACT', score: 100, reason: 'Exact party name' };
    }
    if (Math.abs(cellClean.length - qClean.length) <= 6 && qSkel.length > 2 && getSkeleton(cellClean) === qSkel) {
      return { matched: true, tier: 'EXACT', score: 95, reason: 'Exact phonetic name' };
    }

    // 2. Individual party equality and word-level party match
    const parties = (rawCell.includes(')') || rawCell.includes(',') || rawCell.includes('\n') || rawCell.includes(';'))
      ? rawCell.split(/(?:\d+\)\s*|,|\n|;)/)
      : [rawCell];

    for (let i = 0; i < parties.length; i++) {
      const p = parties[i].trim();
      if (!p) continue;
      const pClean = cleanParty(p.replace(/[{}"\[\]\(\)\-\-]/g, ' '));
      if (pClean === qClean) {
        return { matched: true, tier: 'EXACT', score: 100, reason: 'Exact party member' };
      }
      if (Math.abs(pClean.length - qClean.length) <= 6 && qSkel.length > 2 && getSkeleton(pClean) === qSkel) {
        return { matched: true, tier: 'EXACT', score: 95, reason: 'Exact phonetic party member' };
      }

      // Word-level strict matching within party only if query is a single word (e.g. searching "ashwini" matches "ashwini sandip lokhande")
      if (prep.queryWordMeta && prep.queryWordMeta.length === 1) {
        const pWords = pClean.split(/\s+/).filter(Boolean);
        const qMeta = prep.queryWordMeta[0];
        for (const pw of pWords) {
          if (pw === qMeta.word || (qMeta.len >= 3 && pw.startsWith(qMeta.word))) {
            return { matched: true, tier: 'EXACT', score: 95, reason: 'Party name token' };
          }
        }
      }
    }

    return { matched: false, tier: null, score: 0, reason: '' };
  }

  // Tier 0: Direct Raw Match (Instant substring check)
  if (rawCell === prep.rawQuery || cleanCell === prep.cleanQuery) {
    return { matched: true, tier: 'EXACT', score: 100, reason: 'Exact text match' };
  }
  if (rawCell.includes(prep.rawQuery) || cleanCell.includes(prep.rawQuery) || (prep.cleanQuery && cleanCell.includes(prep.cleanQuery))) {
    return { matched: true, tier: 'EXACT', score: 95, reason: 'Exact text match' };
  }

  // Tier 0.5: Legal Deed & Term Synonym Match (assignment ⇄ असाईनमेंट, agreement ⇄ करारनामा / ॲग्रीमेंट, etc.)
  if (prep.synonyms && prep.synonyms.length > 0) {
    for (let i = 0; i < prep.synonyms.length; i++) {
      const syn = prep.synonyms[i];
      if (rawCell.includes(syn) || cleanCell.includes(syn)) {
        return { matched: true, tier: 'PHONETIC', score: 85, reason: `Legal deed match: ${syn}` };
      }
    }
  }

  const cellTrans = transliterate(rawCell);
  const cellTransClean = transliterate(cleanCell);

  // Tier 1: Fast Transliterated Substring Match
  if (cellTrans.includes(prep.queryTrans) || cellTransClean.includes(prep.queryTrans) || (prep.cleanQueryTrans && cellTransClean.includes(prep.cleanQueryTrans))) {
    return { matched: true, tier: 'PHONETIC', score: 80, reason: 'Transliterated match' };
  }

  // Tier 2: Multi-Word Matcher (Typos & partial words with strict word-level skeleton matching)
  if (prep.queryWordMeta.length > 0) {
    const cellWords = (cellTransClean || cellTrans).split(/\s+/).filter(w => w.length > 0);
    let matchedWordsCount = 0;
    let hasTypo = false;
    let allExactWords = true;

    for (let qMeta of prep.queryWordMeta) {
      let wordMatched = false;

      for (let cWord of cellWords) {
        if (cWord.includes(qMeta.word) || (qMeta.len >= 3 && cWord.startsWith(qMeta.word))) {
          wordMatched = true;
          break;
        }

        const cSkel = getSkeleton(cWord);
        // STRICT WORD-LEVEL SKELETON MATCH: Exact skeleton equality or prefix (if query >= 4)
        if (cSkel === qMeta.skel || (qMeta.skel.length >= 4 && cSkel.startsWith(qMeta.skel))) {
          wordMatched = true;
          allExactWords = false;
          break;
        }

        // Levenshtein typo check only for alphabetic words of 4-15 chars (never numeric identifiers)
        if (!/\d/.test(qMeta.word) && qMeta.len >= 4 && qMeta.len <= 15 && cWord.length >= 4 && cWord.length <= 15) {
          if (levenshtein(qMeta.word, cWord) <= 1) {
            wordMatched = true;
            hasTypo = true;
            allExactWords = false;
            break;
          }
        }
      }

      if (wordMatched) matchedWordsCount++;
    }

    if (matchedWordsCount === prep.queryWordMeta.length) {
      if (allExactWords) {
        return { matched: true, tier: 'EXACT', score: 92, reason: 'Multi-word exact match' };
      } else if (hasTypo) {
        return { matched: true, tier: 'PARTY', score: 70, reason: 'Typo-tolerant match' };
      } else {
        return { matched: true, tier: 'PHONETIC', score: 80, reason: 'Phonetic match' };
      }
    }
  }

  return { matched: false, tier: null, score: 0, reason: '' };
};

export const checkSingleCell = (cellValue, prep) => {
  return matchSingleCell(cellValue, prep).matched;
};

// Pre-warm search cache for all rows in non-blocking batches (scales to 50,000+ rows)
export const warmSearchIndex = (dataset) => {
  if (!Array.isArray(dataset) || dataset.length === 0) return;
  const total = dataset.length;
  let idx = 0;
  const batchSize = 5000;

  function processBatch() {
    const end = Math.min(idx + batchSize, total);
    while (idx < end) {
      getRowSearchBlob(dataset[idx]);
      idx++;
    }
    if (idx < total) {
      if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(processBatch);
      } else {
        setTimeout(processBatch, 0);
      }
    }
  }

  processBatch();
};

export const executeSmartSearch = (masterData, criteriaList, matchMode = 'AND', isGlobalExact = false) => {
  const activeCriteria = criteriaList.filter(c => {
    if (c.isRange) return true;
    return c.column && String(c.query || '').trim() !== "";
  });
  if (activeCriteria.length === 0) return [];

  // OPTIMIZATION: Pre-process queries ONCE before entering the loop
  const preparedCriteria = activeCriteria.map(c => {
    if (c.isRange || c.column === '_price_range_' || c.column === '_carpet_range_') {
      return {
        isRange: true,
        column: c.column === '_price_range_' ? 'consideration_amt' : (c.column === '_carpet_range_' ? 'carpet_sqft' : c.column),
        min: c.min !== undefined && c.min !== null && c.min !== '' ? Number(c.min) : null,
        max: c.max !== undefined && c.max !== null && c.max !== '' ? Number(c.max) : null
      };
    }

    let rawQuery = String(c.query).trim().toLowerCase();
    let hasQuotes = (rawQuery.startsWith('"') && rawQuery.endsWith('"')) || (rawQuery.startsWith("'") && rawQuery.endsWith("'"));
    if (hasQuotes) {
      rawQuery = rawQuery.slice(1, -1).trim();
    }

    const isPartyCol = !c.column || c.column === 'ALL' || c.column === '_ALL_' || /party|name|person|seller|purchaser/i.test(c.column);
    const isExact = Boolean(hasQuotes || c.isExact || (isGlobalExact && isPartyCol));

    const queryTrans = transliterate(rawQuery);
    const queryTransClean = cleanParty(rawQuery);
    const querySkel = getSkeleton(queryTrans);
    const querySkelClean = getSkeleton(queryTransClean);
    const queryWords = queryTrans.split(/\s+/).filter(w => w.length > 0);
    const queryWordMeta = queryWords.map(w => ({
      word: w,
      skel: getSkeleton(w),
      len: w.length
    }));

    const cleanQuery = rawQuery.replace(/[{}"\[\]\(\)\-\-]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanQueryTrans = transliterate(cleanQuery);
    const compactQuery = rawQuery.replace(/[\s_\-]+/g, '');
    const synSet = new Set([
      ...(deedSynonyms[rawQuery] || []),
      ...(deedSynonyms[cleanQuery] || []),
      ...(deedSynonyms[compactQuery] || [])
    ]);
    const qWordList = cleanQuery.split(/\s+/);
    for (let i = 0; i < qWordList.length; i++) {
      const w = qWordList[i];
      if (deedSynonyms[w]) {
        for (let j = 0; j < deedSynonyms[w].length; j++) {
          synSet.add(deedSynonyms[w][j]);
        }
      }
    }
    const synonyms = Array.from(synSet);

    return {
      column: c.column,
      rawQuery,
      cleanQuery,
      cleanQueryTrans,
      queryTrans,
      queryTransClean,
      querySkel,
      querySkelClean,
      queryWords,
      queryWordMeta,
      synonyms,
      isExact,
      isGlobal: c.column === 'ALL' || c.column === '_ALL_'
    };
  });

  const matchedRows = [];

  for (let r = 0; r < masterData.length; r++) {
    const row = masterData[r];
    const criteriaResults = [];

    const checkCriteria = (prep) => {
      // Handle numeric range filters (Price, Carpet Area)
      if (prep.isRange) {
        const raw = getRowCellValue(row, prep.column);
        if (raw === null || raw === undefined || raw === '' || raw === '—' || raw === 'N/A' || raw === 'null') {
          return null;
        }
        // Extract numeric digits and decimal point, handling Indian commas (e.g. "75,00,000") and currency/units (e.g. "₹ 75,00,000", "820 sq.ft")
        const cleanStr = String(raw).replace(/[^0-9\.]/g, '');
        if (!cleanStr) return null;
        const val = parseFloat(cleanStr);
        if (isNaN(val)) return null;

        if (prep.min !== null && !isNaN(prep.min) && val < prep.min) return null;
        if (prep.max !== null && !isNaN(prep.max) && val > prep.max) return null;
        return { matched: true, tier: 'EXACT', score: 100, column: prep.column, reason: 'Range matched' };
      }

      if (prep.isGlobal) {
        if (prep.isExact) {
          const blob = getRowSearchBlob(row);
          // Fast filter: row blob must at least contain the exact raw query or clean query or first skeleton token
          if (!blob.rawBlob.includes(prep.rawQuery) && !blob.transBlob.includes(prep.rawQuery) &&
              (!prep.cleanQuery || (!blob.rawBlob.includes(prep.cleanQuery) && !blob.transBlob.includes(prep.cleanQuery)))) {
            // For multi-word queries, every word must at least exist in the row
            if (prep.queryWords && prep.queryWords.length > 1) {
              let allWordsPresent = true;
              for (let i = 0; i < prep.queryWords.length; i++) {
                const qw = prep.queryWords[i];
                if (!blob.rawBlob.includes(qw) && !blob.transBlob.includes(qw)) {
                  allWordsPresent = false;
                  break;
                }
              }
              if (!allWordsPresent) return null;
            }

            const firstSkel = prep.queryWordMeta[0]?.skel;
            let foundSkel = false;
            if (firstSkel && blob.wordSkels) {
              for (let i = 0; i < blob.wordSkels.length; i++) {
                const wSkel = blob.wordSkels[i];
                if (wSkel === firstSkel || (firstSkel.length >= 4 && wSkel.startsWith(firstSkel))) {
                  foundSkel = true;
                  break;
                }
              }
            }
            if (!foundSkel) {
              return null;
            }
          }

          const keys = Object.keys(row);
          for (let i = 0; i < keys.length; i++) {
            const col = keys[i];
            if (col.startsWith('_')) continue;
            if (row[col]) {
              const res = matchSingleCell(row[col], prep);
              if (res.matched) return { ...res, column: col };
            }
          }
          return null;
        }

        const blob = getRowSearchBlob(row);
        // Tier 0: Direct Raw Substring in whole row blob
        if (blob.rawBlob.includes(prep.rawQuery) || (prep.cleanQuery && blob.rawBlob.includes(prep.cleanQuery))) {
          return { matched: true, tier: 'EXACT', score: 95, column: 'ALL', reason: 'Exact text in row' };
        }
        // Tier 0.5: Legal Deed & Term Synonym Match in global search
        if (prep.synonyms && prep.synonyms.length > 0) {
          for (let i = 0; i < prep.synonyms.length; i++) {
            if (blob.rawBlob.includes(prep.synonyms[i])) {
              return { matched: true, tier: 'PHONETIC', score: 85, column: 'ALL', reason: `Legal deed: ${prep.synonyms[i]}` };
            }
          }
        }
        // Tier 1: Transliterated Substring in whole row blob
        if (blob.transBlob.includes(prep.queryTrans) || (prep.cleanQueryTrans && blob.transBlob.includes(prep.cleanQueryTrans))) {
          return { matched: true, tier: 'PHONETIC', score: 80, column: 'ALL', reason: 'Transliterated match in row' };
        }

        // Tier 2: Multi-word query with strict word-level skeleton matching (all words must match)
        if (prep.queryWordMeta.length > 0) {
          let allWordsMatched = true;
          let allExact = true;
          let hasTypo = false;
          for (let qMeta of prep.queryWordMeta) {
            if (blob.transBlob.includes(qMeta.word)) continue;

            // Strict word-level skeleton match over indexed row words
            let wordSkelMatched = false;
            if (qMeta.skel && blob.wordSkels) {
              for (let i = 0; i < blob.wordSkels.length; i++) {
                const wSkel = blob.wordSkels[i];
                if (wSkel === qMeta.skel || (qMeta.skel.length >= 4 && wSkel.startsWith(qMeta.skel))) {
                  wordSkelMatched = true;
                  allExact = false;
                  break;
                }
              }
            }
            if (wordSkelMatched) continue;

            // Fast fuzzy check against row's distinct words (alphabetic only)
            let fuzzyMatched = false;
            if (!/\d/.test(qMeta.word) && qMeta.len >= 4 && qMeta.len <= 15) {
              for (let i = 0; i < blob.words.length; i++) {
                const w = blob.words[i];
                if (!/\d/.test(w) && Math.abs(w.length - qMeta.len) <= 1 && levenshtein(qMeta.word, w) <= 1) {
                  fuzzyMatched = true;
                  hasTypo = true;
                  allExact = false;
                  break;
                }
              }
            }
            if (!fuzzyMatched) {
              allWordsMatched = false;
              break;
            }
          }
          if (allWordsMatched) {
            if (allExact) return { matched: true, tier: 'EXACT', score: 90, column: 'ALL', reason: 'All words matched in row' };
            if (hasTypo) return { matched: true, tier: 'PARTY', score: 70, column: 'ALL', reason: 'Typo-tolerant match' };
            return { matched: true, tier: 'PHONETIC', score: 80, column: 'ALL', reason: 'Phonetic match in row' };
          }
        }

        return null;
      }

      const res = matchSingleCell(getRowCellValue(row, prep.column), prep);
      return res.matched ? { ...res, column: prep.column } : null;
    };

    let rowMatched = false;
    if (matchMode === 'AND') {
      let allPassed = true;
      for (let i = 0; i < preparedCriteria.length; i++) {
        const cRes = checkCriteria(preparedCriteria[i]);
        if (!cRes) {
          allPassed = false;
          break;
        }
        criteriaResults.push(cRes);
      }
      rowMatched = allPassed;
    } else { // OR
      for (let i = 0; i < preparedCriteria.length; i++) {
        const cRes = checkCriteria(preparedCriteria[i]);
        if (cRes) {
          rowMatched = true;
          criteriaResults.push(cRes);
        }
      }
    }

    if (rowMatched && criteriaResults.length > 0) {
      const avgScore = Math.round(
        criteriaResults.reduce((sum, c) => sum + (c.score || 80), 0) / criteriaResults.length
      );
      const tiers = criteriaResults.map(c => c.tier);
      let finalTier = 'EXACT';
      if (tiers.includes('PARTY')) finalTier = 'PARTY';
      else if (tiers.includes('PHONETIC')) finalTier = 'PHONETIC';

      row._matchScore = avgScore;
      row._matchTier = finalTier;
      row._matchReason = criteriaResults.map(c => c.reason).filter(Boolean).join('; ');
      row._matchedColumns = Array.from(new Set(criteriaResults.map(c => c.column).filter(Boolean)));

      matchedRows.push(row);
    }
  }

  // Priority Ranking: 100% Exact matches first (score descending)
  matchedRows.sort((a, b) => (b._matchScore || 0) - (a._matchScore || 0));
  return matchedRows;
};
