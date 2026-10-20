import React from 'react';

const Header = ({ theme, toggleTheme, onGoHome, hasData }) => {
  return (
    <header className="app-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.85rem 1.5rem',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div 
        onClick={hasData ? onGoHome : undefined}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          cursor: hasData ? 'pointer' : 'default'
        }}
        title={hasData ? 'Click to return to home upload screen' : ''}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.1rem'
        }}>
          📊
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '700', color: 'var(--text-main)' }}>
              Smart Excel Search & Manager
            </h1>
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              fontWeight: '600'
            }}>
              v2.0
            </span>
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 6px',
              borderRadius: '10px',
              background: 'rgba(22, 101, 52, 0.1)',
              color: '#166534',
              fontWeight: '600'
            }}>
              🔒 100% In-Browser Private
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Multilingual Phonetic Search • Dynamic Merging • Excel & CSV Export
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {hasData && (
          <button
            onClick={onGoHome}
            className="btn btn-outline"
            style={{
              fontSize: '0.85rem',
              padding: '0.4rem 0.8rem',
              color: '#3b82f6',
              borderColor: '#3b82f6',
              fontWeight: 600,
              background: 'rgba(59, 130, 246, 0.08)'
            }}
            title="Return to file upload screen"
          >
            ⬅ Back to Upload
          </button>
        )}
        <a 
          href="https://github.com/utkarshnikhare/excel-manager" 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-outline"
          style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
        >
          GitHub ↗
        </a>
        <button className="btn btn-theme" onClick={toggleTheme} style={{ fontSize: '0.85rem' }}>
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </header>
  );
};

export default Header;
