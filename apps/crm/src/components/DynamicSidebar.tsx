import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useThemeStore } from '../stores/theme.store';
import { useConfigStore } from '../stores/config.store';
import { useFeaturesStore } from '../stores/features.store';
import { NavItem } from '../api/crm-engine.api';

type PlanTier = 'trial' | 'starter' | 'pro';
type IndustryKey = 'retail' | 'restaurant' | 'clinic' | 'education' | 'gym' | 'beauty' | 'auto';

// Industry-specific plan module access sets
const INDUSTRY_PLAN_MODULES: Record<IndustryKey, Record<PlanTier, Set<string>>> = {
  retail: {
    trial:   new Set(['pos', 'products', 'settings']),
    starter: new Set(['pos', 'products', 'customers', 'sales', 'warehouse', 'employees', 'payments', 'settings']),
    pro:     new Set(),
  },
  restaurant: {
    trial:   new Set(['menu', 'orders', 'tables', 'settings']),
    starter: new Set(['menu', 'orders', 'tables', 'kitchen', 'employees', 'reports', 'settings']),
    pro:     new Set(),
  },
  clinic: {
    trial:   new Set(['patients', 'appointments', 'doctors', 'settings']),
    starter: new Set(['patients', 'appointments', 'doctors', 'pharmacy', 'prescriptions', 'employees', 'settings']),
    pro:     new Set(),
  },
  education: {
    trial:   new Set(['students', 'courses', 'teachers', 'settings']),
    starter: new Set(['students', 'courses', 'teachers', 'attendance', 'edu_payments', 'employees', 'settings']),
    pro:     new Set(),
  },
  gym: {
    trial:   new Set(['gym_members', 'gym_plans', 'settings']),
    starter: new Set(['gym_members', 'gym_plans', 'gym_checkin', 'employees', 'reports', 'settings']),
    pro:     new Set(),
  },
  beauty: {
    trial:   new Set(['beauty_appointments', 'beauty_services_catalog', 'settings']),
    starter: new Set(['beauty_appointments', 'beauty_masters', 'beauty_services_catalog', 'customers', 'employees', 'settings']),
    pro:     new Set(),
  },
  auto: {
    trial:   new Set(['auto_orders', 'auto_vehicles', 'settings']),
    starter: new Set(['auto_orders', 'auto_vehicles', 'customers', 'warehouse', 'employees', 'reports', 'settings']),
    pro:     new Set(),
  },
};

function getPlanTier(flags: { dashboard_charts: boolean; sales_returns_view: boolean } | null): PlanTier {
  if (!flags) return 'trial';
  if (flags.sales_returns_view) return 'pro';
  if (flags.dashboard_charts)   return 'starter';
  return 'trial';
}

function detectIndustry(industry: string | undefined): IndustryKey {
  if (!industry) return 'retail';
  const i = industry.toLowerCase();
  if (i.includes('restaurant') || i.includes('cafe') || i.includes('food')) return 'restaurant';
  if (i.includes('clinic') || i.includes('hospital') || i.includes('medical')) return 'clinic';
  if (i.includes('education') || i.includes('school') || i.includes('course')) return 'education';
  if (i.includes('gym') || i.includes('sport') || i.includes('fitness')) return 'gym';
  if (i.includes('beauty') || i.includes('salon') || i.includes('nail') || i.includes('spa')) return 'beauty';
  if (i.includes('auto') || i.includes('car') || i.includes('servis')) return 'auto';
  return 'retail';
}

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
  pharmacy:      { key: 'pharmacy',      label: 'Dorixona',        path: '/pharmacy'      },
  prescriptions: { key: 'prescriptions', label: 'Retseptlar',     path: '/prescriptions' },
  students:      { key: 'students',      label: 'Talabalar',       path: '/students'      },
  courses:       { key: 'courses',       label: 'Kurslar',         path: '/courses'       },
  teachers:      { key: 'teachers',      label: "O'qituvchilar",   path: '/teachers'      },
  attendance:    { key: 'attendance',    label: 'Davomat',         path: '/attendance'    },
  edu_payments:  { key: 'edu_payments',  label: "Oylik to'lovlar", path: '/edu_payments'  },
  menu:         { key: 'menu',         label: 'Menyu',            path: '/menu'         },
  gym_members:  { key: 'gym_members',  label: "A'zolar",          path: '/gym_members'  },
  gym_plans:    { key: 'gym_plans',    label: 'Obuna rejalari',   path: '/gym_plans'    },
  gym_checkin:  { key: 'gym_checkin',  label: 'Kirish nazorati',  path: '/gym_checkin'  },
  beauty_appointments:     { key: 'beauty_appointments',     label: 'Qabullar',   path: '/beauty_appointments'     },
  beauty_masters:          { key: 'beauty_masters',          label: 'Masterlar',  path: '/beauty_masters'          },
  beauty_services_catalog: { key: 'beauty_services_catalog', label: 'Xizmatlar', path: '/beauty_services_catalog' },
  auto_orders:   { key: 'auto_orders',   label: 'Servis buyurtmalari', path: '/auto_orders'   },
  auto_vehicles: { key: 'auto_vehicles', label: 'Avtomobillar',        path: '/auto_vehicles' },
  orders:        { key: 'orders',        label: 'Buyurtmalar',         path: '/orders'        },
  kitchen:      { key: 'kitchen',      label: 'Oshxona',          path: '/kitchen'      },
  tables:       { key: 'tables',       label: 'Stollar',          path: '/tables'       },
  employees:    { key: 'employees',    label: 'Xodimlar',         path: '/employees'    },
  reports:      { key: 'reports',      label: 'Hisobotlar',       path: '/reports'      },
  debts:        { key: 'debts',        label: 'Qarzdorlik',       path: '/debts'        },
  suppliers:    { key: 'suppliers',    label: "Ta'minotchilar",   path: '/suppliers'    },
  deliveries:   { key: 'deliveries',   label: 'Yetkazib berish',  path: '/deliveries'   },
  branches:     { key: 'branches',     label: 'Filiallar',        path: '/branches'     },
  portal:       { key: 'portal',       label: 'Mijoz portali',    path: '/portal'       },
  settings:     { key: 'settings',     label: 'Sozlamalar',       path: '/settings'     },
};

