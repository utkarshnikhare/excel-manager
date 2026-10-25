import { enrichRow, normalizeDevanagariDigits } from './propertyParser.js';

// Extract Maharashtra IGR Index-II deed fields from raw text
export function parseIgrIndex2Text(fullText, fileName) {
  const records = [];

  // Split by deed header markers if multiple deeds exist in the text (supports "दस्तऐवज क्र.", "द. क्र.", "दस्तऐवज क्रमांक", "Doc No.")
  const rawBlocks = fullText.split(/(?=(?:[०-९\d]+\.\s*)?(?:दस्तऐवज\s*(?:क्र\.|क्रमांक|नं\.?)|द\.\s*क्र\.|Doc(?:ument)?\s*No\.?)\s*[:\-])/i).filter(b => b.trim().length > 30);
  // Filter out any preamble block before the first deed that does not contain a deed identifier
  const deedBlocks = rawBlocks.filter(b => /(?:दस्तऐवज|द\.\s*क्र|Doc(?:ument)?\s*No)/i.test(b));
  const blocksToProcess = deedBlocks.length > 0 ? deedBlocks : [fullText];

  for (let bIdx = 0; bIdx < blocksToProcess.length; bIdx++) {
    const block = blocksToProcess[bIdx];

    // Match document number: e.g. "दस्तऐवज क्र. : 16060 / 2024", Devanagari "१६०६० / २०२४", or "Doc No: 16060"
    const docNoMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:दस्तऐवज\s*(?:क्र\.|क्रमांक|नं\.?)|द\.\s*क्र\.|Doc(?:ument)?\s*No\.?)\s*[:\-]?\s*([०-९\d]+)/i);
    const docNo = docNoMatch ? normalizeDevanagariDigits(docNoMatch[1]).replace(/\s+/g, '') : '';

    // Match registration date: e.g. "नोंदणी दिनांक : 15/04/2024" or Devanagari "१५/०४/२०२४"
    const dateMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:नोंदणी\s*दिनांक|Reg(?:istration)?\s*Date)\s*[:\-]?\s*([०-९\d]{1,2}[\/\-][०-९\d]{1,2}[\/\-][०-९\d]{4})/i) ||
                      block.match(/([०-९\d]{1,2}[\/\-][०-९\d]{1,2}[\/\-][०-९\d]{4})/);
    const regDate = dateMatch ? normalizeDevanagariDigits(dateMatch[1]) : '';

    // Match document name: e.g. "खरेदीखत" or "Agreement to Sale"
    const docNameMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:दस्तऐवजाचा\s*प्रकार|Deed\s*Type|Document\s*Type)\s*[:\-]?\s*([^\n\r]+)/i);
    const docName = docNameMatch ? docNameMatch[1].trim() : (block.includes('खरेदीखत') ? 'खरेदीखत (Sale Deed)' : (block.includes('गहाणखत') ? 'गहाणखत (Mortgage)' : 'Index-II Deed'));

    // Match SRO office: e.g. "हवेली क्र. ३" or "Haveli No. 3"
    const sroMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:दुय्यम\s*निबंधक|Sub-Registrar|SRO)\s*[:\-]?\s*([^\n\r]+)/i);
    const sroName = sroMatch ? sroMatch[1].trim() : 'हवेली (Haveli)';

    // Financial amounts: Consideration & Market Value (supporting both English and Devanagari numerals)
    const consMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:मोबदला|Consideration(?:\s*Amount)?)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([०-९\d,]+)/i);
    const consAmt = consMatch ? parseFloat(normalizeDevanagariDigits(consMatch[1]).replace(/,/g, '')) : 0;

    const mktMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:बाजारभाव|Market\s*Value)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([०-९\d,]+)/i);
    const mktVal = mktMatch ? parseFloat(normalizeDevanagariDigits(mktMatch[1]).replace(/,/g, '')) : 0;

    const stampMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:मुद्रांक\s*शुल्क|Stamp\s*Duty)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([०-९\d,]+)/i);
    const stampDuty = stampMatch ? parseFloat(normalizeDevanagariDigits(stampMatch[1]).replace(/,/g, '')) : 0;

    const regFeeMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:नोंदणी\s*फी|Registration\s*Fee)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([०-९\d,]+)/i);
    const regFee = regFeeMatch ? parseFloat(normalizeDevanagariDigits(regFeeMatch[1]).replace(/,/g, '')) : 0;

    // Parties: Seller / Denara & Buyer / Ghenara
    const sellerMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:दस्तऐवज\s*करून\s*देणारा|Seller|Licensor|देणारा)\s*[:\-]?\s*([^\n\r]+)/i);
    const sellerParty = sellerMatch ? sellerMatch[1].trim() : '';

    const buyerMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:दस्तऐवज\s*करून\s*घेणारा|Purchaser|Buyer|Licensee|घेणारा)\s*[:\-]?\s*([^\n\r]+)/i);
    const buyerParty = buyerMatch ? buyerMatch[1].trim() : '';

    // Property Description: Flat no, Survey No, Society
    const descMatch = block.match(/(?:[०-९\d]+\.\s*)?(?:मिळकतीचे\s*वर्णन|Property\s*Description|वर्णन)\s*[:\-]?\s*([\s\S]+?)(?=(?:इतर\s*माहिती|नोंदणी\s*दिनांक|$))/i);
    const propDesc = descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : block.slice(0, 300);

    // Extraction Certainty Scoring & Semantic Calibration:
    // Distinguish genuine extractions from inferred defaults, missing critical fields,
    // and misleading field associations.
    const isDocNoExtracted = Boolean(docNo);
    const isRegDateExtracted = Boolean(regDate);
    const isConsiderationExtracted = consAmt > 0;
    const areBothPartiesExtracted = Boolean(sellerParty && buyerParty);
    const isPartialPartiesExtracted = Boolean(sellerParty || buyerParty) && !areBothPartiesExtracted;
    const isDuplicateParties = Boolean(sellerParty && buyerParty && sellerParty.toLowerCase() === buyerParty.toLowerCase());
    const isPropertyExtracted = propDesc.length >= 25;

    const fieldConfidence = {
      docno: isDocNoExtracted ? 'EXTRACTED' : 'INFERRED_DEFAULT',
      registrationdate: isRegDateExtracted ? 'EXTRACTED' : 'UNSTATED',
      consideration: isConsiderationExtracted ? 'EXTRACTED' : 'UNSTATED',
      parties: isDuplicateParties ? 'SUSPICIOUS_DUPLICATE' : areBothPartiesExtracted ? 'EXTRACTED' : isPartialPartiesExtracted ? 'PARTIAL' : 'MISSING',
      property: isPropertyExtracted ? 'EXTRACTED' : 'BRIEF'
    };

    let confidenceScore = 100;
    // Missing document identifier is a primary defect: deduct 35 points
    if (!isDocNoExtracted) confidenceScore -= 35;
    // Missing registration date: deduct 15 points
    if (!isRegDateExtracted) confidenceScore -= 15;
    // Unstated consideration: deduct 15 points
    if (!isConsiderationExtracted) confidenceScore -= 15;
    // Parties evaluation
    if (isDuplicateParties) {
      confidenceScore -= 25; // Misleading association / duplicate extraction
    } else if (!sellerParty && !buyerParty) {
      confidenceScore -= 35; // Both parties missing
    } else if (isPartialPartiesExtracted) {
      confidenceScore -= 15; // Only one party extracted
    }
    // Brief or unextracted property description
    if (!isPropertyExtracted) confidenceScore -= 15;

    // Hard safeguard: A deed can NEVER be HIGH certainty if docno is missing, both parties missing, or duplicate parties
    const extractionCertainty = (confidenceScore >= 80 && isDocNoExtracted && (sellerParty || buyerParty) && !isDuplicateParties)
      ? 'HIGH'
      : (confidenceScore >= 50 && (isDocNoExtracted || (sellerParty && buyerParty)))
        ? 'MEDIUM'
        : 'UNCERTAIN';

    const parsedRow = {
      docno: docNo || String(1000 + bIdx),
      registrationdate: regDate || '—',
      docname: docName,
      sroname: sroName,
      consideration_amt: consAmt,
      marketvalue: mktVal,
      stampdutypaid: stampDuty,
      registrationfees: regFee,
      sellerparty: sellerParty || 'Parties per Index-II',
      purchaserparty: buyerParty || 'Allottee per Index-II',
      propertydescription: propDesc,
      source_file: fileName,
      source_sheet: 'PDF_Extract',
      _extractionStatus: 'SUCCESS',
      _extractionSource: 'DIGITAL_PDF_TEXT',
      _extractionCertainty: extractionCertainty,
      _fieldConfidence: fieldConfidence,
      _confidenceScore: confidenceScore,
      _rawText: block.trim(),
      _deedIndex: bIdx + 1
    };

    records.push(enrichRow(parsedRow));
  }
  return records;
}

