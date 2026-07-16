import { Component, ReactNode } from 'react';
import { reportBug } from '../utils/bugReporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }): void {
    reportBug(
      { message: error.message, stack: (error.stack ?? '') + '\n\nComponent stack:' + info.componentStack },
      'ErrorBoundary',
      { type: 'frontend_error', url: window.location.pathname },
    );
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: 'var(--bg, #f8fafc)', padding: '2rem',
        }}>
          <div style={{
            maxWidth: 480, textAlign: 'center',
            background: 'var(--card-bg, #fff)', borderRadius: 12,
            padding: '2rem 2.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: 'var(--text, #111)' }}>
              Xatolik yuz berdi
            </h2>
            <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
              Sahifani yangilang. Muammo davom etsa, qo'llab-quvvatlash xizmatiga murojaat qiling.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none',
                background: 'var(--primary, #2563eb)', color: '#fff',
                cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              }}
            >
              Sahifani yangilash
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
