import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { useConfigStore } from '../stores/config.store';
import { NavItem } from '../api/crm-engine.api';

// Labels/paths for every known module key — used when config.navigation lacks an entry
const MODULE_NAV_MAP: Record<string, NavItem> = {
  pos:          { key: 'pos',          label: 'Sotuv (POS)',      path: '/pos'          },
  products:     { key: 'products',     label: 'Mahsulotlar',      path: '/products'     },
  sales:        { key: 'sales',        label: 'Sotuv tarixi',     path: '/sales'        },
  warehouse:    { key: 'warehouse',    label: 'Sklad',            path: '/warehouse'    },
  customers:    { key: 'customers',    label: 'Mijozlar',         path: '/customers'    },
  payments:     { key: 'payments',     label: "To'lovlar",        path: '/payments'     },
  patients:     { key: 'patients',     label: 'Bemorlar',         path: '/patients'     },
  appointments: { key: 'appointments', label: 'Qabullar',         path: '/appointments' },
  doctors:      { key: 'doctors',      label: 'Shifokorlar',      path: '/doctors'      },
  pharmacy:     { key: 'pharmacy',     label: 'Dorixona',         path: '/pharmacy'     },
  students:     { key: 'students',     label: 'Talabalar',        path: '/students'     },
  courses:      { key: 'courses',      label: 'Kurslar',          path: '/courses'      },
  teachers:     { key: 'teachers',     label: "O'qituvchilar",    path: '/teachers'     },
  attendance:   { key: 'attendance',   label: 'Davomat',          path: '/attendance'   },
  menu:         { key: 'menu',         label: 'Menyu',            path: '/menu'         },
  orders:       { key: 'orders',       label: 'Buyurtmalar',      path: '/orders'       },
  kitchen:      { key: 'kitchen',      label: 'Oshxona',          path: '/kitchen'      },
  tables:       { key: 'tables',       label: 'Stollar',          path: '/tables'       },
};

const FALLBACK_NAV: NavItem[] = [
  MODULE_NAV_MAP.pos, MODULE_NAV_MAP.products, MODULE_NAV_MAP.sales,
  MODULE_NAV_MAP.warehouse, MODULE_NAV_MAP.customers, MODULE_NAV_MAP.payments,
];

export default function DynamicSidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const config       = useConfigStore((s) => s.config);
  const getUserPerms = useConfigStore((s) => s.getUserPerms);

  useEffect(() => {
    if (config?.theme?.primaryColor) {
      document.documentElement.style.setProperty('--primary', config.theme.primaryColor);
    }
  }, [config]);

  // Build nav strictly from wizard-selected modules.
  // Prefer the label/path from config.navigation; fall back to the local map.
  const configuredNav: NavItem[] = config?.modules?.length
    ? config.modules
        .map((key) => config.navigation?.find((n) => n.key === key) ?? MODULE_NAV_MAP[key])
        .filter((item): item is NavItem => item !== undefined)
    : FALLBACK_NAV;

  // Further filter by current user's role permissions
  const perms = getUserPerms();
  const permModules = perms?.modules ?? [];
  const navigation = permModules.length && !permModules.includes('*')
    ? configuredNav.filter((item) => permModules.includes(item.key))
    : configuredNav;

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
