import React, { useRef } from 'react';
import { compilePropertyTimeline, findMatchingPropertyRecords } from '../utils/propertyTimeline';
import { formatINR } from '../utils/propertyParser';
import { useModalFocus } from '../utils/useModalFocus';

const PropertyTimelineModal = ({ deed, dataset, onClose }) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useModalFocus({
    modalRef,
    onClose,
    initialFocusRef: closeButtonRef
  });

  if (!deed) return null;

  const matchingRecords = findMatchingPropertyRecords(dataset, deed);
  const report = compilePropertyTimeline(matchingRecords, deed);

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(3px)',
      padding: '1rem'
    }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-label="Property Chain-of-Title Timeline"
        tabIndex={-1}
        className="modal-content print-timeline-container" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-main, #1e293b)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '1.75rem'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color, #e2e8f0)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.4rem' }}>📜</span>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
                Property Record History Report
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Chronological Transaction Timeline & Registration Chain-of-Title Analysis
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrintPdf}
              style={{
                background: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
              title="Print or Save as PDF"
            >
              📄 Print / Save PDF
            </button>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close Timeline Modal"
              title="Close Modal (Esc)"
              style={{
                background: 'var(--bg-main, #f1f5f9)',
                border: '1px solid var(--border-color, #cbd5e1)',
                borderRadius: '6px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: 'var(--text-muted, #64748b)'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Property Coordinates Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-main, #f8fafc)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
          marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>SOCIETY / PROJECT</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{report.propertyInfo.society}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>FLAT / UNIT NUMBER</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#2563eb' }}>{report.propertyInfo.flat_no || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>CARPET AREA</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              {report.propertyInfo.carpet_sqft ? `${report.propertyInfo.carpet_sqft} sq.ft` : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>REGISTERED TRANSACTIONS</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#10b981' }}>{report.metrics.totalDeeds} Deed(s) Found</div>
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, minWidth: '200px', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>TOTAL REGISTERED CONSIDERATION</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065f46' }}>{report.metrics.formattedTotalConsideration}</div>
          </div>
          <div style={{ flex: 1, minWidth: '200px', padding: '0.75rem 1rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>TOTAL STAMP DUTY PAID</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e40af' }}>{report.metrics.formattedTotalStampDuty}</div>
          </div>
        </div>

        {/* Growth & Capital Appreciation Metrics if eligible conveyance deeds exist */}
        {report.priceAppreciationPct !== undefined && report.initialPrice > 0 && report.latestPrice > 0 && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.75rem 1rem',
              background: report.priceAppreciationPct >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              borderRadius: '8px',
              border: `1px solid ${report.priceAppreciationPct >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
            }}>
              <div style={{ fontSize: '0.75rem', color: report.priceAppreciationPct >= 0 ? '#047857' : '#b91c1c', fontWeight: 600 }}>
                CAPITAL APPRECIATION
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: report.priceAppreciationPct >= 0 ? '#065f46' : '#991b1b' }}>
                {report.priceAppreciationPct >= 0 ? `+${report.priceAppreciationPct}%` : `${report.priceAppreciationPct}%`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.2rem' }}>
                {formatINR(report.initialPrice)} → {formatINR(report.latestPrice)}
              </div>
            </div>
            {report.cagrPct > 0 && (
              <div style={{
                flex: 1,
                minWidth: '200px',
                padding: '0.75rem 1rem',
                background: 'rgba(99, 102, 241, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 600 }}>
                  ANNUALIZED RETURN (CAGR)
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#3730a3' }}>
                  {report.cagrPct}% p.a.
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '0.2rem' }}>
                  Across verified sale transfers
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legal Valuation & Conveyance Methodology Explainer (Objective D) */}
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '8px',
          padding: '0.65rem 0.85rem',
          fontSize: '0.78rem',
          color: 'var(--text-muted, #64748b)',
          marginBottom: '1.25rem',
          lineHeight: '1.45'
        }}>
          ℹ️ <strong>Valuation Methodology:</strong> Capital appreciation and CAGR are computed exclusively across verified conveyance sales (Sale / Resale) over exact date intervals. Non-conveyance deeds (Partition, Rectification, Mortgage, Gift, Release) are tracked for legal chain-of-title but excluded from appreciation events.
        </div>

                {/* Chain Ambiguity Warning if detected */}
        {report.hasAmbiguities && (
          <div style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '0.85rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: '#92400e'
          }}>
            <strong>⚠️ Potential Chain of Title Ambiguity:</strong>
            <ul style={{ margin: '0.35rem 0 0 1.25rem', padding: 0 }}>
              {report.gaps.map((g, idx) => (
                <li key={idx} style={{ marginTop: '0.2rem' }}>{g.note}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Chronological Timeline */}
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main, #0f172a)' }}>
          Chronological Ownership & Registration History:
        </h3>

        <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid var(--border-color, #cbd5e1)', marginLeft: '0.5rem', marginBottom: '2rem' }}>
          {report.timeline.map((item, idx) => (
            <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
              {/* Timeline Dot */}
              <div style={{
                position: 'absolute',
                left: '-2.05rem',
                top: '0.25rem',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: item.isChainGap ? '#f59e0b' : '#3b82f6',
                border: '3px solid #ffffff',
                boxShadow: '0 0 0 1px #cbd5e1'
              }} />

              {/* Deed Card */}
              <div style={{
                backgroundColor: 'var(--bg-main, #f8fafc)',
                border: item.isChainGap ? '1px solid #f59e0b' : '1px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px',
                padding: '0.85rem 1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2563eb' }}>
                      Step {item.stepIndex}: {item.docname}
                    </span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                      Doc #{item.docno}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted, #64748b)' }}>
                    📅 {item.registrationdate}
                  </div>
                </div>

                {/* Parties Involved */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0', background: 'var(--bg-card, #ffffff)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', display: 'block', fontWeight: 600 }}>
                      {item.role1Label || 'TRANSFEROR / PARTY 1'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: '#b91c1c' }}>{item.sellerparty}</strong>
                  </div>
                  <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                    <div>➔</div>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>{item.transferVerb || 'TO'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #64748b)', display: 'block', fontWeight: 600 }}>
                      {item.role2Label || 'TRANSFEREE / PARTY 2'}
                    </span>
                    <strong style={{ fontSize: '0.85rem', color: '#15803d' }}>{item.purchaserparty}</strong>
                  </div>
                </div>

                {/* Financial and Provenance details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginTop: '0.35rem' }}>
                  <span>Consideration: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{item.formattedConsideration}</strong> | Stamp Duty: <strong>{item.formattedStampDuty}</strong></span>
                  <span style={{ fontSize: '0.75rem' }}>📁 {item.source_file}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer Statement */}
        <div style={{
          backgroundColor: 'var(--bg-main, #f8fafc)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '8px',
          padding: '0.85rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted, #64748b)',
          lineHeight: 1.5
        }}>
          <strong>NOTICE & DISCLAIMER:</strong> {report.disclaimer}
          <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', textAlign: 'right' }}>
            Report generated on: {new Date().toLocaleString()} (100% Client-Side Local Verification)
          </div>
        </div>

        {/* Modal Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--bg-main, #f1f5f9)',
              color: 'var(--text-main, #0f172a)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyTimelineModal;
