import React, { useState, useMemo, useEffect } from 'react';
import DeedDetailModal from './DeedDetailModal';
import PropertyTimelineModal from './PropertyTimelineModal';
import { formatINR } from '../utils/propertyParser';
import { renderHighlightedText } from '../utils/highlightHelper';

export { renderHighlightedText };

const DataTable = ({ data, onDeleteRow, searchTokens = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [quickFilter, setQuickFilter] = useState('');
  const [selectedDeed, setSelectedDeed] = useState(null);
  const [selectedTimelineDeed, setSelectedTimelineDeed] = useState(null);
  const [hiddenCols, setHiddenCols] = useState(new Set([
    'internaldocumentnumber', 'micrno', 'bank_type', 'party_code', 'status', 'dateofexecution', 'source_sheet'
  ]));
  const [showColPicker, setShowColPicker] = useState(false);
  const [displayMode, setDisplayMode] = useState('table'); // 'table' or 'cards'

  const activeHighlightTokens = useMemo(() => {
    const tokens = [];
    if (searchTokens && Array.isArray(searchTokens)) {
      tokens.push(...searchTokens);
    }
    if (quickFilter.trim()) {
      tokens.push(...quickFilter.trim().split(/\s+/));
    }
    return tokens.filter(t => t.length >= 2);
  }, [searchTokens, quickFilter]);

  // Safe data array ensuring zero hook skips or crashes
  const safeData = useMemo(() => Array.isArray(data) ? data : [], [data]);

  // Extract all unique columns across all uploaded files (handles 50+ mixed schema files systematically)
  const allColumns = useMemo(() => {
    if (safeData.length === 0) return [];
    const colSet = new Set();
    const limit = Math.min(safeData.length, 1000);
    for (let i = 0; i < limit; i++) {
      const keys = Object.keys(safeData[i]);
      for (let j = 0; j < keys.length; j++) {
        const k = keys[j];
        if (k.startsWith('_')) continue;
        colSet.add(k);
      }
    }
    const cols = Array.from(colSet);
    // Prioritize original casing (e.g. DocNo before docno) and deduplicate casing variants
    cols.sort((a, b) => {
      const aIsMixed = a !== a.toLowerCase();
      const bIsMixed = b !== b.toLowerCase();
      if (aIsMixed && !bIsMixed) return -1;
      if (!aIsMixed && bIsMixed) return 1;
      return 0;
    });
    const finalCols = [];
    const lowerSeen = new Set();
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      const l = c.toLowerCase().replace(/[\s_\-]+/g, '');
      if (!lowerSeen.has(l)) {
        lowerSeen.add(l);
        finalCols.push(c);
      }
    }
    return finalCols;
  }, [safeData]);

  const isPropertyData = useMemo(() => {
    if (safeData.length === 0) return false;
    const first = safeData[0];
    return Boolean(first.docno || first.DocNo || first.society || first.consideration_amt || first.propertydescription || first.PropertyDescription);
  }, [safeData]);

  const hasMatchTier = useMemo(() => safeData.some(r => Boolean(r._matchTier)), [safeData]);

  const visibleColumns = useMemo(() => {
    return allColumns.filter(c => !hiddenCols.has(c.toLowerCase()));
  }, [allColumns, hiddenCols]);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // 1. Quick in-table filter
  const filteredData = useMemo(() => {
    if (!quickFilter.trim()) return safeData;
    const q = quickFilter.toLowerCase();
    return safeData.filter(row =>
      allColumns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
    );
  }, [safeData, allColumns, quickFilter]);

  // 2. Multi-type Column Sorting (Numbers vs Text)
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortConfig.key] ?? '';
      const valB = b[sortConfig.key] ?? '';

      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // 3. Pagination Logic
  const totalEntries = sortedData.length;
  const totalPages = rowsPerPage === 'All' ? 1 : Math.ceil(totalEntries / rowsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    if (rowsPerPage === 'All') return sortedData;
    const startIndex = (activePage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, activePage, rowsPerPage]);

  const handleSort = (col) => {
    setSortConfig(prev => {
      if (prev.key === col) {
        return { key: col, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: col, direction: 'asc' };
    });
  };

  const getSortIcon = (col) => {
    if (sortConfig.key !== col) return ' ↕';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const toggleCol = (col) => {
    setHiddenCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  // Helper for cell rendering
  const renderCellContent = (col, val, row) => {
    if (val === undefined || val === null || val === '') return '—';

    // Currency values
    if (['consideration_amt', 'marketvalue', 'stampdutypaid', 'registrationfees'].includes(col)) {
      return (
        <span style={{ fontWeight: 600, color: col === 'consideration_amt' ? '#10b981' : 'var(--text-main)' }}>
          {formatINR(val)}
        </span>
      );
    }

    // Rate per sqft
    if (col === 'rate_per_sqft') {
      return (
        <span style={{ fontWeight: 700, color: '#3b82f6' }}>
          ₹ {Number(val).toLocaleString('en-IN')}
        </span>
      );
    }

    // Source File badge
    if (col === 'source_file') {
      return (
        <span style={{
          background: 'rgba(59, 130, 246, 0.1)',
          color: '#1d4ed8',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          padding: '0.2rem 0.5rem',
          borderRadius: '5px',
          fontWeight: 600,
          fontSize: '0.78rem',
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }} title={`Originating spreadsheet: ${val}`}>
          📁 {String(val)}
        </span>
      );
    }

    // Society badge
    if (col === 'society') {
      return (
        <span style={{
          background: 'rgba(59, 130, 246, 0.12)',
          color: '#3b82f6',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '0.8rem',
          whiteSpace: 'nowrap'
        }}>
          {String(val)}
        </span>
      );
    }

    // Doc name badge
    if (col === 'docname') {
      return (
        <span style={{
          background: 'rgba(16, 185, 129, 0.12)',
          color: '#10b981',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontWeight: 600,
          fontSize: '0.8rem',
          whiteSpace: 'nowrap'
        }}>
          {String(val)}
        </span>
      );
    }

    // Doc number clickable
    if (col === 'docno') {
      return (
        <button
          onClick={() => setSelectedDeed(row)}
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontWeight: 700,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline'
          }}
          title="Click to view full Index-II deed summary"
        >
          #{val}
        </button>
      );
    }

    // Long description truncation with safe in-cell highlighting
    if (col === 'propertydescription' || col === 'sellerparty' || col === 'purchaserparty') {
      const s = String(val);
      const textToDisplay = s.length > 55 ? `${s.slice(0, 55)}...` : s;
      return (
        <span title={s} style={{ cursor: 'pointer' }} onClick={() => setSelectedDeed(row)}>
          {renderHighlightedText(textToDisplay, activeHighlightTokens)}
        </span>
      );
    }

    return renderHighlightedText(val, activeHighlightTokens);
  };

  // If no records at all
  if (safeData.length === 0) {
    return (
      <div style={{
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        background: 'var(--bg-main)',
        borderRadius: '12px',
        border: '1px dashed var(--border-color)',
        marginTop: '0.5rem'
      }}>
        <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🔍</div>
        <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
          No records match your active filters
        </strong>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
          Try clearing the year or society filter, or searching for a different keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="datatable-container" style={{ marginTop: '0.5rem' }}>
      {/* Top Bar: Rows Per Page & Quick Filter & Column Customizer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Show</label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                setRowsPerPage(val);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.35rem 0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="All">All ({totalEntries})</option>
            </select>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>rows</span>
          </div>

          {/* Column Toggle Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColPicker(prev => !prev)}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            >
              👁️ Columns ({visibleColumns.length}/{allColumns.length})
            </button>

            {showColPicker && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.4rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.75rem',
                boxShadow: 'var(--shadow-md)',
                zIndex: 100,
                width: '240px',
                maxHeight: '260px',
                overflowY: 'auto'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                  TOGGLE COLUMNS
                </div>
                {allColumns.map(col => (
                  <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', padding: '0.2rem 0', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!hiddenCols.has(col)}
                      onChange={() => toggleCol(col)}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{col.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* View Mode Toggle: Table View vs Card View */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '2px'
          }}>
            <button
              onClick={() => setDisplayMode('table')}
              style={{
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                background: displayMode === 'table' ? '#3b82f6' : 'transparent',
                color: displayMode === 'table' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ⊞ Table
            </button>
            <button
              onClick={() => setDisplayMode('cards')}
              style={{
                padding: '0.25rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                background: displayMode === 'cards' ? '#3b82f6' : 'transparent',
                color: displayMode === 'cards' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🗂️ Cards
            </button>
          </div>
        </div>

        <div style={{ flex: '1 1 auto', maxWidth: '300px' }}>
          <input
            type="text"
            placeholder="🔍 In-table filter (e.g. Esfera, 16060, Flat 504)..."
            value={quickFilter}
            onChange={(e) => {
              setQuickFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              width: '100%'
            }}
          />
        </div>
      </div>

      {displayMode === 'cards' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1rem',
          maxHeight: '560px',
          overflowY: 'auto',
          padding: '0.25rem'
        }}>
          {paginatedData.length > 0 ? (
            paginatedData.map((row, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  boxShadow: 'var(--shadow-sm)',
                  background: 'var(--bg-card)'
                }}
              >
                <div>
                  {isPropertyData ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#3b82f6', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              Doc #{row.docno || 'N/A'}
                            </span>
                            {row._matchTier && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: row._matchTier === 'EXACT' ? 'rgba(34, 197, 94, 0.15)' : (row._matchTier === 'PHONETIC' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)'),
                                color: row._matchTier === 'EXACT' ? '#15803d' : (row._matchTier === 'PHONETIC' ? '#1d4ed8' : '#7e22ce'),
                                border: `1px solid ${row._matchTier === 'EXACT' ? 'rgba(34, 197, 94, 0.4)' : (row._matchTier === 'PHONETIC' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(168, 85, 247, 0.4)')}`,
                                padding: '0.12rem 0.45rem',
                                borderRadius: '9999px'
                              }} title={row._matchReason}>
                                {row._matchTier === 'EXACT' ? '🎯 100% Exact' : (row._matchTier === 'PHONETIC' ? '🔤 Phonetic Match' : '👥 Party Match')}
                              </span>
                            )}
                            {row.source_file && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#1d4ed8',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '4px',
                                maxWidth: '160px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={`Source File: ${row.source_file}`}>
                                📁 {row.source_file}
                              </span>
                            )}
                          </div>
                          <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                            {row.society || 'Residential Property'}
                          </h4>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          📅 {row.registrationdate || '—'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
                        {row.flat_no && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                            🚪 Flat {row.flat_no}
                          </span>
                        )}
                        {row.carpet_sqft > 0 && (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                            📐 {row.carpet_sqft} sq.ft
                          </span>
                        )}
                        {row.docname && (
                          <span style={{ fontSize: '0.75rem', background: 'var(--bg-main)', color: 'var(--text-muted)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            📜 {row.docname}
                          </span>
                        )}
                      </div>

                      <div style={{
                        background: 'var(--bg-main)',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        marginBottom: '0.65rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                            Consideration
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                            {formatINR(row.consideration_amt)}
                          </div>
                        </div>
                        {row.rate_per_sqft > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                              Rate / sq.ft
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#3b82f6' }}>
                              ₹ {Number(row.rate_per_sqft).toLocaleString('en-IN')}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.purchaserparty}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Buyer: </span>
                          {row.purchaserparty || '—'}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.sellerparty}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Seller: </span>
                          {row.sellerparty || '—'}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Systematic Generic Card for Any Data Type (Employees, Accounts, Sales, Inventory) */
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#3b82f6', color: '#fff', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              #{rowsPerPage === 'All' ? idx + 1 : (activePage - 1) * rowsPerPage + idx + 1}
                            </span>
                            {row._matchTier && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                background: row._matchTier === 'EXACT' ? 'rgba(34, 197, 94, 0.15)' : (row._matchTier === 'PHONETIC' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(168, 85, 247, 0.15)'),
                                color: row._matchTier === 'EXACT' ? '#15803d' : (row._matchTier === 'PHONETIC' ? '#1d4ed8' : '#7e22ce'),
                                border: `1px solid ${row._matchTier === 'EXACT' ? 'rgba(34, 197, 94, 0.4)' : (row._matchTier === 'PHONETIC' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(168, 85, 247, 0.4)')}`,
                                padding: '0.12rem 0.45rem',
                                borderRadius: '9999px'
                              }} title={row._matchReason}>
                                {row._matchTier === 'EXACT' ? '🎯 100% Exact' : (row._matchTier === 'PHONETIC' ? '🔤 Phonetic Match' : '👥 Party Match')}
                              </span>
                            )}
                            {row.source_file && (
                              <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                background: 'rgba(59, 130, 246, 0.1)',
                                color: '#1d4ed8',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                padding: '0.12rem 0.45rem',
                                borderRadius: '4px',
                                maxWidth: '170px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={`Source File: ${row.source_file}`}>
                                📁 {row.source_file}
                              </span>
                            )}
                          </div>
                          <h4 style={{ margin: '0.2rem 0 0 0', fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                            {String(row[visibleColumns[0]] || row[allColumns[0]] || `Record #${idx + 1}`)}
                          </h4>
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.5rem',
                        background: 'var(--bg-main)',
                        padding: '0.65rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {visibleColumns.filter(c => !['source_file', 'source_sheet', visibleColumns[0]].includes(c)).slice(0, 4).map(col => (
                          <div key={col} style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.3px' }}>
                              {col.replace(/_/g, ' ')}
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {String(row[col] ?? '—')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => setSelectedDeed(row)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '4px' }}
                    >
                      📄 View Index-II
                    </button>
                    {isPropertyData && (row.flat_no || row.society) && (
                      <button
                        onClick={() => setSelectedTimelineDeed(row)}
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '4px',
                          borderColor: '#3b82f6',
                          color: '#2563eb'
                        }}
                        title="View chronological ownership and title history for this unit"
                      >
                        📜 Timeline
                      </button>
                    )}
                  </div>
                  {onDeleteRow && (
                    <button
                      onClick={() => onDeleteRow(row)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', opacity: 0.8 }}
                      title="Delete row"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matching records found.
            </div>
          )}
        </div>
      ) : (
        /* Table Container with Sticky Header */
        <div style={{ overflowX: 'auto', maxHeight: '520px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <table className="excel-table modern-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 1, borderBottom: '2px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '0.6rem 0.8rem', width: '45px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '0.6rem 0.8rem', width: '90px', textAlign: 'center' }}>Details</th>
                {hasMatchTier && (
                  <th style={{ padding: '0.6rem 0.8rem', width: '135px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '600' }}>
                    Match Precision
                  </th>
                )}
                {visibleColumns.map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    style={{
                      padding: '0.6rem 0.9rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontWeight: '600',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap'
                    }}
                    title="Click to sort"
                  >
                    {col.replace(/_/g, ' ')}
                    <span style={{ fontSize: '0.8rem', color: sortConfig.key === col ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                      {getSortIcon(col)}
                    </span>
                  </th>
                ))}
                {onDeleteRow && (
                  <th style={{ padding: '0.6rem 0.8rem', width: '60px', textAlign: 'center' }}>Del</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, idx) => {
                  const rowNumber = rowsPerPage === 'All' ? idx + 1 : (activePage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.1s ease' }}>
                      <td style={{ padding: '0.5rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                        {rowNumber}
                      </td>
                      <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => setSelectedDeed(row)}
                          className="btn btn-outline"
                          style={{
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          📄 View
                        </button>
                        {isPropertyData && (row.flat_no || row.society) && (
                          <button
                            onClick={() => setSelectedTimelineDeed(row)}
                            className="btn btn-outline"
                            style={{
                              padding: '0.2rem 0.5rem',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              whiteSpace: 'nowrap',
                              marginLeft: '0.35rem',
                              borderColor: '#3b82f6',
                              color: '#2563eb'
                            }}
                            title="View chronological ownership and title history for this unit"
                          >
                            📜 Timeline
                          </button>
                        )}
                      </td>
                      {hasMatchTier && (
                        <td style={{ padding: '0.45rem 0.65rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {row._matchTier === 'EXACT' ? (
                            <span style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#15803d',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }} title={row._matchReason || '100% Exact Match'}>
                              🎯 Exact ({row._matchScore || 100}%)
                            </span>
                          ) : row._matchTier === 'PHONETIC' ? (
                            <span style={{
                              background: 'rgba(59, 130, 246, 0.15)',
                              color: '#1d4ed8',
                              border: '1px solid rgba(59, 130, 246, 0.4)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }} title={row._matchReason || 'Phonetic or Translated Match'}>
                              🔤 Phonetic ({row._matchScore || 85}%)
                            </span>
                          ) : row._matchTier === 'PARTY' ? (
                            <span style={{
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#7e22ce',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.72rem',
                              fontWeight: 700
                            }} title={row._matchReason || 'Party Token Match'}>
                              👥 Party ({row._matchScore || 70}%)
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.map(col => (
                        <td key={col} style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {renderCellContent(col, row[col], row)}
                        </td>
                      ))}
                      {onDeleteRow && (
                        <td style={{ padding: '0.5rem 0.8rem', textAlign: 'center' }}>
                          <button
                            onClick={() => onDeleteRow(row)}
                            title="Delete this row"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              opacity: 0.8
                            }}
                            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                            onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={visibleColumns.length + (onDeleteRow ? 3 : 2)} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bottom Pagination Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginTop: '0.85rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div>
          Showing {totalEntries === 0 ? 0 : (activePage - 1) * (rowsPerPage === 'All' ? 0 : rowsPerPage) + 1} to{' '}
          {rowsPerPage === 'All' ? totalEntries : Math.min(activePage * rowsPerPage, totalEntries)} of {totalEntries} entries
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button
              className="btn btn-outline"
              disabled={activePage === 1}
              onClick={() => setCurrentPage(1)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              « First
            </button>
            <button
              className="btn btn-outline"
              disabled={activePage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              ‹ Prev
            </button>
            <span style={{ padding: '0.25rem 0.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
              Page {activePage} of {totalPages}
            </span>
            <button
              className="btn btn-outline"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              Next ›
            </button>
            <button
              className="btn btn-outline"
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              Last »
            </button>
          </div>
        )}
      </div>

      {/* Digital Index-II Deed Card Modal */}
      {selectedDeed && (
        <DeedDetailModal
          deed={selectedDeed}
          onClose={() => setSelectedDeed(null)}
        />
      )}

      {/* Property Transaction Timeline & Chain-of-Title Modal */}
      {selectedTimelineDeed && (
        <PropertyTimelineModal
          deed={selectedTimelineDeed}
          dataset={safeData}
          onClose={() => setSelectedTimelineDeed(null)}
        />
      )}
    </div>
  );
};

export default DataTable;
