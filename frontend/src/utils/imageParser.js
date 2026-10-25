import { enrichRow } from './propertyParser.js';

// In-Browser Image Reader & OCR Extraction Pipeline
export async function parseImageFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = async () => {
        const width = img.width;
        const height = img.height;
        let detectedText = '';
        let hasNativeOcr = false;

        // Modern Browser Shape Detection API (Native In-Browser OCR)
        if ('TextDetector' in window) {
          try {
            // @ts-ignore
            const detector = new window.TextDetector();
            const detections = await detector.detect(img);
            if (detections && detections.length > 0) {
              detectedText = detections.map(d => d.rawValue).join(' ');
              hasNativeOcr = true;
            }
          } catch (err) {
            console.warn('Native TextDetector failed on image:', err);
          }
        }

        const dateStr = file.lastModified ? new Date(file.lastModified).toLocaleDateString('en-GB') : '—';
        const fileSizeKb = Math.round(file.size / 1024);

        // Systematic record structure for image uploads
        const row = {
          document_title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
          file_type: file.type || 'image/jpeg',
          dimensions: `${width} x ${height} px`,
          file_size: `${fileSizeKb} KB`,
          capture_date: dateStr,
          extracted_ocr_text: detectedText || (hasNativeOcr ? 'No readable text recognized in image.' : 'Native browser OCR unavailable. File metadata recorded.'),
          source_file: file.name,
          source_sheet: 'Image_OCR',
          _ocrStatus: hasNativeOcr ? 'NATIVE_OCR_SUCCESS' : 'OCR_UNAVAILABLE',
          _extractionStatus: detectedText ? 'SUCCESS' : 'INCOMPLETE',
          _isWarning: !detectedText
        };

        // If detected text looks like a real-estate deed or receipt, extract fields
        if (detectedText && (detectedText.includes('दस्त') || detectedText.includes('मोबदला') || detectedText.includes('₹'))) {
          const numMatch = detectedText.match(/(\d+)/);
          if (numMatch) row.docno = numMatch[1];
          const valMatch = detectedText.match(/(?:₹|Rs\.?)\s*([\d,]+)/);
          if (valMatch) row.consideration_amt = parseFloat(valMatch[1].replace(/,/g, ''));
        }

        // Traceable filename metadata fallback if OCR was not available
        if (!row.docno) {
          const docMatch = file.name.match(/(?:doc|deed|no|rec)?[-_\s]?(\d{4,6})/i);
          if (docMatch) {
            row.docno = docMatch[1];
            row._provenance = 'Inferred from filename (unverified)';
          }
        }

        resolve([enrichRow(row)]);
      };

      img.onerror = () => {
        resolve([{
          document_title: file.name,
          file_size: `${Math.round(file.size / 1024)} KB`,
          extracted_ocr_text: `Corrupt or unreadable image file: ${file.name}`,
          source_file: file.name,
          source_sheet: 'Image_OCR',
          _ocrStatus: 'FAILED',
          _extractionStatus: 'FAILED',
          _isWarning: true
        }]);
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
