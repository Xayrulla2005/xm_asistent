import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { useConfigStore } from '../stores/config.store';
import { NavItem } from '../api/crm-engine.api';

const FALLBACK_NAV: NavItem[] = [
  { key: 'pos',       label: 'Sotuv (POS)',  path: '/pos'       },
  { key: 'products',  label: 'Mahsulotlar',  path: '/products'  },
  { key: 'sales',     label: 'Sotuv tarixi', path: '/sales'     },
  { key: 'warehouse', label: 'Sklad',        path: '/warehouse' },
  { key: 'customers', label: 'Mijozlar',     path: '/customers' },
  { key: 'payments',  label: "To'lovlar",    path: '/payments'  },
];

export default function DynamicSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const config     = useConfigStore((s) => s.config);
  const getUserPerms = useConfigStore((s) => s.getUserPerms);

  useEffect(() => {
    if (config?.theme?.primaryColor) {
      document.documentElement.style.setProperty('--primary', config.theme.primaryColor);
    }
  }, [config]);

  const allNav = config?.navigation?.length ? config.navigation : FALLBACK_NAV;

  // Filter nav items by current user's role permissions
  const perms = getUserPerms();
  const navigation = perms && !perms.modules.includes('*')
    ? allNav.filter((item) => perms.modules.includes(item.key))
    : allNav;

  const canManageEmployees = user?.role === 'admin' || user?.role === 'manager';

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
        <span>{config?.theme?.shopName || 'Savdo CRM'}</span>
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

        {canManageEmployees && (
          <NavLink
            to="/employees"
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
          >
            Xodimlar
          </NavLink>
        )}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-theme-toggle" onClick={toggle}>
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="sidebar-user">
          <span className="sidebar-user-avatar">{user?.email?.[0]?.toUpperCase() ?? 'U'}</span>
          <span className="sidebar-email">{user?.email}</span>
          {user?.role && (
            <span style={{
              fontSize: '0.68rem', background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)', padding: '0.1rem 0.4rem',
              borderRadius: 4, marginTop: 2,
            }}>
              {user.role}
            </span>
          )}
        </div>
        <button className="sidebar-logout" onClick={handleLogout}>Chiqish</button>
      </div>
    </aside>
  );
}
