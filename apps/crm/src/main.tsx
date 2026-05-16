import { StrictMode, useEffect } from 'react';
import './styles.css';
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

document.body.setAttribute(
  'data-theme',
  (localStorage.getItem('crm_theme') as 'light' | 'dark') ?? 'light',
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
