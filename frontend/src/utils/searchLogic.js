const devanagariMap = {
  'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ए': 'e', 'ऐ': 'e', 'ओ': 'o', 'औ': 'o',
  'ऋ': 'r', 'ॠ': 'r', 'ऍ': 'a', 'ऑ': 'o',
  'क': 'k', 'ख': 'k', 'ग': 'g', 'घ': 'g', 'ङ': 'n',
  'च': 'ch', 'छ': 'ch', 'ज': 'j', 'झ': 'j', 'ञ': 'n',
  'ट': 't', 'ठ': 't', 'ड': 'd', 'ढ': 'd', 'ण': 'n',
  'त': 't', 'थ': 't', 'द': 'd', 'ध': 'd', 'न': 'n',
  'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'b', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 's', 'ष': 's', 'स': 's', 'ह': 'h',
  'ळ': 'l', 'क्ष': 'x', 'ज्ञ': 'jn',
  // Matras & modifiers
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'r', 'े': 'e', 'ै': 'e', 'ो': 'o', 'ौ': 'o',
  'ॅ': 'a', 'ॉ': 'o', 'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': '',
  // Nukta consonants
  'क़': 'k', 'ख़': 'kh', 'ग़': 'gh', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f'
};

const hasDevanagari = /[\u0900-\u097F]/;

export const transliterate = (text) => {
  if (!text) return "";
  const str = String(text);
  // Fast path: If pure English/ASCII, return lowercased directly
  if (!hasDevanagari.test(str)) {
    return str.toLowerCase();
  }

  let result = "";
  const normalized = str.replace(/[\u094D\u200C\u200D]/g, '').toLowerCase();
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    result += devanagariMap[char] || char;
  }
  return result;
};