// In-Browser PDF Text Extractor (100% Client-Side & Zero-CDN Offline Privacy)
export async function parsePdfBuffer(arrayBuffer, fileName) {
  try {
    const pdfModule = await import('pdfjs-dist/build/pdf.js');
    const pdfjsLib = pdfModule.default || pdfModule;
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // Local self-hosted worker: prevents CDN leakage and enables true offline capability
      const base = typeof window !== 'undefined' && window.location 
        ? (window.location.origin + window.location.pathname.replace(/[^/]*$/, ''))
        : '';
      pdfjsLib.GlobalWorkerOptions.workerSrc = base ? `${base}pdf.worker.min.js` : './pdf.worker.min.js';
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pageTexts = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items.map(item => item.str).join(' ');
      pageTexts.push(pageStr);
    }

    const fullPdfText = pageTexts.join('\n');
    const hasSufficientText = pageTexts.some(pt => pt.trim().length > 20);

    // Scanned PDF detection: if embedded text layer is empty or unusable, flag clearly for OCR
    if (!hasSufficientText) {
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        try {
          const { ocrScannedPdf } = await import('./ocrEngine.js');
          return await ocrScannedPdf(pdf, fileName, null);
        } catch (ocrErr) {
          console.warn('Scanned PDF OCR attempt failed, using fallback advisory:', ocrErr);
        }
      }
      return [{
        docno: 'SCANNED_DOC',
        registrationdate: '—',
        docname: 'Scanned Document (No Embedded Text)',
        sroname: '—',
        consideration_amt: 0,
        marketvalue: 0,
        stampdutypaid: 0,
        registrationfees: 0,
        sellerparty: 'Scanned Image / OCR Required',
        purchaserparty: 'Scanned Image / OCR Required',
        propertydescription: `This PDF (${fileName}, ${numPages} page${numPages > 1 ? 's' : ''}) appears to be a scanned image with no embedded digital text layer. Real-time OCR or searchable PDF conversion is recommended.`,
        source_file: fileName,
        source_sheet: 'Scanned_PDF',
        _extractionStatus: 'SCANNED_NEEDS_OCR',
        _isWarning: true,
        _pageCount: numPages
      }];
    }

    // Strategy 1: Check if this is an IGR Index-II or Government Deed PDF
    if (fullPdfText.includes('दस्त') || fullPdfText.includes('नोंदणी') || fullPdfText.includes('Index') || fullPdfText.includes('मोबदला')) {
      return parseIgrIndex2Text(fullPdfText, fileName);
    }

    // Strategy 2: Generic Tabular PDF parsing (extract lines that look like table records)
    const lines = fullPdfText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5);
    const genericRows = [];

    if (lines.length > 0) {
      for (let i = 0; i < Math.min(lines.length, 500); i++) {
        genericRows.push({
          row_id: i + 1,
          pdf_text: lines[i],
          source_file: fileName,
          source_sheet: 'Page_Content',
          _extractionStatus: 'SUCCESS',
          _pageCount: numPages
        });
      }
    } else {
      genericRows.push({
        row_id: 1,
        content: fullPdfText.slice(0, 500),
        source_file: fileName,
        source_sheet: 'Document_Summary',
        _extractionStatus: 'PARTIAL',
        _pageCount: numPages
      });
    }

    return genericRows;
  } catch (err) {
    console.warn('PDF parsing error, falling back to text stream:', err);
    try {
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(new Uint8Array(arrayBuffer));
      if (text.includes('दस्त') || text.includes('नोंदणी')) {
        return parseIgrIndex2Text(text, fileName);
      }
    } catch {
      // Fall through to error response
    }

    return [{
      docno: 'PARSE_ERROR',
      registrationdate: '—',
      docname: 'PDF Parse Error',
      sroname: '—',
      consideration_amt: 0,
      marketvalue: 0,
      stampdutypaid: 0,
      registrationfees: 0,
      sellerparty: '—',
      purchaserparty: '—',
      propertydescription: `Failed to parse PDF document: ${err.message}`,
      source_file: fileName,
      source_sheet: 'Error_Log',
      _extractionStatus: 'FAILED',
      _isWarning: true
    }];
  }
}
