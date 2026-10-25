import React from 'react';

// Safe in-cell keyword highlighting using React elements (Zero dangerouslySetInnerHTML, 100% XSS-Safe)
export function renderHighlightedText(text, tokens = []) {
  if (!text || !tokens || tokens.length === 0) return String(text ?? '');
  const cleanTokens = tokens
    .map(t => String(t || '').trim())
    .filter(t => t.length >= 2);
  if (cleanTokens.length === 0) return String(text);

  try {
    const escaped = cleanTokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = String(text).split(regex);
    if (parts.length <= 1) return String(text);

    return parts.map((part, i) => {
      const isMatch = cleanTokens.some(t => t.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return React.createElement('mark', {
          key: i,
          style: {
            backgroundColor: '#fef08a',
            color: '#854d0e',
            padding: '0.1rem 0.25rem',
            borderRadius: '3px',
            fontWeight: 700
          }
        }, part);
      }
      return part;
    });
  } catch {
    return String(text);
  }
}
