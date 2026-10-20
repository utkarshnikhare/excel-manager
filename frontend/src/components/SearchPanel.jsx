import React, { useState, useEffect, useMemo, useRef } from 'react';
import { executeSmartSearch } from '../utils/searchLogic';
import DataTable from './DataTable';

const SearchPanel = ({ masterData, stagedData, onProcessResults, onDone, externalFilter }) => {
  // Main search keyword
  const [keyword, setKeyword] = useState('');
  
  // Side-by-side quick drilldown filters
  const [selectedSociety, setSelectedSociety] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDeedType, setSelectedDeedType] = useState('');
  const [flatNumber, setFlatNumber] = useState('');

  // Advanced multi-row filter toggle
  const [showAdvanced, setShowAdvanced] = useState(false);
  const columns = masterData && masterData.length > 0 ? Object.keys(masterData[0]) : [];
  const [advancedConditions, setAdvancedConditions] = useState([
    { column: 'ALL', query: '' }
  ]);
  const [matchMode, setMatchMode] = useState('AND');

  const [pendingResults, setPendingResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef(null);

  // Dynamic lists from dataset for side-by-side dropdowns
  const societies = useMemo(() => {
    if (!masterData) return [];
    const counts = {};
    masterData.forEach(r => {
      const s = r.society || 'Other';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [masterData]);

  const deedTypes = useMemo(() => {
    if (!masterData) return [];
    const counts = {};
    masterData.forEach(r => {
      if (r.docname) counts[r.docname] = (counts[r.docname] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [masterData]);

  const years = ['2026', '2025', '2024', '2023', '2018'];

  // Sync external filter (e.g. from KPIDashboard society clicks)
  useEffect(() => {
    if (externalFilter && externalFilter.column === 'society') {
      setSelectedSociety(externalFilter.query || '');
    }
  }, [externalFilter]);

  // Compile active conditions from both Quick Side-Filters and Advanced Filters
  const activeConditions = useMemo(() => {
    const list = [];

    // Quick side filters
    if (keyword.trim()) {
      list.push({ column: 'ALL', query: keyword.trim() });
    }
    if (selectedSociety) {
      list.push({ column: 'society', query: selectedSociety });
    }
    if (selectedYear) {
      list.push({ column: 'registrationdate', query: selectedYear });
    }
    if (selectedDeedType) {
      list.push({ column: 'docname', query: selectedDeedType });
    }
    if (flatNumber.trim()) {
      list.push({ column: 'flat_no', query: flatNumber.trim() });
    }

    // Advanced conditions if enabled
    if (showAdvanced) {
      advancedConditions.forEach(c => {
        if (c.query.trim()) {
          list.push({ column: c.column, query: c.query.trim() });
        }
      });
    }

    return list;
  }, [keyword, selectedSociety, selectedYear, selectedDeedType, flatNumber, showAdvanced, advancedConditions]);

  // Debounced live search
  useEffect(() => {
    if (activeConditions.length === 0) {
      setPendingResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const results = executeSmartSearch(masterData, activeConditions, matchMode);
      setPendingResults(results);
      setIsSearching(false);
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [activeConditions, masterData, matchMode]);

  const handleReset = () => {
    setKeyword('');
    setSelectedSociety('');
    setSelectedYear('');
    setSelectedDeedType('');
    setFlatNumber('');
    setAdvancedConditions([{ column: 'ALL', query: '' }]);
    setPendingResults(null);
  };

  const handleDecision = (action) => {
    onProcessResults(action, pendingResults);
    handleReset();
  };

  const hasAnyFilter = keyword || selectedSociety || selectedYear || selectedDeedType || flatNumber || 
    (showAdvanced && advancedConditions.some(c => c.query.trim() !== ''));

  return (
    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 className="card-title" style={{ margin: 0, borderBottom: 'none' }}>
            ⚡ Smart Property Search & Filter
          </h2>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Search by name, bank, or keyword — and narrow down instantly using the side-by-side dropdown filters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {hasAnyFilter && (
            <button
              onClick={handleReset}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: '#ef4444', borderColor: '#ef4444' }}
            >
              ✕ Reset All Filters
            </button>
          )}
          <button 
            className="btn btn-primary" 
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }} 
            onClick={onDone}
          >
            🏁 Finish Workflow
          </button>
        </div>
      </div>

      {/* Modern, User-Friendly Side-by-Side Quick Filter Bar */}
      <div style={{
        background: 'var(--bg-main)',
        borderRadius: '12px',
        padding: '1.25rem',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Row 1: Primary Search Keyword Input */}
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔍 Search Name, Party, Bank, or Keyword:</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
              Supports English & Marathi transliteration
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Type any name (e.g. Dnyandeep, Shlesha, Suryavanshi, Moze, ICICI, 16060)..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                fontSize: '0.95rem',
                borderRadius: '8px',
                border: keyword ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                boxShadow: keyword ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none'
              }}
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Side-by-Side Quick Narrow-Down Dropdowns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'flex-end'
        }}>
          {/* Side Filter 1: Project / Society */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
              🏢 Project / Society:
            </label>
            <select
              className="form-control"
              value={selectedSociety}
              onChange={(e) => setSelectedSociety(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: selectedSociety ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                fontWeight: selectedSociety ? 700 : 400
              }}
            >
              <option value="">All Projects ({masterData?.length || 0})</option>
              {societies.map(([soc, cnt]) => (
                <option key={soc} value={soc}>{soc} ({cnt})</option>
              ))}
            </select>
          </div>

          {/* Side Filter 2: Year */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
              📅 Registration Year:
            </label>
            <select
              className="form-control"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: selectedYear ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                fontWeight: selectedYear ? 700 : 400
              }}
            >
              <option value="">All Years</option>
              {years.map(y => (
                <option key={y} value={y}>{y} Deeds</option>
              ))}
            </select>
          </div>

          {/* Side Filter 3: Deed Type */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
              📜 Deed / Document Type:
            </label>
            <select
              className="form-control"
              value={selectedDeedType}
              onChange={(e) => setSelectedDeedType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: selectedDeedType ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                fontWeight: selectedDeedType ? 700 : 400
              }}
            >
              <option value="">All Deed Types</option>
              {deedTypes.slice(0, 10).map(([dt, cnt]) => (
                <option key={dt} value={dt}>{dt} ({cnt})</option>
              ))}
            </select>
          </div>

          {/* Side Filter 4: Flat / Unit Number */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
              🚪 Flat / Unit Number:
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 106, 612..."
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: flatNumber ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                fontWeight: flatNumber ? 700 : 400
              }}
            />
          </div>
        </div>

        {/* Active Filter Chips bar */}
        {hasAnyFilter && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              ACTIVE FILTERS:
            </span>
            {keyword && (
              <span style={{ background: '#3b82f6', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
                Query: "{keyword}"
              </span>
            )}
            {selectedSociety && (
              <span style={{ background: '#10b981', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
                Society: {selectedSociety}
              </span>
            )}
            {selectedYear && (
              <span style={{ background: '#f59e0b', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
                Year: {selectedYear}
              </span>
            )}
            {selectedDeedType && (
              <span style={{ background: '#8b5cf6', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
                Deed: {selectedDeedType}
              </span>
            )}
            {flatNumber && (
              <span style={{ background: '#ec4899', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
                Flat: #{flatNumber}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Advanced Custom Filter Collapsible for Power Users */}
      <div>
        <button
          onClick={() => setShowAdvanced(prev => !prev)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          {showAdvanced ? '▼ Hide Advanced Filter Builder' : '▶ Show Advanced Custom Column Builder (Multi-Condition)'}
        </button>

        {showAdvanced && (
          <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Match Conditions:</span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => setMatchMode('AND')}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: matchMode === 'AND' ? '#3b82f6' : 'var(--bg-card)',
                    color: matchMode === 'AND' ? '#fff' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  ALL (AND)
                </button>
                <button
                  type="button"
                  onClick={() => setMatchMode('OR')}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    background: matchMode === 'OR' ? '#3b82f6' : 'var(--bg-card)',
                    color: matchMode === 'OR' ? '#fff' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  ANY (OR)
                </button>
              </div>
            </div>

            {advancedConditions.map((cond, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  className="form-control"
                  value={cond.column}
                  onChange={(e) => {
                    const next = [...advancedConditions];
                    next[index].column = e.target.value;
                    setAdvancedConditions(next);
                  }}
                  style={{ width: '180px', fontSize: '0.85rem' }}
                >
                  <option value="ALL">🌐 All Columns</option>
                  {columns.map((col, idx) => (
                    <option key={idx} value={col}>{col.replace(/_/g, ' ')}</option>
                  ))}
                </select>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Query..."
                  value={cond.query}
                  onChange={(e) => {
                    const next = [...advancedConditions];
                    next[index].query = e.target.value;
                    setAdvancedConditions(next);
                  }}
                  style={{ flex: 1, fontSize: '0.85rem' }}
                />

                <button
                  onClick={() => {
                    if (advancedConditions.length <= 1) {
                      setAdvancedConditions([{ column: 'ALL', query: '' }]);
                    } else {
                      setAdvancedConditions(prev => prev.filter((_, i) => i !== index));
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              onClick={() => setAdvancedConditions(prev => [...prev, { column: 'ALL', query: '' }])}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', alignSelf: 'flex-start' }}
            >
              ➕ Add Another Condition
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isSearching && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          ⏳ Searching across 3,498 deeds...
        </p>
      )}

      {/* Live Results Display */}
      {pendingResults && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🎯 Results:</span>
              <strong style={{ color: '#3b82f6' }}>{pendingResults.length} Matching Deeds Found</strong>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                (filtered from {masterData?.length || 0} total)
              </span>
            </h3>

            {pendingResults.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDecision('INITIAL_ADD')}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  ➕ Add to Workspace ({pendingResults.length})
                </button>
              </div>
            )}
          </div>

          <DataTable data={pendingResults} />
        </div>
      )}

    </div>
  );
};

export default SearchPanel;
