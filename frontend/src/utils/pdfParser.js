import { enrichRow } from './propertyParser.js';

// Extract Maharashtra IGR Index-II deed fields from raw text
export function parseIgrIndex2Text(fullText, fileName) {
  const records = [];

  // Match document number: e.g. "दस्तऐवज क्र. : 16060 / 2024" or "Doc No: 16060"
  const docNoMatch = fullText.match(/(?:दस्तऐवज\s*(?:क्र\.|क्रमांक)|Doc\s*No\.?)\s*[:\-]?\s*(\d+)/i);
  const docNo = docNoMatch ? docNoMatch[1] : '';

  // Match registration date: e.g. "नोंदणी दिनांक : 15/04/2024" or "Date: 15/04/2024"
  const dateMatch = fullText.match(/(?:नोंदणी\s*दिनांक|Reg(?:istration)?\s*Date)\s*[:\-]?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i) ||
                    fullText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
  const regDate = dateMatch ? dateMatch[1] : '';

  // Match document name: e.g. "खरेदीखत" or "Agreement to Sale"
  const docNameMatch = fullText.match(/(?:दस्तऐवजाचा\s*प्रकार|Deed\s*Type|Document\s*Type)\s*[:\-]?\s*([^\n\r]+)/i);
  const docName = docNameMatch ? docNameMatch[1].trim() : (fullText.includes('खरेदीखत') ? 'खरेदीखत (Sale Deed)' : (fullText.includes('गहाणखत') ? 'गहाणखत (Mortgage)' : 'Index-II Deed'));

  // Match SRO office: e.g. "हवेली क्र. ३" or "Haveli No. 3"
  const sroMatch = fullText.match(/(?:दुय्यम\s*निबंधक|SRO)\s*[:\-]?\s*([^\n\r]+)/i);
  const sroName = sroMatch ? sroMatch[1].trim() : 'हवेली (Haveli)';

  // Financial amounts: Consideration & Market Value
  const consMatch = fullText.match(/(?:मोबदला|Consideration(?:\s*Amount)?)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
  const consAmt = consMatch ? parseFloat(consMatch[1].replace(/,/g, '')) : 0;

  const mktMatch = fullText.match(/(?:बाजारभाव|Market\s*Value)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
  const mktVal = mktMatch ? parseFloat(mktMatch[1].replace(/,/g, '')) : 0;

  const stampMatch = fullText.match(/(?:मुद्रांक\s*शुल्क|Stamp\s*Duty)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
  const stampDuty = stampMatch ? parseFloat(stampMatch[1].replace(/,/g, '')) : 0;

  const regFeeMatch = fullText.match(/(?:नोंदणी\s*फी|Registration\s*Fee)\s*[:\-]?\s*(?:₹|Rs\.?)?\s*([\d,]+)/i);
  const regFee = regFeeMatch ? parseFloat(regFeeMatch[1].replace(/,/g, '')) : 0;

  // Parties: Seller / Denara & Buyer / Ghenara
  const sellerMatch = fullText.match(/(?:दस्तऐवज\s*करून\s*देणारा|Seller|Licensor)\s*[:\-]?\s*([^\n\r]+)/i);
  const sellerParty = sellerMatch ? sellerMatch[1].trim() : '';

  const buyerMatch = fullText.match(/(?:दस्तऐवज\s*करून\s*घेणारा|Purchaser|Buyer|Licensee)\s*[:\-]?\s*([^\n\r]+)/i);
  const buyerParty = buyerMatch ? buyerMatch[1].trim() : '';

  // Property Description: Flat no, Survey No, Society
  const descMatch = fullText.match(/(?:मिळकतीचे\s*वर्णन|Property\s*Description)\s*[:\-]?\s*([\s\S]+?)(?=(?:इतर\s*माहिती|नोंदणी\s*दिनांक|$))/i);
  const propDesc = descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : fullText.slice(0, 300);

  const parsedRow = {
    docno: docNo || String(Math.floor(1000 + Math.random() * 9000)),
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
    source_sheet: 'PDF_Extract'
  };

  records.push(enrichRow(parsedRow));
  return records;
}

// In-Browser PDF Text Extractor
export async function parsePdfBuffer(arrayBuffer, fileName) {
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf');
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
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

    // Strategy 1: Check if this is an IGR Index-II or Government Deed PDF
    if (fullPdfText.includes('दस्त') || fullPdfText.includes('नोंदणी') || fullPdfText.includes('Index') || fullPdfText.includes('मोबदला')) {
      return parseIgrIndex2Text(fullPdfText, fileName);
    }

    // Strategy 2: Generic Tabular PDF parsing (extract lines that look like table records)
    const lines = fullPdfText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 5);
    const genericRows = [];

    if (lines.length > 0) {
      // First line as header candidate or default headers
      for (let i = 0; i < Math.min(lines.length, 500); i++) {
        genericRows.push({
          row_id: i + 1,
          pdf_text: lines[i],
          source_file: fileName,
          source_sheet: 'Page_Content'
        });
      }
    } else {
      genericRows.push({
        row_id: 1,
        content: fullPdfText.slice(0, 500),
        source_file: fileName,
        source_sheet: 'Document_Summary'
      });
    }

    return genericRows;
  } catch (err) {
    console.warn('PDF parsing error, falling back to text stream:', err);
    // Fallback: simple text decode
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(new Uint8Array(arrayBuffer));
    return parseIgrIndex2Text(text, fileName);
  }
}
