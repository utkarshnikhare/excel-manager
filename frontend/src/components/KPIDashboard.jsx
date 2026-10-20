import React, { useMemo } from 'react';
import { formatINR } from '../utils/propertyParser';

const KPIDashboard = ({ data, activeSociety, onSelectSociety }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalDeeds: 0,
        totalValue: 0,
        totalStampDuty: 0,
        topSociety: 'N/A',
        societies: {}
      };
    }

    let totalValue = 0;
    let totalStampDuty = 0;
    const societies = {};

    data.forEach(row => {
      totalValue += Number(row.consideration_amt) || 0;
      totalStampDuty += Number(row.stampdutypaid) || 0;
      
      const soc = row.society || 'Other';
      societies[soc] = (societies[soc] || 0) + 1;
    });

    const sortedSocieties = Object.entries(societies).sort((a, b) => b[1] - a[1]);
    const topSociety = sortedSocieties[0] ? `${sortedSocieties[0][0]} (${sortedSocieties[0][1]})` : 'N/A';

    return {
      totalDeeds: data.length,
      totalValue,
      totalStampDuty,
      topSociety,
      societies: sortedSocieties
    };
  }, [data]);

  if (!data || data.length === 0) return null;

  return (
    <div className="kpi-dashboard-card" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '1.25rem',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      {/* Top 4 KPI Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Metric 1 */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.08)',
          borderRadius: '10px',
          padding: '1rem',
          borderLeft: '4px solid #3b82f6'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            Total Property Deeds
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.3rem' }}>
            {stats.totalDeeds.toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 500 }}>
            Survey No. 284 Registry Records
          </span>
        </div>

        {/* Metric 2 */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          borderRadius: '10px',
          padding: '1rem',
          borderLeft: '4px solid #10b981'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            Total Transaction Value
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.3rem' }}>
            {formatINR(stats.totalValue)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Registered Consideration Amount
          </span>
        </div>

        {/* Metric 3 */}
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          borderRadius: '10px',
          padding: '1rem',
          borderLeft: '4px solid #f59e0b'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            Stamp Duty Collected
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.3rem' }}>
            {formatINR(stats.totalStampDuty)}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Government Revenue Generated
          </span>
        </div>

        {/* Metric 4 */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.08)',
          borderRadius: '10px',
          padding: '1rem',
          borderLeft: '4px solid #8b5cf6'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
            Top Project / Society
          </span>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8b5cf6', marginTop: '0.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stats.topSociety}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Highest Transaction Volume
          </span>
        </div>
      </div>

      {/* Society Quick-Filter Pills */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            🏢 Quick Project / Society Filter:
          </span>
          {activeSociety && (
            <button
              onClick={() => onSelectSociety('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              ✕ Clear Filter
            </button>
          )}
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <button
            onClick={() => onSelectSociety('')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              border: activeSociety === '' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
              background: activeSociety === '' ? '#3b82f6' : 'var(--bg-main)',
              color: activeSociety === '' ? '#ffffff' : 'var(--text-main)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            All Projects ({stats.totalDeeds})
          </button>
          {stats.societies.slice(0, 7).map(([soc, count]) => {
            const isActive = activeSociety === soc;
            return (
              <button
                key={soc}
                onClick={() => onSelectSociety(isActive ? '' : soc)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  border: isActive ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                  background: isActive ? '#3b82f6' : 'var(--bg-main)',
                  color: isActive ? '#ffffff' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {soc} ({count})
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default KPIDashboard;
