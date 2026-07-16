import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DynamicSidebar from './DynamicSidebar';
import { useConfigStore } from '../stores/config.store';
import { useTenantStore } from '../stores/tenant.store';
import { useThemeStore } from '../stores/theme.store';
import { useFeaturesStore } from '../stores/features.store';
import { AlignJustify, Sun, Moon } from 'lucide-react';

export default function DynamicLayout() {
  const tenantId    = useTenantStore((s) => s.tenantId);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const config      = useConfigStore((s) => s.config);
  const setTheme    = useThemeStore((s) => s.setTheme);
  const { theme, toggle } = useThemeStore();
  const fetchFlags  = useFeaturesStore((s) => s.fetchFlags);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    fetchConfig(tenantId);
    void fetchFlags(tenantId);
  }, [tenantId, fetchConfig, fetchFlags]);

  useEffect(() => {
    if (!config) return;
    document.body.setAttribute('data-style', config.theme.style || 'modern');

    // Industry-specific body attribute for CSS theming
    const industry = config.industry;
    if (industry) {
      const key = industry.toLowerCase();
      const tag =
        key.includes('restaurant') || key.includes('cafe') || key.includes('food') ? 'restaurant'
        : key.includes('clinic') || key.includes('hospital') || key.includes('medical') ? 'clinic'
        : key.includes('education') || key.includes('school') || key.includes('course') ? 'education'
        : key.includes('gym') || key.includes('sport') || key.includes('fitness') ? 'gym'
        : key.includes('beauty') || key.includes('salon') || key.includes('nail') || key.includes('spa') ? 'beauty'
        : key.includes('auto') || key.includes('car') || key.includes('servis') ? 'auto'
        : 'retail';
      document.body.setAttribute('data-industry', tag);
    }

    if (config.theme.primaryColor) {
      document.documentElement.style.setProperty('--primary', config.theme.primaryColor);
    }
    if (!localStorage.getItem('crm_theme') && config.theme.darkMode !== undefined) {
      setTheme(config.theme.darkMode ? 'dark' : 'light');
    }
  }, [config]);

  return (
    <div className="layout">
      {/* Backdrop (mobile only) */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <DynamicSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile top bar */}
        <header className="mobile-topbar">
          <button
            className="mobile-topbar-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menyuni ochish"
          >
            <AlignJustify size={18} />
          </button>
          <div className="mobile-topbar-brand">
            {config?.theme?.logo ? (
              <img
                src={config.theme.logo}
                alt="logo"
                style={{ height: 22, objectFit: 'contain' }}
              />
            ) : null}
            {config?.theme?.shopName || 'Savdo CRM'}
          </div>
          <button
            className="mobile-topbar-btn"
            onClick={toggle}
            aria-label="Tema almashtirish"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
