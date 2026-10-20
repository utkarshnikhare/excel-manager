import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const FileUpload = ({ onDataParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Core logic to read both .xls and .xlsx
  const processFile = (file) => {
    setError('');
    
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
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetNames = workbook.SheetNames || [];
        if (sheetNames.length === 0) {
          setError('The uploaded Excel file contains no worksheets.');
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

        onDataParsed({
          data: jsonData,
          workbook,
          sheetNames,
          activeSheet: firstSheetName,
          fileName: file.name
        });
      } catch (err) {
        console.error("Excel parsing error:", err);
        setError('Failed to read the file. It might be corrupted or password-protected.');
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
      setError('A browser error occurred while reading the file.');
      setIsLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  // Demo sample data for instant testing
  const loadSampleData = () => {
    const demoRecords = [
      { "ID": "EMP-101", "Name": "Rahul Sharma", "Hindi Name": "राहुल शर्मा", "City": "Mumbai", "Department": "Engineering", "Phone": "9820011223", "Status": "Active" },
      { "ID": "EMP-102", "Name": "Pooja Patil", "Hindi Name": "पूजा पाटिल", "City": "Pune", "Department": "Finance", "Phone": "9820044556", "Status": "Active" },
      { "ID": "EMP-103", "Name": "Amit Verma", "Hindi Name": "अमित वर्मा", "City": "Delhi", "Department": "Sales", "Phone": "9811122334", "Status": "Pending" },
      { "ID": "EMP-104", "Name": "Sneha Kulkarni", "Hindi Name": "स्नेहा कुलकर्णी", "City": "Pune", "Department": "Engineering", "Phone": "9820077889", "Status": "Active" },
      { "ID": "EMP-105", "Name": "Vishal Thombre", "Hindi Name": "विशाल ठोंबरे", "City": "Nashik", "Department": "Marketing", "Phone": "9890011223", "Status": "Active" },
      { "ID": "EMP-106", "Name": "Utkarsh Nikhare", "Hindi Name": "उत्कर्ष निखारे", "City": "Nagpur", "Department": "Operations", "Phone": "9823344556", "Status": "Active" },
      { "ID": "EMP-107", "Name": "Priya Deshmukh", "Hindi Name": "प्रिया देशमुख", "City": "Mumbai", "Department": "Human Resources", "Phone": "9821199887", "Status": "Inactive" },
      { "ID": "EMP-108", "Name": "Suresh Gupta", "Hindi Name": "सुरेश गुप्ता", "City": "Delhi", "Department": "Engineering", "Phone": "9810055443", "Status": "Active" },
      { "ID": "EMP-109", "Name": "Ananya Joshi", "Hindi Name": "अनन्या जोशी", "City": "Pune", "Department": "Engineering", "Phone": "9822233445", "Status": "Active" },
      { "ID": "EMP-110", "Name": "Rohan Mehta", "Hindi Name": "रोहन मेहता", "City": "Ahmedabad", "Department": "Sales", "Phone": "9879911223", "Status": "Pending" },
      { "ID": "EMP-111", "Name": "Deepak Shinde", "Hindi Name": "दीपक शिंदे", "City": "Mumbai", "Department": "Support", "Phone": "9820066778", "Status": "Active" },
      { "ID": "EMP-112", "Name": "Kavita Rao", "Hindi Name": "कविता राव", "City": "Bengaluru", "Department": "Engineering", "Phone": "9845012345", "Status": "Active" }
    ];

    const ws = XLSX.utils.json_to_sheet(demoRecords);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");

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

      {/* Instant Demo Sample Data Option */}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Don't have an Excel file right now?
        </p>
        <button 
          className="btn btn-outline" 
          onClick={loadSampleData}
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
        >
          ✨ Load Demo Sample Data (Instant Test)
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444' }}>
          <strong>Error: </strong> {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
