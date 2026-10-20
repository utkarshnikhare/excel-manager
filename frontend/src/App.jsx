import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css'; 
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import SearchPanel from './components/SearchPanel';
import DataTable from './components/DataTable';
import { hashRecord } from './utils/searchLogic';

function App() {
  const [masterData, setMasterData] = useState(null);
  const [fileMeta, setFileMeta] = useState(null); // { workbook, sheetNames, activeSheet, fileName }
  const [stagedData, setStagedData] = useState([]);
  const [isDone, setIsDone] = useState(false); 
  const [theme, setTheme] = useState('light'); 

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleDataParsed = (parsedInfo) => {
    if (parsedInfo && parsedInfo.data) {
      setMasterData(parsedInfo.data);
      setFileMeta({
        workbook: parsedInfo.workbook,
        sheetNames: parsedInfo.sheetNames || [],
        activeSheet: parsedInfo.activeSheet || '',
        fileName: parsedInfo.fileName || 'Spreadsheet.xlsx'
      });
    } else {
      setMasterData(parsedInfo);
      setFileMeta(null);
    }
    setStagedData([]);
    setIsDone(false);
  };

  const handleSheetChange = (newSheetName) => {
    if (!fileMeta || !fileMeta.workbook) return;
    
    if (stagedData.length > 0) {
      const confirmSwitch = window.confirm("Switching sheets will reset your current search workspace. Continue?");
      if (!confirmSwitch) return;
    }

    const worksheet = fileMeta.workbook.Sheets[newSheetName];
    if (!worksheet) return;

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
    setMasterData(jsonData);
    setFileMeta(prev => ({ ...prev, activeSheet: newSheetName }));
    setStagedData([]);
    setIsDone(false);
  };

  // Robust set operations with deterministic key-sorted hashing
  const handleProcessResults = (action, newResults) => {
    if (action === 'INITIAL_ADD' || action === 'OVERWRITE') {
      const map = new Map();
      newResults.forEach(row => {
        const h = hashRecord(row);
        if (!map.has(h)) map.set(h, row);
      });
      setStagedData(Array.from(map.values()));
      
    } else if (action === 'APPEND') {
      setStagedData(prevData => {
        const map = new Map();
        prevData.forEach(row => map.set(hashRecord(row), row));
        newResults.forEach(row => {
          const h = hashRecord(row);
          if (!map.has(h)) map.set(h, row);
        });
        return Array.from(map.values());
      });
      
    } else if (action === 'RETAIN') {
      setStagedData(prevData => {
        const prevSet = new Set(prevData.map(hashRecord));
        const common = newResults.filter(row => prevSet.has(hashRecord(row)));
        const map = new Map();
        common.forEach(row => {
          const h = hashRecord(row);
          if (!map.has(h)) map.set(h, row);
        });
        return Array.from(map.values());
      });
    }
  };

  const handleDeleteRow = (rowToDelete) => {
    const targetHash = hashRecord(rowToDelete);
    setStagedData(prev => prev.filter(r => hashRecord(r) !== targetHash));
  };

  const handleClearStaged = () => {
    if (window.confirm("Are you sure you want to clear all records from the temporary workspace?")) {
      setStagedData([]);
    }
  };

  const getExportFilename = (extension) => {
    const baseName = (fileMeta?.fileName || 'Spreadsheet').replace(/\.[^/.]+$/, "");
    const dateStr = new Date().toISOString().slice(0, 10);
    return `Export_${baseName}_${dateStr}.${extension}`;
  };

  const handleExportExcel = () => {
    if (stagedData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(stagedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, fileMeta?.activeSheet || "Filtered Data");
    XLSX.writeFile(workbook, getExportFilename('xlsx'));
  };

  const handleExportCSV = () => {
    if (stagedData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(stagedData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", getExportFilename('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-layout">
      <Header theme={theme} toggleTheme={toggleTheme} />

      <main className="main-content">
        {!masterData ? (
          <div className="card" style={{ maxWidth: '800px', margin: '4rem auto' }}>
            <FileUpload onDataParsed={handleDataParsed} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Status bar with file info and Sheet Selector */}
            <div className="top-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>File: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{fileMeta?.fileName || 'Spreadsheet'}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Records: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{masterData.length} rows</strong>
                </div>

                {fileMeta && fileMeta.sheetNames.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sheet:</span>
                    <select
                      value={fileMeta.activeSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {fileMeta.sheetNames.map((sheet, idx) => (
                        <option key={idx} value={sheet}>{sheet}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button className="btn btn-outline" onClick={() => { setMasterData(null); setFileMeta(null); }}>
                📁 Change File
              </button>
            </div>

            {!isDone ? (
              <>
                <SearchPanel 
                  masterData={masterData} 
                  stagedData={stagedData}
                  onProcessResults={handleProcessResults}
                  onDone={() => setIsDone(true)}
                />

                {stagedData.length > 0 && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h3 style={{ margin: 0 }}>Current Workspace ({stagedData.length} Unique Records)</h3>
                      <button 
                        className="btn btn-outline" 
                        onClick={handleClearStaged}
                        style={{ color: '#ef4444', borderColor: '#ef4444', fontSize: '0.85rem' }}
                      >
                        🗑️ Clear All
                      </button>
                    </div>
                    <DataTable data={stagedData} onDeleteRow={handleDeleteRow} />
                  </div>
                )}
              </>
            ) : (
              <div className="prompt-box alert-info" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '2rem' }}>
                <h2>🏁 WORKFLOW COMPLETED</h2>
                <p>You have compiled <strong>{stagedData.length}</strong> unique records ready for export.</p>
                <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                  <button className="btn btn-primary" onClick={handleExportExcel} disabled={stagedData.length === 0}>
                    📥 Download Excel (.xlsx)
                  </button>
                  <button className="btn btn-outline" onClick={handleExportCSV} disabled={stagedData.length === 0}>
                    📄 Download CSV (.csv)
                  </button>
                  <button className="btn btn-outline" onClick={() => setIsDone(false)}>
                    ⬅ Back to Search
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
