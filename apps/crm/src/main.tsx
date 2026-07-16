import * as Sentry from '@sentry/react';
import { StrictMode, useEffect } from 'react';
import './styles.css';

// Initialize Sentry before anything renders — only when DSN is set (production)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:              import.meta.env.VITE_SENTRY_DSN,
    environment:      import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations:     [Sentry.browserTracingIntegration()],
  });
}
import { BrowserRouter } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './app/app';
import { useThemeStore } from './stores/theme.store';
import { ErrorBoundary } from './components/ErrorBoundary';
import { reportBug } from './utils/bugReporter';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string ?? '';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);
  return <>{children}</>;
}

document.body.setAttribute(
  'data-theme',
  (localStorage.getItem('crm_theme') as 'light' | 'dark') ?? 'light',
);

// Global error listeners — catch unhandled errors before React
window.addEventListener('error', (e: ErrorEvent) => {
  reportBug(
    { message: e.message, stack: e.error?.stack },
    'window.onerror',
    { type: 'frontend_error', url: window.location.pathname },
  );
});

window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
  const reason = e.reason;
  const msg    = reason instanceof Error ? reason.message : String(reason);
  const stack  = reason instanceof Error ? reason.stack   : undefined;
  reportBug(
    { message: msg, stack },
    'unhandledrejection',
    { type: 'frontend_error', url: window.location.pathname },
  );
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ThemeProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ThemeProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
);