const FALLBACK_NAV: NavItem[] = [
  MODULE_NAV_MAP.pos, MODULE_NAV_MAP.products, MODULE_NAV_MAP.sales,
];

interface Props {
  open?: boolean;
  onClose?: () => void;
}

export default function DynamicSidebar({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const config       = useConfigStore((s) => s.config);
  const getUserPerms = useConfigStore((s) => s.getUserPerms);
  const flags        = useFeaturesStore((s) => s.flags);

  const planTier   = getPlanTier(flags as Parameters<typeof getPlanTier>[0]);
  const industry   = detectIndustry(config?.industry);
  const allowedSet = INDUSTRY_PLAN_MODULES[industry][planTier]; // empty Set = PRO = allow all

  useEffect(() => {
    if (config?.theme?.primaryColor) {
      document.documentElement.style.setProperty('--primary', config.theme.primaryColor);
    }
  }, [config]);

  // Build nav from wizard-selected modules (DB config).
  // Prefer the label/path from config.navigation; fall back to the local map.
  const rawConfigNav: NavItem[] = config?.modules?.length
    ? config.modules
        .map((key) => config.navigation?.find((n) => n.key === key) ?? MODULE_NAV_MAP[key])
        .filter((item): item is NavItem => item !== undefined)
    : FALLBACK_NAV;

  // Filter by billing plan tier so old DB configs don't leak STARTER/PRO modules to TRIAL.
  // PRO has an empty allowedSet (allow everything); for TRIAL/STARTER filter by key.
  const configuredNav = allowedSet.size > 0
    ? rawConfigNav.filter((item) => allowedSet.has(item.key))
    : rawConfigNav;

  // Further filter by current user's role permissions
  const perms = getUserPerms();
  const permModules = perms?.modules ?? [];
  const navigation = permModules.length && !permModules.includes('*')
    ? configuredNav.filter((item) => permModules.includes(item.key))
    : configuredNav;

  const canManageEmployees = user?.role === 'admin' || user?.role === 'manager';
  // Hardcoded employees link only for STARTER+ users (avoid showing to TRIAL)
  const canSeeEmployeesLink = canManageEmployees && (planTier === 'starter' || planTier === 'pro');

  const handleLogout = () => { logout(); navigate('/'); };
  const handleNav = () => { onClose?.(); };

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
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
        <span style={{ flex: 1 }}>{config?.theme?.shopName || 'Savdo CRM'}</span>
        {onClose && (
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Yopish">
            <X size={15} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          onClick={handleNav}
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
        >
          Dashboard
        </NavLink>

        {navigation.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            onClick={handleNav}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
          >
            {item.label}
          </NavLink>
        ))}

        {canSeeEmployeesLink && !navigation.some((n) => n.key === 'employees') && (
          <NavLink
            to="/employees"
            onClick={handleNav}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
          >
            Xodimlar
          </NavLink>
        )}

        {/* Settings — always visible; modules list may already include it, deduplicate */}
        {!navigation.some((n) => n.key === 'settings') && (
          <NavLink
            to="/settings"
            onClick={handleNav}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
          >
            Sozlamalar
          </NavLink>
        )}

        <NavLink
          to="/subscription"
          onClick={handleNav}
          className={({ isActive }) => 'sidebar-link' + (isActive ? ' sidebar-link--active' : '')}
        >
          Obuna & To'lov
        </NavLink>
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
