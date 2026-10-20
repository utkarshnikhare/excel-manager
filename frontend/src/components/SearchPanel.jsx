import React, { useState, useEffect, useMemo, useRef } from 'react';
import { executeSmartSearch } from '../utils/searchLogic';
import DataTable from './DataTable';

const SearchPanel = ({ masterData, stagedData, onProcessResults, onDone, externalFilter }) => {
  const columns = masterData && masterData.length > 0 ? Object.keys(masterData[0]) : [];
  const defaultCol = 'ALL';

  const [conditions, setConditions] = useState([
    { column: 'ALL', query: '' }
  ]);
  const [matchMode, setMatchMode] = useState('AND'); // 'AND' or 'OR'
  const [pendingResults, setPendingResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Sync external filter (e.g. from KPIDashboard society clicks)
  useEffect(() => {
    if (externalFilter && externalFilter.column) {
      setConditions([
        { column: externalFilter.column, query: externalFilter.query || '' }
      ]);
    }
  }, [externalFilter]);

  const debounceTimerRef = useRef(null);

  const handleConditionChange = (index, field, value) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    setConditions(newConditions);
  };

  const handleAddCondition = () => {
    setConditions(prev => [...prev, { column: defaultCol, query: '' }]);
  };

  const handleRemoveCondition = (index) => {
    if (conditions.length <= 1) {
      handleConditionChange(0, 'query', '');
      return;
    }
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  // Debounced search (300ms) to ensure smooth typing
  useEffect(() => {
    const hasActiveSearch = conditions.some(c => c.column && c.query.trim() !== '');

    if (!hasActiveSearch) {
      setPendingResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const results = executeSmartSearch(masterData, conditions, matchMode);
      setPendingResults(results);
      setIsSearching(false);
    }, 280);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [conditions, masterData, matchMode]);

  const overlapStats = useMemo(() => {
    if (!pendingResults) return { common: 0, unique: 0 };
    if (stagedData.length === 0) return { common: 0, unique: pendingResults.length };

    const stagedSet = new Set(stagedData.map(row => JSON.stringify(row)));
    let common = 0;
    let unique = 0;

    pendingResults.forEach(row => {
      if (stagedSet.has(JSON.stringify(row))) {
        common++;
      } else {
        unique++;
      }
    });

    return { common, unique };
  }, [pendingResults, stagedData]);

  const handleReset = () => {
    setConditions([{ column: defaultCol, query: '' }]);
    setPendingResults(null);
  };

  const handleDecision = (action) => {
    onProcessResults(action, pendingResults);
    handleReset(); 
  };

  const renderPrompt = () => {
    if (!pendingResults || pendingResults.length === 0) return null;

    // SCENARIO 1: First search (Temporary file is empty)
    if (stagedData.length === 0) {
      return (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          backgroundColor: 'var(--dropzone-hover, rgba(59, 130, 246, 0.08))',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e3a8a' }}>✨ Found {pendingResults.length} matching records</h3>
            <p style={{ margin: '0.25rem 0 0 0', color: '#3b82f6', fontSize: '0.9rem' }}>Would you like to start a workspace with these records?</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => handleDecision('INITIAL_ADD')}>➕ Start Workspace</button>
            <button className="btn btn-outline" onClick={() => setPendingResults(null)}>Cancel</button>
          </div>
        </div>
      );
    }

    // SCENARIO 2: Temporary file has data (The Modern Decision Dashboard)
    return (
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Header & Badges Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Search Complete: {pendingResults.length} Matches</h3>
            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Choose how to merge these with your <strong>{stagedData.length}</strong> existing records.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(22, 101, 52, 0.1)', border: '1px solid rgba(22, 101, 52, 0.2)', color: '#166534', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
              🔄 {overlapStats.common} Common
            </div>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#1d4ed8', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
              ✨ {overlapStats.unique} New Unique
            </div>
          </div>
        </div>

        {/* The 3 Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Append Card */}
          <button 
            onClick={() => handleDecision('APPEND')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', background: 'var(--bg-main)', border: '2px solid transparent', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-main)' }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>➕</span>
            <strong style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Append New</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Adds only the <strong>{overlapStats.unique}</strong> new records.</span>
          </button>

          {/* Retain Card */}
          <button 
            onClick={() => handleDecision('RETAIN')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', background: 'var(--bg-main)', border: '2px solid transparent', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-main)' }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🎯</span>
            <strong style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Retain Common</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Keeps only the <strong>{overlapStats.common}</strong> overlapping records.</span>
          </button>

          {/* Overwrite Card */}
          <button 
            onClick={() => handleDecision('OVERWRITE')}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem 1rem', background: 'var(--bg-main)', border: '2px solid transparent', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-main)' }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>⚠️</span>
            <strong style={{ fontSize: '1.05rem', marginBottom: '0.25rem' }}>Overwrite File</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Replaces the file with these <strong>{pendingResults.length}</strong> records.</span>
          </button>
        </div>

        {/* Subtle Cancel Button */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.9rem' }} 
            onClick={() => setPendingResults(null)}
          >
            Discard Search
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h2 className="card-title" style={{ margin: 0 }}>🔍 MULTI-COLUMN LIVE SEARCH</h2>
        
        {/* Match Mode Selector (AND / OR) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Match:</span>
          <button 
            type="button"
            onClick={() => setMatchMode('AND')}
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              border: 'none',
              background: matchMode === 'AND' ? 'var(--primary-color)' : 'transparent',
              color: matchMode === 'AND' ? 'white' : 'var(--text-main)',
              fontWeight: matchMode === 'AND' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            ALL (AND)
          </button>
          <button 
            type="button"
            onClick={() => setMatchMode('OR')}
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: '6px',
              border: 'none',
              background: matchMode === 'OR' ? 'var(--primary-color)' : 'transparent',
              color: matchMode === 'OR' ? 'white' : 'var(--text-main)',
              fontWeight: matchMode === 'OR' ? 'bold' : 'normal',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            ANY (OR)
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Search values support English, Hindi/Devanagari, Phone Numbers, and phonetic typo matching.
      </p>
      
      {/* Conditions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {conditions.map((cond, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', width: '24px', fontSize: '0.9rem' }}>{index + 1}.</span>
            
            <div className="input-group" style={{ flex: 1 }}>
              <select 
                className="form-control"
                value={cond.column} 
                onChange={(e) => handleConditionChange(index, 'column', e.target.value)}
              >
                <option value="ALL">🌐 All Columns (Global Search)</option>
                {columns.map((col, idx) => (
                  <option key={idx} value={col}>{col.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            
            <div className="input-group" style={{ flex: 2 }}>
              <input 
                type="text" 
                className="form-control"
                placeholder="Search value (e.g. name, city, number)..." 
                value={cond.query} 
                onChange={(e) => handleConditionChange(index, 'query', e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => handleRemoveCondition(index)}
              title="Remove filter"
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '1.1rem',
                padding: '0.4rem',
                opacity: conditions.length > 1 ? 1 : 0.4
              }}
              disabled={conditions.length <= 1 && cond.query === ''}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Buttons: Add Condition, Clear, Finish */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
        <button 
          className="btn btn-outline" 
          onClick={handleAddCondition}
          style={{ fontSize: '0.85rem' }}
        >
          ➕ Add Filter
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline" onClick={handleReset}>🔄 CLEAR</button>
          <button className="btn" style={{ backgroundColor: '#1e3a8a', color: 'white' }} onClick={onDone}>🏁 FINISH WORKFLOW</button>
        </div>
      </div>

      {isSearching && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Searching...</p>
      )}

      {renderPrompt()}

      {pendingResults && pendingResults.length > 0 && (
        <div style={{ marginTop: '2rem', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--text-main)' }}>
            Live Preview: {pendingResults.length} Matches Found
          </h3>
          <DataTable data={pendingResults} />
        </div>
      )}
    </div>
  );
};

export default SearchPanel;
