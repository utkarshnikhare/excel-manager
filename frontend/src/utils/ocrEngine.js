// 100% Client-Side Local Marathi & English OCR Engine (Zero External Telemetry / Offline WASM)
import { createWorker } from 'tesseract.js';
import { parseIgrIndex2Text } from './pdfParser.js';

let activeWorker = null;

// Determine local asset paths dynamically for browser origin & deployment path
function getLocalAssetPaths() {
  let base = '';
  if (typeof window !== 'undefined' && window.location) {
    base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  }
  return {
    workerPath: base ? `${base}tesseract/worker.min.js` : './tesseract/worker.min.js',
    corePath: base ? `${base}tesseract/tesseract-core-simd-lstm.wasm.js` : './tesseract/tesseract-core-simd-lstm.wasm.js',
    langPath: base ? `${base}tesseract/lang-data` : './tesseract/lang-data'
  };
}

// Initialize Tesseract worker with Marathi + English local traineddata
export async function getOrCreateOcrWorker(languages = 'mar+eng', onProgress = null) {
  try {
    const paths = getLocalAssetPaths();
    const worker = await createWorker(languages, 1, {
      workerPath: paths.workerPath,
      corePath: paths.corePath,
      langPath: paths.langPath,
      cacheMethod: 'write',
      logger: (m) => {
        if (onProgress && typeof onProgress === 'function') {
          if (m.status === 'recognizing text') {
            onProgress({
              status: 'recognizing',
              progress: Math.round((m.progress || 0) * 100),
              detail: `Recognizing text (${Math.round((m.progress || 0) * 100)}%)`
            });
          } else {
            onProgress({
              status: m.status,
              progress: Math.round((m.progress || 0) * 100),
              detail: m.status
            });
          }
        }
      }
    });
    activeWorker = worker;
    return worker;
  } catch (err) {
    console.warn('Failed to initialize local Tesseract OCR worker:', err);
    throw err;
  }
}

// Terminate OCR worker to free browser memory
export async function terminateOcrWorker() {
  if (activeWorker) {
    try {
      await activeWorker.terminate();
    } catch {
      // Ignore termination cleanup errors
    } finally {
      activeWorker = null;
    }
  }
}

// Render a single PDF.js page onto an HTML canvas at high resolution for OCR
export async function renderPdfPageToCanvas(pdfPage, scale = 2.0) {
  if (typeof document === 'undefined') return null;
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const canvasContext = canvas.getContext('2d');
  await pdfPage.render({ canvasContext, viewport }).promise;
  return canvas;
}

// Perform client-side OCR on an image (File, Blob, or HTMLCanvasElement)
export async function recognizeImage(imageSource, options = {}) {
  const { onProgress, languages = 'mar+eng' } = options;
  try {
    const worker = await getOrCreateOcrWorker(languages, onProgress);
    const result = await worker.recognize(imageSource);
    return {
      success: true,
      text: result.data.text || '',
      confidence: result.data.confidence || 0,
      words: result.data.words || []
    };
  } catch (err) {
    console.warn('Image OCR failed:', err);
    return {
      success: false,
      text: '',
      confidence: 0,
      error: err.message || 'Unknown OCR error'
    };
  }
}

// Perform client-side multi-page scanned PDF OCR
export async function ocrScannedPdf(pdfDoc, fileName, onProgress) {
  const numPages = pdfDoc.numPages;
  const pageOcrResults = [];
  let combinedOcrText = '';
  let totalConfidence = 0;

  try {
    const worker = await getOrCreateOcrWorker('mar+eng', onProgress);

    for (let pageNum = 1; pageNum <= Math.min(numPages, 10); pageNum++) {
      if (onProgress) {
        onProgress({
          status: 'rendering_page',
          progress: Math.round(((pageNum - 1) / numPages) * 100),
          detail: `Rendering Page ${pageNum} of ${numPages} for OCR...`
        });
      }

      const page = await pdfDoc.getPage(pageNum);
      const canvas = await renderPdfPageToCanvas(page, 2.0);
      if (!canvas) continue;

      const result = await worker.recognize(canvas);
      const pageText = result.data.text || '';
      combinedOcrText += `\n--- Page ${pageNum} ---\n` + pageText;
      pageOcrResults.push({
        page: pageNum,
        text: pageText,
        confidence: result.data.confidence || 0
      });
      totalConfidence += (result.data.confidence || 0);
    }

    const avgConfidence = pageOcrResults.length > 0 ? Math.round(totalConfidence / pageOcrResults.length) : 0;

    // Check if recognized text contains Index-II deed markers
    if (combinedOcrText.includes('दस्त') || combinedOcrText.includes('नोंदणी') || combinedOcrText.includes('मोबदला') || combinedOcrText.includes('खरेदी') || combinedOcrText.includes('Index')) {
      const parsedRecords = parseIgrIndex2Text(combinedOcrText, fileName);
      return parsedRecords.map(rec => ({
        ...rec,
        _ocrStatus: 'OCR_SUCCESS',
        _ocrEngine: 'Tesseract.js (mar+eng Offline WASM)',
        _ocrConfidence: avgConfidence,
        _ocrTextSnippet: combinedOcrText.slice(0, 300)
      }));
    }

    // Generic scanned PDF OCR record
    return [{
      docno: 'SCANNED_OCR_DOC',
      registrationdate: '—',
      docname: 'Scanned Document (OCR Processed)',
      sroname: '—',
      consideration_amt: 0,
      marketvalue: 0,
      stampdutypaid: 0,
      registrationfees: 0,
      sellerparty: 'Extracted via OCR',
      purchaserparty: 'Extracted via OCR',
      propertydescription: combinedOcrText.trim().slice(0, 500) || 'Scanned document processed via local OCR. Low textual contrast detected.',
      source_file: fileName,
      source_sheet: 'Scanned_PDF_OCR',
      _ocrStatus: 'OCR_SUCCESS',
      _ocrEngine: 'Tesseract.js (mar+eng Offline WASM)',
      _ocrConfidence: avgConfidence,
      _pageCount: numPages
    }];
  } catch (err) {
    console.warn('Scanned PDF OCR failed:', err);
    return [{
      docno: 'SCANNED_DOC',
      registrationdate: '—',
      docname: 'Scanned Document (OCR Failed/Unavailable)',
      sroname: '—',
      consideration_amt: 0,
      marketvalue: 0,
      stampdutypaid: 0,
      registrationfees: 0,
      sellerparty: 'Scanned Image / OCR Incomplete',
      purchaserparty: 'Scanned Image / OCR Incomplete',
      propertydescription: `This PDF (${fileName}, ${numPages} page${numPages > 1 ? 's' : ''}) appears to be a scanned image with no embedded digital text layer. OCR fallback failed or language data was unavailable: ${err.message}`,
      source_file: fileName,
      source_sheet: 'Scanned_PDF',
      _extractionStatus: 'SCANNED_NEEDS_OCR',
      _isWarning: true,
      _pageCount: numPages
    }];
  }
}
