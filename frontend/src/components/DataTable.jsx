import React, { useState, useMemo } from 'react';

const DataTable = ({ data, onDeleteRow }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [quickFilter, setQuickFilter] = useState('');

  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>No records to display.</p>;
  }

  const columns = Object.keys(data[0] || {});

  // 1. Quick in-table filter
  const filteredData = useMemo(() => {
    if (!quickFilter.trim()) return data;
    const q = quickFilter.toLowerCase();
    return data.filter(row =>
      columns.some(col => String(row[col] ?? '').toLowerCase().includes(q))
    );
  }, [data, columns, quickFilter]);

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

  return (
    <div className="datatable-container" style={{ marginTop: '0.5rem' }}>
      {/* Top Bar: Rows Per Page & Quick Filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Show</label>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
              setRowsPerPage(val);
              setCurrentPage(1);
            }}
            style={{
              padding: '0.4rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value="All">All</option>
          </select>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>records per page</span>
        </div>

        <div>
          <input
            type="text"
            placeholder="🔍 Quick filter in table..."
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
              fontSize: '0.9rem',
              minWidth: '220px'
            }}
          />
        </div>
      </div>

      {/* Table Container with Sticky Header */}
      <div style={{ overflowX: 'auto', maxHeight: '520px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
        <table className="excel-table modern-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 1, borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '0.6rem 0.8rem', width: '50px' }}>#</th>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  style={{
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontWeight: '600'
                  }}
                  title="Click to sort A-Z / Z-A"
                >
                  {col}
                  <span style={{ fontSize: '0.8rem', color: sortConfig.key === col ? 'var(--primary-color)' : 'var(--text-muted)' }}>
                    {getSortIcon(col)}
                  </span>
                </th>
              ))}
              {onDeleteRow && (
                <th style={{ padding: '0.6rem 0.8rem', width: '70px', textAlign: 'center' }}>Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => {
                const rowNumber = rowsPerPage === 'All' ? idx + 1 : (activePage - 1) * rowsPerPage + idx + 1;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.5rem 0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{rowNumber}</td>
                    {columns.map(col => (
                      <td key={col} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                        {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
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
                <td colSpan={columns.length + (onDeleteRow ? 2 : 1)} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};

export default DataTable;
