import React, { useState, useEffect, useMemo, useRef } from 'react';
import { executeSmartSearch } from '../utils/searchLogic';
import DataTable from './DataTable';

const SearchPanel = ({ masterData, _stagedData, onProcessResults, onDone, externalFilter }) => {
  // Search Mode Tab: 'general', 'person', 'property'
  const [searchModeTab, setSearchModeTab] = useState('general');

  // Main search keyword (General mode)
  const [keyword, setKeyword] = useState('');
  
  // Side-by-side quick drilldown filters (General mode)
  const [selectedSociety, setSelectedSociety] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedDeedType, setSelectedDeedType] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [carpetRange, setCarpetRange] = useState('');
  const [isExactMatch, setIsExactMatch] = useState(false);
  const [selectedSourceFile, setSelectedSourceFile] = useState('');

  // Person / Party Search State
  const [personFirstName, setPersonFirstName] = useState('');
  const [personMiddleName, setPersonMiddleName] = useState('');
  const [personLastName, setPersonLastName] = useState('');
  const [personRole, setPersonRole] = useState('ALL'); // 'ALL', 'party1', 'party2'
  const [personExactMatch, setPersonExactMatch] = useState(false);

  // Property Unit Search State
  const [propSociety, setPropSociety] = useState('');
  const [propWing, setPropWing] = useState('');
  const [propFlat, setPropFlat] = useState('');
  const [propSurvey, setPropSurvey] = useState('');
  const [propYear, setPropYear] = useState('');

  const isPropertyDataset = useMemo(() => {
    if (!masterData || masterData.length === 0) return false;
    const first = masterData[0];
    return Boolean(first.docno || first.society || first.consideration_amt || first.propertydescription);
  }, [masterData]);

  const uploadedFilesList = useMemo(() => {
    if (!masterData) return [];
    const fileCounts = {};
    for (let i = 0; i < masterData.length; i++) {
      const f = masterData[i].source_file;
      if (f) fileCounts[f] = (fileCounts[f] || 0) + 1;
    }
    return Object.entries(fileCounts).sort((a, b) => b[1] - a[1]);
  }, [masterData]);

  // Advanced multi-row filter toggle
  const [showAdvanced, setShowAdvanced] = useState(false);
  const columns = masterData && masterData.length > 0 ? Object.keys(masterData[0]) : [];
  const [advancedConditions, setAdvancedConditions] = useState([
    { column: 'ALL', query: '' }
  ]);
  const [matchMode, setMatchMode] = useState('AND');

  const [pendingResults, setPendingResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [tierFilter, setTierFilter] = useState('ALL');
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
      const d = r.docname || r.DocName;
      if (d) counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [masterData]);

  const years = useMemo(() => {
    if (!masterData) return ['2026', '2025', '2024', '2023', '2018', '2015'];
    const yearSet = new Set();
    masterData.forEach(r => {
      const dStr = String(r.registrationdate || r.RegistrationDate || '');
      const match = dStr.match(/\b(19\d{2}|20\d{2})\b/);
      if (match) yearSet.add(match[1]);
    });
    const arr = Array.from(yearSet).sort().reverse();
    return arr.length > 0 ? arr : ['2026', '2025', '2024', '2023', '2018', '2015'];
  }, [masterData]);

  // Sync external filter (e.g. from KPIDashboard society clicks)
  useEffect(() => {
    if (externalFilter && externalFilter.column === 'society') {
      setSelectedSociety(externalFilter.query || '');
    }
  }, [externalFilter]);

  // Compile active conditions based on active mode
  const activeConditions = useMemo(() => {
    const list = [];

    if (searchModeTab === 'general') {
      // Quick side filters
      if (keyword.trim()) {
        list.push({ column: 'ALL', query: keyword.trim() });
      }
      if (selectedSourceFile) {
        list.push({ column: 'source_file', query: selectedSourceFile });
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
      if (priceRange) {
        const [minStr, maxStr] = priceRange.split('-');
        list.push({
          isRange: true,
          column: '_price_range_',
          min: Number(minStr),
          max: Number(maxStr)
        });
      }
      if (carpetRange) {
        const [minStr, maxStr] = carpetRange.split('-');
        list.push({
          isRange: true,
          column: '_carpet_range_',
          min: Number(minStr),
          max: Number(maxStr)
        });
      }

      // Advanced conditions if enabled
      if (showAdvanced) {
        advancedConditions.forEach(c => {
          if (c.query.trim()) {
            list.push({ column: c.column, query: c.query.trim() });
          }
        });
      }
    } else if (searchModeTab === 'person') {
      if (selectedSourceFile) {
        list.push({ column: 'source_file', query: selectedSourceFile });
      }
      const nameParts = [personFirstName, personMiddleName, personLastName].map(s => s.trim()).filter(Boolean);
      if (nameParts.length > 0) {
        const fullName = nameParts.join(' ');
        const targetCol = personRole === 'SELLER' ? 'party1' : personRole === 'PURCHASER' ? 'party2' : 'ALL';
        if (personExactMatch) {
          list.push({ column: targetCol, query: `"${fullName}"` });
        } else {
          list.push({ column: targetCol, query: fullName });
        }
      }
    } else if (searchModeTab === 'property') {
      if (selectedSourceFile) {
        list.push({ column: 'source_file', query: selectedSourceFile });
      }
      if (propSociety.trim()) {
        list.push({ column: 'society', query: propSociety.trim() });
      }
      if (propWing.trim()) {
        list.push({ column: 'propertydescription', query: propWing.trim() });
      }
      if (propFlat.trim()) {
        list.push({ column: 'flat_no', query: propFlat.trim() });
      }
      if (propSurvey.trim()) {
        list.push({ column: 'propertydescription', query: propSurvey.trim() });
      }
      if (propYear.trim()) {
        list.push({ column: 'registrationdate', query: propYear.trim() });
      }
    }

    return list;
  }, [
    searchModeTab, keyword, selectedSourceFile, selectedSociety, selectedYear, selectedDeedType, flatNumber, priceRange, carpetRange, showAdvanced, advancedConditions,
    personFirstName, personMiddleName, personLastName, personRole, personExactMatch,
    propSociety, propWing, propFlat, propSurvey, propYear
  ]);

  const activeHighlightTokens = useMemo(() => {
    const tokens = [];
    if (searchModeTab === 'general') {
      if (keyword.trim()) tokens.push(...keyword.trim().split(/\s+/));
      if (flatNumber.trim()) tokens.push(flatNumber.trim());
      if (selectedSociety) tokens.push(selectedSociety);
    } else if (searchModeTab === 'person') {
      if (personFirstName.trim()) tokens.push(personFirstName.trim());
      if (personMiddleName.trim()) tokens.push(personMiddleName.trim());
      if (personLastName.trim()) tokens.push(personLastName.trim());
    } else if (searchModeTab === 'property') {
      if (propSociety.trim()) tokens.push(propSociety.trim());
      if (propWing.trim()) tokens.push(propWing.trim());
      if (propFlat.trim()) tokens.push(propFlat.trim());
      if (propSurvey.trim()) tokens.push(propSurvey.trim());
    }
    return tokens.filter(t => t.length >= 2);
  }, [searchModeTab, keyword, flatNumber, selectedSociety, personFirstName, personMiddleName, personLastName, propSociety, propWing, propFlat, propSurvey]);

  const effectiveExactMatch = searchModeTab === 'person' ? personExactMatch : isExactMatch;

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
      const results = executeSmartSearch(masterData, activeConditions, matchMode, effectiveExactMatch);
      setPendingResults(results);
      setIsSearching(false);
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [activeConditions, masterData, matchMode, effectiveExactMatch]);

  const handleReset = () => {
    setKeyword('');
    setSelectedSociety('');
    setSelectedYear('');
    setSelectedDeedType('');
    setFlatNumber('');
    setPriceRange('');
    setCarpetRange('');
    setSelectedSourceFile('');
    setIsExactMatch(false);
    setPersonFirstName('');
    setPersonMiddleName('');
    setPersonLastName('');
    setPersonRole('ALL');
    setPersonExactMatch(false);
    setPropSociety('');
    setPropWing('');
    setPropFlat('');
    setPropSurvey('');
    setPropYear('');
    setTierFilter('ALL');
    setAdvancedConditions([{ column: 'ALL', query: '' }]);
    setPendingResults(null);
  };

  const handleDecision = (action) => {
    onProcessResults(action, pendingResults);
    handleReset();
  };

  const hasAnyFilter = (searchModeTab === 'general' && (keyword || selectedSociety || selectedYear || selectedDeedType || flatNumber || priceRange || carpetRange || (showAdvanced && advancedConditions.some(c => c.query.trim() !== '')))) ||
    (searchModeTab === 'person' && (personFirstName || personMiddleName || personLastName)) ||
    (searchModeTab === 'property' && (propSociety || propWing || propFlat || propSurvey || propYear));

  const matchStats = useMemo(() => {
    if (!pendingResults) return { total: 0, exact: 0, phonetic: 0, party: 0 };
    let exact = 0, phonetic = 0, party = 0;
    for (let i = 0; i < pendingResults.length; i++) {
      const t = pendingResults[i]._matchTier;
      if (t === 'EXACT') exact++;
      else if (t === 'PHONETIC') phonetic++;
      else party++;
    }
    return { total: pendingResults.length, exact, phonetic, party };
  }, [pendingResults]);

  const displayedResults = useMemo(() => {
    if (!pendingResults) return [];
    if (tierFilter === 'ALL') return pendingResults;
    return pendingResults.filter(r => r._matchTier === tierFilter);
  }, [pendingResults, tierFilter]);

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

      {/* Search Mode Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '2px solid var(--border-color)',
        paddingBottom: '0.65rem',
        flexWrap: 'wrap'
      }}>
        <button
          type="button"
          onClick={() => setSearchModeTab('general')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            background: searchModeTab === 'general' ? '#3b82f6' : 'var(--bg-main)',
            color: searchModeTab === 'general' ? '#ffffff' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: searchModeTab === 'general' ? '0 2px 4px rgba(59, 130, 246, 0.25)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🔍</span> General Keyword Search
        </button>

        <button
          type="button"
          onClick={() => setSearchModeTab('person')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            background: searchModeTab === 'person' ? '#3b82f6' : 'var(--bg-main)',
            color: searchModeTab === 'person' ? '#ffffff' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: searchModeTab === 'person' ? '0 2px 4px rgba(59, 130, 246, 0.25)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>👤</span> Person / Party Search (Marathi & English)
        </button>

        <button
          type="button"
          onClick={() => setSearchModeTab('property')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '8px',
            border: 'none',
            background: searchModeTab === 'property' ? '#3b82f6' : 'var(--bg-main)',
            color: searchModeTab === 'property' ? '#ffffff' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: searchModeTab === 'property' ? '0 2px 4px rgba(59, 130, 246, 0.25)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🏢</span> Property Unit & Flat Search
        </button>
      </div>

      {/* Mode 1: General Side-by-Side Quick Filter Bar */}
      {searchModeTab === 'general' && (
      <>
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

          {/* Exact Match Toggle & Tip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: isExactMatch ? '#2563eb' : 'var(--text-main)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={isExactMatch}
                onChange={(e) => setIsExactMatch(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <span>🎯 Exact Match Only (कठोर जुळणी - फक्त आणि फक्त तोच व्यक्ती)</span>
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              💡 Exact phrase search: Use double quotes like <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>"Sanjay Patil"</code>
            </span>
          </div>
        </div>

        {/* Row 2: Side-by-Side Quick Narrow-Down Dropdowns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          alignItems: 'flex-end'
        }}>
          {/* Source File Filter (when multiple files uploaded) */}
          {uploadedFilesList.length > 1 && (
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
                📁 Originating File ({uploadedFilesList.length}):
              </label>
              <select
                className="form-control"
                value={selectedSourceFile}
                onChange={(e) => setSelectedSourceFile(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: selectedSourceFile ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                  fontWeight: selectedSourceFile ? 700 : 400
                }}
              >
                <option value="">All Uploaded Files ({uploadedFilesList.length})</option>
                {uploadedFilesList.map(([fName, count]) => (
                  <option key={fName} value={fName}>{fName} ({count.toLocaleString()} rows)</option>
                ))}
              </select>
            </div>
          )}

          {isPropertyDataset && (
            <>
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

              {/* Side Filter 5: Price Range */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
                  💰 Price Range:
                </label>
                <select
                  className="form-control"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: priceRange ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                    fontWeight: priceRange ? 700 : 400
                  }}
                >
                  <option value="">All Prices</option>
                  <option value="0-2500000">Under ₹ 25 Lakh</option>
                  <option value="2500000-5000000">₹ 25 L – ₹ 50 Lakh</option>
                  <option value="5000000-7500000">₹ 50 L – ₹ 75 Lakh</option>
                  <option value="7500000-10000000">₹ 75 L – ₹ 1 Crore</option>
                  <option value="10000000-9999999999">Above ₹ 1 Crore</option>
                  <option value="0-0">₹ 0 (Gifts / Releases)</option>
                </select>
              </div>

              {/* Side Filter 6: Carpet Area */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
                  📐 Carpet Area:
                </label>
                <select
                  className="form-control"
                  value={carpetRange}
                  onChange={(e) => setCarpetRange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: carpetRange ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                    fontWeight: carpetRange ? 700 : 400
                  }}
                >
                  <option value="">All Sizes</option>
                  <option value="0-450">&lt; 450 sq.ft (Studio/1RK)</option>
                  <option value="450-650">450 – 650 sq.ft (1 BHK)</option>
                  <option value="650-950">650 – 950 sq.ft (2 BHK)</option>
                  <option value="950-99999">&gt; 950 sq.ft (3 BHK+)</option>
                </select>
              </div>
            </>
          )}
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
            {priceRange && (
              <span style={{ background: '#059669', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
                Price: {priceRange === '0-0' ? '₹ 0 (Gifts/Rel)' : priceRange === '0-2500000' ? '< ₹25L' : priceRange === '2500000-5000000' ? '₹25L-50L' : priceRange === '5000000-7500000' ? '₹50L-75L' : priceRange === '7500000-10000000' ? '₹75L-1Cr' : '> ₹1Cr'}
              </span>
            )}
            {carpetRange && (
              <span style={{ background: '#0284c7', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
                Area: {carpetRange === '0-450' ? '< 450 sqft' : carpetRange === '450-650' ? '450-650 sqft' : carpetRange === '650-950' ? '650-950 sqft' : '> 950 sqft'}
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
      </>
      )}

      {/* Mode 2: Dedicated Person / Party Search Form */}
      {searchModeTab === 'person' && (
        <div style={{
          background: 'var(--bg-main)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              👤 Dedicated Person / Party Search Engine
            </span>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Search individuals by first name, middle/father's name, and surname in Marathi or English. Handles transliteration and name arrangements automatically.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem'
          }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'block' }}>
                First Name (नाव):
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Dnyaneshwar, ज्ञानेश्वर, Rahul..."
                value={personFirstName}
                onChange={(e) => setPersonFirstName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>
                Middle / Father's Name (वडिलांचे नाव - Optional):
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Vitthal, विठ्ठल..."
                value={personMiddleName}
                onChange={(e) => setPersonMiddleName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'block' }}>
                Surname / Last Name (आडनाव):
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Patil, पाटील, Mozhe, Shinde..."
                value={personLastName}
                onChange={(e) => setPersonLastName(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'block' }}>
                Party Role (पक्षकाराचा प्रकार):
              </label>
              <select
                className="form-control"
                value={personRole}
                onChange={(e) => setPersonRole(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                <option value="ALL">👥 All Parties (Seller, Buyer, or Financier)</option>
                <option value="SELLER">🔴 Party 1 / Seller / Executant (देणारा पक्षकार)</option>
                <option value="PURCHASER">🟢 Party 2 / Purchaser / Claimant (घेणारा पक्षकार)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: personExactMatch ? '#2563eb' : 'var(--text-main)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={personExactMatch}
                onChange={(e) => setPersonExactMatch(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <span>🎯 Strict Exact Name Only (No middle-name tolerance or phonetic spelling variance)</span>
            </label>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              💡 Smart Search tolerates middle name variations (e.g. "Dnyaneshwar Patil" matches "ज्ञानेश्वर विठ्ठल पाटील")
            </span>
          </div>
        </div>
      )}

      {/* Mode 3: Dedicated Property Unit & Flat Search Form */}
      {searchModeTab === 'property' && (
        <div style={{
          background: 'var(--bg-main)',
          borderRadius: '12px',
          padding: '1.25rem',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🏢 Dedicated Property Unit & Chain-of-Title Search
            </span>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Target specific apartments, commercial shops, office units, or survey plots to inspect their historical deeds.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem'
          }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'block' }}>
                🏢 Project / Society:
              </label>
              <select
                className="form-control"
                value={propSociety}
                onChange={(e) => setPropSociety(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                <option value="">All Projects ({masterData?.length || 0})</option>
                {societies.map(([soc, cnt]) => (
                  <option key={soc} value={soc}>{soc} ({cnt})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem', display: 'block' }}>
                🚪 Flat / Unit Number:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 106, 504, 612..."
                value={propFlat}
                onChange={(e) => setPropFlat(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>
                🏢 Wing / Building / Tower:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Wing A, Tower B..."
                value={propWing}
                onChange={(e) => setPropWing(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>
                📐 Survey / Gat / CTS / Plot No:
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Survey 42, Gat 112..."
                value={propSurvey}
                onChange={(e) => setPropSurvey(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.9rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>
                📅 Registration Year:
              </label>
              <select
                className="form-control"
                value={propYear}
                onChange={(e) => setPropYear(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}
              >
                <option value="">All Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            💡 Tip: Click the <strong>📜 Timeline</strong> button on any matched record to view its full chain-of-title and seller-buyer history.
          </div>
        </div>
      )}

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
              <strong style={{ color: pendingResults.length > 0 ? '#3b82f6' : '#f59e0b' }}>
                {displayedResults.length} Matching Deeds Found
              </strong>
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
                  ➕ Add to Workspace ({displayedResults.length})
                </button>
              </div>
            )}
          </div>

          {/* Tiered Match Precision Filter Pills */}
          {matchStats.total > 0 && (matchStats.exact > 0 || matchStats.phonetic > 0) && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              flexWrap: 'wrap',
              marginBottom: '0.85rem',
              background: 'var(--bg-main)',
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Match Precision:
              </span>
              <button
                type="button"
                onClick={() => setTierFilter('ALL')}
                style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  border: '1px solid ' + (tierFilter === 'ALL' ? '#3b82f6' : 'var(--border-color)'),
                  background: tierFilter === 'ALL' ? '#3b82f6' : 'var(--bg-card)',
                  color: tierFilter === 'ALL' ? '#fff' : 'var(--text-main)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All Matches ({matchStats.total})
              </button>
              {matchStats.exact > 0 && (
                <button
                  type="button"
                  onClick={() => setTierFilter('EXACT')}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    border: '1px solid ' + (tierFilter === 'EXACT' ? '#16a34a' : 'var(--border-color)'),
                    background: tierFilter === 'EXACT' ? '#16a34a' : 'var(--bg-card)',
                    color: tierFilter === 'EXACT' ? '#fff' : '#15803d',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Show only 100% exact matches"
                >
                  🎯 100% Exact ({matchStats.exact})
                </button>
              )}
              {matchStats.phonetic > 0 && (
                <button
                  type="button"
                  onClick={() => setTierFilter('PHONETIC')}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    border: '1px solid ' + (tierFilter === 'PHONETIC' ? '#2563eb' : 'var(--border-color)'),
                    background: tierFilter === 'PHONETIC' ? '#2563eb' : 'var(--bg-card)',
                    color: tierFilter === 'PHONETIC' ? '#fff' : '#1d4ed8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Show phonetic / legal deed translation matches"
                >
                  🔤 Phonetic / Translation ({matchStats.phonetic})
                </button>
              )}
              {matchStats.party > 0 && (
                <button
                  type="button"
                  onClick={() => setTierFilter('PARTY')}
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '9999px',
                    border: '1px solid ' + (tierFilter === 'PARTY' ? '#9333ea' : 'var(--border-color)'),
                    background: tierFilter === 'PARTY' ? '#9333ea' : 'var(--bg-card)',
                    color: tierFilter === 'PARTY' ? '#fff' : '#7e22ce',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Show party token / typo-tolerant matches"
                >
                  👥 Party Member ({matchStats.party})
                </button>
              )}
            </div>
          )}

          <DataTable data={displayedResults} searchTokens={activeHighlightTokens} />
        </div>
      )}

    </div>
  );
};

export default SearchPanel;
