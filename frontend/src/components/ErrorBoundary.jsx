import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application caught error in ErrorBoundary:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '3rem 2rem',
          maxWidth: '650px',
          margin: '4rem auto',
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid #ef4444',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
            Application Self-Recovery Active
          </h2>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            A rendering issue occurred. Your data has not been lost. Click below to refresh smoothly.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn btn-outline"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              Try Recovering
            </button>
            <button
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.25rem' }}
            >
              🔄 Refresh View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
