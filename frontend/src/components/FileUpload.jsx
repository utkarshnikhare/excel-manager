import React, { useState } from 'react';
import { enrichRow } from '../utils/propertyParser';

const FileUpload = ({ onDataParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Helper to decode a single file's arrayBuffer into workbook using dynamic XLSX
  const parseBufferToWorkbook = (XLSX, arrayBuffer, fileName) => {
    const data = new Uint8Array(arrayBuffer);

    // Strategy 1: Check for UTF-16LE BOM (0xFF 0xFE) - standard for Maharashtra IGR exports
    if (data.length >= 2 && data[0] === 0xFF && data[1] === 0xFE) {
      try {
        const textDecoder = new TextDecoder('utf-16le');
        const text = textDecoder.decode(data);
        return XLSX.read(text, { type: 'string', cellDates: false });
      } catch (err) {
        console.warn('UTF-16LE decode failed, falling back to array', err);
      }
    }

    // Strategy 2: Check for UTF-8 BOM (0xEF 0xBB 0xBF)
    if (data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF) {
      try {
        const textDecoder = new TextDecoder('utf-8');
        const text = textDecoder.decode(data);
        return XLSX.read(text, { type: 'string', cellDates: false });
      } catch (err) {
        console.warn('UTF-8 decode failed, falling back to array', err);
      }
    }

    // Strategy 3: Binary array buffer (Standard .xlsx and binary .xls)
    try {
      return XLSX.read(data, { type: 'array', cellDates: false });
    } catch (binaryErr) {
      // Strategy 4: Fallback HTML / string read
      const textDecoder = new TextDecoder('utf-8');
      const text = textDecoder.decode(data);
      return XLSX.read(text, { type: 'string', cellDates: false });
    }
  };

  // Process single or multiple files
  const processFiles = async (fileList) => {
    setError('');
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsLoading(true);
    setStatusMessage(files.length > 1 ? `Processing ${files.length} files...` : 'Reading file...');

    try {
      const XLSX = await import('xlsx');
      let combinedData = [];
      let combinedWorkbook = XLSX.utils.book_new();
      let sheetNames = [];
      const seenRecords = new Set();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (files.length > 1) {
          setStatusMessage(`Processing file ${i + 1} of ${files.length}: ${file.name}`);
        }

        const buffer = await file.arrayBuffer();
        const workbook = parseBufferToWorkbook(XLSX, buffer, file.name);

        const currentSheets = workbook.SheetNames || [];
        if (currentSheets.length === 0) continue;

        currentSheets.forEach(sheetName => {
          const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
          rawRows.forEach(r => {
            // Deduplicate if docno exists
            const dedupeKey = r.docno ? `${r.srocode || ''}_${r.docno}_${r.registrationdate || ''}` : JSON.stringify(r);
            if (!seenRecords.has(dedupeKey)) {
              seenRecords.add(dedupeKey);
              // Auto-enrich real estate properties
              const enriched = enrichRow(r);
              combinedData.push(enriched);
            }
          });

          if (!sheetNames.includes(sheetName)) {
            sheetNames.push(sheetName);
            // Append sheet to combined workbook
            try {
              XLSX.utils.book_append_sheet(combinedWorkbook, workbook.Sheets[sheetName], sheetName.slice(0, 31));
            } catch (e) {}
          }
        });
      }

      if (combinedData.length === 0) {
        setError('No readable records found in the uploaded file(s).');
        setIsLoading(false);
        return;
      }

      // If multiple files or new combined workbook, create unified master sheet
      const masterWs = XLSX.utils.json_to_sheet(combinedData);
      const finalWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(finalWb, masterWs, 'Consolidated_Records');

      setIsLoading(false);
      setStatusMessage('');

      onDataParsed({
        data: combinedData,
        workbook: finalWb,
        sheetNames: ['Consolidated_Records', ...sheetNames.filter(s => s !== 'Consolidated_Records')],
        activeSheet: 'Consolidated_Records',
        fileName: files.length === 1 ? files[0].name : `${files.length} Merged Files (${combinedData.length} rows)`
      });

    } catch (err) {
      console.error('File parsing error:', err);
      setIsLoading(false);
      setStatusMessage('');
      setError(`Failed to read the file: ${err.message || 'Check if file format is supported.'}`);
    }
  };

  // Demo 1: Real Property Records (3,498 Genuine Records)
  const loadPropertyData = async () => {
    setError('');
    setIsLoading(true);
    setStatusMessage('Loading 3,500 real estate property records...');

    try {
      // 1. Try fetching lohgaon_deeds.json for ultra-fast load
      const base = import.meta.env.BASE_URL || './';
      const jsonUrls = [
        `${base}lohgaon_deeds.json`,
        './lohgaon_deeds.json',
        'lohgaon_deeds.json',
        '/excel-manager/lohgaon_deeds.json'
      ];

      let jsonRes = null;
      for (const u of jsonUrls) {
        try {
          const r = await fetch(u);
          if (r.ok) {
            jsonRes = r;
            break;
          }
        } catch (e) {}
      }

      if (jsonRes) {
        const records = await jsonRes.json();
        setIsLoading(false);
        setStatusMessage('');
        onDataParsed({
          data: records,
          workbook: null,
          sheetNames: ['All_3500_Deeds'],
          activeSheet: 'All_3500_Deeds',
          fileName: 'Sample_Real_Estate_Records.xlsx'
        });
        return;
      }

      // 2. Fallback: try fetching xlsx directly
      const xlsxUrls = [
        `${base}Lohgaon_Property_Records.xlsx`,
        './Lohgaon_Property_Records.xlsx',
        'Lohgaon_Property_Records.xlsx',
        '/excel-manager/Lohgaon_Property_Records.xlsx'
      ];

      let xlsxRes = null;
      for (const u of xlsxUrls) {
        try {
          const r = await fetch(u);
          if (r.ok) {
            xlsxRes = r;
            break;
          }
        } catch (e) {}
      }

      if (xlsxRes) {
        const buf = await xlsxRes.arrayBuffer();
        const XLSX = await import('xlsx');
        const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
        const sheetNames = wb.SheetNames || [];
        const firstSheet = sheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: "" });

        setIsLoading(false);
        setStatusMessage('');
        onDataParsed({
          data,
          workbook: wb,
          sheetNames,
          activeSheet: firstSheet,
          fileName: 'Sample_Real_Estate_Records.xlsx'
        });
        return;
      }

      throw new Error('Could not fetch sample property dataset. Please ensure file exists.');

    } catch (err) {
      console.error('Demo loading error:', err);
      setIsLoading(false);
      setStatusMessage('');
      setError(`Failed to load dataset: ${err.message}`);
    }
  };

  // Demo 2: Standard Employee Dataset
  const loadEmployeeData = () => {
    setError('');
    setIsLoading(true);

    const demoRecords = [
      { "ID": "EMP-101", "Name": "Rahul Sharma", "Hindi Name": "राहुल शर्मा", "City": "Mumbai", "Department": "Engineering", "Phone": "9820011223", "Status": "Active" },
      { "ID": "EMP-102", "Name": "Pooja Patil", "Hindi Name": "पूजा पाटिल", "City": "Pune", "Department": "Finance", "Phone": "9820044556", "Status": "Active" },
      { "ID": "EMP-103", "Name": "Amit Verma", "Hindi Name": "अमित वर्मा", "City": "Delhi", "Department": "Sales", "Phone": "9811122334", "Status": "Pending" },
      { "ID": "EMP-104", "Name": "Sneha Kulkarni", "Hindi Name": "स्नेहा कुलकर्णी", "City": "Pune", "Department": "Engineering", "Phone": "9820077889", "Status": "Active" },
      { "ID": "EMP-105", "Name": "Vishal Thombre", "Hindi Name": "विशाल ठोंबरे", "City": "Nashik", "Department": "Marketing", "Phone": "9890011223", "Status": "Active" },
      { "ID": "EMP-106", "Name": "Utkarsh Nikhare", "Hindi Name": "उत्कर्ष निखारे", "City": "Nagpur", "Department": "Operations", "Phone": "9823344556", "Status": "Active" }
    ];

    setIsLoading(false);

    onDataParsed({
      data: demoRecords,
      workbook: null,
      sheetNames: ["Employees"],
      activeSheet: "Employees",
      fileName: "sample_employees.xlsx"
    });
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
    <div style={{ textAlign: 'center' }}>
      <h2 className="card-title" style={{ textAlign: 'left', borderBottom: 'none' }}>
        📂 Load Spreadsheet Data
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'left' }}>
        Upload single or multiple spreadsheets to begin searching. Supports .xlsx, .xls, .csv, and Maharashtra IGR HTML exports.
      </p>

      <div 
        className={`dropzone ${isDragging ? 'active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload-input').click()}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
          {isLoading ? '⏳' : '📊'}
        </div>
        
        {isLoading ? (
          <div>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Parsing Records...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>{statusMessage}</p>
          </div>
        ) : (
          <>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Drag & Drop your Excel / IGR files here
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              or click to browse from your computer (Multiple files supported)
            </p>
            <input 
              id="file-upload-input"
              type="file" 
              multiple
              accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              style={{ display: 'none' }} 
              onChange={handleFileInput}
            />
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.XLSX</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.XLS (IGR)</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.CSV</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>MULTI-FILE</span>
            </div>
          </>
        )}
      </div>

      {/* Instant Demo Sample Data Options */}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Instant Test with Verified Full Dataset:
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={loadPropertyData}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            🏛️ Load Sample Real Estate Records (3,500 Deeds)
          </button>
          <button 
            className="btn btn-outline" 
            onClick={loadEmployeeData}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            👥 Load Employee Records
          </button>
        </div>
      </div>

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
