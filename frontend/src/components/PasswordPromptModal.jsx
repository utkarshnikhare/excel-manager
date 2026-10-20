import React, { useState } from 'react';

const PasswordPromptModal = ({ fileName, onDecrypt, onSkip }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Please enter a password');
      return;
    }
    setErrorMsg('');
    setIsDecrypting(true);
    try {
      const success = await onDecrypt(password);
      if (!success) {
        setErrorMsg('Incorrect password or unsupported 256-bit encryption. Please check and retry.');
      }
    } catch (err) {
      setErrorMsg(`Decryption failed: ${err.message || 'Check password'}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        color: 'var(--text-main)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.4)',
        border: '1px solid var(--border-color)',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            fontSize: '1.8rem',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#ef4444',
            padding: '0.5rem',
            borderRadius: '12px',
            lineHeight: 1
          }}>
            🔒
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
              Encrypted File Detected
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Password required to unlock spreadsheet
            </span>
          </div>
        </div>

        <div style={{
          background: 'var(--bg-main)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ color: 'var(--text-muted)' }}>File:</span>
          <strong style={{ color: '#3b82f6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName}
          </strong>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Enter Spreadsheet Password:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type file password..."
                autoFocus
                className="form-control"
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: 'var(--text-muted)'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              fontSize: '0.82rem'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={onSkip}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              ⏭️ Skip This File
            </button>
            <button
              type="submit"
              disabled={isDecrypting}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {isDecrypting ? '⏳ Unlocking...' : '🔓 Decrypt & Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordPromptModal;
