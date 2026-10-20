import React from 'react';

const Header = ({ theme, toggleTheme, onGoHome, hasData }) => {
  return (
    <header className="app-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.85rem 1.25rem',
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border-color)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      flexWrap: 'wrap',
      gap: '0.75rem'
    }}>
      <div 
        onClick={hasData ? onGoHome : undefined}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          cursor: hasData ? 'pointer' : 'default',
          flex: '1 1 auto',
          minWidth: '220px'
        }}
        title={hasData ? 'Click to return to home upload screen' : ''}
      >
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '1.2rem',
          flexShrink: 0,
          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
        }}>
          📊
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.15rem', margin: 0, fontWeight: '700', color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
              Smart Excel Search & Manager
            </h1>
            <span style={{
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: '#3b82f6',
              fontWeight: '700'
            }}>
              v2.0
            </span>
            <span className="hide-on-mobile" style={{
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: '8px',
              background: 'rgba(22, 101, 52, 0.12)',
              color: '#166534',
              fontWeight: '600'
            }}>
              🔒 100% In-Browser Private
            </span>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Multilingual Phonetic Search • Dynamic Merging • Excel & CSV Export
          </p>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {hasData && (
          <button
            onClick={onGoHome}
            className="btn btn-outline"
            style={{
              fontSize: '0.8rem',
              padding: '0.4rem 0.75rem',
              color: '#3b82f6',
              borderColor: '#3b82f6',
              fontWeight: 600,
              background: 'rgba(59, 130, 246, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Return to file upload screen"
          >
            ⬅ Back to Upload
          </button>
        )}
        <button 
          className="btn btn-theme" 
          onClick={toggleTheme} 
          style={{ 
            fontSize: '0.8rem', 
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </header>
  );
};

export default Header;
