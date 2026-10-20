import React from 'react';
import { formatINR } from '../utils/propertyParser';

const DeedDetailModal = ({ deed, onClose }) => {
  if (!deed) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        border: '1px solid var(--border-color)',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{
                background: '#3b82f6',
                color: '#fff',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                Doc #{deed.docno || 'N/A'}
              </span>
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {deed.docname || 'Deed'}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Reg Date: <strong>{deed.registrationdate}</strong>
              </span>
            </div>
            <h2 style={{ margin: '0.5rem 0 0.2rem 0', fontSize: '1.35rem' }}>
              {deed.society || 'Verified Property Record'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              🏛️ {deed.sroname || 'Sub-Registrar Office'} • {deed.areaname || 'लोहगांव'} (Survey No. 284)
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '0.25rem 0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {/* Property Highlights Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
          background: 'var(--bg-main)',
          padding: '1rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Flat / Unit No</span>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {deed.flat_no ? `Flat ${deed.flat_no}` : 'Not Specified'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carpet Area</span>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {deed.carpet_sqft ? `${deed.carpet_sqft} sq.ft` : 'Not Specified'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rate / Sq.Ft</span>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: deed.rate_per_sqft ? '#3b82f6' : 'var(--text-muted)' }}>
              {deed.rate_per_sqft ? `₹ ${Number(deed.rate_per_sqft).toLocaleString('en-IN')}` : 'N/A'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SRO Code</span>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
              Haveli #{deed.srocode || '3'}
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            💰 Financials & Registration Fees
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.75rem'
          }}>
            <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Consideration Amount</span>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#10b981' }}>
                {formatINR(deed.consideration_amt)}
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Govt Market Value</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {formatINR(deed.marketvalue)}
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stamp Duty Paid</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f59e0b' }}>
                {formatINR(deed.stampdutypaid)}
              </div>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registration Fees</span>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {formatINR(deed.registrationfees)}
              </div>
            </div>
          </div>
        </div>

        {/* Parties Involved */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
              👤 Seller / Developer / Mortgagor:
            </span>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
              {deed.sellerparty || 'None recorded'}
            </p>
          </div>
          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
              👥 Purchaser / Allottee / Bank:
            </span>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', lineHeight: '1.4' }}>
              {deed.purchaserparty || 'None recorded'}
            </p>
          </div>
        </div>

        {/* Full Property Description */}
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            📜 Full Property Description (Index-II Record):
          </span>
          <div style={{
            marginTop: '0.35rem',
            padding: '0.75rem',
            background: 'var(--bg-main)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            lineHeight: '1.5',
            border: '1px solid var(--border-color)',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {deed.propertydescription || 'No description available'}
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1rem',
          marginTop: '0.5rem'
        }}>
          <button
            onClick={handlePrint}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            🖨️ Print Index-II Slip
          </button>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeedDetailModal;
