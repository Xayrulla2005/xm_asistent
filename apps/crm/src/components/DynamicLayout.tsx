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

  const isImpersonated = localStorage.getItem('crm_impersonated') === 'true';

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

  const isInIframe = window !== window.top;
  const ADMIN_URL = (import.meta as unknown as { env: Record<string, string> }).env['VITE_ADMIN_URL'] ?? 'http://localhost:4200';
  const showBanner = isImpersonated && !isInIframe;
  const BANNER_H = showBanner ? 34 : 0;

  return (
    <div className="layout" style={showBanner ? { paddingTop: BANNER_H } : undefined}>
      {/* Superadmin impersonation banner — only shown in standalone mode (not in iframe) */}
      {showBanner && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#7c3aed', color: '#fff',
          height: BANNER_H, padding: '0 1rem', fontSize: '0.8rem', fontWeight: 600,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        }}>
          <span>Superadmin rejimi: <strong>{config?.theme?.shopName ?? 'tenant'}</strong> CRM si</span>
          <button
            onClick={() => {
              localStorage.removeItem('crm_impersonated');
              localStorage.removeItem('crm_accessToken');
              localStorage.removeItem('crm_wizardConfig');
              window.location.href = ADMIN_URL;
            }}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '0.2rem 0.75rem', borderRadius: 5, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
          >
            ← Admin paneliga qaytish
          </button>
        </div>
      )}

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
