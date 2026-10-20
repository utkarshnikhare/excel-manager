import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const FileUpload = ({ onDataParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Core logic to read .xlsx, .xls, .csv, and HTML-tables-as-xls
  const processFile = (file) => {
    setError('');

    if (!file) return;

    if (file.size === 0) {
      setError('The selected file is empty (0 bytes).');
      return;
    }

    const validExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload a .xlsx, .xls, or .csv file.');
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let workbook;

        // Strategy 1: Try reading as binary array buffer
        try {
          const data = new Uint8Array(e.target.result);
          workbook = XLSX.read(data, { type: 'array', cellDates: true });
        } catch (binaryErr) {
          // Strategy 2: Fallback for CSV or HTML-table exports saved as .xls (e.g. Maharashtra IGR)
          try {
            const textDecoder = new TextDecoder('utf-8');
            const text = textDecoder.decode(e.target.result);
            workbook = XLSX.read(text, { type: 'string', cellDates: true });
          } catch (textErr) {
            throw new Error(binaryErr.message || "Unrecognized spreadsheet format");
          }
        }

        const sheetNames = workbook.SheetNames || [];
        if (sheetNames.length === 0) {
          setError('The uploaded Excel file contains no readable worksheets.');
          setIsLoading(false);
          return;
        }

        const firstSheetName = sheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length === 0) {
          setError(`Worksheet "${firstSheetName}" appears to be empty.`);
          setIsLoading(false);
          return;
        }

        setError('');
        setIsLoading(false);

        onDataParsed({
          data: jsonData,
          workbook,
          sheetNames,
          activeSheet: firstSheetName,
          fileName: file.name
        });
      } catch (err) {
        console.error("Excel parsing error:", err);
        setIsLoading(false);
        setError(
          `Could not read this file. If it is currently open in Microsoft Excel, please close it and try again, or make sure it is not password-protected.`
        );
      }
    };

    reader.onerror = () => {
      setError('A browser error occurred while reading the file.');
      setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // Demo 1: Maharashtra IGR Real Property Records
  const loadPropertyData = () => {
    setError('');
    setIsLoading(true);

    const propertyRecords = [
      {
        srocode: 3,
        docno: 16060,
        docname: "गहाणखत",
        registrationdate: "12/10/2023",
        sroname: "सह दु.नि. हवेली 3",
        sellerparty: "सौ श्लेषा अविनाश भोसले, श्री अविनाश चंद्रकांत भोसले",
        purchaserparty: "ज्ञानदीप को ऑप क्रेडिट सोसायटी लि मुंबई",
        propertydescription: "लोहगांव स. नं. 284 हि. नं. 3 व 4 स्कायवेज एस्फेरा 2 विंग ए 106",
        areaname: "लोहगांव",
        consideration_amt: 3000000,
        marketvalue: 0,
        stampdutypaid: 9000,
        registrationfees: 15000
      },
      {
        srocode: 4,
        docno: 17762,
        docname: "असाईनमेंट डीड",
        registrationdate: "20/09/2023",
        sroname: "सह दु.नि. हवेली 4",
        sellerparty: "रीना जोसेफ, मारिया जोसेफ क्रिस्टोफर",
        purchaserparty: "योगेश सुभाष कळंबे",
        propertydescription: "लोहगाव सर्व्हे नं. 284 हिस्सा नं. 7 एरोपोलीस इ विंग फ्लॅट 612",
        areaname: "लोहगांव",
        consideration_amt: 6500000,
        marketvalue: 4854982,
        stampdutypaid: 455000,
        registrationfees: 30000
      },
      {
        srocode: 8,
        docno: 12046,
        docname: "करारनामा",
        registrationdate: "06/01/2023",
        sroname: "सह दु.नि. हवेली 8",
        sellerparty: "मे मोझे असोसिएटस तर्फे भागीदार अजय नामदेव मोझे",
        purchaserparty: "शोभा कुमारी, जितेंद्र कुमार",
        propertydescription: "लोहगांव स नं 284 हि नं 3 व 4 स्कायवेज एस्फेरा बी विंग फ्लॅट 504",
        areaname: "लोहगांव",
        consideration_amt: 3399120,
        marketvalue: 2621293,
        stampdutypaid: 238000,
        registrationfees: 30000
      },
      {
        srocode: 8,
        docno: 3027,
        docname: "ट्रान्सफर डीड",
        registrationdate: "17/02/2023",
        sroname: "सह दु.नि. हवेली 8",
        sellerparty: "ध्रुव रमेशलाल अरोरा",
        purchaserparty: "रोहन त्रिभुवन शाह, नितिशा रोहन शाह",
        propertydescription: "लोहगाव सर्वे नं. 284/2 प्राईड आशियाना को ऑप हौसिंग इमारत इ-2 फ्लॅट 1102",
        areaname: "लोहगांव",
        consideration_amt: 7400000,
        marketvalue: 6619093,
        stampdutypaid: 518000,
        registrationfees: 30000
      },
      {
        srocode: 8,
        docno: 6609,
        docname: "करारनामा",
        registrationdate: "12/04/2023",
        sroname: "सह दु.नि. हवेली 8",
        sellerparty: "नितीन बबन मोझे",
        purchaserparty: "वैभव किसनराव कुडके",
        propertydescription: "लोहगांव स नं 284 स्कायवेज एस्फेरा 2 विंग ए 1110",
        areaname: "लोहगांव",
        consideration_amt: 5800275,
        marketvalue: 4039973,
        stampdutypaid: 406100,
        registrationfees: 30000
      },
      {
        srocode: 8,
        docno: 14065,
        docname: "असाईनमेंट डीड",
        registrationdate: "04/07/2024",
        sroname: "सह दु.नि. हवेली 8",
        sellerparty: "राजीव कुमार विग, अंजू विग",
        purchaserparty: "विवेक कुमार खरे, आकांक्षा खरे",
        propertydescription: "लोहगाव सर्वे नं. 284 प्राईड आशियाना को ऑप हौसिंग जी-3 फ्लॅट 903",
        areaname: "लोहगांव",
        consideration_amt: 10000000,
        marketvalue: 6529512,
        stampdutypaid: 700000,
        registrationfees: 30000
      },
      {
        srocode: 1,
        docno: 25891,
        docname: "करारनामा",
        registrationdate: "20/11/2025",
        sroname: "सह दु.नि.हवेली 1",
        sellerparty: "सौ. लिना किशोर जोशी",
        purchaserparty: "ऐश्वर्या सुरेश नलावडे, शुभम राजेश पाखरे",
        propertydescription: "लोहगांव सर्वे नं. 284 हिस्सा नं. 4 एरोपोलीस फेज 01 विंग ए 1105",
        areaname: "लोहगांव",
        consideration_amt: 6000000,
        marketvalue: 5281162,
        stampdutypaid: 420000,
        registrationfees: 30000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(propertyRecords);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lohgaon_284_Deeds");

    setIsLoading(false);

    onDataParsed({
      data: propertyRecords,
      workbook: wb,
      sheetNames: ["Lohgaon_284_Deeds"],
      activeSheet: "Lohgaon_284_Deeds",
      fileName: "Lohgaon_Property_Records.xlsx"
    });
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

    const ws = XLSX.utils.json_to_sheet(demoRecords);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");

    setIsLoading(false);

    onDataParsed({
      data: demoRecords,
      workbook: wb,
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
      processFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 className="card-title" style={{ textAlign: 'left', borderBottom: 'none' }}>
        📂 Load Spreadsheet Data
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'left' }}>
        Upload your spreadsheet to begin searching. Supports .xlsx, .xls, and .csv with multi-sheet tab switching.
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
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>Parsing Spreadsheet...</h3>
        ) : (
          <>
            <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              Drag & Drop your Excel file here
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              or click to browse from your computer
            </p>
            <input 
              id="file-upload-input"
              type="file" 
              accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
              style={{ display: 'none' }} 
              onChange={handleFileInput}
            />
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.XLSX</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.XLS</span>
              <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--border-color)', borderRadius: '4px', color: 'var(--text-muted)', fontWeight: '600' }}>.CSV</span>
            </div>
          </>
        )}
      </div>

      {/* Instant Demo Sample Data Options */}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Instant Test with Pre-Loaded Data:
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary" 
            onClick={loadPropertyData}
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            🏛️ Load Lohgaon Property Records (Real Data)
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
