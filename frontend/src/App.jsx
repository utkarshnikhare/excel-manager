import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './App.css'; 
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import SearchPanel from './components/SearchPanel';
import DataTable from './components/DataTable';
import KPIDashboard from './components/KPIDashboard';
import { hashRecord } from './utils/searchLogic';
import { enrichRow } from './utils/propertyParser';

function App() {
  const [masterData, setMasterData] = useState(null);
  const [fileMeta, setFileMeta] = useState(null); // { workbook, sheetNames, activeSheet, fileName }
  const [stagedData, setStagedData] = useState([]);
  const [isDone, setIsDone] = useState(false); 
  const [theme, setTheme] = useState('light'); 
  const [activeSociety, setActiveSociety] = useState('');
  const [viewMode, setViewMode] = useState('search'); // 'search' or 'explore'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleDataParsed = (parsedInfo) => {
    if (parsedInfo && parsedInfo.data) {
      // Auto-enrich records if needed
      const enriched = parsedInfo.data.map(r => enrichRow(r));
      setMasterData(enriched);
      setFileMeta({
        workbook: parsedInfo.workbook,
        sheetNames: parsedInfo.sheetNames || [],
        activeSheet: parsedInfo.activeSheet || '',
        fileName: parsedInfo.fileName || 'Spreadsheet.xlsx'
      });
    } else if (Array.isArray(parsedInfo)) {
      const enriched = parsedInfo.map(r => enrichRow(r));
      setMasterData(enriched);
      setFileMeta(null);
    }
    setStagedData([]);
    setIsDone(false);
    setActiveSociety('');
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
    const enriched = jsonData.map(r => enrichRow(r));
    setMasterData(enriched);
    setFileMeta(prev => ({ ...prev, activeSheet: newSheetName }));
    setStagedData([]);
    setIsDone(false);
    setActiveSociety('');
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
    const exportData = stagedData.length > 0 ? stagedData : masterData;
    if (!exportData || exportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, fileMeta?.activeSheet || "Filtered Data");
    XLSX.writeFile(workbook, getExportFilename('xlsx'));
  };

  const handleExportCSV = () => {
    const exportData = stagedData.length > 0 ? stagedData : masterData;
    if (!exportData || exportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    // Include UTF-8 BOM (\uFEFF) so Excel on Windows properly displays Marathi/Hindi characters
    const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", getExportFilename('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered dataset if activeSociety is selected
  const displayedMasterData = React.useMemo(() => {
    if (!masterData) return [];
    if (!activeSociety) return masterData;
    return masterData.filter(r => (r.society || '').toLowerCase() === activeSociety.toLowerCase());
  }, [masterData, activeSociety]);

  return (
    <div className="app-layout">
      <Header theme={theme} toggleTheme={toggleTheme} />

      <main className="main-content">
        {!masterData ? (
          <div className="card" style={{ maxWidth: '850px', margin: '3rem auto' }}>
            <FileUpload onDataParsed={handleDataParsed} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Top status bar with file info, Sheet Selector, and Mode Tabs */}
            <div className="top-status-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>File: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{fileMeta?.fileName || 'Spreadsheet'}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Total Records: </span>
                  <strong style={{ color: '#3b82f6', fontWeight: 800 }}>{masterData.length.toLocaleString()} rows</strong>
                </div>

                {fileMeta && fileMeta.sheetNames.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sheet:</span>
                    <select
                      value={fileMeta.activeSheet}
                      onChange={(e) => handleSheetChange(e.target.value)}
                      style={{
                        padding: '0.35rem 0.65rem',
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

              {/* View Mode Toggle: Search vs Explore Full Table */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '3px'
                }}>
                  <button
                    onClick={() => setViewMode('search')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewMode === 'search' ? '#3b82f6' : 'transparent',
                      color: viewMode === 'search' ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    🔍 Multi-Filter Search
                  </button>
                  <button
                    onClick={() => setViewMode('explore')}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: viewMode === 'explore' ? '#3b82f6' : 'transparent',
                      color: viewMode === 'explore' ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Explore Full Table ({displayedMasterData.length})
                  </button>
                </div>

                <button 
                  className="btn btn-outline" 
                  onClick={() => { setMasterData(null); setFileMeta(null); setActiveSociety(''); }}
                  style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                >
                  📁 Change File
                </button>
              </div>
            </div>

            {/* Pillar 3 & 4: Visual KPI & Analytics Dashboard */}
            <KPIDashboard
              data={masterData}
              activeSociety={activeSociety}
              onSelectSociety={(soc) => setActiveSociety(soc)}
            />

            {viewMode === 'explore' ? (
              /* Direct Table Explorer for all 3,500 records */
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {activeSociety ? `${activeSociety} Deeds` : 'All Registered Property Deeds'} ({displayedMasterData.length} Records)
                    </h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Click any deed's <strong>Doc #</strong> or <strong>📄 View</strong> button to inspect the full Index-II deed card.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary" onClick={handleExportExcel} style={{ fontSize: '0.85rem' }}>
                      📥 Download Excel
                    </button>
                    <button className="btn btn-outline" onClick={handleExportCSV} style={{ fontSize: '0.85rem' }}>
                      📄 Download CSV
                    </button>
                  </div>
                </div>
                <DataTable data={displayedMasterData} />
              </div>
            ) : (
              /* Search & Staging Workflow */
              !isDone ? (
                <>
                  <SearchPanel 
                    masterData={masterData} 
                    stagedData={stagedData}
                    externalFilter={activeSociety ? { column: 'society', query: activeSociety } : null}
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
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
