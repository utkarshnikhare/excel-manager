import React, { useState } from 'react';
import { enrichRow } from '../utils/propertyParser';
import { parsePdfBuffer } from '../utils/pdfParser';
import { parseImageFile } from '../utils/imageParser';
import PasswordPromptModal from './PasswordPromptModal';

const FileUpload = ({ onDataParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0, records: 0, currentFileName: '' });
  const [encryptedModalState, setEncryptedModalState] = useState(null);

  // Fast decoder for single file buffer (supports UTF-16LE, UTF-8 BOM, binary xlsx/xls, and HTML exports)
  const parseBufferToWorkbook = (XLSX, arrayBuffer, fileName, password = null) => {
    const data = new Uint8Array(arrayBuffer);

    // If password provided, decrypt directly
    if (password) {
      return XLSX.read(data, { type: 'array', password, cellDates: false });
    }

    // Strategy 1: UTF-16LE BOM (0xFF 0xFE) - standard for Maharashtra IGR exports
    if (data.length >= 2 && data[0] === 0xFF && data[1] === 0xFE) {
      try {
        const textDecoder = new TextDecoder('utf-16le');
        const text = textDecoder.decode(data);
        return XLSX.read(text, { type: 'string', cellDates: false });
      } catch {
        // Fall through to binary decoder
      }
    }

    // Strategy 2: UTF-8 BOM (0xEF 0xBB 0xBF)
    if (data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
      try {
        const textDecoder = new TextDecoder('utf-8');
        const text = textDecoder.decode(data);
        return XLSX.read(text, { type: 'string', cellDates: false });
      } catch {
        // Fall through to binary decoder
      }
    }

    // Strategy 3: Standard Binary XLSX / XLS array
    try {
      return XLSX.read(data, { type: 'array', cellDates: false });
    } catch (binaryErr) {
      // Check for password/encryption error
      const msg = String(binaryErr?.message || '').toLowerCase();
      if (msg.includes('password') || msg.includes('encrypt') || msg.includes('protected')) {
        throw binaryErr;
      }
      // Strategy 4: Fallback UTF-8 String (HTML-table-based .xls)
      const textDecoder = new TextDecoder('utf-8');
      const text = textDecoder.decode(data);
      return XLSX.read(text, { type: 'string', cellDates: false });
    }
  };

  const isEncryptedError = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    return msg.includes('password') || msg.includes('encrypt') || msg.includes('protected');
  };

  // High-Capacity Multi-File Ingestion Pipeline (Handles 50+ files smoothly)
  const processFiles = async (fileList) => {
    setError('');
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsLoading(true);
    setProgress({ current: 0, total: files.length, percent: 0, records: 0, currentFileName: '' });

    try {
      const XLSX = await import('xlsx');
      let combinedData = [];
      const seenRecords = new Set();
      const sheetNames = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();

        setProgress({
          current: i + 1,
          total: files.length,
          percent: Math.round(((i + 1) / files.length) * 100),
          records: combinedData.length,
          currentFileName: file.name
        });

        // Yield execution to browser render loop so UI progress updates silky smooth
        await new Promise(resolve => setTimeout(resolve, 5));

        const buffer = await file.arrayBuffer();

        // -------------------------------------------------------------
        // OPTION 4 SOLUTION: Ingest PDFs (Index-II government deeds & general PDFs)
        // -------------------------------------------------------------
        if (lowerName.endsWith('.pdf')) {
          try {
            const pdfRows = await parsePdfBuffer(buffer, file.name);
            for (let r = 0; r < pdfRows.length; r++) {
              combinedData.push(pdfRows[r]);
            }
            if (!sheetNames.includes('PDF_Deeds')) sheetNames.push('PDF_Deeds');
          } catch (pdfErr) {
            console.warn(`PDF parse error in ${file.name}:`, pdfErr);
          }
          continue;
        }

        // -------------------------------------------------------------
        // OPTION 4 SOLUTION: Ingest Images (Scanned deeds, photos, receipts)
        // -------------------------------------------------------------
        if (/\.(png|jpe?g|webp|bmp)$/i.test(lowerName)) {
          try {
            const imgRows = await parseImageFile(file);
            for (let r = 0; r < imgRows.length; r++) {
              combinedData.push(imgRows[r]);
            }
            if (!sheetNames.includes('Image_OCR')) sheetNames.push('Image_OCR');
          } catch (imgErr) {
            console.warn(`Image OCR error in ${file.name}:`, imgErr);
          }
          continue;
        }

        // -------------------------------------------------------------
        // OPTION 5 SOLUTION: Excel & Password-Protected Decryption Interceptor
        // -------------------------------------------------------------
        let workbook = null;
        try {
          workbook = parseBufferToWorkbook(XLSX, buffer, file.name);
        } catch (readErr) {
          if (isEncryptedError(readErr)) {
            workbook = await new Promise((resolve) => {
              setEncryptedModalState({
                fileName: file.name,
                onDecrypt: async (password) => {
                  try {
                    const wb = parseBufferToWorkbook(XLSX, buffer, file.name, password);
                    setEncryptedModalState(null);
                    resolve(wb);
                    return true;
                  } catch {
                    return false;
                  }
                },
                onSkip: () => {
                  setEncryptedModalState(null);
                  resolve(null);
                }
              });
            });
          } else {
            console.warn(`Workbook parse error in ${file.name}:`, readErr);
          }
        }

        if (!workbook) continue;

        const currentSheets = workbook?.SheetNames || [];
        if (currentSheets.length === 0) continue;

        for (let s = 0; s < currentSheets.length; s++) {
          const sheetName = currentSheets[s];
          const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

          for (let r = 0; r < rawRows.length; r++) {
            const row = rawRows[r];
            row.source_file = file.name;
            row.source_sheet = sheetName;
            // High-speed deduplication key (no JSON.stringify overhead, scales to 100,000+ rows)
            const dedupeKey = row.docno 
              ? `${file.name}_${row.srocode || ''}_${row.docno}_${row.registrationdate || ''}` 
              : `${file.name}_s${s}_r${r}`;
            if (!seenRecords.has(dedupeKey)) {
              seenRecords.add(dedupeKey);
              // Auto-enrich real estate properties if present, preserve generic data as-is
              const enriched = enrichRow(row);
              combinedData.push(enriched);
            }
          }

          if (!sheetNames.includes(sheetName)) {
            sheetNames.push(sheetName);
          }
        }
      }

      if (combinedData.length === 0) {
        setError('No readable records found in the uploaded file(s). Please verify file contents.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);

      onDataParsed({
        data: combinedData,
        workbook: null,
        sheetNames: sheetNames.length > 0 ? sheetNames : ['Consolidated_Records'],
        activeSheet: sheetNames[0] || 'Consolidated_Records',
        fileName: files.length === 1 ? files[0].name : `${files.length} Merged Spreadsheets (${combinedData.length.toLocaleString()} rows)`
      });

    } catch (err) {
      console.error('File parsing error:', err);
      setIsLoading(false);
      setError(`Failed to read the file(s): ${err.message || 'Check if file format is supported.'}`);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '1rem' }}>
      <h2 className="card-title" style={{ textAlign: 'left', borderBottom: 'none', marginBottom: '0.35rem' }}>
        📂 Upload Any Spreadsheet & Data Files (50+ Files Supported)
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'left' }}>
        Drag & drop single or bulk spreadsheets (1 to 50+ files supported). Works with any data format (Excel, CSV, TSV, Text). Fast, non-blocking browser engine.
      </p>

      <div 
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && document.getElementById('file-upload-input').click()}
        style={{
          border: isDragging ? '2px dashed #3b82f6' : '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '2.5rem 1.5rem',
          cursor: isLoading ? 'wait' : 'pointer',
          background: isDragging ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-main)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ fontSize: '3.2rem', marginBottom: '0.85rem' }}>
          {isLoading ? '⏳' : '📥'}
        </div>
        
        {isLoading ? (
          <div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', marginBottom: '0.5rem' }}>
              Merging & Processing {progress.total} Files Without Freezing...
            </h3>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
              {progress.currentFileName}
            </p>

            {/* Interactive Animated Progress Bar */}
            <div style={{ width: '100%', maxWidth: '420px', margin: '0.5rem auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <span>File {progress.current} of {progress.total}</span>
                <span style={{ fontWeight: 700, color: '#3b82f6' }}>{progress.percent}%</span>
              </div>
              <div style={{ height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress.percent}%`, background: '#3b82f6', transition: 'width 0.15s ease' }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, marginTop: '0.5rem' }}>
                ⚡ {progress.records.toLocaleString()} unique records compiled systematically
              </div>
            </div>
          </div>
        ) : (
          <>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.15rem', marginBottom: '0.4rem', fontWeight: 700 }}>
              Drag & Drop your spreadsheets, PDFs, or Scans here
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              Supports Excel, CSV, Government Index-II PDFs, Scanned Photos & Password-Protected Files (1 to 50+ files)
            </p>
            <input 
              id="file-upload-input"
              type="file" 
              multiple
              accept=".xlsx, .xls, .csv, .tsv, .txt, .xlsm, .xlsb, .ods, .pdf, .png, .jpg, .jpeg, .webp, *" 
              style={{ display: 'none' }} 
              onChange={handleFileInput}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.XLSX / .XLS</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.CSV / .TSV / .TXT</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '4px', color: '#ef4444', fontWeight: '700' }}>📄 .PDF (Index-II Deeds)</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '4px', color: '#10b981', fontWeight: '700' }}>🖼️ .PNG / .JPG (Scanned OCR)</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', borderRadius: '4px', color: '#f59e0b', fontWeight: '700' }}>🔒 Password Unlocker</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#3b82f6', color: '#fff', borderRadius: '4px', fontWeight: '700' }}>🚀 50+ BULK FILES</span>
            </div>
          </>
        )}
      </div>

      {/* Password Prompt Modal for Encrypted Files */}
      {encryptedModalState && (
        <PasswordPromptModal
          fileName={encryptedModalState.fileName}
          onDecrypt={encryptedModalState.onDecrypt}
          onSkip={encryptedModalState.onSkip}
        />
      )}

      {error && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '8px',
          color: '#ef4444',
          textAlign: 'left',
          fontSize: '0.9rem'
        }}>
          <strong>⚠️ {error}</strong>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
