import React, { useState, useRef } from 'react';
import { formatINR } from '../utils/propertyParser';
import { useModalFocus } from '../utils/useModalFocus';

const DeedDetailModal = ({ deed, onClose }) => {
  const [showRawText, setShowRawText] = useState(false);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useModalFocus({
    modalRef,
    onClose,
    initialFocusRef: closeButtonRef
  });

  if (!deed) return null;

  const isPropertyDeed = Boolean(deed.docno || deed.society || deed.consideration_amt || deed.propertydescription);
  const rawDocumentText = deed._rawText || deed.extracted_ocr_text || deed._ocrTextSnippet || '';

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
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Document Deed Details" tabIndex={-1} style={{ outline: 'none',
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
              {deed.source_file && (
                <span style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#1d4ed8',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  📁 File: {deed.source_file}
                </span>
              )}
            </div>
            <h2 style={{ margin: '0.5rem 0 0.2rem 0', fontSize: '1.35rem' }}>
              {deed.society || 'Verified Property Record'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              🏛️ {deed.sroname || 'Sub-Registrar Office'} • {deed.areaname || 'लोहगांव'} (Survey No. 284)
            </p>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close Modal"
            title="Close Modal (Esc)"
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

        {isPropertyDeed ? (
          <>
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
          </>
        ) : (
          /* Generic Data Sheet Details */
          <div>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              📋 Complete Record Attributes ({Object.keys(deed).length} fields)
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
              maxHeight: '400px',
              overflowY: 'auto',
              padding: '0.25rem'
            }}>
              {Object.entries(deed).filter(([k]) => !['source_file', 'source_sheet', '_searchBlob'].includes(k)).map(([key, val]) => (
                <div key={key} style={{
                  background: 'var(--bg-main)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.2rem' }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', wordBreak: 'break-word', fontWeight: 600 }}>
                    {String(val ?? '—')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Document Text & Extraction Provenance Section (Objective A) */}
        {rawDocumentText && (
          <div style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.75rem 1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  🔍 Extracted Document Text Stream
                </span>
                {deed._extractionCertainty && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: deed._extractionCertainty === 'HIGH' 
                      ? 'rgba(16, 185, 129, 0.15)' 
                      : deed._extractionCertainty === 'MEDIUM'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color: deed._extractionCertainty === 'HIGH' 
                      ? '#047857' 
                      : deed._extractionCertainty === 'MEDIUM'
                        ? '#b45309'
                        : '#b91c1c'
                  }}>
                    Certainty: {deed._extractionCertainty}
                  </span>
                )}
                {deed._ocrStatus && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#1d4ed8'
                  }}>
                    OCR ({deed._ocrConfidence ? deed._ocrConfidence + '%' : 'WASM'})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                aria-expanded={showRawText}
              >
                {showRawText ? 'Hide Raw Text ▲' : 'Inspect Raw Text ▼'}
              </button>
            </div>
            {showRawText && (
              <pre style={{
                marginTop: '0.65rem',
                padding: '0.75rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                lineHeight: '1.45',
                maxHeight: '200px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--text-main)'
              }}>
                {rawDocumentText}
              </pre>
            )}
          </div>
        )}

                {/* Originating Source File Verification Box */}
        {deed.source_file && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.22)',
            borderRadius: '8px',
            padding: '0.65rem 1rem',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
              <span style={{ fontSize: '1.15rem' }}>📂</span>
              <span>Originating Source File: <strong style={{ color: '#2563eb' }}>{deed.source_file}</strong></span>
            </div>
            {deed.source_sheet && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Sheet: <strong>{deed.source_sheet}</strong>
              </span>
            )}
          </div>
        )}

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