// Consonant skeleton with Indian phonetic normalizations (v=w, s=sh, ph=f, dny=jny=gy=jn)
// Preserves word boundaries (spaces) to prevent false-positive cross-word bleed
export const getSkeleton = (text) => {
  if (!text) return "";
  let normalized = String(text)
    .toLowerCase()
    .replace(/dny|jny|gy/g, 'jn')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/sh/g, 's')
    .replace(/[aeiouy]/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized.replace(/([a-z])\1+/g, '$1'); 
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

// Deterministic row hash for accurate deduplication regardless of key order
export const hashRecord = (row) => {
  if (!row || typeof row !== 'object') return '';
  const sortedKeys = Object.keys(row).sort();
  const normalizedObj = {};
  for (let k of sortedKeys) {
    normalizedObj[k] = row[k];
  }
  return JSON.stringify(normalizedObj);
};

// Target text fields for global search to avoid scanning numeric garbage
const searchableColumns = [
  'sellerparty', 'purchaserparty', 'propertydescription', 'docno',
  'society', 'flat_no', 'docname', 'sroname', 'areaname', 'registrationdate'
];

// Pre-indexed search representation on the row (cached lazily & non-enumerable)
export const getRowSearchBlob = (row) => {
  if (row._searchBlob) return row._searchBlob;
  const rawParts = [];
  for (let i = 0; i < searchableColumns.length; i++) {
    const col = searchableColumns[i];
    const val = row[col];
    if (val !== undefined && val !== null && val !== '') {
      rawParts.push(String(val).toLowerCase());
    }
  }
  const rawBlob = rawParts.join(' ');
  const transBlob = transliterate(rawBlob);
  const skelBlob = getSkeleton(transBlob);
  const words = Array.from(new Set(transBlob.split(/\s+/).filter(w => w.length >= 4)));

  const data = { rawBlob, transBlob, skelBlob, words };
  try {
    Object.defineProperty(row, '_searchBlob', {
      value: data,
      enumerable: false,
      writable: true,
      configurable: true
    });
  } catch (e) {
    row._searchBlob = data;
  }
  return data;
};

const checkSingleCell = (cellValue, prep) => {
  if (cellValue === null || cellValue === undefined || cellValue === '') return false;
  const rawCell = String(cellValue).toLowerCase();

  // Tier 0: Direct Raw Match (Instant substring check)
  if (rawCell.includes(prep.rawQuery)) return true;

  const cellTrans = transliterate(rawCell);

  // Tier 1: Fast Transliterated Substring Match
  if (cellTrans.includes(prep.queryTrans)) return true;

  const cellSkel = getSkeleton(cellTrans);

  // Tier 2: Fast Phonetic Skeleton Match
  if (prep.querySkel.length > 1 && cellSkel.includes(prep.querySkel)) return true;

  // Tier 3: Multi-Word Matcher (Typos & partial words)
  if (prep.queryWordMeta.length > 0) {
    const cellWords = cellTrans.split(/\s+/).filter(w => w.length > 0);
    let matchedWordsCount = 0;

    for (let qMeta of prep.queryWordMeta) {
      let wordMatched = false;

      for (let cWord of cellWords) {
        if (cWord.includes(qMeta.word)) {
          wordMatched = true;
          break;
        }

        if (qMeta.skel.length > 1 && getSkeleton(cWord).includes(qMeta.skel)) {
          wordMatched = true;
          break;
        }

        // Levenshtein typo check only for words of 4-15 chars
        if (qMeta.len >= 4 && qMeta.len <= 15 && cWord.length >= 4 && cWord.length <= 15) {
          if (levenshtein(qMeta.word, cWord) <= 1) {
            wordMatched = true;
            break;
          }
        }
      }

      if (wordMatched) matchedWordsCount++;
    }

    if (matchedWordsCount === prep.queryWordMeta.length) return true;
  }

  return false;
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

export const executeSmartSearch = (masterData, criteriaList, matchMode = 'AND') => {
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

    const rawQuery = String(c.query).trim().toLowerCase();
    const queryTrans = transliterate(rawQuery);
    const querySkel = getSkeleton(queryTrans);
    const queryWords = queryTrans.split(/\s+/).filter(w => w.length > 0);
    const queryWordMeta = queryWords.map(w => ({
      word: w,
      skel: getSkeleton(w),
      len: w.length
    }));

    return {
      column: c.column,
      rawQuery,
      queryTrans,
      querySkel,
      queryWords,
      queryWordMeta,
      isGlobal: c.column === 'ALL' || c.column === '_ALL_'
    };
  });

  return masterData.filter(row => {
    const checkCriteria = (prep) => {
      // Handle numeric range filters (Price, Carpet Area)
      if (prep.isRange) {
        const val = Number(row[prep.column] || 0);
        if (prep.min !== null && !isNaN(prep.min) && val < prep.min) return false;
        if (prep.max !== null && !isNaN(prep.max) && val > prep.max) return false;
        return true;
      }

      if (prep.isGlobal) {
        const blob = getRowSearchBlob(row);
        // Tier 0: Direct Raw Substring in whole row blob
        if (blob.rawBlob.includes(prep.rawQuery)) return true;
        // Tier 1: Transliterated Substring in whole row blob
        if (blob.transBlob.includes(prep.queryTrans)) return true;
        // Tier 2: Phonetic Skeleton in whole row blob
        if (prep.querySkel.length > 1 && blob.skelBlob.includes(prep.querySkel)) return true;

        // Tier 3: Multi-word query (all words must match)
        if (prep.queryWordMeta.length > 0) {
          let allWordsMatched = true;
          for (let qMeta of prep.queryWordMeta) {
            if (blob.transBlob.includes(qMeta.word)) continue;
            if (qMeta.skel.length > 1 && blob.skelBlob.includes(qMeta.skel)) continue;

            // Fast fuzzy check against row's distinct words
            let fuzzyMatched = false;
            if (qMeta.len >= 4 && qMeta.len <= 15) {
              for (let i = 0; i < blob.words.length; i++) {
                const w = blob.words[i];
                if (Math.abs(w.length - qMeta.len) <= 1 && levenshtein(qMeta.word, w) <= 1) {
                  fuzzyMatched = true;
                  break;
                }
              }
            }
            if (!fuzzyMatched) {
              allWordsMatched = false;
              break;
            }
          }
          if (allWordsMatched) return true;
        }

        return false;
      }

      return checkSingleCell(row[prep.column], prep);
    };

    if (matchMode === 'AND') {
      return preparedCriteria.every(checkCriteria);
    } else {
      return preparedCriteria.some(checkCriteria);
    }
  });
};
