import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { useConfigStore } from '../stores/config.store';
import { NavItem } from '../api/crm-engine.api';

const FALLBACK_NAV: NavItem[] = [
  { key: 'sales',     label: 'Sotuv',     path: '/sales' },
  { key: 'warehouse', label: 'Sklad',     path: '/warehouse' },
  { key: 'customers', label: 'Mijozlar',  path: '/customers' },
  { key: 'payments',  label: "To'lovlar", path: '/payments' },
];

export default function DynamicSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const config = useConfigStore((s) => s.config);

  useEffect(() => {
    if (config?.theme?.primaryColor) {
      document.documentElement.style.setProperty('--primary', config.theme.primaryColor);
    }
  }, [config]);

  const navigation = config?.navigation?.length ? config.navigation : FALLBACK_NAV;

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        {config?.theme?.logo ? (
          <img
            src={config.theme.logo}
            alt="logo"
            style={{ height: 28, objectFit: 'contain' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <span className="sidebar-logo-icon" style={{ color: 'var(--primary, #2563eb)' }}>■</span>
        )}
        <span>Savdo CRM</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
        >
          Dashboard
        </NavLink>

        {navigation.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-theme-toggle" onClick={toggle}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="sidebar-user">
          <span className="sidebar-user-avatar">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
          <span className="sidebar-email">{user?.email}</span>
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>Chiqish</button>
      </div>
    </aside>
  );
}
