import * as Sentry from '@sentry/react';
import { StrictMode, useEffect } from 'react';
import './styles.css';

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
import App from './app/app';
import { useThemeStore } from './stores/theme.store';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}

// Apply theme immediately before first render (avoids flash)
document.body.setAttribute(
  'data-theme',
  (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light',
);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
